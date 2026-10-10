# Mobile/tablet responsiveness implementation plan

Issue: https://issues.latam-tools.com.br/?card=k5crHdaf9nJWGtGvpbUx

The card could not be fetched in this session. This plan follows the user's
requirements; reconcile any additional card details before implementation.
This change prepares the evaluator and implementation workflow. Application
responsiveness changes belong to the subsequent implementation loop.

## Acceptance contract

Preserve the current full-desktop appearance and behavior, the dark/green design
system, and every desktop feature. Provide mobile/tablet layouts and discoverable
touch equivalents for all hover information. A fresh, independent browser evaluator
must rate **desktop, tablet and mobile good** on the same final candidate build.
An ok/bad rating, missing evidence, skipped feature, unavailable required browser,
desktop regression or material design drift cannot pass.

Skill: [evaluate-responsive-ui](../.agents/skills/evaluate-responsive-ui/SKILL.md).
Execution prompt: [mobile-responsiveness-loop-prompt.md](mobile-responsiveness-loop-prompt.md).

## Findings that guide implementation

- The React topbar and calculator content impose inline `min-width: 1500px` in
  `src/react/views/content/app.topbar.tsx` and `content/ro-calculator.tsx`.
- `src/react/views/equipment-grid.css` uses 480px-minimum columns, which cannot
  fit a phone without reflow. Several forms and HUDs have further fixed columns.
- `src/react/ui/tooltip.tsx` opens on mouse entry/focus. Some information is on
  non-focusable text, so focus support alone does not provide complete touch access.
- Overlay positioning in `src/react/ui/layers.ts` uses the window viewport and
  requires a panel-size review, not just moving an oversized panel to the left.
- `e2e/layout-regressions.spec.ts` intentionally expects a 595px-wide card at
  390px. `e2e/appearance.spec.ts` preserves narrow overflow and opens an offscreen
  topbar action at desktop width before shrinking. Those narrow expectations need
  replacement; desktop references remain frozen.
- `docs/design-system.md` fixes the dark/green theme and 14px base scale. Use the
  existing React controls/tokens/portals; legacy Angular style references are not
  the source of new active UI behavior. The environment Run action still names
  Angular; start the actual app with `node tools/serve-web.mjs` or `pnpm start`.

## 1. Freeze the original before editing the application

Record the initial application revision/tree and existing user changes. In this
session the clean starting revision was
`1e5bd8a28365b211fef59a614300ae28bd7f97fd`. Use the actual starting tree when
the loop runs; do not assume this revision remains current.

Serve a separate frozen checkout/build on port 4201 and the candidate on 4200.
Capture original desktop at 1920 × 918, 1600 × 900 and 1536 × 864 on the same
browser/platform/data as the candidate. Include open dialogs, pickers, expanded
panels and populated builds. Existing Windows snapshots are additional evidence,
not substitutes for a same-platform baseline. Never refresh original desktop
references to accommodate this task's implementation changes.

Have a fresh evaluator discover all desktop features and hover information.
Save a neutral inventory, fixture/storage contract, baseline build identifier,
screenshots and finalized `matrix.json` in `.scratch/responsiveness/baseline/`.
Before serving/finalizing each frozen output, run the skill's
`scripts/build-contract.mjs BUILD_DIRECTORY BUILD_ID EXPECTED_CONTRACT.json`.
This binds browser-observed IDs to served static resource hashes; save the
original expected contract with the baseline and candidate contract per iteration.
Use only disposable data; mock public submission/shortening endpoints explicitly
when necessary and label that integration coverage accurately.

Proposed ranges: mobile <768 CSS px; tablet/compact screen 768–1535px; full
desktop ≥1536px. The desktop lower bound accommodates the existing 1500px
layout plus gutters. This is an explicit scope assumption, not a claim that a
1280px laptop is a physical tablet. Both touch and mouse must work in compact
layouts. Check the frozen design at 1536 before finalizing the contract; if its
actual minimum is larger, resolve the range rather than accepting hidden clipping.
If the user requires unchanged desktop at a narrower width, preserve that
comparison too and resolve its existing overflow before declaring success.

## 2. Make the shell responsive without changing full desktop

Move inline width constraints into named, scoped rules retaining their original
desktop values. Add narrow overrides in `src/react/views/topbar.css` and
`ro-calculator.css`, plus shell rules in `src/styles.css` or the active layout
stylesheet where appropriate. Keep selector specificity and portal scopes intact.

Below the full-desktop boundary, reflow toolbar/build actions and editor/HUD
columns. Use existing visual components for any overflow menu; expose every action
and preserve names, feedback and state. Phones get a sensible single-column task
order; tablets may keep multiple columns only where real content fits. Avoid
global `overflow-x: hidden`, transform scaling, smaller fonts or hidden features.

Add responsive overrides close to the affected component. Desktop declarations
and DOM geometry stay equivalent at the frozen sizes. Verify desktop immediately
after shell changes, rather than accumulating global CSS risk.

## 3. Adapt each dense component and overlay

Work through the inventory, with priority on the shared controls before repeating
local fixes. Likely active files:

