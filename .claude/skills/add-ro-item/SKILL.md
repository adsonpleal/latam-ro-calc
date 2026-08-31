---
name: add-ro-item
description: Add one or more LATAM items to the calculator's item.json from their in-game (pt-BR) description — infers the bonus script, the structural fields, and set/combo bonuses (matched by item id). Use when items are missing from the calc DB, e.g. the ids reported by the replay-import "X ignorado(s) (fora do banco de dados)" toast, or any "item não está no banco de dados" situation.
---

# Add RO item(s) to the calculator DB

Items the calculator can't calculate are the ones missing from `src/assets/demo/data/item.json` (the LATAM overlay only adds pt-BR name/description, never the script/stats). This skill turns an item **id** into a complete `item.json` record: structural fields + the bonus **script** (incl. id-matched set combos).

## Inputs
One or more numeric item ids. The pt-BR name, description and `aegisName` are already in `latam-items.json` (the aegisName comes from `data/itemmoveinfov5.txt`; see [[latam-localization]]).

## Procedure

### 1. Scaffold
```
node .claude/skills/add-ro-item/scaffold.mjs <id> [<id> ...]
```
For each id it prints: pt name, aegisName, inferred `location`/`itemTypeId`/`itemSubTypeId` (from item.json), parsed `defense`/`weight`/`requiredLevel`, the isolated **effect/combo lines**, and a **record skeleton** with `script: {}`. (Skips ids already in item.json.)

