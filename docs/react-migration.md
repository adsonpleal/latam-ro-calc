# React migration and dependency modernization

The production entry now boots the client-rendered React application. Calculation
orchestration lives in a TypeScript session subscribed with `useSyncExternalStore`;
mutable engine instances and services are owned outside rendering. The engine,
URLs, saved formats, storage keys and backend contracts are retained. Angular, RxJS,
Zone.js and tslib have been removed. Final validation results are recorded below.
Nothing has been deployed.

## Baseline

Baseline commit: `a7ce5527`, Windows, Node 22.16, Chrome, pnpm 11.7.0.
The original suite passed 320 files / 6,444 tests, the production web/Worker build
passed, and all 27 existing Playwright tests passed against unchanged screenshots.
Logs are local under `.tmp/react-baseline-*.log`.

## Implemented

- React 19.3.0 with matching DOM and type packages, pinned exactly.
- Stable external-store snapshots, disposal and protection from stale async results.
- Cached dataset promises that adopt production preloads, delay descriptions until
  core items arrive, preserve custom descriptions and allow failed loads to retry.
- React buttons, inputs, checkboxes, switches, cards, tags, chips, segmented controls,
  selectors, multiselects, cascades, virtual lists, dialogs, toast and confirmation UI,
  tables, accordions, listboxes, blocking, tooltips, popovers and pointer reordering.
- React stat inputs, equipment chips, damage values, elemental tables, battle effects,
  monster cards and attack-speed charts. Existing host elements and feature CSS
  scopes are retained. The attack-speed geometry remains framework independent.
- Comparison equipment preparation is shared plain TypeScript, including hidden
  off-hand picks, custom attachments, ammo/converters, loyalty and character fields.
- Shared application services are supplied through React context, created outside
  rendering. Custom items use the original library and storage format.
- The replay submission client is framework independent. Its atomic metadata/file
  write, server timestamps and errors are covered with mocked requests.
- Portals with the existing positioning algorithm, explicit feature scopes, nested
  Escape ordering, descendant dismissal, scroll locks and focus restoration.
- An allowlist sanitizer for rich descriptions; executable markup, event handlers,
  unsafe links and inline styles are removed.
- Read-only source checks recognize TSX and reject React imports in engine/Worker/MCP
  boundaries. React source has an independent type configuration.
- Worker production checks remain free of Node types. Node-based backend tests are
  checked separately, retaining the existing backend test coverage.
- The Vitest configuration uses `.mts` for unambiguous ESM loading.
- Dependency measurements support pnpm 12's multiple-document lockfiles and count
  unique versions across both application and package-manager definitions.
- Shared monster-card styles apply in the standalone auto-cast section as well as
  the battle HUD. Calculator description-list icon positioning stays within its
  own rows so custom-item modal headers and previews retain inline icons.
- Overlay pointer triangles are removed from popovers and tooltips, including
  rich item descriptions, as a requested design change after the migration.

The React fixture in `e2e/fixtures` is bundled into memory and served by Playwright
request interception. It is not a product route or part of the production bundle.
The thirteen control browser tests run under Strict Mode and exercise falsy controlled values,
filtering, focus, nested Escape, virtualization, disabled options, cascades, parent
unmount cleanup, sanitization, a confirmation pending before mount, tooltip/popover
cleanup, pointer reordering/cancellation, stat badges, delayed item descriptions,
damage comparisons and attack-speed markers/captions.

## Dependency versions

Versions were resolved from npm's stable `latest` tags on 2026-10-01. Vite is an
explicit required peer of Vitest, not the application build/dev server.

| Package | Baseline | Current |
| --- | --- | --- |
| react / react-dom | absent | 19.3.0 |
| @types/react / @types/react-dom | absent | 19.3.0 |
| rrfparser | 1.3.0 | 1.4.0 |
| @cloudflare/workers-types | 5.20260822.1 | 5.20261001.1 |
| @modelcontextprotocol/sdk | 1.29.0 | 1.31.0 |
| @playwright/test | 1.63.0 | 1.63.0, exact pin |
| @types/node | 22.20.1 | 26.6.3 |
| vitest / @vitest/coverage-v8 | 2.1.9 | 5.0.3 |
| esbuild | 0.28.1 | 0.28.2 |
| vite | transitive 5.4.21 | explicit 8.3.2 |
| zod | 4.4.3 | 4.6.5 |
| wrangler, separate tooling | 4.128.0 | 4.145.0 |
| pnpm, both manifests and CI | 11.7.0 | 12.8.1 |
| typescript | 5.1.6 | 7.0.2 |

