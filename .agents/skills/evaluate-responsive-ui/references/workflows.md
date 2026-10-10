# Neutral desktop feature inventory

Explore the frozen desktop first and extend this list with every discovered
action/state. The inventory describes observable tasks, never implementation.
Use disposable local browser contexts and deterministic fixture data. Include
an empty build, a populated long-name build, comparison enabled, and an imported
replay. Record baseline output values; candidate runs must give equivalent values.

| ID | Required workflow and observations |
| --- | --- |
| F01 | Navigation and topbar: reach every action/link, version/Novidades and any help entry; no action disappears behind a phone edge |
| F02 | Character: change class, base/job level, attributes and traits; search/filter selectors; check disabled/clear states and updated summaries |
| F03 | Equipment: inspect and equip/remove items in every slot group (normal, shadow, costume, pet, offhand/ammo where available); change refine/grade/cards/enchants/random bonuses/options and slot color; preserve distinct side/slot behavior |
| F04 | All hover information: inventory item/skill descriptions, equipment chips, status/bonus explanations, warning badges, damage/rate/DPS derivations and ancillary hints; inspect every distinct information surface with touch and dismiss/scroll it |
| F05 | Full item search: every filter family, adding/removing bonus rows, submit/clear, loading/empty results, virtual long lists, pagination, selected description, destination selection and Equipar from build and comparison contexts |
| F06 | Consumables/passives/buffs: expand every section; toggle/edit available options; preserve effects and summaries; clear individual selections |
| F07 | Comparison: add/change/remove comparison equipment, open its details, inspect deltas/results, cancel without changing the main build |
| F08 | Battle/monster: choose grouped/searchable target, filters, monster details, difficulty/PVP options where present, elemental table; confirm stats/reductions/damage results and explanations |
| F09 | Rotation/skills: add skills, level and options, duplicate/reorder/remove, drag and any discrete alternative, details/formulas/critical and range information; scroll normally without triggering a drag |
| F10 | Auto-conjuração: expand sources and controls; inspect damage, critical, DPS, rate, effective-hit and nested details; every data column remains available |
| F11 | Persistence/reset: save differently named builds, browse/load/remove saved simulations, reload, clear/cancel/confirm; ensure entered names, values and prior saves survive |
| F12 | Import/export/share: simulation data and fixture replay file chooser, choice/confirmation/error states, import results, long-link fallback/copy/share and direct shared entry; export/download if baseline offers it |
| F13 | Custom items: library/search/category/pagination, create/edit/preview/save, segmented controls, long forms, cancel/confirm/removal; editor and preview remain discoverable on narrow screens |
| F14 | Secondary flows and lifecycle: help/improve/replay-submission form, release notes, confirmations, toast/error/loading feedback; open/close nested overlays, scroll-lock release, focus, portrait/landscape and resize continuity |

Every named viewport needs all F01–F14 plus any newly discovered workflow IDs.
At the two compact-screen profiles (1280/1440), repeat mouse/keyboard access
as part of each workflow in addition to touch; these layouts also serve laptops.
For repeated generated content, cover every distinct interaction type and slot
capability; record representative cases/data rather than clicking every catalog
item or all 70 classes. Do not sample away unique controls or feature branches.
Test critical populated/empty/error states at every named size and the longest
content on the smallest phone and short landscape.

## Practical touch protocol

Start directly at the target viewport in a fresh touch browser context. Find and
tap the action as a user would. Scroll using native touch gestures. Test center
and near-edge hits, adjacent controls, opening/closing details and tapping a new
target after dismissal. Measure actual hit boxes and screenshot open panels.
For scrolling/reordering, Chromium CDP `Input.dispatchTouchEvent` is browser
input; page-JavaScript synthetic pointer dispatch is insufficient evidence.

Use keyboard text entry after tapping fields as needed; record that software
keyboard occlusion is unverified unless tested on a physical device. A reduced
viewport is a useful stress probe, but is not a native-keyboard verification.

## Feature completeness and public side effects

Use local/disposable saved data and provided replay fixtures. Public submissions,
external messages and real deletion are not needed to test layout. Verify those
flows with an authorized test backend or an explicitly documented fixture that
preserves the complete form/validation/loading/success/error UI. Never silently
omit the flow: absent test data/backend is blocked coverage. Test share fallback
without publishing new public short links unless the test environment allows it.
Fixtures are evidence of the UI contract, not evidence of production integration.

Capture an independent inventory on the first evaluation. Preserve it as the
neutral contract for later evaluations; future agents can rediscover more features
but cannot remove requirements to raise the rating.
