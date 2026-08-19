#!/usr/bin/env node
// Build the pt-BR monster-name overlay from ragassets' mobs.json.
//
// The overlay (latam-monsters.json, `{ "<id>": "<nome pt-BR>" }`) is applied by
// RoService on top of monster.json at runtime, so monster.json records keep a
// stable base name and the LATAM label lives here. Same file, same ids as the
// stat sync (tools/sync-monster-db.mjs) — see tools/mob-source.mjs.
//
// ragassets doesn't cover every id the calc knows (mostly newer instance/raid
// mobs, plus the calc's synthetic per-level clones), so this merges on top of
// the existing OUT file instead of overwriting it wholesale: ragassets wins for
// any id it has, the previous value is kept as a fallback for ids it doesn't.
//
// Usage: node tools/build-latam-monsters.mjs [--src <mobs.json>]
// Without --src the file is downloaded from MOBS_URL.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadMobs, MOBS_URL } from "./mob-source.mjs";

/**
 * Labels the calc owns, which must survive a rebuild. ragassets carries the
 * plain in-game name, so a straight merge would clobber them.
 *
 * 20573 is the "Nível 10" entry of the leveled Miragem de Amdarais set — ids
 * 205731-205739 are synthetic clones of it that differ only in HP, and they
 * carry their labels in monster.json's `name` (no overlay entry).
 *
 * 20994 is here for the other reason: the name it needs is the game's own, but
 * the overlay had been carrying the Korean "베텔기우스" — an earlier feed shipped
 * the record untranslated, and the current one dropped it entirely, so nothing
 * would have corrected it. Pinning it keeps the pt-BR name if the record comes
 * back still untranslated.
 */
const CALC_OVERRIDES = {
  20573: "Miragem de Amdarais - Nível 10",
  20994: "Betelgeuse",
};

const argv = process.argv.slice(2);
// Accept a bare path too, for the old `node tools/build-latam-monsters.mjs <file>` form.
const src = argv.includes("--src") ? argv[argv.indexOf("--src") + 1] : argv.find((a) => !a.startsWith("--"));
const OUT = resolve(process.cwd(), "src/assets/demo/data/latam-monsters.json");

const mobs = await loadMobs(src);

const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
const fallbackCount = Object.keys(out).length;
let overridden = 0;
for (const e of mobs) {
  if (e && e.id != null && e.name) {
    const id = String(e.id);
    if (out[id] !== e.name) overridden++;
    out[id] = e.name;
  }
}
for (const [id, name] of Object.entries(CALC_OVERRIDES)) out[id] = name;
writeFileSync(OUT, JSON.stringify(out));
console.log(
  `latam-monsters.json — ${Object.keys(out).length} pt-BR monster names ` +
    `(${overridden} set/overridden from ${src ?? MOBS_URL}, ${fallbackCount} kept as prior fallback)`,
);
