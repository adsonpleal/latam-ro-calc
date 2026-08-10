#!/usr/bin/env node
// Derive the browser-facing data artifacts from the hand-edited sources in
// src/assets/demo/data/ and emit them to src/assets/data/ (gitignored).
//
// Why this exists: the app used to fetch item.json (11,5 MB) + latam-items.json
// (6,6 MB) and do the LATAM merge in the browser, on the main thread, on every
// single page load. Over half of that payload was `description` — and for the
// items that exist on LATAM the English description was thrown away and replaced
// by the pt-BR one from latam-items.json a few milliseconds later. This script
// does that merge once, at build time, and splits the result so the calculator
// can boot without the descriptions (they are only needed for hover tooltips and
// the item-search preview, both user-triggered).
//
// Emits, into --out (default src/assets/data/):
//
//   items-core[.<hash>].json   { "<key>": CoreItem } — item.json already merged
//                              with the LATAM overlay: pt-BR `name`, `enName`
//                              when it differs, `presentInLatam`, `canGrade`.
//                              Minus `description`, `unidName`, `resName` and
//                              `requiredLevel`, none of which the browser reads.
//
//   items-desc[.<hash>].json   { "<key>": "<pt-BR description>" } — fetched
//                              lazily, after items-core resolves.
//
//   monsters[.<hash>].json     monster.json with the pt-BR names from
//                              latam-monsters.json already applied.
//
//   hpsp / classes / item-views [.<hash>].json — reserialized, minified.
//
//   data-manifest.json         logical name -> emitted filename. Never hashed,
//                              and deliberately one directory ABOVE the hashed
//                              files so the two firebase.json header globs
//                              (immutable vs no-cache) cannot overlap.
//
// IMPORTANT: this script only ever READS src/assets/demo/data/. item.json stays
// the hand-edited source of truth — .claude/skills/add-ro-item/apply.mjs appends
// new records as raw text before the closing brace, and a full re-stringify by
// anything else would rewrite all ~9,5k entries and destroy that diff. The MCP
// server also reads the raw files (mcp/src/data/dataset.ts), including the ~7,7k
// latam-items.json records that have no item.json counterpart and that the
// browser never touches.
//
// Usage:
//   node tools/build-web-data.mjs [--hash] [--report] [--all-desc]
//                                 [--src <dir>] [--out <dir>]
//
//   --hash      content-hash the emitted filenames (production builds). Off for
//               `ng serve`, where stable names let a re-run be picked up by a
//               plain reload.
//   --report    print raw/gzip/brotli sizes per artifact.
//   --all-desc  also emit descriptions for items absent from LATAM. Off by
//               default: their item.json description is in English and they are
//               filtered out of every dropdown anyway.

import { createHash } from 'node:crypto';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// Mirrors src/app/constants/item.const.ts. Kept as literals so this stays a
// dependency-free .mjs; the derived-data spec asserts the outputs agree with the
// real TypeScript helpers.
const ITEM_TYPE_WEAPON = 1;
const ITEM_TYPE_ARMOR = 2;

/** Same rule as canGradeItem() in src/app/utils/can-grade.ts (asserted by the spec). */
export function canGradeItem(item) {
  if (!item) return false;
  if (item.itemTypeId === ITEM_TYPE_WEAPON) return item.itemLevel === 5;
  if (item.itemTypeId === ITEM_TYPE_ARMOR) return item.itemLevel === 2;
  return false;
}

/** Fields the browser never reads — see the header for why each one goes. */
const DROPPED_FIELDS = new Set([
  'description', // moved to items-desc (and overwritten by the pt-BR one anyway)
  'unidName', // zero reads outside the ItemModel declaration
  'resName', // zero reads outside the ItemModel declaration
  'requiredLevel', // MCP-only, and the MCP reads the raw file
  'canGrade', // recomputed here from itemLevel; the stored flag had drifted
  'presentInLatam', // recomputed here from the LATAM key set
]);

function parseArgs(argv) {
  const out = { hash: false, report: false, allDesc: false, src: null, out: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--hash') out.hash = true;
    else if (a === '--report') out.report = true;
    else if (a === '--all-desc') out.allDesc = true;
    else if (a === '--src') out.src = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else {
      console.error('usage: node tools/build-web-data.mjs [--hash] [--report] [--all-desc] [--src <dir>] [--out <dir>]');
      process.exit(1);
    }
  }
  out.src = resolve(out.src ?? join(ROOT, 'src/assets/demo/data'));
  out.out = resolve(out.out ?? join(ROOT, 'src/assets/data'));
  return out;
}

