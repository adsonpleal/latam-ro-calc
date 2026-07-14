#!/usr/bin/env node
// Build pt-BR monster names from ragassets' mobs.json.
//
// ragassets (sibling project) derives mob id -> pt-BR name from the client's
// navi spawn data (mob id <-> aegis name) joined against the client's
// localized string table, backfilled from replay packet data for
// instance-only mobs — see ragassets/_scratch/*.mjs. That's the LATAM
// monster-name source of truth (same kRO/DP mob ids the calculator's
// monster.json uses), replacing the old Divine Pride scrape this script used
// to read from ragreplaystats (removed — DP has no/generic/stale pt-BR text
// for many mob ids, and collapses distinct subtypes like colored Pitaya or
// weapon-type Goblins/Kobolds into one generic name).
//
// ragassets doesn't cover every id (mostly newer instance/raid-only mobs it
// hasn't extracted yet from navi data), so this script merges on top of the
// existing OUT file instead of overwriting it wholesale: ragassets wins for
// any id it has, the previous value is kept as a fallback for ids it doesn't.
//
// Usage: node tools/build-latam-monsters.mjs [path/to/mobs.json]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SRC = process.argv[2] ?? "C:\\Users\\adson\\dev\\ragassets\\mobs.json";
const OUT = resolve(process.cwd(), "src/assets/demo/data/latam-monsters.json");

const arr = JSON.parse(readFileSync(SRC, "utf8"));
if (!Array.isArray(arr)) {
  console.error("Expected mobs.json to be a JSON array of mob objects.");
  process.exit(1);
}

const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const fallbackCount = Object.keys(out).length;
let overridden = 0;
for (const e of arr) {
  if (e && e.id != null && e.name) {
    const id = String(e.id);
    if (out[id] !== e.name) overridden++;
    out[id] = e.name;
  }
}
writeFileSync(OUT, JSON.stringify(out));
console.log(
  `latam-monsters.json — ${Object.keys(out).length} pt-BR monster names ` +
    `(${overridden} set/overridden from ${SRC}, ${fallbackCount} kept as prior fallback)`,
);