TypeScript 7 uses its native compiler and native API for source checks. The web
build compiles TSX directly with esbuild and the automatic JSX runtime; Angular
compilation/linking and obsolete Angular peer exceptions are removed. Required
peers remain explicit with `autoInstallPeers: false`.

## Measurements

Clean frozen installs used separate directories under `.tmp`, with scripts ignored
in both cases. Bytes count logical files, excluding symlinks, pnpm store and browser
downloads; an existing root installation is not a comparable clean measurement.

| Measurement | Baseline | React cutover |
| --- | ---: | ---: |
| Direct runtime packages | 10 | 3 |
| Direct development packages | 10 | 12 |
| Unique locked versions | 328 | 242 |
| Clean install bytes | 188,395,059 | 139,326,262 |
| Production web JS + CSS bytes | 3,550,422 | 3,324,024 |

The clean install is 26.0% smaller and production web JS/CSS is 6.4% smaller than
the baseline. Counts include every emitted JS/CSS file, including duplicate CSS
chunks; source maps, data, browser downloads and pnpm store files are excluded.
Wrangler remains a separate install. The upgraded MCP SDK increases the Worker
handler chunk from approximately 1,272 KiB to 1,401 KiB.

## Workflow and persistence compatibility

The React screens include stats, equipment and comparisons, slot colors, battle
rotation/details, consumables, item search, custom items, saves, share links,
replay file/link imports and submission, help, MCP instructions and changelog.
Native history captures historical share entry before URL normalization.

Retained storage includes `ro-set`, `ro-set-compare`, `ro-saves`, `ro-custom-items-v1`, `ro-color-labels`, `ro-color-seen`, `ro-shop-server` and target
`monster` selection and `monsterRelieve`. Existing parsers/validators and share codecs remain the source
of truth. Legacy appearance preferences are preserved but ignored as before.

Calculator timers retain the original debounce intervals (100/250/300 ms), preset
load ordering and delayed descriptions. View lifetimes own callbacks/timers;
overlays preserve nested Escape, hover grace, keyboard focus, scroll locks and
pointer/touch reordering. Rich descriptions use the shared DOM allowlist sanitizer.

## Final validation

- Full Vitest suite: 329 files, 6,468 tests passed, including engine, replay,
  Worker/MCP contracts and migrated control assertions.
- Vitest 5's V8 coverage provider passed the same full suite: 93.89% lines,
  92.11% statements, 85.40% branches and 91.95% functions in the configured
  engine/domain/utils/replay coverage scope.
- Native TypeScript checks: web, React, Worker and backend tests passed.
- Source checks: 760 TypeScript/TSX files passed; no framework imports cross
  engine/Worker/MCP boundaries or enter React from the removed framework.
- All 27 original browser tests passed against the development build. All 17
  original visual references are unchanged, with the original 0.001 tolerance.
- All 41 browser tests passed against the production assets: the original 27,
  13 React control/Strict Mode fixtures and the full React application fixture.
- Three additional layout regressions cover the standalone auto-cast card at
  desktop and narrow viewports and custom-item library/editor icon placement.
  Production Angular comparison confirmed the same monster-card dimensions and
  existing horizontal overflow on narrow screens.
- Root and isolated Cloudflare frozen installs passed; clean root measurement
  recorded above. Angular/RxJS/Zone.js/tslib are absent from the root lock graph
  and production web metafile.
- Production web/data/Worker builds and restored component-style/initial-bundle
  budgets passed. A total JS/CSS gate also enforces the Angular baseline ceiling.
- Development compile-error recovery passed: the last good generation remained
  available, then exact source restoration rebuilt successfully.
- Wrangler deployment dry run passed without publishing.

Validation logs and detailed measurements are local under `.tmp/react-*.log`
and `.tmp/react-*-metrics.json`. The source map and duplicate CSS outputs are
left in their existing output structure. The optional Cloudflare toolchain is
isolated from the three runtime dependencies. No deployment or publication occurred.

The separate Wrangler lock retains optional `@emnapi/runtime` → `tslib` from
Wrangler's own toolchain. It is absent from the application lock, runtime graph,
and browser bundle; removing that optional tooling edge would modify Wrangler's
declared dependencies rather than migrate an application consumer.
