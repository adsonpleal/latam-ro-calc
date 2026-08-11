#!/usr/bin/env node
// Rebuild the three client-derived files in src/assets/demo/data/ from the
// ragassets `/raw` tables (see tools/raw-source.mjs):
//
//   latam-items.json    { "<id>": { name, description, aegisName, slots } } — the
//                        pt-BR item name and description, the item_db aegis name
//                        and the card/enchant slot count. Its key set IS the
//                        "present in LATAM" item universe: build-web-data.mjs
//                        flags item.json records with `presentInLatam` from it.
//
//   item-views.json     { "<id>": [view, slotMask] } — the client's `ClassNum`
//                        (the sprite the paper-doll draws for that item) plus the
//                        visual slots it covers, so a multi-slot costume can hide
//                        the headgears underneath it.
//
//   latam-classes.json  [ <jobIconId>, … ] — the job icon ids that ship in the
//                        LATAM client. Classes unreleased on LATAM have no icon,
//                        so the UI hides them.
//
// This replaces the GRF/Lua extraction that used to live here (build-latam-db.mjs
// and build-item-views.mjs, with their grf.mjs + lua51.mjs): ragassets now does
// that reading once and publishes the result, so the files are rebuilt from a
// download instead of from a local client install.
//
// Usage:
//   node tools/sync-latam-db.mjs [--src <dir>] [--dry]
//
// Without --src the tables are downloaded. --src takes a directory holding
// items.json/jobs.json (a ragassets checkout's resources/raw) for offline runs.
// --dry reports without writing.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRawJson, RAW_BASE } from "./raw-source.mjs";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../src/assets/demo/data");

/** Visual-slot bits of item-views.json's `slotMask`, read by char-sprite.pipe.ts. */
export const SLOT_BIT = { top: 1, mid: 2, low: 4, garment: 8 };

/**
 * latam-items.json — the pt-BR overlay, keyed by item id.
 *
 * Rows without a `name` are skipped: ~640 items ship a sprite but no display
 * name, and an entry here means "exists on LATAM", which drives presentInLatam.
 * `aegisName` falls back to the client resource name because ragassets only has
 * the real item_db aegis name for the items itemmoveinfov5.txt covers.
 * `slots` is omitted when 0 to keep the file minimal.
 */
export function buildLatamItems(items) {
  const out = {};
  for (const it of items) {
    if (!it.name) continue;
    const rec = { name: it.name };
    if (it.description) rec.description = it.description;
    const aegisName = it.aegisName ?? it.resourceName;
    if (aegisName) rec.aegisName = aegisName;
    if (it.slots > 0) rec.slots = it.slots;
    out[it.id] = rec;
  }
  return out;
}

/**
 * item-views.json — id -> [view, slotMask].
 *
 * Unlike latam-items this keeps the unnamed rows: the paper-doll draws by id and
 * a missing display name says nothing about whether the sprite exists.
 */
export function buildItemViews(items) {
  const out = {};
  for (const it of items) {
    if (it.view > 0) out[it.id] = [it.view, it.equipSlots.reduce((mask, s) => mask | SLOT_BIT[s], 0)];
  }
  return out;
}

/** latam-classes.json — the job ids whose party icon ships in the client. */
export function buildLatamClasses(jobs) {
  return jobs.filter((j) => j.hasIcon).map((j) => j.id);
}

// None of the three transforms sorts: the /raw tables arrive sorted by id and
// the outputs inherit that order. It matters — these files are reviewed by diff
// after every client update, and a reordering would bury ten real changes under
// fourteen thousand fake ones.

async function main() {
  const argv = process.argv.slice(2);
  const dry = argv.includes("--dry");
  const src = argv.includes("--src") ? argv[argv.indexOf("--src") + 1] : undefined;

  const [items, jobs] = await Promise.all([loadRawJson("items.json", src), loadRawJson("jobs.json", src)]);
  console.log(`source: ${items.length} items, ${jobs.length} jobs (${src ?? RAW_BASE})\n`);

  const artifacts = [
    ["latam-items.json", buildLatamItems(items)],
    ["item-views.json", buildItemViews(items)],
    ["latam-classes.json", buildLatamClasses(jobs)],
  ];

  for (const [name, value] of artifacts) {
    const path = join(OUT_DIR, name);
    const bytes = JSON.stringify(value);
    const count = Array.isArray(value) ? value.length : Object.keys(value).length;
    let status = "unchanged";
    if (bytes !== readFileSync(path, "utf8")) {
      status = dry ? "would change" : "written";
      if (!dry) writeFileSync(path, bytes);
    }
    console.log(`  ${name.padEnd(20)} ${String(count).padStart(6)} entries — ${status}`);
  }
}

// Só executa quando chamado direto pela CLI; a spec importa os transforms.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
