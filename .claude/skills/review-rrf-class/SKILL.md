---
name: review-rrf-class
description: Validate a class's skill formulas, stats and gear against .rrf replay recordings — decode the packets, cross-check the status window, compare recorded damage to the simulator packet by packet, and land the result as tests. Use whenever someone sends recordings to check a class ("as fórmulas do X batem?", "o dano está errado"), when a new class is being ported, or when a build's damage disagrees with the game.
---

# Review a class against .rrf recordings

A replay is the only ground truth this project has: the packets carry the damage the
**server** computed, plus the character's own status window. This skill turns a pile of
`.rrf` files into a verdict — which formulas are right, which are wrong, and by how much.

## 0. What the recording does NOT carry

Ask before starting; guessing these wastes a whole pass:

- **Traits** (POD/STA/SAB/FEI/CON/CRV). **Check the file before asking.** They ride on
  `ZC_COUPLESTATUS`, which the server sends on every map load, so a recording that
  teleported or warped carries all six and `decodeReplay` hands them over as
  `replay.traits` — the importer writes them into the model on its own. Only ask when that
  comes back empty or partial, which is what a session recorded entirely inside one map
  looks like. A **partial** set is not usable: the missing fields are unknown, not zero.
  (A recording that came through `triage-rrf-uploads` carries them either way.)
- **Skill levels.** The `skillLevel` in the damage packet is reliable, but passive and
  toggle levels are not — ask (`learnedSkills` in the import gives the learned tree, which
  usually settles it).
- **Which toggles were on**, and *when*. Recheck against the EFST timeline (§4).

What it DOES carry, and is easy to miss: the **pet's intimacy**. It is not in any packet
(the `0x01a4` in these recordings is `type=2`, hunger) — it lives in the **pet block**,
container 9 chunks 53xx, which is what the game client reads to fill the Janela de Mascote
when it replays the file. `decodeReplay` exposes it as `replay.pet`, and the importer turns
it into the loyalty tier. Don't ask the player for it. See [[pet-loyalty-tiers]].

**Look in the containers before concluding something isn't recorded.** The packet stream is
only container 1; the file also carries Session (3), Status (4), Items (8), pet/companions
(9), the initial entity snapshot (15) and the pre-existing buff list (18). If the client can
show it while replaying, it is in the file somewhere.

Ask for **one recording with no gear** if there isn't one. It is the single most valuable
file in the set: it separates "the class formula is wrong" from "an item is missing".

## 1. Get the file

Players share the recording in one of three ways, and all end up as the same bytes:

- **The `.rrf` itself**, usually dropped in `~/Downloads`. Use it as is.
- **A RagnaRecap link**, `https://recap.latam-tools.com.br/?r=<ID>`. The `<ID>` **is the
  Firestore doc id** in project `ragreplaystats`, collection `replays`; reads are public, so
  it downloads with no login. Don't try WebFetch or the browser — the page is client-rendered
  and returns nothing useful.
- **Sent through the simulator's own "Ajude o simulador" dialog.** Those land in Firestore
  and are picked up with the [`triage-rrf-uploads`](../triage-rrf-uploads/SKILL.md) skill —
  use it instead of the steps below, and note that it hands you **the traits §0 tells you to
  ask for** — read off the recording when it carried them, collected in the dialog when it
  did not, and the listing says which.

```
node .claude/skills/review-rrf-class/fetch-recap.mjs "https://recap.latam-tools.com.br/?r=HdHAKyBShW"
```

It takes the full link or the bare id, writes `.scratch/<ID>.rrf` (or `--out <caminho>`, e.g.
straight into `src/app/replay/__tests__/fixtures/`) and prints the character, map, date,
duration and packet count — enough to confirm it's the right recording before spending a pass
on it. The doc's summary fields (`damageEvents`, `totalDamage`, `avgDps`) also make a cheap
sanity check against what the person said they were testing.

## 2. Decode

Copy `templates/dump.spec.ts` to `src/app/replay/__tests__/_tmp-dump.spec.ts` (that path is
git-ignored) and point it at the file. It prints the session, entities, damage packets,
weapon timeline, EFST timeline and `ZC_PAR_CHANGE` values.

