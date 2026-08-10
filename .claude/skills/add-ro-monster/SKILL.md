---
name: add-ro-monster
description: Add one or more monsters to the calculator's monster.json from their in-game ids — pulls the stat block from the ragassets mobs.json feed, then groups them by spawn map. Use when a monster is missing from the calc's target/monster picker, e.g. new instance mobs, or any "monstro não está no banco de dados" situation.
---

# Add monster(s) to the calculator DB

A monster the calc can target must be a record in `src/assets/demo/data/monster.json`
(keyed by id). This skill turns a monster **id** into a complete record: stats from
the ragassets feed, grouped under its spawn map in the picker.

## The source
Everything except the spawn map comes from one public file, no auth:

    https://raw.githubusercontent.com/adsonpleal/ragassets/main/mobs.json

ragassets generates it from the RagnaPlace Public API (laro-pt gateway) — LATAM
server values. **This repo only downloads the file; it never calls the API.** The
reader, the field mapping, the race normalization and the null policy all live in
[tools/mob-source.mjs](tools/mob-source.mjs); read it before changing anything here.

`aegisId` in the source is what monster.json calls `dbname`. `name` is pt-BR;
`race`/`size`/`property` are English enums.

**The spawn map is not in the source** and is not machine-derivable for instance
mobs — you set it by hand (step 2).

## What the calc actually uses (so you know what must be right)
`Monster.setData` in [monster.ts](src/app/domain/monster.ts) reads only `name` and
`stats.{level, health, defense, magicDefense, res, mres, str, agi, vit, int, dex, luk,
elementName, raceName, scaleName, class, mvp}`. Everything else (softDef/softMDef,
the flee-equivalent `hitRequireFor100 = 200 + level + agi`, criShield…) is **derived**.
Crucially it parses the **English name strings** `elementName` ("Dark 3"),
`raceName` ("Undead"), `scaleName` ("Medium") — not the numeric codes. So those three
strings must be the calc's exact English vocab (race uses **DemiHuman**, not "Human").

## Procedure

### 1. Extract
```
node .claude/skills/add-ro-monster/extract.mjs <id> [<id> ...]
```
Downloads the feed, prints a per-mob summary (name, dbname, level, race/size/element,
HP, DEF/MDEF, stats) and writes the records array to `<os tmp>/latam-monster-recs.json`
with `spawn: "TBD"`. Pass `--src <file>` to reuse an already-downloaded copy.

It **refuses to emit a partial record**: an id the feed doesn't carry, or a null in
any field the calc reads, is reported and skipped. Report that gap to the user —
the fix belongs upstream in ragassets. Never hand-write a stat block from another site.

### 2. Spawn + group (the "grouped by map code" step)
For each record, set the top-level **`spawn`** to the instance's map code (e.g.
`1@gl_kh`). All mobs of the same instance share one code. Then add a
group entry in [monster-spawn-mapper.ts](src/app/constants/monster-spawn-mapper.ts):
```ts
'1@gl_kh': 'Glastheim Infernal',
```
The key is the spawn code; the value is the pt-BR label shown as the picker group
header (`getMonsterSpawnMap` maps code → label; an unmapped code renders as "undefined").
Confirm the **map code** and **label** with the user — neither is reliably derivable.

`System/mapInfo.lub` in the client GRF gives candidate codes and their pt-BR display
names (decode it with [tools/lua51.mjs](tools/lua51.mjs)), but it can't tell instance
variants apart, so it is a hint, not an answer.

### 3. Name
The displayed name comes from the **`latam-monsters.json`** overlay, which
[tools/build-latam-monsters.mjs](tools/build-latam-monsters.mjs) builds from the same
`mobs.json` — so any id in the feed already gets its pt-BR label for free:
```
node tools/build-latam-monsters.mjs
```
The record's own `name` is only a fallback. If the feed has no pt-BR name for an id,
**report the gap to the user** and use whatever base name the record carries — do not
invent one, derive one from the aegis name, or scrape one from elsewhere. Only write a
pt-BR name into the overlay when the user provides it:
```
node -e "const fs=require('fs');const F='src/assets/demo/data/latam-monsters.json';const o=JSON.parse(fs.readFileSync(F,'utf8'));o['<id>']='<name from user>';fs.writeFileSync(F,JSON.stringify(o));"
```
(Keep `latam-monsters.json` single-line/minified. A label the calc owns rather than
the game — like the per-level Miragem de Amdarais entries — belongs in that script's
`CALC_OVERRIDES`, or the next rebuild will clobber it. See [[no-guessing-translations]],
[[latam-localization]].)

### 4. Apply
```
node .claude/skills/add-ro-monster/apply.mjs <os tmp>/latam-monster-recs.json
```
Appends the records to `monster.json` with a minimal diff (the file is keyed by id;
a full re-stringify would reorder all 450+ entries). It refuses `spawn:"TBD"` (pass
`--allow-tbd` only for a throwaway test) and skips ids already present. New ids land at
the end of the file — fine, the file is keyed, not ordered.

### 5. Verify
- Dev preview recompiles; confirm `✔ Compiled successfully` in its logs.
- The served data has the mobs: `curl -s localhost:4200/assets/demo/data/monster.json`.
- In the calc: the monster/target picker shows the new group (the spawn label) with the
  mobs; selecting one shows the right level/element/race/size/DEF.
- Re-run `extract.mjs <id>` then `apply.mjs` → it should report "already in monster.json".

## Rules & gotchas
- One record per id; `id` + `stats.{elementName,raceName,scaleName}` are required and
  must use the calc's **English** vocab (apply.mjs enforces their presence).
- The source's `race` is dirty upstream — most Formless mobs arrive as the pt-BR word
  `"fantasma"`, and DemiHuman under three spellings. `RACE_NORMALIZATION` in
  `tools/mob-source.mjs` maps them and **throws on an unmapped value**. If it throws,
  add the mapping there after checking what the race actually is; never pass an unknown
  string through.
- `res`/`mres` are not in the source and stay 0 (`monster.ts` defaults them). Don't invent them.
- `element`/`scale`/`race` **numeric** codes are filled for format parity but the calc
  ignores them — the name strings are what matter.
- `mvp` is a strict subset of `boss`: `class: 1` is the boss protocol (MVPs *and*
  minibosses), `mvp: 1` only the MVP subset.
- Keep `spawn` as the real instance map code when known; the grouping label lives in
  monster-spawn-mapper.ts, not in the record.
- An id may **already be in monster.json** — `apply.mjs` skips it. To refresh the stats
  of records already in the file, use `node tools/sync-monster-db.mjs` instead (it never
  adds or removes ids, and it preserves `spawn`).
