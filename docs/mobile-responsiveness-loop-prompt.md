# Copy/paste implementation loop prompt

Run this in the `latam-ro-calc` repository:

```text
Implement mobile/tablet responsiveness for
https://issues.latam-tools.com.br/?card=k5crHdaf9nJWGtGvpbUx.

Read applicable AGENTS.md and docs/mobile-responsiveness-plan.md. Use the existing
React components and design system. Reconcile the card with these requirements:
- Preserve today's full-desktop design and behavior exactly.
- Create responsive mobile/tablet layouts without changing the component identity.
- Keep every desktop feature, option, result and explanation available on touch.
- Replace every hover-only information path with a discoverable touch equivalent.
- Provide appropriate touch targets, scrolling, overlays, dismissal and feedback.

Use .agents/skills/evaluate-responsive-ui/SKILL.md as the independent validation
contract. You are the implementer/orchestrator. Only the fresh evaluator grades.

BOOTSTRAP BEFORE IMPLEMENTATION
1. Inspect the repository, preserve user changes, and record the initial app tree.
   Freeze a separate original build/checkout on http://127.0.0.1:4201. Candidate
   runs on http://127.0.0.1:4200. Keep the original immutable throughout the loop.
   After building and before freezing the original output, run
   node .agents/skills/evaluate-responsive-ui/scripts/build-contract.mjs \
     ORIGINAL_BUILD_DIRECTORY BASELINE_BUILD_ID \
     .scratch/responsiveness/baseline/build-contract.json
2. Capture matched original desktop states at 1920x918, 1600x900, 1536x864 on the
   same browser/platform/fonts/data used for validation. Preserve all desktop
   references. Proposed layout ranges are mobile <768, tablet/compact 768–1535,
   full desktop >=1536 CSS px, based on the current 1500px minimum-width layout.
   Verify this boundary fits the original; honor any explicit user override.
3. Spawn a separate baseline-discovery evaluator with fork_turns: "none". Give it
   only the evaluator skill, original URL/build ID, requirements, browser and test
   data, and output directory. Have it independently inventory desktop workflows,
   hover information and relevant states. It must not read application source.
4. Save the neutral original feature/fixture contract and matrix.json under
   .scratch/responsiveness/baseline/. Required checks pair every F01–F14 and every
   discovered additional workflow with the skill's thirteen viewports plus the
   desktop-touch profile, and add width sweep and breakpoint-boundary probes.
   Include separate compact-screen pointer profiles, each sweep width and each
   b-1/b/b+1 breakpoint width with both inputs, and each required engine separately.
   Use scripts/contract.mjs requiredChecks() to generate the checks. Record the
   baseline resource digest/count from its expected build contract in matrix.json.
   The capture helper can generate suggested-matrix.json; finalize it with the
   real baseline identity, discovery and support contract. Freeze/hash the matrix
   and fixtures. Later evaluations may add requirements, never remove them.
5. Use Chromium + verified touch/no-hover/coarse-pointer contexts as the minimum.
   If Safari/iOS or physical-device behaviors are required, put those checks in
   the frozen matrix; missing required evidence blocks completion. Record emulation
   limitations. Use an installed browser (e.g. /usr/bin/chromium when present),
   or the repository's Playwright browser. Do not bypass network/access restrictions.

IMPLEMENT -> VERIFY -> INDEPENDENTLY EVALUATE -> FIX -> REPEAT
6. Follow the implementation plan in small coherent changes: responsive shell,
   dense components/overlays, touch information parity, then regression coverage.
   Preserve desktop defaults/tokens; scope width and input adaptations. Update
   tests that intentionally preserve broken narrow geometry, not desktop baselines.
   Keep feature/state/calculation parity. Do not shrink or hide controls to fit.
7. Run relevant type/lint/unit/build/browser checks. Establish the exact candidate
   build identity including dirty tracked/untracked app changes. Serve that build
   immutably if possible. Ensure a completed successful build, not the old dev
   server output. Stop edits/rebuilds during validation. Write down the served
   build identity in the iteration's neutral metadata.
   Run build-contract.mjs on the candidate output too, saving its expected contract
   in the iteration directory before serving it. Candidate identity must be bound
   to verified served resource bytes, not only a supplied ID string.
8. Spawn a NEW evaluator agent for EVERY iteration with fork_turns: "none".
   Do not reuse a prior evaluator or fork this chat. Read and fill
   .agents/skills/evaluate-responsive-ui/references/evaluator-prompt.md.
   Give only: skill/resources, candidate and frozen original URLs/build IDs,
   user requirements, frozen neutral feature/fixture/matrix contract, numeric
   breakpoints, browser/support configuration and fresh evidence output directory.
   Also pass expected baseline/candidate served resource contracts (hashes/IDs only).
   Do NOT give: application code, diffs, commit history, this implementation plan,
   your solution/explanations, prior evaluator reports or this conversation.
   If the spawn tool cannot create a context-isolated agent, report blocked;
   do not substitute a self-review or a full-history fork.
9. Require that agent to DRIVE A REAL BROWSER, inspect its screenshots, run every
   required workflow at every viewport, use actual touch input on touch contexts,
   compare frozen desktop, and return report.md + report.json + evidence-manifest.json with bad/ok/good
   grades and reproducible evidence. Initial capture metrics alone do not qualify.
   Actions must start from the target viewport; no desktop-open-then-shrink trick.
   Require browser verification of served manifests/resource hashes before and
   after interactions, and records matching each check's build, input, engine,
   width and height. Inspect visual viewport offsets during native swipes.
10. Inspect the evidence. Independently run:
    node .agents/skills/evaluate-responsive-ui/scripts/check-report.mjs \
      ITERATION_DIRECTORY/report.json CANDIDATE_BUILD_ID \
      .scratch/responsiveness/baseline/matrix.json \
      ITERATION_DIRECTORY/build-contract.json
    Also verify the frozen matrix/fixtures still match their recorded contract.
11. If any device/dimension is bad or ok, a required check failed/was skipped,
    findings remain, or the checker fails: fix the observed problems, run the
    appropriate checks, build the next candidate, and return to step 8 with
    another NEW context-isolated evaluator. Share findings only with the implementer.
    Require a new complete evaluation of the final build; do not combine passing
    device ratings from different builds or carry forward unrerun passes.

SUCCESSFUL STOP CONDITION (ALL REQUIRED)
- desktop.rating == good AND tablet.rating == good AND mobile.rating == good;
- every required dimension is good and every frozen matrix check passed;
- full-desktop appearance/behavior matches the immutable original;
- complete desktop feature/information parity with touch;
- no unresolved actionable findings/blockers, actual browser evidence is saved;
- report checker exits 0 for the CURRENT candidate identity;
- required repository/build/browser checks are green.

Continue until that condition holds. Never relax grading, edit the evaluator's
criteria to pass, replace desktop references, remove required matrix checks, or
claim success because a maximum iteration count was reached. If progress is
blocked by unavailable access/browser/data, repeated nonprogress or resource
limits, save a resumable checkpoint and report INCOMPLETE with the precise blocker.
This is a pause, not completion. Do not deploy/merge/publish merely because it passes.

At completion provide desktop/tablet/mobile ratings, links to the final independent
report/screenshots, tests run, material remaining limitations, and changed files.
```

`ITERATION_DIRECTORY` and `CANDIDATE_BUILD_ID` are filled by the orchestrator each
round. This prompt is the loop controller; only the separate evaluator prompt
is sent to the blind subagent. Keep artifacts in ignored `.scratch/` directories,
and keep the baseline available for the entire run.
