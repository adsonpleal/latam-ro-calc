# Continue mobile/tablet responsiveness in a new instance

This is the implementation/orchestrator handoff, **not** the blind evaluator prompt.

Repository: `adsonpleal/latam-ro-calc`.
Branch: `codex/mobile-tablet-responsiveness` (draft PR).
Original application revision: `1e5bd8a28365b211fef59a614300ae28bd7f97fd`.
Issue: https://issues.latam-tools.com.br/?card=k5crHdaf9nJWGtGvpbUx.

Read applicable `AGENTS.md`, `docs/mobile-responsiveness-plan.md`,
`docs/mobile-responsiveness-loop-prompt.md`, and
`.agents/skills/evaluate-responsive-ui/SKILL.md`. Follow the full loop controller;
this document does not replace or weaken it. No applicable `AGENTS.md` existed
when this handoff was created.

## State of the work

Responsive shell, compact component layouts and input-aware touch information,
target sizing, virtual-list rows, nested overlay dismissal, scroll locks and
rotation alternatives are implemented. Full-desktop fine-pointer defaults,
design tokens, original snapshots and calculations were preserved.

The current immutable, evaluated candidate is
`candidate-003-533b05a5fba96440`, with 90 served resources and digest
`70e4679e6288b28accb9920ca81938f1c1ddd9b960e4ba1a1668047885478563`.
The separate immutable original is `baseline-1e5bd8a-original`, with 90 resources
and digest `b8654f2d99a95c3af87b3c09ac5112527c29b0342154bdfd229b95a880019992`.

The final independent evaluation is **INCOMPLETE/blocked**. Desktop, tablet and
mobile grades are withheld. All 464 frozen checks remain required: eight had
partial observations and 456 were unrun in the final evaluation. No reproducible
candidate-specific defect was established in that limited batch. This is not
acceptance. The report checker exited 1.

Typecheck, lint, production build, 6,580 unit tests in 342 files and 65 unique
browser tests passed on the candidate 003 application. These include nine
unmasked byte-identical original/candidate desktop regression comparisons.
Complete independent desktop preservation is still unestablished: the evaluator
recorded an unresolved 58-pixel initial-state difference in its own captures.
Do not substitute implementer tests for independent grading.

The PR also contains this handoff and a release fragment required by
`docs/releases.md`. These and a CSS trailing-blank-line cleanup were added after
candidate 003 was frozen. Rebuild and
establish a new current source/build identity before final acceptance; the tested
candidate 003 identity must not be relabeled as the PR head. Never edit shared
versions/history or run the release coordinator locally.

Upstream `main` had advanced to `1397997ad36567ff2fdd1569270f4db01a8fc76b`
(Monarch Tomb enchantments and release 0.1.167) when the handoff was created. This
branch retains the original application base; it does not revert upstream changes
in the PR's three-dot diff. Preserve the original baseline if integrating newer
main. Any integration requires fresh checks and independent evaluation of the
resulting build. Do not silently replace references to resolve comparison changes.

## Transfer the ignored checkpoint

The PR does **not** contain `.scratch/` or `.tmp/` artifacts. The old chat provides
`responsiveness-checkpoint.tar.gz` and, if needed for upload limits, numbered parts
under `.scratch/responsiveness/handoff/`. The committed
`docs/mobile-responsiveness-handoff-manifest.json` records archive/part SHA-256
hashes and byte counts. Use that trusted manifest to verify the transferred bytes.

If the archive is attached through a Sediment file ID, use `download_file`; files
larger than 32 MiB need the supplied parts. Download each part, verify its recorded
hash/length, concatenate in manifest order, then verify the complete archive hash.
For an attachment with a local `workspace_path`, read it directly. Do not assume
old-instance absolute paths, PIDs or files exist in the new instance.

The archive contains all original baseline references/fixtures/frozen contracts,
the original discovery trace, initial original tree archive, both immutable build
outputs, the final evaluator report/screenshots/traces, and the ignored helpers and
checkpoint. It intentionally excludes dependency directories and historical
candidate iterations that are unnecessary for current-build acceptance.

Inspect archive member paths before extraction. They must stay within the listed
`.scratch/responsiveness/` and `.tmp/responsiveness/` paths and contain no traversal.
Extract into the repository root with `--no-same-owner --no-same-permissions` only
after confirming it will not overwrite a different existing baseline or user work.
Then make the original artifacts/output read-only again. Keep candidate 003 output
immutable for its archived evidence; use a new output directory for the next build.

Run `node .scratch/responsiveness/check-frozen.mjs`: all 544 original frozen files
must match. Also verify the supplementary original discovery trace and invalid
fixture hashes against their contracts. Never regenerate, remove, or replace the
frozen original screenshots/matrix/fixtures to make acceptance pass.

