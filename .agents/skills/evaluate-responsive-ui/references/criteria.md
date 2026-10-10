# Rating criteria

Ratings are `bad`, `ok`, `good`. `blocked` describes a run/coverage status, not a
fourth quality rating. Judge critically, but use observable evidence, not taste.

| Dimension | Bad | Ok | Good |
| --- | --- | --- | --- |
| Responsiveness | Page overflow, clipped/overlapping controls, inaccessible content, unusable overlay or short landscape screen | All content reachable, but awkward wrapping, excess navigation or avoidable nested scrolling remains | Legible hierarchy; appropriate reflow; all controls/overlays fit; smooth scrolling and orientation changes without state loss |
| Input UX | Hover/mouse required on touch, accidental activation, blocked scrolling, unreachable dismissal | Tasks work, but small targets, weak discoverability, confusing dismissal or unnecessary taps remain | Appropriate targets, clear actions/feedback, touch-only access to all information, reliable scrolling/dismissal; mouse/keyboard behavior preserved on desktop |
| Feature parity | Any desktop action, data, explanation, setting, result or workflow missing/unreachable | Features available but obscured or materially harder to use | Every baseline feature and information surface works with equivalent results at each required viewport |
| Design identity | Significant new visual language, changed theme/colors/type/icons, unrelated component styling | Recognizable, but inconsistent component treatment or hierarchy | Same tokens, typography family/hierarchy, surfaces, borders, accents, sprites, labels and component language; only justified reflow/input adaptation |
| Desktop preservation (desktop) | Any reproducible unintended change to desktop layout, component appearance, content or behavior | Cannot resolve an apparent visual difference, or comparison is incomplete | Matched states preserve the frozen desktop; any pixel differences proven to be rendering/animation noise, with evidence |

The family rating is the worst dimension across all required viewports. A severe
design-identity deviation is `bad` even if the layout is attractive and fits.
Feature parity is not a percentage: 99% with a missing desktop feature is `bad`.
An `ok` rating never passes. Do not invent a new desktop design to improve mobile.

## Measurable acceptance rules

- On touch, action hit areas should be at least **44 × 44 CSS px**, with 48 × 48
  preferred for frequent/primary actions. These are project acceptance targets,
  not a claim about a universal accessibility minimum. Measure the interactive
  hit area, not the glyph. A small glyph can sit inside a larger target.
- Any target below 44 × 44 prevents `good` unless it is an ordinary inline text
  link with adequate separation and demonstrated reliable touch access. Record
  the measured exception and evidence. Never apply the touch-size rule to frozen
  mouse/keyboard desktop controls to justify changing their appearance.
- No page-level horizontal overflow (>1 CSS px rounding tolerance), including
  content visually clipped by `overflow-x: hidden`. Dense tables/formula graphs
  may scroll in a clearly bounded local container, provided labels/context,
  every column/action and touch scroll remain accessible. A whole offscreen
  toolbar or form is not an acceptable local-scroll exception.
- Browser zoom remains enabled. No global shrinking/scaling to fit desktop onto
  a phone, no smaller type to conceal overflow. Preserve the established 14px
  base design scale; touch text inputs may have scoped sizing for browser input
  behavior. Smaller existing secondary labels remain secondary, not a substitute
  for readable primary content.
- At initial load, inspect the configured viewport, document client/scroll width,
  layout viewport and `visualViewport.scale`. A mobile browser may auto-fit a
  too-wide document into a phone, making a full-page screenshot look deceptively
  complete. Unintended shrink-to-fit, or a layout viewport expanded beyond the
  configured CSS width, is a responsiveness defect. Inspect both the viewport
  screenshot and full-page capture, and measure targets at the actual visual scale.
- All desktop hover information has a discoverable touch equivalent: explicit
  detail/info action, tappable disclosure, or an existing details panel containing
  the same information. Long press alone and incidental emulated hover do not
  qualify. One tap to inspect must not equip, delete or otherwise trigger another
  action accidentally. Long content scrolls inside its details surface.
- Menus, popovers and dialogs stay within the visible viewport and have a reachable
  close/cancel action. Touch outside-dismiss is tested where offered. Nested
  selectors do not prematurely close parents or strand scroll locks. Keyboard
  focus restoration/trapping and Escape still work on desktop.
- Required controls remain available in portrait and short landscape. Sticky
  headers/footers must not consume the usable screen or cover fields/actions.
- Resize/orientation changes preserve entered values, selected items, comparison
  state and rotation ordering. Reflow does not silently reset or duplicate work.
- Labels, accessible names, focus states, loading/error/empty feedback and disabled
  states remain clear. Tap outcomes are visible and do not fire twice.

## Severity and evidence

- `P0`: app unusable or test action risks corrupting user data.
- `P1`: lost/inaccessible desktop capability; hover-only required information;
  major design drift; reproducible desktop regression; page overflow preventing use.
- `P2`: awkward but possible interaction, undersized target, overlap, poor discovery,
  avoidable extra steps or inconsistent styling. Usually caps a family at `ok`.
- `P3`: minor actionable polish issue. It still prevents final `good` until fixed;
  purely informational observations may remain and must not be labeled defects.

Screenshot + measured geometry + interaction outcome is stronger than any alone.
Distinguish app defects from unavailable dependencies and browser limitations.
If evidence is inconclusive, coverage is blocked; do not assign a confident grade.

## Comparing desktop and identity

Match browser/platform/fonts, locale `pt-BR`, timezone `America/Sao_Paulo`, storage,
data fixtures, scroll, expanded panels and selected values. Capture both baseline
and candidate at 1920, 1600 and 1536 CSS px, including open dialogs and details.
Freeze animations consistently. Do not mask buttons/icons/labels/components to
hide differences. If using existing screenshot tests with historical masks,
also inspect unmasked captures. Existing Windows snapshots cannot establish
pixel equivalence to Linux; capture the frozen build on the same platform.

Judge mobile identity against the original desktop component vocabulary, not
against today's broken narrow baseline. Cards can stack, fields can wrap, and
touch details can expand while keeping their recognizable styling and content.
Input-aware adaptations at a wide touch viewport are permitted; matched
mouse/keyboard desktop remains the reference that must be unchanged.
