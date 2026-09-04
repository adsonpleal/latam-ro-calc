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

The whole codebase was swept to English on 13/08/2026 — there is no pt-BR prose left in
comments or test names, and no backlog to work through. Keep it that way: this is not a
convention to match against surrounding code, it is the rule for every file.

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

## Hosting: Cloudflare, not Firebase

Site deploys are automatic — a push to `main` runs `.github/workflows/deploy.yml`, which
builds and publishes to **Cloudflare Workers static assets** serving `dist/sakai-ng`.
Static asset requests are free and unlimited; that is why hosting left Firebase on
23/08/2026, with its 10 GB/month egress quota exhausted.

There is **one** Worker script (`worker/index.ts`) and it runs on **two routes**, named by
`run_worker_first: ["/s/*", "/mcp", "/mcp/*"]` in `wrangler.jsonc`. That array form is not
what the old "never add `run_worker_first`" warning was about: the **boolean** form puts
every request on the Worker, and a 429 once the request budget is spent would mean the
homepage itself stops loading. With an array, every path not listed still takes the free
asset path and never invokes it. The entry is required rather than optional, because the
compatibility date activates `assets_navigation_prefers_asset_serving`, under which a
browser navigation is answered from assets before the Worker sees it while a crawler
(no `Sec-Fetch-Mode: navigate`) is not — so without it a person and a crawler would get
different documents.

The first route exists for the **social share preview**. A build token used to ride in the
URL fragment (`#/?b=…`), which browsers never send anywhere, so every shared link
previewed as the same static card. Share links are now `/s/<token>/`; the Worker serves the
real `index.html` with the Open Graph tags rewritten for that build and proxies the card
image from `/s/<token>/og.png`. Both old forms still load — `readShareToken` in
`src/app/core/share-path.ts` is the single grammar the app, the MCP server and the Worker
all read, and the trailing slash on the canonical form is deliberate (a token can end in
`.`, which chat clients strip as sentence punctuation).

