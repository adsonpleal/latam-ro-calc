#!/usr/bin/env node
// Insert finished item records into src/assets/demo/data/item.json with a
// MINIMAL diff (the file has custom escaping/ordering, so a full re-stringify
// would rewrite all 6k entries). New entries are appended as text before the
// root's closing brace; existing ids are skipped (use --force to overwrite).
//
// Input: a JSON file holding either an array of records or an object keyed by id.
// Each record must have a numeric `id` and a `script` object.
//
// Usage:  node .claude/skills/add-ro-item/apply.mjs <records.json> [--force]

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const ITEM_JSON = resolve(ROOT, "src/assets/demo/data/item.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const recPath = args.find((a) => !a.startsWith("--"));
if (!recPath) {
  console.error("usage: node .claude/skills/add-ro-item/apply.mjs <records.json> [--force]");
  process.exit(1);
}

const input = JSON.parse(readFileSync(resolve(recPath), "utf8"));
const records = Array.isArray(input) ? input : Object.values(input);

for (const r of records) {
  if (!Number.isInteger(r.id)) throw new Error(`record missing integer id: ${JSON.stringify(r).slice(0, 120)}`);
  if (typeof r.script !== "object" || r.script == null) throw new Error(`record ${r.id} missing script object`);
}

const raw = readFileSync(ITEM_JSON, "utf8");
const db = JSON.parse(raw);

const toAdd = [];
for (const r of records) {
  if (db[r.id] && !force) { console.log(`skip ${r.id} — already in item.json (use --force to overwrite)`); continue; }
  toAdd.push(r);
}
if (!toAdd.length) { console.log("nothing to add."); process.exit(0); }

// --force overwrite: re-parse + re-stringify only those keys via text replace is
// risky, so for overwrite we fall back to a structured rewrite of just the value.
// Default path (append) keeps the diff tiny.
const overwrite = toAdd.filter((r) => db[r.id]);
const append = toAdd.filter((r) => !db[r.id]);

let out = raw;

// Overwrites: replace the existing "id": {...} block. We locate it structurally
// by re-stringifying the whole file is avoided; instead require append-only here.
if (overwrite.length) {
  console.error(`refusing to overwrite ${overwrite.map((r) => r.id).join(", ")} in place — remove them first, then re-run.`);
  process.exit(1);
}

// Append: insert before the final root '}'.
const lastBrace = out.lastIndexOf("}");
let head = out.slice(0, lastBrace).replace(/\s+$/, ""); // ...ends with the last entry's '}'
const entryText = (r) => `  ${JSON.stringify(String(r.id))}: ${JSON.stringify(r, null, 2).split("\n").join("\n  ")}`;
out = head + ",\n" + append.map(entryText).join(",\n") + "\n}";

// sanity: the result must still parse and contain the new ids
const check = JSON.parse(out);
for (const r of append) if (!check[r.id]) throw new Error(`post-insert check failed for ${r.id}`);

writeFileSync(ITEM_JSON, out);
console.log(`added ${append.length} item(s): ${append.map((r) => r.id).join(", ")}`);
