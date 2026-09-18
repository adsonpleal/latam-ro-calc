#!/usr/bin/env node
// Append finished monster records to src/assets/demo/data/monster.json with a
// MINIMAL diff (the file is keyed by id; a full re-stringify would reorder all
// 300+ entries because JS sorts integer-like string keys). New entries are
// inserted as text before the root's closing brace; existing ids are skipped.
//
// Input: a JSON file holding an array of records (or an object keyed by id),
// e.g. the file written by extract.mjs after you fill in each record's `spawn`.
//
// Usage:  node .agents/skills/add-ro-monster/apply.mjs <records.json> [--allow-tbd]

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const MONSTER_JSON = resolve(ROOT, "src/assets/demo/data/monster.json");

const args = process.argv.slice(2);
const allowTbd = args.includes("--allow-tbd");
const recPath = args.find((a) => !a.startsWith("--"));
if (!recPath) {
  console.error("usage: node .agents/skills/add-ro-monster/apply.mjs <records.json> [--allow-tbd]");
  process.exit(1);
}

const input = JSON.parse(readFileSync(resolve(recPath), "utf8"));
const records = Array.isArray(input) ? input : Object.values(input);

for (const r of records) {
  if (!Number.isInteger(r.id)) throw new Error(`record missing integer id: ${JSON.stringify(r).slice(0, 120)}`);
  if (!r.stats || typeof r.stats !== "object") throw new Error(`record ${r.id} missing stats object`);
  for (const f of ["elementName", "raceName", "scaleName"]) {
    if (!r.stats[f]) throw new Error(`record ${r.id} missing stats.${f} (calc reads the English name string)`);
  }
  if ((r.spawn === "TBD" || !r.spawn) && !allowTbd) {
    throw new Error(`record ${r.id} has spawn="${r.spawn}" — set the instance map code (and add a monster-spawn-mapper.ts group), or pass --allow-tbd`);
  }
}

const raw = readFileSync(MONSTER_JSON, "utf8");
const db = JSON.parse(raw);
const eol = raw.includes("\r\n") ? "\r\n" : "\n";

const append = [];
for (const r of records) {
  if (db[r.id]) { console.log(`skip ${r.id} — already in monster.json`); continue; }
  append.push(r);
}
if (!append.length) { console.log("nothing to add."); process.exit(0); }

// Insert before the final root '}', indented one level (2 spaces), matching the
// file's pretty-print + line endings.
const lastBrace = raw.lastIndexOf("}");
const head = raw.slice(0, lastBrace).replace(/\s+$/, ""); // ...ends with the last entry's '}'
const entryText = (r) => {
  const j = JSON.stringify(r, null, 2).split("\n").map((ln, i) => (i === 0 ? ln : "  " + ln)).join("\n");
  return "  " + JSON.stringify(String(r.id)) + ": " + j;
};
let out = head + ",\n" + append.map(entryText).join(",\n") + "\n}";
if (eol === "\r\n") out = out.replace(/\r?\n/g, "\r\n");

const check = JSON.parse(out); // must still parse and contain the new ids
for (const r of append) if (!check[r.id]) throw new Error(`post-insert check failed for ${r.id}`);

writeFileSync(MONSTER_JSON, out);
console.log(`added ${append.length} monster(s): ${append.map((r) => `${r.id} (${r.name}, spawn=${r.spawn})`).join(", ")}`);
