#!/usr/bin/env node
// Build monster.json records for the calculator from their in-game ids, using
// ragassets' mobs.json as the source (see tools/mob-source.mjs). One file, no
// auth, no scraping — it is downloaded, never queried per-id.
//
// What the calc reads (everything else in the record is legacy/display-only):
// name + stats.{level, health, defense, magicDefense, res, mres, str, agi, vit,
// int, dex, luk, elementName, raceName, scaleName, class, mvp}. It parses the
// ENGLISH name strings — elementName "Dark 3", raceName "Undead" (DemiHuman,
// never "Human"), scaleName "Medium" — not the numeric codes.
//
// `spawn` is left "TBD": the source carries no spawn map, and instance maps are
// not machine-derivable. Set it by hand (the instance's map code) and add a
// monster-spawn-mapper.ts group entry before running apply.mjs.
//
// Usage:
//   node .claude/skills/add-ro-monster/extract.mjs <id> [<id> ...] [--src <mobs.json>] [--out <file>]
// Writes the records array to --out (default: <os tmp>/latam-monster-recs.json)
// and prints a summary. Feed that file to apply.mjs.

import { writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const { loadMobs, indexById, mapMobStats, CALC_READ_STAT_FIELDS, MOBS_URL } = await import(
  pathToFileURL(join(ROOT, "tools/mob-source.mjs")).href
);

const argv = process.argv.slice(2);
const ids = [];
let src;
let outPath = join(tmpdir(), "latam-monster-recs.json");
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--src") src = argv[++i];
  else if (argv[i] === "--out") outPath = argv[++i];
  else if (/^\d+$/.test(argv[i])) ids.push(Number(argv[i]));
}
if (!ids.length) {
  console.error("usage: node .claude/skills/add-ro-monster/extract.mjs <id> [<id> ...] [--src <mobs.json>] [--out <file>]");
  process.exit(1);
}

const byId = indexById(await loadMobs(src));
console.log(`source: ${src ?? MOBS_URL}\n`);

const recs = [];
for (const id of ids) {
  const mob = byId.get(id);
  if (!mob) {
    console.error(`=== ${id} NOT IN THE SOURCE — ragassets' mobs.json has no record for this id.`);
    console.error(`    Report it to the user (the file is regenerated upstream, in the ragassets repo).`);
    console.error(`    Do NOT hand-write a stat block from another site.\n`);
    continue;
  }

  // No previous record to fall back on, so a null in any field the calc reads
  // is fatal here — see the NULL POLICY note in tools/mob-source.mjs.
  const { stats, retained } = mapMobStats(mob, {});
  const missing = retained.filter((f) => CALC_READ_STAT_FIELDS.includes(f));
  if (missing.length) {
    console.error(`=== ${id} "${mob.name}" INCOMPLETE — null in the source for: ${missing.join(", ")}`);
    console.error(`    The calc reads these as numbers/strings; refusing to emit a record with holes.`);
    console.error(`    Report the gap to the user.\n`);
    continue;
  }

  const rec = {
    id,
    dbname: mob.aegisId || "",
    // The pt-BR label users see comes from the latam-monsters.json overlay,
    // which is built from this same file — so this base name is a fallback.
    name: mob.name,
    spawn: "TBD",
    stats: {
      attackRange: 0,
      level: stats.level,
      health: stats.health,
      sp: 1,
      str: stats.str, int: stats.int, vit: stats.vit, dex: stats.dex, agi: stats.agi, luk: stats.luk,
      rechargeTime: 0,
      atk1: mob.attack ?? 0,
      atk2: 0,
      // The source carries a single attack value, not a min/max pair. Nothing
      // in the app reads these — they exist for format parity.
      attack: { minimum: mob.attack ?? 0, maximum: mob.attack ?? 0 },
      magicAttack: { minimum: 0, maximum: 0 },
      defense: stats.defense,
      baseExperience: mob.baseExp ?? 0,
      jobExperience: mob.jobExp ?? 0,
      aggroRange: 0, escapeRange: 0, movementSpeed: 0, attackSpeed: 0, attackedSpeed: 0,
      element: stats.element,
      scale: stats.scale,
      race: stats.race,
      magicDefense: stats.magicDefense,
      hit: 0, flee: 0, ai: "",
      mvp: stats.mvp,
      class: stats.class,
      attr: 0,
      res: stats.res,
      mres: stats.mres,
      elementName: stats.elementName,
      elementShortName: stats.elementShortName,
      scaleName: stats.scaleName,
      raceName: stats.raceName,
    },
  };
  recs.push(rec);

  const s = rec.stats;
  console.log(`=== ${id}  ${rec.dbname || "(no dbname)"}  "${rec.name}"  [${s.mvp ? "MVP" : s.class ? "Boss" : "Normal"}]`);
  console.log(`  Lv ${s.level} | ${s.raceName}/${s.scaleName}/${s.elementName} | HP ${s.health.toLocaleString()} | DEF ${s.defense} MDEF ${s.magicDefense} | RES ${s.res} MRES ${s.mres}`);
  console.log(`  STR ${s.str} AGI ${s.agi} VIT ${s.vit} INT ${s.int} DEX ${s.dex} LUK ${s.luk}`);
  if (mob.race !== s.raceName) console.log(`  (race normalized: "${mob.race}" -> "${s.raceName}")`);
  console.log("");
}

if (!recs.length) { console.error("no records extracted."); process.exit(1); }
writeFileSync(outPath, JSON.stringify(recs, null, 2));
console.log(`wrote ${recs.length} record(s) -> ${outPath}`);
console.log(`Next: set each record's "spawn" (the instance map code), add a monster-spawn-mapper.ts group, then:`);
console.log(`  node .claude/skills/add-ro-monster/apply.mjs "${outPath}"`);