```
npx vitest run src/app/replay/__tests__/_tmp-dump.spec.ts
```

Gotchas that cost time:
- `JSON.stringify` on decoded packets throws on **BigInt** — pass a replacer.
- The importer needs the item DB: `importReplayBuffer(buffer, items)`.
- `decodeReplay` wants an `ArrayBuffer`; `loadReplayFixture` already does the slicing.

## 3. Cross-check the status window FIRST

Never touch a formula before the character matches. Every `ZC_PAR_CHANGE` is a free
assertion, and they're the game's own numbers:

| SP | field | SP | field |
|----|-------|----|-------|
| 41 | ATQ (status) | 225 | P.ATQ |
| 42 | ATQ Equip. | 226 | S.ATQM |
| 43 | ATQM equip. | 227 | RES |
| 46 | DEF equip. | 228 | RESM |
| 48 | DEFM equip. | 229 | C.Mais |
| 52 | Crítico | 230 | T.CRÍT |
| 53 | amotion (VelAtq = 200 − amotion/10) | 232 | AP |

A weapon swap re-sends 41/42/52 — that gives one exact ATK reading **per weapon**, for
free. If SP_ATK2 is off by a constant, an item's script is missing a line (that's how the
Manopla Sombria POD's "ATQ e ATQM +1 por refino" was found). Fix the build before the math.

## 4. Rebuild the timeline

- **Weapon**: initial weapon from `importReplayBuffer`, then every `equipChanges` entry with
  `location === 34` and `equipped`. Refine and cards come on the change event.
- **Counters/toggles**: the EFST id is in `statusEvents`. Resolve unknown ids from ragassets'
  status table — `{id, name}` for every EFST the client knows, pt-BR names. Do not guess.
  ```bash
  curl -s https://assets.latam-tools.com.br/raw/status.json > /tmp/status.json
  node -e 'const s=require("/tmp/status.json");for(const id of process.argv.slice(1))console.log(id, s.find(e=>e.id==+id)?.name ?? "(unknown)")' 156 158
  ```
- **Stacking counters** (Pontos de Foco / aiming count) tick on their own EFST every 500 ms,
  and the reset arrives on the **same millisecond** as the damage. Count the ticks between
  one damage packet and the next — and remember the recording usually **starts with the
  gauge full**, so the first cast is at max, not at 1.

## 5. Divide the packet correctly

`damage` is the packet total; `hits` is its `count` field — and `count` is NOT always the
number of damage hits:

| caso | como dividir |
|---|---|
| `count` == the sim's `skillTotalHit` | divide by `count` |
| skill declares `hit: N` (display only, `totalHit` 1) | **don't divide** — the whole packet is one hit |
| multi-packet skill (one packet per explosion) | **don't divide** — each packet is one hit |
| basic attack (`skillId === 0`) | divide by `count` — a double attack really is 2 hits |

Getting this wrong produces spectacular fake divergences (a factor of 3 on Explosão Gradual).

## 6. Find the criticals — they are the measurement

A critical uses the weapon's **maximum** ATK, so it is deterministic: the same skill critting
twice prints the **same number**. Repeated identical values in a recording are your crits,
and each one is an exact equation instead of a range. Compare them by equality, not by
interval. Non-crits only give you a bound (a low roll proves nothing).

The engine exposes both on `damageSummary`: `skillMaxDamage` is the crit when
`skillCanCri`, and `skillMinDamageNoCri`/`skillMaxDamageNoCri` are the non-crit range.
All of them are **per hit**.

## 7. Skill ratios: the client description wins

`SKILL_META[...].description` in `src/app/skills/skill-meta.generated.ts` is the client's own
pt-BR text with the per-level table. It outranks the Sigma blog — the `[V2]` tables are the
2nd rebalance, which LATAM does not run, and they were wrong on 6 of 7 Night Watch skills.
See [[sigma-v2-vs-client-tables]]. Ratios are `Math.floor`ed by the server, never rounded —
see [[skill-ratio-truncation]].