| Surface | Files and approach |
| --- | --- |
| Attributes, traits, summaries and options | `src/react/views/ro-calculator.css`, `status-input.css`, `misc-detail.css`: shrinkable grids, wrapping long labels, preserved result/detail access |
| Equipment/cards | `equipment-grid.css`, `equipment-slot-card.css`, `equipment-chip.css`: responsive column minima; wrap modifiers without hiding slot-specific controls |
| Item picker/full search | `item-picker-overlay.css`, `item-search.css`, relevant content TSX: bounded panels, reachable search/pagination/equip, touch description access; long virtual lists |
| Battle/auto-cast/rotation | `battle-hud.css`, `battle-monster-card.css`, `auto-cast-hud.css`, `rotation-list.css`, `rotation-timeline.css`: reflow data/actions, preserve every value and explanation; bounded local scroll for genuinely dense content |
| Custom editor/secondary dialogs | `custom-item-studio.css`, `help-improve.css`, `content/*.tsx`: editor/preview discovery, long forms, validation and reachable footer/close controls |
| Shared overlays/controls | `src/react/ui/dialog.tsx`, `portal.tsx`, `layers.ts`, `select.tsx`, `src/app/ui/styles/_controls.css`: scoped size constraints, visible viewport/dynamic height, focus/dismissal and nested scroll-lock behavior |

Use content-driven intermediate breakpoints as needed. Add each breakpoint number
to neutral evaluation inputs; test `b-1`, `b`, `b+1`, orientation and live resize.
Local horizontal table/graph scrolling needs clear context and accessible actions.

## 4. Provide complete touch interaction parity

Inventory every tooltip and hover-only affordance in the running baseline.
Implement one consistent touch-details pattern with existing component styling.
For selectable/equippable rows, separate inspection from the primary action so
reading a description never equips/removes an item by accident. Preserve current
desktop hover presentation and mouse/keyboard behavior.

Use input capability (`hover`/`pointer`, including wide touch devices) together
with layout width, rather than user-agent strings or phone-width-only behavior.
Keep touch actions at least 44 × 44 CSS px, preferably 48px for frequent actions,
with spacing and accessible names; the visible glyph may retain its existing size.
Scope changes so desktop icon geometry stays unchanged. Do not rely on long press.

Preserve tooltip content/formatting/sanitization and all nested formula/data
surfaces. Verify outside-tap/close, long-content scroll, returning to another
target, drag cancellation and normal page scrolling. Rotation reordering already
has mouse/keyboard/touch code; validate actual touch input and provide a discoverable
discrete alternative if dragging is awkward. Retain browser zoom and test fields
with reduced-height viewports; report actual-device keyboard/safe-area coverage
honestly. Required iOS behavior needs WebKit/physical evidence per the support contract.

## 5. Update meaningful regression coverage

Retain desktop appearance references and existing engine/behavior tests. Replace
only the tests that encode broken narrow geometry with checks for viewport fit,
reachable touch controls, equivalent content/results and preserved state.
Add real touch-context mobile/tablet scenarios; merely changing `page.viewport`
in mouse-based tests does not validate no-hover input. Include unmasked screenshots
to assess the icons excluded by historical appearance tests.

Run the appropriate repository checks: `pnpm typecheck`, `pnpm lint:check`,
`pnpm test`, `pnpm build`, and browser interactions/desktop visual checks via
`pnpm e2e` with the configured installed browser. New tests should catch real
regressions (hover parity, lost actions, oversized overlays, state loss), not
duplicate CSS declarations. Respect style/bundle budgets. Add an impersonal pt-BR
release-note fragment only when implementation is completed, following
`docs/releases.md`; do not manually bump published versions.

## 6. Run the independent fix/evaluate loop

Build a stable candidate, label it with a fingerprint that includes uncommitted
tracked and untracked application changes, and freeze it during evaluation.
The dev server serves the last successful build while rebuilding, so explicitly
wait for the new successful build and verify the served bundle before evaluation;
an immutable production build served without hot reload is preferred.

Spawn a **new** evaluator with `fork_turns: "none"` and the bundled evaluator
prompt. Pass URLs/build IDs, requirements, frozen neutral inventory/fixtures/matrix,
browser config, breakpoint numbers and evidence destination only. Keep source/diff,
implementation plan/history and previous evaluation findings out of its input.
Also pass expected served resource contracts (identifiers/hashes only). Require
browser resource verification before and after interactions, separate matrix rows
for every input/engine/sweep/boundary size, and an evidence manifest linking
actual actions/screenshots/traces to each check and current build.

Review its browser evidence and findings. Run the report checker against the
expected candidate fingerprint and frozen matrix. Fix observed defects, rerun
appropriate checks, and use another fresh evaluator. A final full run must cover
all devices/workflows on the same candidate. Never average ratings, waive failures,
hide features, narrow the inventory or update the desktop baseline to force pass.

Completion means all three family ratings and every required dimension/check are
good/passed, desktop is unchanged, feature parity is complete, checks are green,
and the checker exits 0. If browser/access/data/resources block progress, persist
the last state and report **incomplete**, with a resumable next step. A pause is
not successful completion. Passing does not itself publish, merge or deploy.