If the transfer is unavailable, stop with an exact resumable blocker. Do not
substitute a fresh baseline without the user's explicit instruction.

## Access and browser configuration

The old instance allowed package-manager destinations but excluded
`assets.latam-tools.com.br` and `issues.latam-tools.com.br`; real proxy requests to
both returned CONNECT 403. The user has changed environment settings and is moving
to a new instance because the old one retains its old policy. Inspect the new
runtime network policy/readiness and test actual access through the inherited
proxy with TLS verification enabled. Do not bypass restrictions.

Original character/item/skill images failed with
`ERR_TUNNEL_CONNECTION_FAILED`. The original weapon icon chooser displayed
“Nenhum ícone nesta seleção.” No populated icon-selection fixture was established;
its cause was not independently proved. Establish that state in the original
**public UI** once access works. Reconcile additional issue details when the card
becomes accessible. Append genuine neutral fixture data/requirements and hashes
when necessary; keep all existing requirements and original references.

Install identical frozen `baseline/browser-fixtures.mjs` setup on both builds.
Only two genuine image fixtures are supplied; do not fabricate the remaining
imagery, replace sprites with collection illustrations or hide unavailable UI.
Firestore submission is fulfilled locally and unmatched external POST requests
are guarded; no real replay submission or public short link is authorized.

Minimum frozen support: real Chromium with verified native touch,
`hasTouch:true`, `(hover:none)`, `(pointer:coarse)` and positive maxTouchPoints;
pt-BR, America/Sao_Paulo, dark theme. Old Chromium was 151.0.7922.173 at
`/usr/bin/chromium`. WebKit/physical devices are not required in the frozen matrix;
software keyboard, browser chrome and safe-area behavior remain unverified.
Read the transferred browser support and capture diagnostic files. Full-page
screenshots reset touch emulation in the old Chromium/Playwright combination;
use viewport captures and native swipes and verify input before/after every action.

If the new browser/platform/fonts differ, preserve the old references and append
matched original/candidate browser evidence recording that environment. Do not
claim platform differences explain a desktop change without evidence.

## Resume the complete loop

1. Restore and verify the transfer, and inspect the existing user changes before
   editing. Read `.scratch/responsiveness/RESUME.md` and `checkpoint.json` as the
   implementer. Never send those implementation/history notes to the evaluator.
2. Serve the restored original output on `http://127.0.0.1:4201` using the archived
   `serve-static.mjs`; never rebuild it. Start candidate 003 on 4200 only if needed
   to reproduce archived observations. Verify expected served bytes in a real
   browser, not only a supplied build ID.
3. Establish genuine original image/icon data access; investigate the unnamed
   automatic-icon/native-swipe observation and unresolved desktop capture
   difference. Complete available but unrun branches separately from data blockers.
4. Run appropriate type/lint/unit/build/browser checks on the PR head and any fixes.
   Record dirty tracked/untracked application source identity. Build a new candidate
   output, run `build-contract.mjs` before freezing it, and serve that immutable
   output on 4200. Stop edits/rebuilds during evaluation. Preserve original 4201.
5. Spawn a **NEW evaluator with `fork_turns:"none"`** for every new evaluation.
   Fill `references/evaluator-prompt.md` with only the evaluator skill/resources,
   numeric breakpoints, neutral frozen feature/fixture/matrix contract, browser/test
   data, URLs/build IDs, expected served hashes and a fresh output directory.
   Never provide app source/tests/diffs/history/this handoff/plan/prior reports or
   developer explanations. Only that fresh evaluator grades.
6. Require every frozen matrix check and all retained workflow branches on the
   same final build: 19 families across 16 profiles, 82 separate sweep checks and
   78 separate breakpoint checks. Mobile <768, compact/tablet 768–1535, desktop
   >=1536. Breakpoint numbers are in the frozen matrix. No desktop-open-then-shrink
   trick, synthetic touch events or inferred intermediate passes. Require inspected
   screenshots, target-edge tests, scrolling/overlay/dismissal evidence, visual
   viewport offsets during native swipes and served-hash verification before/after.
7. Independently run `check-report.mjs REPORT.json CURRENT_BUILD_ID MATRIX.json
   CANDIDATE_CONTRACT.json` and verify frozen matrix/fixture/reference hashes. Fix
   reproduced findings and repeat with a new isolated evaluator; do not combine
   passing grades/checks across different builds.

Stop successfully only when desktop, tablet, mobile and every required dimension
are good, all frozen checks pass, desktop appearance/behavior matches the immutable
original, complete touch feature/information parity is proved, no findings/blockers
remain, checker exits 0 for the current served identity and required repository
checks are green. Otherwise save a precise resumable INCOMPLETE checkpoint for
genuine access/data/browser/resource blockers. Never relax criteria or stop because
of an iteration limit. Keep the PR draft until acceptance. Do not merge or deploy.
