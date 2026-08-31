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
  **A recording that reached you as a tracker card already carries them** — the dialog
  collects them by hand precisely because a single-map session has none, and
  `triage-backlog --get <id>` prints them in the card's `gravação` block. Finding
  `traits: null` in the decoded file is the signal to read the card, not to ask the
  reporter.
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
- **Sent through the simulator's own "Ajude o simulador" dialog.** Those are promoted onto
  the tracker as `tipo: "replay"` cards and reach you through
  [`triage-rrf`](../triage-rrf/SKILL.md), which picks which are worth a pass. Pull the file
  with the board script instead of the steps below:

  ```
  node .claude/skills/triage-backlog/backlog.mjs --anexos <id> --out .scratch/<id>.rrf
  ```

  The card hands you **the traits §0 tells you to ask for**, printed by `--get <id>` in its
  `gravação` block — read off the recording when it carried them, collected in the dialog
  when it did not, and the block says which.

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

## 2b. Build the character with the importer, never by hand

**`replayToModel` is the only thing that should ever set a slot.** It already knows the
`e_equip_pos` bitmask, which off-hand item is a shield and which is a second weapon, how a
weapon's sockets split into cards-then-enchants by its real slot count, where an accessory's
enchants sit in the shared `cards[]`, the costume-head positions, grades and random options.
Retyping any of that into a spec re-implements it, badly and silently: a hand-built copy of
one recording's gear came out **44% over** the same build read by the importer, and it looked
plausible the whole way.

The importer reads `replay.initialInventory`, which is the snapshot at t=0 — so a recording
that gears up on camera imports as whatever it was wearing at the start. To reach a later
state, **fold the equip events onto the snapshot and hand that to the same importer**. Both
sides carry `slot`, the inventory index, so it is an overwrite and not a mapping:

```ts
function modelAt(replay, items, untilMs) {
  const inv = new Map([...replay.initialInventory].map(([k, r]) => [k, { ...r, cards: [...r.cards] }]));
  for (const e of replay.equipChanges ?? []) {
    if (e.time > untilMs) break;
    const rec = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
    inv.set(e.slot, {
      ...rec, itemId: e.itemId, refine: e.refine, grade: e.grade,
      cards: [...(e.cards ?? [])], options: e.options?.length ? e.options : rec.options ?? [],
      equipped: e.equipped ? e.location : 0,
    });
  }
  return replayToModel({ ...replay, initialInventory: inv }, items);
}
```

That turns a gear-up recording into as many builds as it has states — the gearless control,
weapon-only, full gear — from one file, which is the matrix §9 wants and normally costs three
recordings to get.

**Then, and only then, check by hand** (§3): the importer can only place what the packets
carried, so a build it produced still has to reproduce the recording's own status window
before any formula is read off it. Hand-checking is for resolving an inconsistency the
importer surfaced — never for producing the build in the first place.

## 2c. Filter every stream by the recorder's `aid` — before reading anything

A recording made on a public map carries **other people's packets**, and not only their
damage. Both of these streams are mixed, and both hand back an owner id:

| stream | field | what leaks in |
|---|---|---|
| `damage` | `source` | strangers' hits — 65 of RXBZc39dV5's 129, 94 of 5tGJSGaNWg's 112 |
| `statusEvents` | `aid` | **strangers' buffs**, and their target debuffs |

The damage half is well known. **The `statusEvents` half is the one that ruins a pass**,
because an unfiltered buff list reads as the recorder's own and every extra EFST looks like
an unmodelled multiplier hiding in the residual. On the 29/08/2026 board two Sicário files
were benched as 25- and 9-buff party recordings carrying Poema de Bragi, Kyrie Eleison,
Mantra da Força and Postura do Universo. Filtered by `aid` they carry **zero** and **one**,
and both then reproduced the engine packet for packet. The tell was there to be read: a
Mestre Celestial buff on a Sicário belongs to somebody else.

```js
const me = replay.sessionInfo.aid;
const meusDanos = (replay.damage ?? []).filter((d) => d.source === me);
const meusStatus = (replay.statusEvents ?? []).filter((s) => s.aid === me);
```

Then drop the bookkeeping ids. Every recording carries them, none is a buff, and leaving
them in inflates the count by a dozen:

```js
const RUIDO = new Set([46, 622, 673, 695, 802, 942, 983, 984, 987, 993, 994, 1084, 1085, 1312]);
```

(46 `EFST_POSTDELAY`, 622 sitting, 673 cart, 695 arrow-equipped, 987 vending, and the
RODEX/EXP/DROP counters.)

**The events whose `aid` is not yours are still worth a look** — they are the *target's*
statuses. That is where a debuff you applied shows up, and it can settle a state the
recorder's own buff list cannot: EFST 328 `EFST_VENOMIMPRESS` sitting on the dummy is proof
Potencializar Veneno was up, whether or not you would have guessed it.

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

**A recording that re-gears on camera is a status window per piece.** Every equip event
re-sends the block, so a strip-down-and-rebuild file hands you a reading after each item —
LfVVfKMZg3 gives 40 readings of SP 42 and 84 of SP 52. Walk them **in order and diff them**
rather than checking only the final state: each step isolates one item, so a divergence
names its culprit instead of leaving you with one wrong total. That is how the CRIT slope
was pinned to `+18982` in a single pass — every other step's delta matched exactly.

**Check the window exists before promising a stat verdict.** Plenty of recordings send
nothing but SP 7 (weight): three of the five in the 29/08/2026 Sicário/Executor batch had no
`ZC_PAR_CHANGE` worth reading. Damage can still be validated against the imported build, but
a build error and a formula error are then **inseparable** — say so in the verdict instead of
reporting the damage match as if it confirmed the stats too.

```js
const janela = (replay.paramChanges ?? []).filter((p) => [41, 42, 52, 53, 225].includes(p.type));
if (!janela.length) console.log('sem janela de status — dano só se valida contra a build importada');
```

## 4. Rebuild the timeline

- **Weapon**: initial weapon from `importReplayBuffer`, then every `equipChanges` entry
  whose `location` carries `EQP_HAND_R` (`location & 0x02`) and is `equipped`. Refine and
  cards come on the change event. Match on the **bit**, not on `=== 34`: 34 is `0x02|0x20`,
  a two-handed weapon that also fills the shield slot, and a one-handed one arrives as
  plain `2`. Testing for 34 silently prints an empty weapon timeline for the one-handed
  case, which reads as "the character never swapped weapons" — a Sky Emperor recording that
  equips a book mid-session was misread that way.
- **Counters/toggles**: the EFST id is in `statusEvents` — **filtered by `aid` and stripped of
  the bookkeeping ids, per §2c**, or half of what follows belongs to a stranger. Resolve
  unknown ids from ragassets' status table — `{id, name}` for every EFST the client **names**, pt-BR. Do not guess.
  ```bash
  curl -s https://assets.latam-tools.com.br/raw/status.json > /tmp/status.json
  node -e 'const s=require("/tmp/status.json");for(const id of process.argv.slice(1))console.log(id, s.find(e=>e.id==+id)?.name ?? "(unknown)")' 156 158
  ```
  **That feed only names 704 ids out of a 0-1688 range**, and the gaps are not rare — a
  buffed recording will hand you several. For those, fall back to **rAthena's `efst_type`
  enum**, whose numbering is the client's: 699 of the 704 named ids line up, and the spot
  checks are exact (1 `EFST_ENDURE` = Vigor, 2 `EFST_TWOHANDQUICKEN` = Rapidez com Duas
  Mãos, 105 `EFST_LKCONCENTRATION` = Dedicação, 1172 `EFST_SERVANTWEAPON` = Espada Alada).
  The enum is implicitly numbered from `EFST_BLANK = -1`, with a handful of explicit
  assignments to honour, so index it in order rather than counting by hand:
  ```bash
  curl -sL https://raw.githubusercontent.com/rathena/rathena/master/src/map/status.hpp -o .scratch/status.hpp
  node --input-type=module -e '
    import { readFileSync } from "node:fs";
    const src = readFileSync(".scratch/status.hpp", "utf8");
    const body = src.slice(src.indexOf("enum efst_type"));
    const block = body
      .slice(0, body.indexOf(String.fromCharCode(10) + "};"))
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\r\n]*/g, "");
    const by = {};
    let next = null;
    for (const [, name, num] of block.matchAll(/(EFST_[A-Z0-9_]+)\s*(?:=\s*(-?\d+))?\s*,/g)) {
      const id = num !== undefined ? Number(num) : next;
      if (id === null) continue;
      by[id] = name; next = id + 1;
    }
    for (const id of process.argv.slice(1)) console.log(id, by[id] ?? "?");
  ' 802 993 1061
  ```
  An id the client does not name is almost always **not a combat buff** — the unnamed ones
  that turn up in recordings are bookkeeping states (`EFST_PLAYTIME_STATISTICS`,
  `EFST_GET_CNT_UNREAD_RODEX_*`, `EFST_AID_PERIOD_*`). Naming them is still worth the two
  minutes, because it is what lets you *close* the "is there a hidden buff?" question
  instead of leaving it open. One more worth knowing by heart: **46 is `EFST_POSTDELAY`**,
  cast delay, which toggles on almost every skill packet and is not a buff.
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

