---
name: sync-with-ragassets
description: Refresh the calculator's client-derived data (latam-items.json, item-views.json, latam-classes.json, monster.json, latam-monsters.json) from the ragassets /raw tables. Use after a Ragnarok LATAM client update, when an item/class/monster the client already has is missing here, or whenever these files look stale.
---

# Sync the LATAM data with ragassets

Every byte this repo derives from the game comes from **ragassets**, which reads the
client once and republishes the result as public JSON, no auth:

    https://assets.latam-tools.com.br/raw/<table>.json

**This repo never opens a GRF, never decodes a `.lub` and never calls an upstream API.**
It used to (`build-latam-db.mjs`, `build-item-views.mjs`, `grf.mjs`, `lua51.mjs`) — that
code is gone, along with its requirement of a local client install. If a value is wrong
or missing, the fix belongs upstream in ragassets, not here.

## The tables and what they feed

| /raw | script | generated file |
|---|---|---|
| `items.json` | `tools/sync-latam-db.mjs` | `latam-items.json`, `item-views.json` |
| `jobs.json` | `tools/sync-latam-db.mjs` | `latam-classes.json` |
| `mobs.json` | `tools/sync-monster-db.mjs` | `monster.json` (stats only) |
| `mobs.json` | `tools/build-latam-monsters.mjs` | `latam-monsters.json` |
| `status.json` | — | queried by hand (EFST ids; see `review-rrf-class`) |

All of them land in `src/assets/demo/data/`. What the browser actually downloads is built
from those by `tools/build-web-data.mjs` (`pnpm data:dev`), which is a separate step.

## Procedure

```bash
node tools/sync-latam-db.mjs        # items + views + classes
node tools/sync-monster-db.mjs      # stats of monsters already registered
node tools/build-latam-monsters.mjs # pt-BR name overlay
git diff --stat src/assets/demo/data/
pnpm test && pnpm build
```

Then **read the diff before committing** — it is the whole point of the exercise. A client
update should show up as a handful of new items and a few corrected fields. If it shows up
as "everything changed", something is wrong with the source or the transform; do not commit
it. The two `sync-*` scripts take `--dry` to report without writing (`build-latam-monsters.mjs`
doesn't — it always writes, so look at its diff afterwards).

All three take `--src` for an offline run: a ragassets checkout's `resources/raw` directory
(the monster scripts also accept the `mobs.json` path itself).

```bash
node tools/sync-latam-db.mjs --src ../ragassets/resources/raw --dry
```

## Gotchas

- **`latam-items.json` and `item-views.json` do not have the same scope.** ~640 items ship
  a sprite but no display name. `latam-items` skips them, because a key there means "exists
  on LATAM" and drives `presentInLatam`; `item-views` keeps them, because the paper-doll
  draws by id and a missing name says nothing about the sprite. Two files, one input, two
  filters — don't "fix" the inconsistency.
- **`aegisName` falls back to `resourceName`.** ragassets only knows the real item_db aegis
  name for items `itemmoveinfov5.txt` covers; the rest fall back to the client resource
  name, which is often Korean. That is expected, and `add-ro-item` prints it as-is.
- **`slots` is omitted when 0**, matching the file's minimal style. `add-ro-item`'s scaffold
  reads `lt.slots != null`, so an omitted 0 correctly means "no slot".
- **`sync-monster-db.mjs` rewrites `monster.json` in its original key order** (it scans the
  file for the order instead of re-stringifying the object). The file is keyed, not sorted;
  a plain `JSON.stringify` would reorder all 458 records and bury the real change. Never
  replace that writer.
- **`item.json` is hand-maintained and is NOT generated.** No sync script touches it —
  `add-ro-item` appends to it as raw text. Adding a new item is that skill's job, not this
  one's.
- **`sync-monster-db.mjs` never adds or removes ids**, because a new monster needs a
  hand-set `spawn`. Use `add-ro-monster` for that.

## Publishing

The data files are committed. If the sync changed anything users would notice, bump
`version` in `package.json` and add the matching entry to the `updates` array in
`src/app/layout/app.topbar.component.ts` (the deploy workflow posts to Discord on a version
change — check it with `node tools/post-novidades.mjs --dry-run`).
