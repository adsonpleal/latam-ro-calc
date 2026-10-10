# Evidence and report contract

Use a separate output directory per immutable candidate build/iteration:

```text
iteration-001/
  report.md
  report.json
  evidence-manifest.json
  build-contract.json
  browser-actions.mjs
  captures/...
  traces/...
  metrics.json
```

The frozen baseline directory contains its own screenshots, build identity, the
desktop feature inventory, fixture contract, and `matrix.json`. The matrix must
be established before implementation; only add coverage later, never remove it.
It has this shape (the arrays below are abbreviated, not an executable matrix):

```json
{
  "baseline_build_id": "frozen-original-build",
  "baseline_resource_digest": "SHA256_FROM_EXPECTED_BASELINE_BUILD_CONTRACT",
  "baseline_resource_count": 123,
  "breakpoints": [768, 1536],
  "engines": ["chromium"],
  "workflow_ids": ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10", "F11", "F12", "F13", "F14"],
  "required_checks": [
    {"viewport_id": "desktop-wide", "workflow_id": "F01", "engine": "chromium", "input": "mouse-keyboard", "width": 1920, "height": 918},
    {"viewport_id": "mobile-iphone", "workflow_id": "F04", "engine": "chromium", "input": "touch", "width": 390, "height": 844}
  ]
}
```

Generate a required check for **every pairing** of F01–F14 (and discovered IDs)
with all thirteen named viewports and `desktop-touch` (1920 × 918, touch/no hover).
Add separate `tablet-wide-pointer` / `tablet-compact-screen-pointer` checks.
Each sweep width and boundary width needs a separate check for both input modes;
add every required engine separately. Use `scripts/contract.mjs`'s
`requiredChecks(workflowIds, breakpoints, engines)` to generate the full matrix
(318 entries with the default fourteen workflows, sixteen input/viewport profiles,
41 sweep widths × two inputs, and six boundary widths × two inputs).
Include required extra engines/real-device checks in the matrix when agreed;
each required check must identify its engine/device in `viewport_id` when distinct.

## Served identity and evidence association

The orchestrator runs `scripts/build-contract.mjs BUILD_DIRECTORY BUILD_ID
EXPECTED_CONTRACT.json` after building and before freezing/serving the output. It
writes `/__responsive-build.json` into that output and an identical expected
contract outside it. Each static file has a SHA-256 hash; source maps are excluded.
The evaluator uses `verifyBuild(page, url, expectedContract)` from
`scripts/verify-build.mjs` to verify IDs and fetch/hash the served resources through
the real browser. Do not inspect their code contents. Save verification results
before and after interactions. A manifest string alone does not establish identity.
Fixtures/data must be frozen too.

Save `evidence-manifest.json` with one `checks` entry per matrix check:

```json
{
  "checks": [{
    "check_key": "chromium/mobile-iphone/F04",
    "candidate_build_id": "iteration-001-build-fingerprint",
    "engine": "chromium", "input": "touch", "width": 390, "height": 844,
    "files": ["captures/mobile-description.png", "traces/mobile-description.zip"],
    "actions": ["Tap equipment picker", "Tap description control", "Swipe description", "Tap close"],
    "observations": ["Full baseline description accessible; close target reachable"]
  }]
}
```

Populate this from the actual browser session, not intended actions. Coverage
rows must match these build/input/engine/size records and link to recorded files.
Each needs screenshot or trace evidence. A composite trace may support multiple
checks if its distinct actions/states are identified; reusing an unrelated image
or a text placeholder is not evidence. The orchestrator must inspect matched
desktop states, hover inventory and representative actual traces/screenshots.
The checker validates association/completeness, not the meaning of image pixels.

## Markdown report

Lead with verdict, candidate and baseline identity, engine/version, and input
verification. Use a table with desktop/tablet/mobile rows and columns for
responsiveness, input UX, feature parity, design identity, desktop preservation
(desktop only), and overall `bad`/`ok`/`good`. Explain each non-good grade.

Then provide:

- Coverage matrix linking each workflow/viewport outcome to browser evidence.
- Matched baseline/candidate desktop captures and explanation of any differences.
- Touch-target measurements and the complete hover-to-touch parity inventory.
- Findings ordered by severity, with stable IDs, reproduction, expected/observed,
  exact viewport/input, and screenshot/trace links.
- Blocked checks, unavailable dependencies, emulation limitations and explicitly
  unverified device/engine behaviors. Do not claim a physical-device test.

## Machine-readable report

The following is a **partial failing example**, not a passing template. Complete
all required coverage and device dimensions yourself. For blocked runs, use
`run_status: "blocked"`, `verdict: "blocked"`, and list why in `blockers`.

```json
{
  "schema_version": 1,
  "run_status": "complete",
  "verdict": "fail",
  "candidate_build_id": "iteration-001-build-fingerprint",
  "baseline_build_id": "frozen-original-build",
  "evaluated_at": "2026-10-09T16:00:00Z",
  "browser": {"engine": "chromium", "version": "actual-version", "actual_browser": true},
  "baseline_verified": true,
  "build_verification": {
    "candidate": {
      "before": {"build_id": "iteration-001-build-fingerprint", "resource_digest": "OBSERVED_SHA256", "matched": true, "resources_verified": 123},
      "after": {"build_id": "iteration-001-build-fingerprint", "resource_digest": "OBSERVED_SHA256", "matched": true, "resources_verified": 123}
    },
    "baseline": {
      "before": {"build_id": "frozen-original-build", "resource_digest": "OBSERVED_SHA256", "matched": true, "resources_verified": 123},
      "after": {"build_id": "frozen-original-build", "resource_digest": "OBSERVED_SHA256", "matched": true, "resources_verified": 123}
    }
  },
  "input_checks": {"touch_context_used": true, "no_hover_verified": true, "coarse_pointer_verified": true},
  "devices": {
    "desktop": {"rating": "good", "dimensions": {"responsiveness": "good", "input_ux": "good", "feature_parity": "good", "design_identity": "good", "desktop_preservation": "good"}},
    "tablet": {"rating": "ok", "dimensions": {"responsiveness": "good", "input_ux": "ok", "feature_parity": "good", "design_identity": "good"}},
    "mobile": {"rating": "bad", "dimensions": {"responsiveness": "bad", "input_ux": "bad", "feature_parity": "bad", "design_identity": "good"}}
  },
  "coverage": [
    {"viewport_id": "mobile-iphone", "workflow_id": "F04", "engine": "chromium", "input": "touch", "width": 390, "height": 844, "status": "failed", "evidence": ["captures/mobile-description.png"]}
  ],
  "findings": [
    {"id": "M-001", "severity": "P1", "device": "mobile", "viewport": "390x844", "input": "touch", "summary": "Description cannot be opened with touch", "steps": ["Open equipment picker", "Tap the info action"], "expected": "Read the same description as baseline desktop", "observed": "No information surface opens", "evidence": ["captures/mobile-description.png"]}
  ],
  "blockers": [],
  "limitations": ["Chromium touch emulation; native software keyboard not verified"]
}
```

All final coverage entries need `status: "passed"` and actual evidence files
relative to the report directory. No duplicates. No unresolved actionable findings
or blockers can remain on a passing report. The `check-report.mjs` script refuses
missing/malformed reports, stale build identifiers, missing required workflows,
missing evidence files, non-good dimensions or incomplete coverage. It checks the
gate, not the truth of browser observations; the orchestrator must review evidence.
