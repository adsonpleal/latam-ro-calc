# Notes for agents

## Language: code in English, content in pt-BR

**Everything you write in this repo is English** — code, comments, JSDoc, test names,
commit messages, and the docs under `.claude/` (this file included).

**pt-BR is for content only**: strings the user reads (UI labels, changelog/Novidades
entries, toast and error messages) and the game data itself (item, skill and monster
names and descriptions). Do not mix the two languages in prose.

Naming a skill or item inside an English sentence is fine and expected — "Fúria Estelar
only applies to Large targets" is English with a proper noun in it. Quoting a chunk of
pt-BR client text inside an English comment is fine too; put it in `"quotes"` or
`` `backticks` ``.

`src/app/code-language.spec.ts` enforces this on every `pnpm test` (and therefore on
`pre-push`). It scans comments and test names for Portuguese function words and fails
with the file, line and offending word. It carries a `LEGACY` allowlist of files that
predate the rule — **that list only shrinks**. If a file you touch is on it, translate
the file and drop its line; never add a new entry.

```bash
npx vitest run src/app/code-language.spec.ts -t backlog   # what is left to translate
```

## Environment: local, no Docker

This project runs **locally with Node + pnpm**. The Docker setup was **removed** (it ate
too much memory on the author's machine). Do not recreate `Dockerfile`,
`docker-compose.yml` or `nginx.conf`, and do **not** run `docker compose ...` or
`docker exec ...` here — there is no container for this project.

```bash
pnpm install    # once (or when deps change)
pnpm start      # dev server at http://localhost:4200
pnpm test       # Vitest (full suite)
pnpm build      # production build
pnpm lint       # ESLint --fix
```

- **Node 22** (v22.16 in use) + **pnpm 11**. Angular 16.
- The package manager is **pnpm** — do not use `npm install` here. It breaks with
  `EUNSUPPORTEDPROTOCOL workspace:*` when reading the pnpm store, and produces a
  `package-lock.json` that does not belong to the project. The project's lockfile is
  `pnpm-lock.yaml`.
- **All pnpm configuration lives in `pnpm-workspace.yaml`.** pnpm 11 ignores both the
  `"pnpm"` field in `package.json` and the equivalent keys in `.npmrc`. Two settings are
  required and are already there:
  - `allowBuilds` (esbuild, `@parcel/watcher`, nx) — without it `pnpm install` ends in
    `ERR_PNPM_IGNORED_BUILDS` and `ng build` breaks for want of the esbuild binary;
  - `publicHoistPattern: ['@babel/*']` — the Angular 16 build resolves `@babel/runtime`
    by absolute path at the root of `node_modules`, which pnpm's strict layout does not
    provide; without it the dev server fails with
    `Can't resolve '.../@babel/runtime/helpers/esm/asyncToGenerator.js'`.
- After changing those settings, delete `node_modules` before reinstalling — pnpm answers
  "Already up to date" and does not rebuild the links.
- To open the preview in chat, use the `ro-calc-dev` configuration from
  `.claude/launch.json` (`preview_start` with `{name: "ro-calc-dev"}`), which runs
  `pnpm start`. Never start a server directly through `Bash`/`PowerShell`.

> `pnpm start` is `ng serve --hmr`, which uses **webpack**, not esbuild/Vite. That is
> deliberate: esbuild's WebSocket HMR does not cross the preview proxy and the page never
> renders. `ng build` still uses esbuild normally.

## Firebase

Site deploys are automatic (GitHub Actions → Firebase Hosting, project
`simulador-latam-ro`). What is **not** automatic are the Firestore rules and indexes —
the hosting action does not publish them. After touching `firestore.rules` or
`firestore.indexes.json`:

```bash
firebase deploy --only firestore
```

Firestore only holds the `.rrf` recordings submitted by the community (collection
`replay_submissions`, fed by the "Ajude o simulador" dialog). The browser **only writes**;
to read, use the `triage-rrf-uploads` skill, which authenticates as an administrator.

## Tests

`pnpm test` runs the whole suite (Vitest, ~20s). Logic tests sit next to the code
(`src/**/*.spec.ts`); the engine lives in `src/app/core/` behind an ESLint boundary. The
`pre-push` hook (`.githooks/pre-push`, wired by the `prepare` script) runs the tests and
blocks the push if anything fails.

## Item data

`src/assets/demo/data/item.json` is the item source; `latam-items.json` carries the pt-BR
name and description.

> **The browser no longer reads those files.** `tools/build-web-data.mjs` merges the two
> at build time and emits `src/assets/data/` (not in git). After editing `item.json`, run
> `pnpm data:dev` — or restart `pnpm start`, which already runs it — otherwise the change
> never reaches the screen. `pnpm build` runs the generator with `--hash` and then
> `tools/inject-data-manifest.mjs`, which injects the hashed names into `index.html`.
> The MCP server still reads the raw files from `src/assets/demo/data/`.

When registering bonuses and set combos, the **pt-BR description is the source of truth**
— `latam-items.json` is for resolving *ids*, not for deciding the effect. Format details
in [`docs/item-json.md`](docs/item-json.md); to add items, use the `add-ro-item` skill.

## Client-extracted data: everything comes from ragassets

All game-file reading lives in the **ragassets** project, which publishes the result as
public JSON, no authentication:

    https://assets.latam-tools.com.br/raw/<table>.json

**This repository only downloads those files.** Never open a GRF, never decode a `.lub`
and never call the RagnaPlace API from here — if a piece of data is missing, ragassets is
where it gets generated. The step-by-step (when to run it, how to check the diff) is in
the `sync-with-ragassets` skill.

- `tools/raw-source.mjs` — the base URL and the table reader (with `--src` to run offline
  from a local copy).
- `tools/sync-latam-db.mjs` — rebuilds `latam-items.json`, `item-views.json` and
  `latam-classes.json` from `items.json` + `jobs.json`.
- `tools/mob-source.mjs` — reading `mobs.json`, field mapping, race normalisation and the
  null policy. Start here for monsters.
- `tools/sync-monster-db.mjs` — updates the stats of records that already exist in
  `monster.json`. It never adds or removes ids, and it preserves `spawn` (kept by hand:
  the source has no spawn map).
- `tools/build-latam-monsters.mjs` — generates the pt-BR name overlay
  (`latam-monsters.json`) from the same `mobs.json`.
- `skills.json` — `{id, name, description}` for every skill the client knows, with the raw
  pt-BR text (`^RRGGBB` codes and line breaks preserved, same as `items.json`). This is
  where a new entry in `src/app/skills/skill-meta.generated.ts` comes from — that catalog
  is hand-maintained, so **do not** extract from the GRF and do not ask the user to paste
  the text. The pt-BR description is the source of truth for the effect, outranking
  divine-pride and the Sigma blog, which disagree with each other and with LATAM.
- To **add** a monster use the `add-ro-monster` skill; for an item, `add-ro-item`.