The **card itself is rendered by [latam-social](https://github.com/adsonpleal/latam-social)**,
a separate service at `social.latam-tools.com.br` on the same EC2 box — not by the Worker
(free-plan Workers cap CPU at 10 ms per request and rasterizing 1200×630 costs 50–150 ms)
and no longer by this repo's MCP server. Nothing about the card lives here any more except
the Worker that consumes it and `src/assets/og-cover.{svg,png}`, which is **vendored**: it
is the fallback the Worker serves when latam-social is unreachable, so it has to be a
static asset on Cloudflare rather than a request to the thing that is down. Refresh it with
`curl https://social.latam-tools.com.br/ro-calc/cover.png -o src/assets/og-cover.png`.

**Cache policy lives in `src/_headers`**, which `ng build` copies to the build root via the
`assets` array in `angular.json` (three copies of it — keep them in sync). Read the comment
at the top of that file before touching it: Cloudflare applies **every** matching rule and
comma-joins repeated headers, so the patterns must stay mutually exclusive and there must
never be a `/*` catch-all. `tools/cache-headers.spec.ts` holds the line, including an
overlap check against a real build. No deploy ever needs a cache purge — everything heavy
is content-hashed, so a new build means new URLs.

`tools/cloudflare-audit.mjs` checks the zone and exits non-zero on findings — run it after
any DNS change. It is **read-only**: the settings it inspects are one-time dashboard
toggles, and DNS records are Cloudflare-managed once a Workers Custom Domain is attached,
so there is nothing here worth scripting a write path for.

The audit exists mainly for one trap. **Universal SSL covers the apex and `*.zone` only —
not `*.*.zone`.** Proxying a subdomain two levels deep breaks TLS outright, because
Cloudflare has no certificate to present; the visitor gets a handshake failure rather than
a warning. `mcp.simulador.latam-tools.com.br` hit exactly this when the nameservers moved
on 23/08/2026, and it is why the MCP server could not simply keep its hostname when it
moved to Workers on 04/09/2026: a Workers Custom Domain needs a proxied record, and there
is no certificate for a name two labels deep. It went to `simulador.latam-tools.com.br/mcp`
instead, which is one label and therefore covered. **Anything deeper than one label below
the zone must be DNS-only** — an Advanced Certificate would lift the restriction, at more
per month than the Workers plan costs.

The second route is the **MCP server**, which until 04/09/2026 was a Node process on EC2
behind Caddy. It is the same code (`mcp/src/**`) reached through `worker/mcp/handler.ts`,
which swaps the `node:http` server for the SDK's `WebStandardStreamableHTTPServerTransport`
— stateless, one `McpServer` per POST, exactly as before. Three things about it are
load-bearing and easy to break:

- **The import is dynamic.** `worker/index.ts` does `await import('./mcp/handler')`, and
  `tools/build-worker.mjs` runs esbuild with `splitting: true` so that becomes a separate
  chunk. The engine costs ~190 ms to evaluate against a 400 ms **startup CPU** budget, so a
  static import would risk the whole script — and would make every crawler hitting a cold
  `/s/<token>/` pay for the damage engine. The entry chunk is ~3 KB; the engine is ~1,7 MB.
- **The pre-bundle is not optional.** `wrangler.jsonc`'s `main` points at
  `dist/worker/index.js`, not at the TypeScript, because 36 files under `src/app` import
  each other through the `src/*` alias and wrangler's own esbuild pass does not honour a
  tsconfig baseUrl. `worker/tsconfig.json` supplies that alias *and* the `environment` →
  `environment.prod.ts` swap; the build greps its own output to prove the swap applied,
  because nothing else would notice.
- **Config comes from `env`, not `process.env`,** and `initConfig` runs per isolate before
  any request. Anything that reads `config` at module-eval time freezes the default — the
  two search schemas in `mcp/src/tools/discovery.ts` are factories for that reason.

There are deliberately **no cache rules and no tiered cache** on this zone: with the assets
served by Cloudflare itself there is no origin to shield, and `src/_headers` is the single
source of cache truth.

The Firebase project `simulador-latam-ro` still exists and its Hosting site is still
deployed, kept as a rollback target. Its Firestore config left this repo on 23/08/2026 —
the retired `replay_submissions` collection is deny-all and will not change, so there was
nothing left to publish from here. Manage it in the Firebase console if it ever needs to.

This project's own Firestore no longer receives anything. The `.rrf` recordings from the
"Ajude o simulador" dialog now go to the shared issue tracker (project
`issues-latam-tools`), and the retired `replay_submissions` collection is kept read-only
as history.

**Recordings are triaged as cards, on the board with everything else.** A submission lands
in the tracker's private `gravacoes` inbox and is promoted — from `/admin/gravacoes` — into
a `tipo: "replay"` card in `backlog`, with the `.rrf` attached inline. Promotion is what
publishes; it is a decision taken on the tracker, by hand. From this repo the queue is read
with the `triage-backlog` skill, which owns replay cards like any other card and hands over
both halves: `--get <id>` prints the recording's block (class, level, map, duration and the
talent allocation), `--anexos <id> --out <path>` writes the `.rrf` to disk for
`review-rrf-class`. There is no longer a skill that reads the inbox directly.

## Tests

`pnpm test` runs the whole suite (Vitest, ~20s). Logic tests sit next to the code
(`src/**/*.spec.ts`); the engine lives in `src/app/core/` behind an ESLint boundary. The
`pre-push` hook (`.githooks/pre-push`, wired by the `prepare` script) runs the tests and
blocks the push if anything fails.

**A spec's file name says what it tests, not where the work came from.** Name it after the
subject — `wolf-poe-combo.spec.ts`, `card-bonus-registration.spec.ts`, `size-resistance.spec.ts`
— so that finding the tests for a piece of behaviour is a matter of reading the file list.
Never name a spec after its provenance or the date it was written. A month bucket turns into
a grab-bag of unrelated items, and the tests for one item end up wherever that item happened
to be reported: four such files existed (`backlog-2026-08`, `bug-reports-2026-08`,
`missing-cards-2026-08`, `latam-items-2026-08`) and were split by subject on 17/08/2026,
which is the last time that should be necessary. When a fix comes out of the backlog or a
report, put its tests in the file named after the thing being fixed (creating it if need be),
and record the tracker card in a comment — that is what comments are for.