## 8. Cast and delay: the client table wins

Every skill you add or touch has four more numbers besides the ratio — the ones the game
shows in its own **Informação de Conjuração / Espera** window, which `AtkSkillModel` stores
in seconds:

| in game | ragassets `delay` | model |
|---|---|---|
| Conjuração / Fixa | `castFixed` | `fct` |
| Conjuração / Variável | `castVariable` | `vct` |
| Espera / Pós | `afterCast` | `acd` |
| Espera / Recarga | `cooldown` | `cd` |

`src/assets/demo/data/skill-delay.json` is that table, mirrored from the ragassets
`skills.json` feed. **Never type these from the blog** — the `[V2]` tables were wrong on the
whole Shinkiro cannon tree, and a fork-inherited value survived in 79 skills until the check
below existed. Regenerate and run it:

```bash
node tools/build-skill-delays.mjs
npx vitest run src/app/skills/skill-delay.spec.ts
```

The spec checks every class's atk skills at every level the picker offers, and prints
`<skill> Lv<n> <field>: <ours> should be <client>` for each disagreement. Fix the job file,
not the test. Three things it will make you deal with:

- **A skill whose value varies by level** takes a curve, copied from the client row verbatim:
  `cd: (lv) => [2.5, 2.3, 2.1, 1.9, 1.7, 1.5, 1.3, 1.1, 0.9, 0.7][lv - 1]`. Do not fit a
  formula — `2.7 - lv * 0.2` is a claim the client never made, and it is not even exact in
  binary at Lv10.
- **A skill defined more than once** — in two job files, or twice in one class for a ground
  skill's burst and field — has to be changed in every copy. The spec deliberately does not
  dedupe by name, which is how Trouvere's Rhythm Shooting was caught with `acd` and `cd`
  swapped against Troubadour's.
- **A genuine divergence** goes in the spec's `EXCEPTIONS` with the reason, never a silent
  edit to the expected value. There is exactly one today: Servant Weapon, whose client
  cooldown is the cost of *summoning* the servants, not the rate of the hit being modelled.

If the client has no delay row for the skill at all (`delay: null` in the feed), add its id
to `NO_CLIENT_ROW` with the pt-BR name in a comment.

## 9. Triage a leftover percentage

When every status field matches and damage is still off by a constant-ish factor, find the
**stage** before hunting the cause. Method: add a candidate bonus to an item that is
equipped in every recording, and see how the residual moves across *different buff states*.

- residual **constant** across buff states → a plain multiplier (`dano físico %`,
  `à distância`, `por tamanho/raça/elemento`, `dano crítico`…)
- residual **shrinks when ATK grows** → a flat ATK term
- residual **shrinks when P.ATQ grows** (and only then) → it sits *after* the P.ATQ
  multiplier — the mastery-ATK stage in `calcTotalAtk`
- residual **shrinks when the skill ratio grows** → a flat damage added at the very end

Two or three recordings of the same gear with different toggles are what make this work; one
recording cannot separate the stages. And always keep the gearless recording as the control:
if it is exact, the cause is in the equipment, and the next step is reading every equipped
item's pt-BR description against its `script` in `item.json` — see [[ptbr-description-source-of-truth]].

## 10. Land it as tests

Commit the `.rrf` under `src/app/replay/__tests__/fixtures/` (the folder already versions
several; they never change, so the binary blob is stored once) and write a spec that:

1. imports the build from the fixture — never retype the gear by hand;
2. asserts the crits by **equality** and the non-crits by range;
3. keeps a guard that the range is tight (`max/min < 1.12`), or a wrong ratio would still fit;
4. pins any residual that is still open, with a comment saying what was ruled out and how, so
   the next attempt starts where this one stopped.

`NightWatch.replay.spec.ts`, `nw-mira-damage.spec.ts` and `nw-mastery-gap.spec.ts` are the
worked examples of the three shapes (formula tables, packet-by-packet, open residual).

## Cleanup

Delete your scratch specs **by name**. `rm _tmp-*.spec.ts` is not safe — that folder can hold
the user's own git-ignored scratch files, and a glob will take them with it.
