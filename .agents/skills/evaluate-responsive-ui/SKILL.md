---
name: evaluate-responsive-ui
description: Independently evaluate the RO LATAM simulator in a real browser at desktop, tablet, and mobile sizes. Critically rate responsiveness, touch UX, desktop feature parity, and fidelity to the frozen desktop design as bad, ok, or good. Use as the context-isolated evaluator in a responsiveness implementation loop; never implement fixes.
---

# Independent browser evaluation

You are a critical product evaluator. Your verdict comes from driving the running
website and inspecting browser evidence, not from implementation claims.

## Isolation and inputs

The orchestrator must spawn you with `fork_turns: "none"`. Accept only:

- This skill and its bundled references/scripts.
- A candidate URL and an immutable candidate build identifier.
- A frozen pre-change baseline URL/build identifier and baseline browser evidence.
- Expected baseline/candidate served-resource contracts (IDs, paths and hashes;
  hash bytes only, never inspect bundled implementation contents).
- The user requirements and the neutral desktop feature/workflow inventory.
- Browser access, test files/data, existing public UI labels, and an output directory.
- The viewport matrix, including implementation breakpoint **numbers** if needed.

Do not read application source, diffs, commits, implementation plans, developer
explanations, previous evaluator verdicts, or the parent's chat. Do not inspect
framework/controller internals or mutate application state through them. DOM,
computed styles, accessibility trees, browser storage setup documented in the
test-data contract, console output, screenshots and network diagnostics are valid
browser evidence. If given implementation context, request a clean replacement
agent; do not pretend to be blind. Do not edit the application or the baseline.

Read [criteria](references/criteria.md), [workflows](references/workflows.md), and
[report format](references/report-format.md) before evaluating. The first run must
discover additional desktop functionality in the baseline browser; the bundled
workflow list is a starting inventory, not proof that it covers everything.

## Baseline discovery before implementation

When explicitly invoked for baseline discovery, only the original URL, expected
served contract, requirements, browser/test data and output directory are needed.
Explore the original desktop, verify its served identity, and save a neutral
feature/hover inventory, deterministic data/state setup, expected observable
results and matched desktop captures. Extend F01–F14 with discovered capabilities.
Return discovery artifacts for the orchestrator to finalize the frozen matrix.
There is no candidate quality verdict in this mode: do not issue an all-good or
passing acceptance report. Later evaluations require both builds and full coverage.

## Required behavior

1. Verify the baseline and candidate load, have the expected build identifiers,
   and use equivalent deterministic data, locale, fonts and browser environment.
   Preserve the baseline; never approve replacement reference screenshots to make
   a changed desktop pass. Missing baseline/access/browser/data means `blocked`.
   Use `scripts/verify-build.mjs` from the real browser to fetch each build's
   `/__responsive-build.json` and verify its static resource byte hashes against
   the expected contract. Supplied ID strings alone do not establish identity.
   Repeat verification after interactions; a changing served build blocks the run.
2. Drive real Chromium with Playwright or available browser tools. Resizing a
   screenshot, reading CSS, jsdom, and mocked DOM execution are not validation.
   Headless Chromium is a real browser; record the engine/version and emulation.
3. Explore the baseline desktop and record every user-facing action, relevant
   state, information surface and hover interaction in a neutral feature inventory.
   Compare candidate desktop at the same sizes/states. Save matched screenshots.
4. Run the required workflows independently from mobile/tablet entry points using
   actual browser touch input, `hasTouch: true`, and verified `(hover: none)` /
   `(pointer: coarse)` media queries. Do not open inaccessible actions at desktop
   width and then shrink. Do not use mouse clicks/hover as substitutes for touch.
5. Test the matrix below, additional discovered breakpoint boundaries, long
   content, overlays, scrolling, landscape and resize state continuity. Each device
   family is judged by its **worst** required viewport/workflow/dimension, never
   by an average. Repeat all families on the final candidate build.
6. Inspect viewport and full-page screenshots yourself, including below the fold
   and open overlays. Confirm the actual layout/visual viewport and initial scale;
   a phone auto-shrinking a desktop-width document is not responsive. The
   capture helper only gathers evidence; it cannot judge UX or feature parity.
   Measure actual hit areas and test their edges/neighboring targets. Check scroll
   locks, dismissal and nested overlays using touch.
7. Produce `report.md`, `report.json` and `evidence-manifest.json` using the report
   contract. Every defect
   needs reproduction steps, device/input, expected vs observed behavior, severity,
   and evidence. Report outcome requirements rather than proposing source edits.
8. Return `pass` only if **desktop, tablet and mobile are all good**, every required
   workflow/matrix entry passed, and there are no unresolved actionable findings.
   A missing observation cannot be rated good. Never relax criteria to end a loop.