const readJson = (dir, file) => JSON.parse(readFileSync(join(dir, file), 'utf8'));

/**
 * item.json has 9,555 keys but only 9,553 distinct ids: 4807 is deliberately
 * listed under 4807 / 48079999 / 480799999 so the ASPD+1 enchant shows up in
 * several costume-enchant pickers. The LATAM overlay is keyed by real id, so try
 * the id first and fall back to the map key.
 */
export const latamEntry = (latam, key, item) => latam[item.id] ?? latam[key];

export function buildItems(items, latam, { allDesc } = {}) {
  const core = {};
  const desc = {};

  for (const key of Object.keys(items)) {
    const item = items[key];
    const pt = latamEntry(latam, key, item);

    const rec = {};
    for (const field of Object.keys(item)) {
      if (!DROPPED_FIELDS.has(field)) rec[field] = item[field];
    }

    if (pt) {
      rec.presentInLatam = true;
      // Set/combo scripts (EQUIP[...], POS_SPECIFIC[...], REFINE_NAME[...]) match
      // partner items by their English display name, so it has to survive the
      // swap to pt-BR — calculator.ts matches on `enName ?? name`.
      if (pt.name && pt.name !== item.name) {
        rec.enName = item.name;
        rec.name = pt.name;
      }
      if (pt.description) desc[key] = pt.description;
    } else if (allDesc && item.description) {
      desc[key] = item.description;
    }

    if (canGradeItem(item)) rec.canGrade = true;

    core[key] = rec;
  }

  return { core, desc };
}

export function buildMonsters(monsters, latamMonsters) {
  for (const id of Object.keys(monsters)) {
    const pt = latamMonsters[id];
    if (pt) monsters[id].name = pt;
  }
  return monsters;
}

export function main() {
  const args = parseArgs(process.argv);

  const items = readJson(args.src, 'item.json');
  const latam = readJson(args.src, 'latam-items.json');
  const monsters = readJson(args.src, 'monster.json');
  const latamMonsters = readJson(args.src, 'latam-monsters.json');
  const hpSpTable = readJson(args.src, 'hp_sp_table.json');
  const latamClasses = readJson(args.src, 'latam-classes.json');
  const itemViews = readJson(args.src, 'item-views.json');

  const { core, desc } = buildItems(items, latam, args);

  const artifacts = [
    ['itemsCore', 'items-core', core],
    ['itemsDesc', 'items-desc', desc],
    ['monsters', 'monsters', buildMonsters(monsters, latamMonsters)],
    ['hpsp', 'hpsp', hpSpTable],
    ['classes', 'classes', latamClasses],
    ['itemViews', 'item-views', itemViews],
  ];

  // Wipe first so hashed filenames from previous runs never accumulate.
  rmSync(args.out, { recursive: true, force: true });
  mkdirSync(args.out, { recursive: true });

  const files = {};
  const report = [];

  for (const [key, base, value] of artifacts) {
    const bytes = Buffer.from(JSON.stringify(value));
    // Hash the emitted bytes, not the inputs: a deploy that doesn't touch the
    // item data produces byte-identical names and every returning visitor keeps
    // its immutable cache.
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
    const name = args.hash ? `${base}.${hash}.json` : `${base}.json`;

    writeFileSync(join(args.out, name), bytes);
    files[key] = name;
    report.push([name, bytes, Object.keys(value).length]);
  }

  const manifest = { v: 1, base: 'assets/data/', files };
  writeFileSync(join(args.out, '..', 'data-manifest.json'), JSON.stringify(manifest));

  const kb = (n) => `${(n / 1024).toFixed(0)} KB`;
  console.log(`build-web-data: wrote ${artifacts.length} artifacts to ${args.out}${args.hash ? ' (hashed)' : ''}`);

  if (args.report) {
    let rawTotal = 0;
    let brTotal = 0;
    for (const [name, bytes, count] of report) {
      const gz = gzipSync(bytes, { level: 9 }).length;
      const br = brotliCompressSync(bytes).length;
      rawTotal += bytes.length;
      brTotal += br;
      console.log(`  ${name.padEnd(34)} ${kb(bytes.length).padStart(9)}  ${kb(gz).padStart(8)} gz  ${kb(br).padStart(8)} br  (${count} registros)`);
    }
    console.log(`  ${'TOTAL'.padEnd(34)} ${kb(rawTotal).padStart(9)}  ${''.padStart(11)}  ${kb(brTotal).padStart(8)} br`);
  }
}

// Só executa quando chamado direto pela CLI; a spec importa buildItems/canGradeItem.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