## Item data

`src/assets/demo/data/item.json` is the item source; `latam-items.json` carries the pt-BR
name and description.

> **The browser no longer reads those files.** `tools/build-web-data.mjs` merges the two
> at build time and emits `src/assets/data/` (not in git). After editing `item.json`, run
> `pnpm data:dev` — or restart `pnpm start`, which already runs it — otherwise the change
> never reaches the screen. `pnpm build` runs the generator with `--hash` and then
> `tools/inject-data-manifest.mjs`, which injects the hashed names into `index.html`.
> The MCP server reads these generated files too, through the Worker's ASSETS binding —
> plus two sidecars the browser ignores (`latam-extra`, `latam-monsters`) and its own
> description map (`items-desc-mcp`). A field the MCP needs out of `item.json` just stays
> in `items-core` rather than getting a sidecar of its own.
> `mcp/src/data/derived-parity.spec.ts` is what keeps the derived set equivalent to the raw
> one; it pins the index at 17081 items, the same number the retired EC2 server reported.

When registering bonuses and set combos, the **pt-BR description is the source of truth**
— `latam-items.json` is for resolving *ids*, not for deciding the effect. Format details
in [`docs/item-json.md`](docs/item-json.md); to add items, use the `add-ro-item` skill.

### Combos are matched by id, never by name

Write a combo partner as `EQUIP_ID[<id>]`. **Never write `EQUIP[<nome>]` in a record you
are adding or editing** — it is the legacy form, it resolves through the item's English
`enName`, and it fails in two ways at once:

- a pt-BR rename or a `[Apoio]`-style suffix silently stops the bonus paying;
- **the client re-issues items under new ids keeping the old English name**, so one
  `EQUIP[...]` fires for every generation of that item whether or not you meant it to —
  and, worse, the reverse trap: converting such a clause to a *single* id silently drops
  the other generation. When a partner has been re-issued, name them all:
  `EQUIP_ID[310328||1000378]`. Same grammar as `EQUIP[]` — `&&` all required, `||` any-of,
  with `&&` binding first.

The same holds for the other name-matched tokens: prefer `SKILL_ID[...]` and
`ACTIVE_SKILL_ID[...]` over `LEARN_SKILL[...]` / `ACTIVE_SKILL[...]`.

`item-script-keys.spec.ts` ratchets this: the count of records still on `EQUIP[<nome>]`
may only fall, and the Visual-enchant stone family (subtypes 71-76) must stay at zero — it
was migrated wholesale, 159 records and 330 clauses. When you migrate another family,
**record a behavioural baseline first and assert it unchanged afterwards**; each partner
generation needs a case of its own, because that is precisely what a careless rewrite
loses. `costume-enchant-combo-migration.spec.ts` is the worked example.

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
- `skills.json` — `{id, name, maxLevel, description, delay}` for every skill the client
  knows, with the raw pt-BR text (`^RRGGBB` codes and line breaks preserved, same as
  `items.json`). This is where a new entry in `src/app/skills/skill-meta.generated.ts`
  comes from — that catalog is hand-maintained, so **do not** extract from the GRF and do
  not ask the user to paste the text. The pt-BR description is the source of truth for the
  effect, outranking divine-pride and the Sigma blog, which disagree with each other and
  with LATAM.
- `delay` is the game's own **Conjuração / Espera** window (`castFixed`, `castVariable`,
  `afterCast`, `cooldown`, per level, in ms) — the four numbers `AtkSkillModel` keeps as
  `fct`, `vct`, `acd`, `cd` in seconds. `tools/build-skill-delays.mjs` mirrors it into
  `skill-delay.json` and `src/app/skills/skill-delay.spec.ts` holds every class to it, so
  these are never typed from a blog. See the `review-rrf-class` skill, §8.
- To **add** a monster use the `add-ro-monster` skill; for an item, `add-ro-item`.