## Viewport and input matrix (CSS pixels)

| ID | Family | Size | Input |
| --- | --- | --- | --- |
| desktop-wide | desktop | 1920 × 918 | mouse + keyboard |
| desktop | desktop | 1600 × 900 | mouse + keyboard |
| desktop-compact | desktop | 1536 × 864 | mouse + keyboard |
| tablet-portrait | tablet | 768 × 1024 | touch, no hover |
| tablet-large | tablet | 820 × 1180 | touch, no hover |
| tablet-landscape | tablet | 1024 × 768 | touch, no hover |
| tablet-wide | tablet | 1280 × 800 | touch, no hover; also check mouse/keyboard |
| tablet-compact-screen | tablet | 1440 × 900 | touch, no hover; also check mouse/keyboard |
| mobile-small | mobile | 320 × 568 | touch, no hover |
| mobile | mobile | 360 × 800 | touch, no hover |
| mobile-iphone | mobile | 390 × 844 | touch, no hover |
| mobile-large | mobile | 430 × 932 | touch, no hover |
| mobile-landscape | mobile | 844 × 390 | touch, no hover |

Also sweep widths 320–1920 (e.g. increments of 40 CSS px), then drive representative
open overlays at each declared/discovered breakpoint `b-1`, `b`, `b+1`. Boundary
and sweep probes are additional required coverage; do not infer intermediate
success from the thirteen named sizes. Test a desktop-sized touch context as a
hybrid-device check: touch affordances must be input-aware, not phone-width-only.
The proposed layout ranges are phone <768px, tablet/compact screen 768–1535px,
and full desktop ≥1536px, based on the original 1500px-wide layout. Confirm these
in the neutral contract before implementation; changing ranges must not evade
an existing required desktop comparison. The `desktop-touch` check is 1920 × 918.
The compact-screen mouse/keyboard repeats are distinct required profiles:
`tablet-wide-pointer` and `tablet-compact-screen-pointer`. Freeze every sweep
width and every `b-1`/`b`/`b+1` boundary in the matrix for both input modes and
each required engine. Aggregate sweep success is insufficient coverage.

## Browser support and honest limitations

Chromium + touch emulation is the minimum acceptance environment. It is not a
claim of physical-device testing. Repeat representative tablet/mobile workflows
in WebKit when Safari/iOS is part of the agreed support contract. If that is required
and unavailable, mark the run blocked. Browser emulation cannot prove native
software-keyboard behavior, dynamic browser chrome, or physical safe-area layout;
record those as unverified and require real-device evidence when included in the
support contract. Do not silently drop a required engine or device check.

## Getting a browser and initial evidence

Use the repository's existing `@playwright/test` dependency. Prefer an installed
Chromium when available; otherwise install the matching Playwright browser using
the repository package manager and permitted network access. A missing browser is
a blocker, never a reason to replace browser validation with static inspection.

```bash
node .agents/skills/evaluate-responsive-ui/scripts/capture.mjs \
  --url http://127.0.0.1:4200 \
  --baseline-url http://127.0.0.1:4201 \
  --out .scratch/responsiveness/iteration-001 \
  --candidate-contract .scratch/responsiveness/iteration-001/build-contract.json \
  --baseline-contract .scratch/responsiveness/baseline/build-contract.json \
  --executable /usr/bin/chromium
```

Omit `--executable` to use Playwright's installed Chromium. The helper captures
initial states and metrics only. Continue with agent-written browser interactions
for every workflow; keep those scripts/traces in the iteration evidence directory.
`captured` means evidence was collected; it never means the viewport passed.
Treat recorded geometry issues as observations to grade, not reasons to discard
the failing viewport. Use an additional `hasTouch: true, isMobile: false` probe
when needed to distinguish layout overflow from browser auto-fitting; preserve
the real mobile-emulation evidence and do not substitute the extra probe for it.
Use `locator.tap()` / `page.touchscreen.tap()` for touches and browser-native touch
gestures (e.g. Chromium CDP `Input.dispatchTouchEvent`) for swipes and dragging.
`dispatchEvent()` in page JavaScript and `force: true` are not proof of reachability.
Record any fixture/network interception; fixtures must be identical on both builds
and must not alter layout or hide missing functionality.

After writing the report, the orchestrator independently checks the stop condition:

```bash
node .agents/skills/evaluate-responsive-ui/scripts/check-report.mjs \
  .scratch/responsiveness/iteration-001/report.json CANDIDATE_BUILD_ID \
  .scratch/responsiveness/baseline/matrix.json \
  .scratch/responsiveness/iteration-001/build-contract.json
```

Only exit code 0 permits successful completion. The checker validates report
consistency; the browser evidence and independent judgment remain mandatory.
