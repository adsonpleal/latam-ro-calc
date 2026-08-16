# Attack rotation (combo) — design notes

> Records why the rotation panel works the way it does — the timing model, the DPS
> divergence from the engine's own figure, and the limits the catalog imposes — so those
> are not rediscovered or "fixed" by mistake. Cited from the code that depends on them.

Written in English, per `CLAUDE.md`. Only the strings the user reads are pt-BR.

---

## 1. Context

`Resumo de Batalha` used to calculate **one** attack skill against one target. It now
calculates a **rotation**: an ordered list of skills — duplicates allowed, ataque básico
as an ordinary entry — reported as the DPS of the whole repeating cycle, plus a per-skill
timing flowchart on a shared time axis.

The design handoff lives outside the repo (`design_handoff_combo_rotation`: a README, 7
screenshots and two `.dc.html` mocks). The mocks are references, not code — and their
numbers are **plausible placeholders**, not engine output. Two of them do not survive
arithmetic: the lanes drawn in `01-4a-painel.png` add up to a 3,28s cycle rather than the
3,26s printed, and the `1º ciclo 3,10s vs 3,26s` pair is not derivable from that rotation
at all (it has no recarga stall). Trust the geometry, not the labels.

---

## 2. The timing model

Per skill: **fixa → variável** run in sequence, and when the cast ends the
**pós-conjuração and the recarga start together**. Pós blocks *every* skill; recarga
blocks *only that skill*. VelAtq (ASPD) is a floor between actions, measured
**start to start**.

```
start_i   = max(gate, ready[key_i])
castEnd_i = start_i + cast_i                    // cast = reducedFct + reducedVct
ready[key_i] = castEnd_i + cd_i                 // recarga: this skill only
gate      = max(castEnd_i + acd_i,              // pós: every skill
                start_i + aspdPeriod)           // VelAtq floor
```

Lives in [`src/app/core/rotation-schedule.ts`](../src/app/core/rotation-schedule.ts).

**It is a generalisation of `calc-skill-aspd.ts`, not a second source of truth.** For a
single-skill rotation the recurrence collapses to `max(fct + vct + max(acd, cd), 1/aspd)`
— exactly the engine's own `hitPeriod` capped by ASPD. `rotation-schedule.spec.ts` drives
`calcSkillAspd` directly and holds the two together, so they cannot drift.

**Waits are absorbed into the cycle**, both the VelAtq wait and the recarga wait: the
rotation idles and the cycle grows. That is what makes the order matter at all, and it is
what the mock encodes (the VelAtq hatch blocks carry real width and push the timeline).

**Steady state is found by period detection, not by an epsilon loop.** The scheduler
unrolls ~32 cycles and scans the tail of the duration sequence for the smallest repeating
period `p`:

- `p === 1` — a clean steady cycle. The normal case, and the only one where a single
  "Ciclo Xs" is literally true.
- `p > 1` — a **super-cycle**: a recarga at a non-integer multiple of the natural cycle
  makes successive cycles alternate (3,10 / 3,50 / 3,10 …). "O ciclo" is then a mean, and
  this is what earns the design's `Recarga não fecha` state and its "estimativa" wording.
  A plain convergence loop would never settle here and would silently return whatever the
  cap left behind.

`firstCycleDuration` is cycle 0's **makespan**, not its start-to-start distance to cycle 1
— that distance already contains the wrap-around wait, so it could never come out shorter
than the sustained cycle, which is the whole point of surfacing it.

---

## 3. DPS reports the true rate (deliberate divergence)

The rotation's DPS is `damagePerCycle / cycleDuration`. The engine's `skillDps` is not,
and the two disagree — sometimes by more than 2×.

The engine derives DPS through two truncations that are invisible at high rates and
brutal at low ones:

| Step | Where | Effect on a 5,56s skill |
| --- | --- | --- |
| `totalHitPerSec = floor(1 / hitPeriod, 1)` | `utils/calc-skill-aspd.ts` | 0,1798 → **0,1** |
| `oneHitDps = floor(hitsPerSec * totalDamage)` | `utils/calc-dmg-dps.ts` | 2,6 → **2** |

For a skill dealing 26 per hit over 10 hits that yields `10 × 2 = 20`, against a true
`260 / 5,56 = 46,8`.

**Decision (2026-08-15, with Adson): the rotation reports the exact rate; the engine is
left untouched.** The `Resumo de Batalha (antigo)` tab therefore still shows 20 where the
rotation shows 47, and the two panels visibly disagree on slow skills until the legacy one
is retired. Fixing the truncation app-wide is the more correct end state but moves every
DPS number and needs a replay re-validation pass — a separate, deliberate change.

---

## 4. Reordering (`Otimizar`)

**Nothing in the catalog gates a skill on its position.** `AtkSkillModel` has no
prerequisite field; weapon gating (`verifyItemFn`) and character states (Sky Emperor's
`[Meio-Dia]` and friends) are global toggles that hold for the whole cycle. Two
consequences:

1. **Each distinct skill is solved once**, not once per occurrence — a repeat reuses the
   first solve, and ataque básico needs no pass at all.
2. **`damagePerCycle` is permutation-invariant**, and so is
   `Σ max(cast + acd, aspdPeriod)`. Maximising DPS therefore reduces to **minimising the
   cycle duration**, and the only thing order can change is recarga stall. That sum is a
   provable lower bound, which gives an exact early exit.

[`src/app/core/rotation-optimize.ts`](../src/app/core/rotation-optimize.ts) enumerates
every distinct arrangement while the count stays under the budget (50 000), then falls
back to a greedy seed plus a deterministic first-improvement local search.

**When order actually matters** — worth knowing, because `Otimizar` is honestly a no-op
more often than the handoff implies. A skill used `k` times per cycle can never beat
`k × cd` whatever the order, so:

- all-distinct skills → already optimal, always;
- one repeated skill → order matters only when there are enough other entries to pack
  between its two uses;
- two or more repeated skills → order matters (grouped `A A B B` stalls, interleaved
  `A B A B` does not).

The optimiser says `Já está na melhor ordem que encontrei.` rather than shuffling for
show.

---

## 5. State and persistence

`MainModel.rotation: string[]` holds the same `"<Name>==<level>"` values the engine
already speaks, plus `BASIC_ATTACK_VALUE` (`'__basic'`) for ataque básico. A decomposed
`{skillId, level}` would be **lossy**: several catalog entries can share a name and level
and be told apart only by `value` (the `getElement(skillValue)` skills, HyperNovice's
`labelSuffix` variants).

`selectedAtkSkill` stays as a **write-through mirror** of the first real skill, kept in
sync by `syncRotationMirror()`. That is what keeps the antigo tab, `PresetModel`, the MCP
server (`mcp/src/engine/derive.ts`) and ~20 engine specs working untouched.

Migration is one line in `setModelByJSONString`, which every restore path funnels through
— share token, `ro-set` autosave, `ro-saves` named saves and the `.rrf` import alike: a
build with no `rotation` key arrives as `[]` and becomes a rotation of one.
`compactRotationForShare` drops a rotation that is just `[selectedAtkSkill]` before
encoding, so single-skill builds produce byte-identical tokens to before.

---

## 6. Still open

- `(i)` popover copy per rotation entry. The panels follow the picked row via
  `activeStepIndex`, but some of their wording is still written for a single skill.
- The multi-target table the new tab dropped has no replacement; `Resumo de Batalha
  (antigo)` still carries its own copy.

---

## 7. What the engine cannot express

Recorded so nobody re-derives these:

- **State prerequisites.** The design's `⚠ Requer` tooltip promises
  "Entardecer Nv5 — Precisa de [Nascer do Sol] ou [Meio-Dia]". There is no such data:
  states are a global toggle branched inside each skill's own formula. `⚠ Requer` carries
  only weapon gating (`verifyItemFn` → `requireTxt`). Adding a declarative `requires` to
  `AtkSkillModel` would be a hand-authored pass over ~40 job files.
- **Autospell entries** — out of scope, a dedicated section is planned.
- **Effect durations vs cycle length** — a 15s state expiring mid-rotation is not modelled.
- **The multi-target table** — the dropped one reported a single skill against many
  monsters; a rotation-aware replacement is still to be designed.
- **The MCP server** drives the engine through `selectedAtkSkill` and keeps working on a
  single skill. Teaching it the rotation is a follow-up.

---

## 8. Panel width — sized by container, never viewport

The panel renders at ~595px, not the ~900px the first design was drawn at, because the
`Resumo de Batalha` accordion lives in the calculator's right-hand column. Everything is
therefore laid out in **one column** — alvo, `EFEITOS`, target band, rotação, DPS — and
the rotation and DPS panel are deliberately *not* side by side: giving the flowchart the
full content width is what keeps a 0,30s pós-conjuração label readable, which it is not
in a 400px column.

All of it is sized by **`@container`**, never the viewport, so the same component
degrades correctly in the PVP tab and any other embed. Below ~420px of container the
target band stacks completely.

---

## 9. What the row states, and what it cannot

Every rotation row states its **crit reading** explicitly — a rate where the skill can
crit, `Sem crít.` where it cannot. The design is emphatic that silence would read as
missing data.

The design also asks for an asterisk when the crit is *conditional* ("Entardecer only
crits in [Meio-Dia]"). No skill declares which state it needs, so the condition itself
cannot be named. What *is* available: a catalog entry whose `canCri` is a **function**
rather than a flag is state-dependent by definition. The asterisk is driven off that, with
a generic tooltip pointing at the `(i)`. Same underlying gap as the `⚠ Requer`
prerequisites in §7 — if a declarative `requires`/`critCondition` is ever added to
`AtkSkillModel`, both become exact at once.