### 2. Structural fields — the scaffold fills these; verify a couple
The scaffold maps the slot to **authoritative** `itemTypeId`/`itemSubTypeId`/`location` (these route the calc's equip dropdowns in `setItemDropdownList`):
- Normal gear: `itemTypeId: 2` + ItemSubTypeId enum — head 512 (+`location` Upper/Middle/Lower), Armor 513, Shield 514, Garment 515, Boot/Shoes 516, Acc 517. **Do NOT copy the `location`-tagged 526-530 items — those are shadow gear.**
- **Costume / `[Visual]`**: `itemTypeId: 9`, subtype 519 (Upper) / 520 (Middle) / 521 (Lower) / 522 (Garment). The scaffold detects "Tipo: Visual".
- `slots`: the scaffold now fills this from the **client-authoritative `slots`** field in `latam-items.json` (the client's `slotCount`, via `tools/sync-latam-db.mjs`) — trust it. The LATAM display name drops the `[1]` suffix, so do **not** infer slots from the name. The scaffold falls back to the name-suffix parse only for entries predating the slots extraction (it flags this in its output); in that case re-run `node tools/sync-latam-db.mjs` so the entry gets the client's `slotCount`, and if it still has none, ask the user rather than guessing. Garments/armor/etc. cap at 1; weapons can have more. A slotted item left at `slots: 0` silently hides its card slot in the calc.
- **Weapons**: scaffold leaves them blank — set `itemTypeId: 1` and copy `itemSubTypeId` (the weapon class) from a same-class weapon in item.json.
- **Accessories**: subtype `517` works both sides; use `510` (right) / `511` (left) only if the bonus is side-specific.
- Leave `name` as the pt name and `description: ""` — `RoService` overlays pt name/description and sets `presentInLatam` at runtime from `latam-items.json`.

### 3. Bonus script — map each effect line to a bonus key
Each script value is `"<key>": ["<entry>", ...]`. An entry is one of:
| form | meaning | description trigger |
|------|---------|---------------------|
| `"100"` | flat / unconditional | `ATQ +100.` |
| `"X---Y"` | `floor(refino / X) · Y` (step) | `A cada X refinos: +Y` |
| `"X===Y"` | `+Y` when `refino ≥ X` (threshold) | `Refino +X ou mais: +Y` |
| `"EQUIP_ID[id]Y"` or `"EQUIP_ID[id]===Y"` | `+Y` when item `id` is also equipped (combo) | `Conjunto [Partner]: +Y` |
| `"SKILL_ID[id==lv]Y"` | `+Y` when the **learned** (passive) skill `id` is at level ≥ `lv` | `Se aprendeu <Perícia> Nv lv: +Y` |
| `"SKILL_ID[id==N]---Y"` | `floor(skillLevel / N) · Y` (scale by learned level) | `A cada N níveis de <Perícia>: +Y` |
| `"ACTIVE_SKILL_ID[id]Y"` | `+Y` while the **active/used** skill `id` is in play | `Ao usar <Perícia>: +Y` |

`EQUIP_ID` grammar: `&&` = all required, `||` = any-of, e.g. `EQUIP_ID[480062||480063]50`. Multiple entries on one key stack: `"atk": ["100", "2---10", "EQUIP_ID[480062]50"]`.

**Reference skills by id, never by name.** `SKILL_ID[...]` / `ACTIVE_SKILL_ID[...]` are the id-based forms of the engine's older name tokens (`LEARN_SKILL[Name==lv]` / `ACTIVE_SKILL[Name]`) — prefer the id form for the same reason as `EQUIP_ID`: it survives pt-BR renaming and avoids guessing the exact internal English skill name (e.g. `SKILL_ID[2008==1]---2` instead of `LEARN_SKILL[Dragon Breath==1]---2`). `SKILL_ID2[id==lv]` is the niche variant of `LEARN_SKILL2`. Find a skill **id** in the Skill Catalog (`SKILL_META` / `SKILL_ID_BY_NAME`, `src/app/skills`) — the `id` field next to the pt-BR `label`. Parsed in `calculator.ts` (`learnedSkillIdMap` / `usedSkillIdSet` + the `SKILL_ID[...]` / `ACTIVE_SKILL_ID[...]` branches in `validateCondition`).

**Bonus-key map (pt-BR phrase → key).** The authoritative key list is `src/app/utils/create-raw-total-bonus.ts` — read it rather than trusting a count written here, which drifts (it said 187 long after the file had passed 240). Common ones:

- Stats: `FOR→str AGI→agi VIT→vit INT→int DES→dex SOR→luk`, all → `allStatus`.
- Traits: `POD→pow STA→sta SAB→wis FEI→spl CON→con CRV→crt`, all → `allTrait`.
- `ATQ→atk`, **`Dano físico +N%`→`atkPercent`**; `ATQM / ATK Mágico→matk`, **`Dano mágico +N%`→`matkPercent`**. The *bare* percentage line (no `contra`, `a distância`, `corpo a corpo`, `crítico`) is the new translation of what the client used to print as `ATQ +N%` / `ATQ da arma +N%`; the old wording still shows up on 3 items. The `p_final`/`m_final` keys ("dano final", a multiplier applied after DEF) **no longer exist** — they were removed from the engine on 27/07/2026, because the client prints "dano final" nowhere and all 68 entries using them were this same line (see `src/app/core/__tests__/dano-fisico-percent.spec.ts`).
- `HP máx→hp`, `+N%→hpPercent`; `SP máx→sp`, `+N%→spPercent`.
- `DEF→def DEFM→mdef RES→res RESM/M.RES→mres`.
- `Velocidade de ataque +N%→aspdPercent`, `ASPD +N→aspd`.
- `Pós-conjuração -N%→acd` · `Conjuração variável -N%→vct` · `Tempo de conjuração fixo -N%→fctPercent`. **Sign: store the reduction as a positive number** — `-5%` → `["5"]` (verified: Expert_Ring `acd:5` ↔ "Pós-conjuração -5%").
- `Crítico→cri` · `Dano de crítico +N%→criDmg` · `Precisão→hit` · `Esquiva→flee` · `Alcance de ataque→range`.
- `P.ATQ→pAtk · S.ATQM→sMatk · C.MAIS→cRate · hplus`.
- Sustain (display only, see §3b): `Efetividade de cura→healPower · Cura recebida→healReceived · Regen. natural de HP/SP→hpRecovRate`/`spRecovRate · converter dano em HP/SP→hpDrain`/`spDrain · Resistência a danos refletidos→reduceDamageReturn`.
- Damage modifiers (suffix tables below):
  - `Dano físico contra <raça> +N%` → `p_race_<r>`; `Dano mágico contra <raça>` → `m_race_<r>`.
  - `Dano físico contra tamanho <P/M/G>` → `p_size_<s|m|l>`.
  - `Dano de/contra <elemento>` → `p_element_<e>` (physical) / `m_element_<e>` (magic vs enemy element) / `m_my_element_<e>` (boosts your element).
  - `Ignora <N>% de RES de <raça>` → `p_pene_race_<r>`; MRES → `m_pene_race_<r>`.
  - raça: `todas→all Amorfo→formless Morto-Vivo→undead Bruto→brute Planta→plant Inseto→insect Peixe→fish Demônio→demon Humanoide→demihuman Anjo→angel Dragão→dragon`.
  - tamanho: `Pequeno→s Médio→m Grande→l`.
  - elemento: `Neutro→neutral Água→water Terra→earth Fogo→fire Vento→wind Veneno→poison Sagrado→holy Sombrio→dark Fantasma→ghost Morto-Vivo→undead`.

**When unsure of a key or its sign/scale, confirm against an existing item that already has the same phrase:**
```
node -e "const it=require('./src/assets/demo/data/item.json');const la=require('./src/assets/demo/data/latam-items.json');const c=s=>(s||'').replace(/\^[0-9a-fA-F]{6}/g,'');for(const x of Object.values(it)){const d=c(la[x.id]?.description);if(d.includes('PHRASE')){console.log(x.id,JSON.stringify(x.script));break}}"
```
Replace `PHRASE` (e.g. `Pós-conjuração`). Match the key it uses and the sign. **Never guess a key that isn't in `create-raw-total-bonus.ts`** — a wrong key is worse than no key. But "no key yet" is not the same as "leave it out": see §3b.

### 3b. Effects with no key yet — register them as display-only stats

A description line has **three** possible outcomes, not two. Mapping it to an existing key is
the first; dropping it is the last resort; and in between there is a real one:

> **If the line states a quantified, always-on effect that the engine simply has no stage
> for, give it a display-only key rather than dropping it.**

The calculator models damage *dealt*. Healing, regeneration, life/mana leech and
reflected-damage reduction have nowhere to enter it — which is why they were silently absent
for years. That silence had a cost: ~300 records scored nothing at all, and eight Automatron
automódulos shipped with `script: {}` while the game plainly grants them something. A
display-only key ends that: the item's bonus list and the breakdown dialog name it, the
Resumo de atributos can show a row for it, and a replay import carries it.

**These already exist — reuse them before inventing anything** (all in
`create-raw-total-bonus.ts`, all documented on `EquipmentSummaryModel`):

| pt-BR line | key |
|---|---|
| `Efetividade de cura +N%` (the heal you cast) | `healPower` |
| `Cura recebida +N%` / `Efetividade de cura recebida` (the heal cast on you) | `healReceived` |
| `Regen. natural de HP +N%` | `hpRecovRate` |
| `Regen. natural de SP +N%` | `spRecovRate` |
| `X% de chance de converter N% do dano físico causado em HP` | `hpDrain` |
| …`em SP` | `spDrain` |
| `Resistência a danos refletidos +N%` | `reduceDamageReturn` |
| `[Cura Mágica]` proc | `magicHealHp` |
| `[Cura Espiritual]` / `[Cura Mística]` proc | `magicHealSp` |

**The hard line: a display-only key must never enter the damage pipeline.** This is not a way
around the "no new damage modifiers" rule — that still stands for anything the damage math
reads. If the effect *would* change damage, it is a modifier, and it is not yours to invent:
report the gap and let the user judge. `src/app/core/healing-stats.spec.ts` holds the line
with a test that a build carrying every sustain key deals damage identical to one carrying
none; extend it when you add a key.

**Adding a new display-only key** — five places, in this order:

1. `src/app/models/equipment-summary.model.ts` — the field, with a doc comment saying it is
   display only and why the engine has no stage for it.
2. `src/app/utils/create-raw-total-bonus.ts` — `<key>: 0`.
3. `src/app/core/bonus-key-label.ts` — `ITEM_BONUS_LABELS`, so the breakdown can name it.
4. `src/app/layout/pages/ro-calculator/stats-summary.ts` — a row, **if** the stat is a
   summable always-on figure worth headlining. Adding one changes the column depths that
   `stats-summary.spec.ts` pins. A key with no row is still visible in the item's bonus list.
5. A spec: the values it sums off the description, **and** the damage-unchanged guard.

Two conventions the healing/sustain sweep settled — follow them:

- **The key holds the magnitude, not the trigger chance.** "2% de chance de converter 3% do
  dano em HP" is `hpDrain: ["3"]`. A chance belongs to one item and does not sum across a
  build. Do **not** add a `chance__<key>` for these: that key puts the item in the "Efeitos"
  damage checklist, which is the wrong surface for a cosmetic stat.
- **Normalise the unit when the client is inconsistent.** `[Cura Mágica]` is worded "300 de HP
  por segundo" on 19404 and "500 de HP a cada 0,4 segundos" on 310115 — both are stored per
  second, so the column adds up.

**Still leave out** (and say so in the report): procs whose chance or duration the description
never states; gates the engine has no context for ("Apenas nos Castelos TE", "Em mapas de GdE
e PvP", "Durante a transformação"); and scales on a skill absent from the Skill Catalog.

### 4. Combos — only this item's own, matched by id

> **The pt-BR description is the source of truth.** It decides **which pieces** the set
> needs and **what bonus** it grants. `latam-items.json` is the lookup for **ids** —
> never the authority on the effect. When the two disagree, encode the description and
> say so in the report so the user can arbitrate.

- Encode **only the combos that appear in THIS item's description** (`Conjunto [Partner]`). The partner item declares its own combos in its own description — don't duplicate.
- Read the set off the pt-BR description in `latam-items.json`, minding how it groups the pieces: partners listed together are **all required**; an `ou` line separates **alternative** groups. `[A] [B] ou [C] [D]` = `EQUIP_ID[A&&B]` plus `EQUIP_ID[C&&D]` (one entry per alternative — `||` only ORs *within* one group, so an or-of-pairs cannot be a single token).
- Resolve the partner **ids** by looking the partner's pt-BR name up in `latam-items.json` (the GRF-derived name↔id table — the same file the description came from). Match the **exact** name the description prints, brackets included.
  - A name that matches **several ids** (re-releases, `[Apoio]`/costume variants) is ambiguous — narrow it by slot/type against `item.json`, and if it's still ambiguous, **report the candidates to the user** instead of picking one.
  - A partner name that matches **nothing** has no id to gate on: leave that alternative unencoded and report it. Don't invent an id.
- ⚠ Encode exactly the groups the description describes — **do not widen the condition to fire on a subset**. For a 3-piece set, equipping any 2 of the 3 must NOT grant the bonus. Real example: 410183 Diadema Radiante has 6 real three-piece sets (circlet + a gem pair); encoding the 12 circlet-plus-one-accessory pairs would make it fire on half a set.
- Encode with `EQUIP_ID[<partnerId>]<value>` (implemented in `calculator.ts` — `equipItemIdSet` + the `EQUIP_ID[...]` branch in `validateCondition`). Using the **id** avoids the pt-BR rename / `[Apoio]` bracket problem that breaks name-based `EQUIP[...]`.

Example — 450147 (Colete Ilusión A), description combos with 480062 (ATQ +50) and 480063 (cast delay −10%):
```json
"script": {
  "atk":         ["100", "2---10", "EQUIP_ID[480062]50"],
  "aspdPercent": ["7===10"],
  "acd":         ["EQUIP_ID[480063]10"]
}
```

### 4b. When the client text is truncated
The GRF description occasionally cuts off (e.g. the Passe de Batalha enchants). In that
case **bROWiki** (browiki.org) carries the complete pt-BR text — `WebFetch` gets a 403,
so open it in the in-app browser and read `textContent` off the collapsed tables. It is a
fallback for *text the client truncated*, never a replacement for the client as the
authority on names, ids or slots. See [[browiki-source]].

### 5. Apply
Write the finished record(s) to a temp JSON file (array of full records), then:
```
node .claude/skills/add-ro-item/apply.mjs /tmp/new-items.json
```
It appends them to `item.json` with a minimal diff and skips ids already present. (No need to regenerate anything — `item.json` is the source of truth; the pt overlay is applied at runtime.)

### 6. Verify
- The dev preview rebuilds; confirm "Compiled successfully" in its logs.
- Re-run `scaffold.mjs <id>` → it should now report "ALREADY in item.json".
- In the calculator: pick the item in its slot, check the bonus shows; for combos, equip both partners and confirm the set bonus applies (and disappears when one is removed).
- **Slots:** confirm `slots` matches the client's `slotCount` (the `slots` field in `latam-items.json`) and that the calc shows that many card slots on the equipped item — a slotted item left at `slots: 0` silently hides its card slot.

## Rules & gotchas
- One record per id; `id` + a `script` object are required (the script may be `{}` for a pure-stat/vanity item).
- `aegisName` is a label only (no calc effect) — take it from `latam-items.json`.
- Don't re-add an id that's already in item.json (apply.mjs guards this).
- Costume/`[Visual]` items: **add them too — do not skip.** The scaffold routes them to a costume slot (`itemTypeId 9`, subtype 519-522). Their `script` is usually `{}`, but check the description for costume-enchant/stat effects.
- Keep effects you can't confidently map **out** of the script rather than guessing — but check §3b first: an effect the engine has no *stage* for is a display-only key, not a drop.