Two caveats on that, in opposite directions:

- **A crit is only deterministic when the weapon roll is gone.** On a low-DEX build it
  survives the critical and the engine reports a *range* for `skillMaxDamage` too — compare
  against `skillMinDamage..skillMaxDamage` and let the least-variance weapon carry the
  assertion (see [[crit-not-always-deterministic]]).
- **Bare-handed, everything is exact.** With no weapon there is no ATK to roll, so the
  non-crit *and* the crit each print a single repeated number and the pair is two exact
  equations — the strongest assertion a recording can offer, and it tests the class formula
  with no equipment in the way at all. LfVVfKMZg3 prints `14203 ×5` and `19880 ×2`, a clean
  1,4×, and the engine reproduces both to the unit. **If a file strips the character at any
  point, that window is the first thing to read**, ahead of the fully-geared packets.

The engine exposes both on `damageSummary`: `skillMaxDamage` is the crit when
`skillCanCri`, and `skillMinDamageNoCri`/`skillMaxDamageNoCri` are the non-crit range.

**They are per *packet*, on the same terms as §5** — compare them to the recorded `damage`
directly, and divide neither side. "Per hit" is only true for a skill whose `totalHit` is
the packet's `count`; for a display-only `hit: N` skill (Centelha das Trevas, `hit: 4`) the
engine's figure already covers the whole packet, and multiplying it by `count` to "match"
inflates it fourfold. `Shinkiro.shadow-flash-replay.spec.ts` asserts `skillMaxDamageNoCri`
against the raw packet value — copy that comparison rather than reasoning about it.

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

**First make sure there is one.** A sample maximum is not a distribution maximum: with ten
packets the largest will sit a few percent under the true ceiling, so "recorded max is 4,5%
below simulated max" is the *expected* reading of a correct engine, not evidence of anything.
Comparing maxima this way produced a convincing-looking 3-5% overshoot across three states of
LfVVfKMZg3 that turned out to be nothing.

What cannot be explained by sampling is a packet **below the simulated floor**. That is the
test — one recorded value under `skillMinDamage` (or over `skillMaxDamage`) is a real
divergence; a sample max that fails to reach the ceiling is not. State the verdict as *how
many packets fell outside the range*, never as a ratio of maxima.

Once it is real, find the **stage** before hunting the cause. Method: add a candidate bonus to an item that is
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

**Pre-filter that audit numerically.** A five-build batch equips ~130 distinct items and
reading them all is not worth the pass. Pull every number out of the description, drop the
boilerplate lines (Peso/Nível/Classes/Tipo…), and list the ones the script never mentions:

```js
const limpa = (s) => (s ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');
const BOILERPLATE = /^(Peso|Nível|Classes|Posição|Tipo|Armadura|Defesa|Ataque|Slots?|Arma)/i;

for (const [id, slots] of usados) {
  const rec = items[id];
  const desc = limpa(latam[id]?.description)
    .split('\n').filter((l) => !BOILERPLATE.test(l.trim())).join(' ');
  const noScript = new Set((JSON.stringify(rec.script ?? {}).match(/\d+/g) ?? []).map(Number));
  const faltando = [...new Set((desc.match(/\d+/g) ?? []).map(Number))]
    .filter((n) => n > 0 && n <= 1000 && !noScript.has(n));
  if (faltando.length) console.log(id, latam[id]?.name, faltando.join(','));
}
```

