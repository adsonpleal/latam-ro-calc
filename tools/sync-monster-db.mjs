#!/usr/bin/env node
// Refresh the stats of every record in src/assets/demo/data/monster.json from
// ragassets' mobs.json (see tools/mob-source.mjs for the source and the field
// mapping). This replaces the old Divine Pride scrape as the monster-data
// source of truth.
//
// What it touches, per record: `dbname` and the `stats` fields the calc reads
// (level, health, defense, magicDefense, the six base stats, raceName/scaleName/
// elementName + their numeric codes, class, mvp). Everything else is left alone:
//
//   - `spawn` is maintained by hand (the source carries no spawn map) and is
//     what groups the monster picker — never derived, never cleared.
//   - `name` stays the record's existing base name; the pt-BR label users see
//     comes from the latam-monsters.json overlay (tools/build-latam-monsters.mjs,
//     built from the same mobs.json).
//   - `res`/`mres` are not in the source. monster.ts defaults both to 0; an
//     existing non-zero value is kept rather than invented or zeroed.
//   - attackRange/atk1/attack/magicAttack/hit/flee/baseExperience/… are legacy
//     display fields nothing in the app reads. Left as-is.
//
// This script never ADDS or REMOVES ids — a new monster needs a hand-set spawn,
// which is the add-ro-monster skill's job.
//
// Usage:
//   node tools/sync-monster-db.mjs [--src <mobs.json>] [--dry]
//
// Without --src the file is downloaded from MOBS_URL. --dry reports without
// writing. The rewrite preserves the file's existing key order (the file is
// keyed, not sorted; a plain re-stringify would reorder all 458 entries and
// bury the real diff).

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadMobs, indexById, mapMobStats, CALC_READ_STAT_FIELDS } from "./mob-source.mjs";

const MONSTER_JSON = resolve(process.cwd(), "src/assets/demo/data/monster.json");

const argv = process.argv.slice(2);
const dry = argv.includes("--dry");
const src = argv.includes("--src") ? argv[argv.indexOf("--src") + 1] : undefined;

const raw = readFileSync(MONSTER_JSON, "utf8");
const db = JSON.parse(raw);
const keyOrder = [...raw.matchAll(/^ {2}"(\d+)": \{/gm)].map((m) => m[1]);
if (keyOrder.length !== Object.keys(db).length) {
  throw new Error(`could not recover the key order from monster.json (${keyOrder.length} scanned vs ${Object.keys(db).length} parsed)`);
}

const mobs = await loadMobs(src);
const byId = indexById(mobs);
console.log(`source: ${mobs.length} mobs${src ? ` (${src})` : " (downloaded)"} | monster.json: ${keyOrder.length} records\n`);

const changes = [];
const retentions = [];
const notInSource = [];

for (const key of keyOrder) {
  const rec = db[key];
  const mob = byId.get(rec.id);
  if (!mob) {
    notInSource.push(`${rec.id} (${rec.name})`);
    continue;
  }

  const { stats, retained } = mapMobStats(mob, rec.stats);
  if (retained.length) retentions.push(`${rec.id} (${rec.name}): kept existing ${retained.join(", ")} — null in source`);

  const diffs = [];
  for (const [field, value] of Object.entries(stats)) {
    if (value === undefined) continue; // nothing in the source AND nothing to keep
    if (rec.stats[field] !== value) {
      diffs.push({ field, from: rec.stats[field], to: value });
      rec.stats[field] = value;
    }
  }
  if (mob.aegisId && rec.dbname !== mob.aegisId) {
    diffs.push({ field: "dbname", from: rec.dbname, to: mob.aegisId });
    rec.dbname = mob.aegisId;
  }
  if (diffs.length) changes.push({ id: rec.id, name: rec.name, diffs });
}

// --- guard: no field the calc reads may end up null/undefined ---------------
const broken = [];
for (const key of keyOrder) {
  const rec = db[key];
  for (const f of CALC_READ_STAT_FIELDS) {
    if (rec.stats[f] == null) broken.push(`${rec.id} (${rec.name}): stats.${f} is ${rec.stats[f]}`);
  }
  for (const f of ["id", "dbname", "name", "spawn"]) {
    if (rec[f] == null) broken.push(`${rec.id}: ${f} is ${rec[f]}`);
  }
}

// --- report ----------------------------------------------------------------
const byField = new Map();
for (const c of changes) for (const d of c.diffs) byField.set(d.field, (byField.get(d.field) || 0) + 1);

console.log(`records changed: ${changes.length} / ${keyOrder.length}`);
console.log(`changes by field: ${[...byField.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `${f} x${n}`).join(", ") || "none"}\n`);

for (const c of changes) {
  console.log(`  ${c.id} ${c.name}`);
  for (const d of c.diffs) console.log(`      ${d.field}: ${JSON.stringify(d.from)} -> ${JSON.stringify(d.to)}`);
}

if (retentions.length) {
  console.log(`\nnull in source, existing value kept (${retentions.length}):`);
  for (const r of retentions) console.log(`  ${r}`);
}
if (notInSource.length) {
  console.log(`\nnot in the source, left untouched (${notInSource.length}):`);
  for (const r of notInSource) console.log(`  ${r}`);
}
if (broken.length) {
  console.error(`\nFAILED — ${broken.length} field(s) the calc reads are null/undefined:`);
  for (const b of broken) console.error(`  ${b}`);
  process.exit(1);
}
console.log(`\nno null/undefined in any field the calc reads.`);

if (dry) {
  console.log("\n--dry: monster.json not written.");
  process.exit(0);
}

// Rebuild the file in its original key order (see the header note).
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const body = keyOrder
  .map((k) => {
    const json = JSON.stringify(db[k], null, 2).split("\n").map((ln, i) => (i === 0 ? ln : "  " + ln)).join("\n");
    return `  ${JSON.stringify(k)}: ${json}`;
  })
  .join(",\n");
let out = `{\n${body}\n}`;
if (eol === "\r\n") out = out.replace(/\r?\n/g, "\r\n");

const check = JSON.parse(out);
if (Object.keys(check).length !== keyOrder.length) throw new Error("post-write check failed: record count changed");

writeFileSync(MONSTER_JSON, out);
console.log(`\nwrote ${MONSTER_JSON} (${keyOrder.length} records, key order preserved).`);