It is crude and it over-reports — combo values, `<INFO>` random-option codes and refine
thresholds written another way all show up — but it sorts the list so the real gaps surface
first. On the Sicário/Executor batch it cut 127 items to 41 to read, of which none was a
genuine mismatch, and that "none" is a result worth having: it moved the search off the
equipment in one step instead of leaving it as an untested assumption.

**A skill whose ratio carries a trait term is a probe for the traits themselves.** Compare it
against a sibling skill in the *same* recording whose ratio does not: every ATK-side factor —
gear, buffs, crit, the target — multiplies both identically and cancels out of the ratio, so
what is left is the trait term alone. Dragon Knight has the pair ready made: Servant Weapon is
`(200 + lv×50 + POD×5) × nv/100`, while Onda de Choque and Impacto Flamejante carry no POD at
all. On a 25-buff recording Servant Weapon sat 6.8% above its siblings; sweeping POD until the
three agreed put the character 13 points over the POD its card claimed — an unmodelled buff,
measured out of a file far too contaminated to hold the engine to anything else.

Run in reverse it is a **check on the card's own numbers**: when the trait-scaling skill and
its siblings already agree, the hand-typed traits are right and a surviving residual is not a
trait problem. Worth doing early, because §2 warns that `traitsSource: 'form'` is a human
typing into a dialog.

**With no trait-scaling sibling, sweep the trait instead.** Rebuild at POD 0, 30, 60, 90… and
see which value brackets the packets. It is weaker — it cannot separate the trait from any
other multiplier — but it is decisive in one direction: if *every* value of the sweep fails,
the problem is elsewhere, and if the card's own value is the only one that fails, the card is
wrong. 3TUzT9vQ8U claimed POD 0 / STA 96 at base 235 and put every packet outside the range;
POD ≈ 30-45 brackets them. That file was benched rather than pinned — **a fixture built on
traits you have disproved is worse than no fixture**.

### An unmodelled buff, or a modelled one that does nothing?

Before concluding the engine is missing a buff, check the toggle it already has actually
moves the number. Set it to its extremes and compare:

```js
for (const n of [0, 20]) console.log(n, sim({ 'Nome Do Toggle': n }).criMax);
```

Two identical rows means the bonus key the job file emits is **not read by anything**. Grep
it — a key that appears only on the line that emits it is dead:

```bash
grep -rn "shadowScar" src/app --include=*.ts | grep -v spec
```

Profanar Arma shipped that way: `ShadowCross` emitted `meleeReduction`, no consumer existed,
and the 20-stack picker moved nothing at all, so an Executor recording climbing 27% over its
own opening cast had nothing to attribute it to. This check costs one line and distinguishes
"we never modelled it" from "we modelled it into a hole" — different fixes, and only the
second is a silent bug for every user of the class.

### Placing a modifier: rAthena decides the stage, the client decides the gate

Once you know *what* the effect is, `battle.cpp` is the authority on **where** it applies —
and the pt-BR description usually is not. "Resistência a dano físico corpo a corpo -3%" reads
like a DEF or resistance change; rAthena spends it as a plain multiplier on the finished
damage, in the target's damage-taken block:

```c
if (tsc->getSCE(SC_SHADOW_SCAR)) // !TODO: Need official adjustment for this too.
    damage += damage * (3 * tsc->getSCE(SC_SHADOW_SCAR)->val1) / 100;
```

Read the **neighbouring lines**, not just yours — they carry the gating conventions, and the
differences are the point. `SC_DARKCROW` six lines above is `(flag&(BF_SHORT|BF_MAGIC)) ==
BF_SHORT` and halves for `CLASS_BOSS`; `SC_SHADOW_SCAR` has neither, which is what the pt-BR
"Funciona em monstros do tipo Chefe" is saying. Where rAthena and the client disagree, the
client wins on the *effect* ([[ptbr-description-source-of-truth]]) — that line is ungated by
`BF_SHORT` under its own `!TODO`, while the client says "corpo a corpo", so it is gated to
melee here — but rAthena wins on **stage and arithmetic**, which the client never states.

And mind how the engine composes that stage. rAthena runs each of these as its own sequential
`damage += damage * x / 100`, so they **compound**; `getDebuffMultiplier` used to sum them,
which counts the base 100 once per active source. Harmless while the sources were mutually
exclusive, reachable the moment two belong to one class.

### The magnitude may not be in the client at all

`SKILL_META[...].description` gives no number for Profanação — "Recebe mais dano físico corpo
a corpo… acumula até 20 vezes" and nothing else. **bROWiki carries the figure the client
omits** (3% per stack, 60% at the cap) and is the fallback for exactly this, alongside
truncated text (§4b, [[browiki-source]]). Do not price it off the recording: a stacking
debuff gives you *magnitude × stacks* and the recording says neither, so a residual of +17,5%
is consistent with 6 stacks at 3% and with 20 at 0,9%. Get the per-unit value from a source,
then use the recording to **bracket** it.

### Let the packets choose between discrete unknowns

An EFST often says a toggle was on without saying *which setting*. Aplicar Toxina's 341 is
the same id whichever poison is loaded, and the calculator offers two worth different
amounts. Don't guess and don't ask if the file can answer: run the sim once per candidate and
keep the one whose range contains every packet.

That is a strong test when the states differ enough. On LfVVfKMZg3, Pyrexia put the recorded
criticals **below** the simulated floor in all three states carrying the buff — impossible by
sampling (see the top of this section) — while Magic Mushroom bracketed all three and hugged
both ends. One run each, and a state you would otherwise have had to write down as unknown
becomes a fixture assertion.

## 10. Land it as tests

Commit the `.rrf` under `src/app/replay/__tests__/fixtures/` (the folder already versions
several; they never change, so the binary blob is stored once) and write a spec that:

1. imports the build from the fixture — never retype the gear by hand;
2. asserts the crits by **equality** and the non-crits by range;
3. keeps a guard that the range is tight (`max/min < 1.12`), or a wrong ratio would still fit
   — read it off the state rather than pasting the constant: EDP-style multipliers widen the
   weapon roll and a legitimately correct state can sit at 1.13;
4. pins any residual that is still open, with a comment saying what was ruled out and how, so
   the next attempt starts where this one stopped.

`NightWatch.replay.spec.ts`, `nw-mira-damage.spec.ts` and `nw-mastery-gap.spec.ts` are the
worked examples of the three shapes (formula tables, packet-by-packet, open residual).
`GuillotineCross.cross-impact-gear-states.spec.ts` is the fourth: one file walked through
five states, with the bare-handed window asserted by equality and each geared window
bracketed.

**Prove the guard bites.** A spec that passes both before and after the fix is decoration.
Re-break the thing you fixed — flip the bonus key back, restore the old formula — and confirm
the new test fails, then restore. One `sed` round-trip, and it is the only evidence the
fixture is a regression guard rather than a snapshot of today's output.

### Sweep the existing specs before believing a systematic fix

When the cause turns out to be a **formula** rather than an item, other recordings already in
the repo have been living with it — and the ones that noticed will have written it down. Grep
for the pins:

```bash
grep -rniE "open|still open|pins the|gap|divergence" src/app --include=*.spec.ts | grep -i "cri\|atk\|luk"
```

Fixing `getBaseCriRate` turned up three specs pinning that exact discrepancy, each carrying
the game's real value in a comment (`expect(...).toBe(42); // game: 41`). All three resolved
in the game's favour, which is corroboration from three independent characters that no single
recording could supply — and one of them had recorded a contradiction (SP_ATK1 demanded LUK
108, SP_CRITICAL demanded 105-107, "so either the base-ATK formula or the crit one is still
wrong") that the fix dissolved.

So: a failing spec after a formula change is not automatically a regression. Read its comment
first — it may be the old bug, pinned. When it is, **update the assertion to the game's value
and rewrite the comment to record the resolution**; don't delete the note, it is the history
of how the thing was caught. Two of those three said explicitly that settling the question
needed a recording at a different LUK, which is exactly what arrived.

## Cleanup

Delete your scratch specs **by name**. `rm _tmp-*.spec.ts` is not safe — that folder can hold
the user's own git-ignored scratch files, and a glob will take them with it.
