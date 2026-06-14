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
For each id it prints: pt name, aegisName, inferred `location`/`itemTypeId`/`itemSubTypeId` (from item.json), parsed `defense`/`weight`/`requiredLevel`, the isolated **effect/combo lines**, a divine-pride URL, and a **record skeleton** with `script: {}`. (Skips ids already in item.json.)

### 2. Structural fields — the scaffold fills these; verify a couple
The scaffold maps the slot to **authoritative** `itemTypeId`/`itemSubTypeId`/`location` (these route the calc's equip dropdowns in `setItemDropdownList`):
- Normal gear: `itemTypeId: 2` + ItemSubTypeId enum — head 512 (+`location` Upper/Middle/Lower), Armor 513, Shield 514, Garment 515, Boot/Shoes 516, Acc 517. **Do NOT copy the `location`-tagged 526-530 items — those are shadow gear.**
- **Costume / `[Visual]`**: `itemTypeId: 9`, subtype 519 (Upper) / 520 (Middle) / 521 (Lower) / 522 (Garment). The scaffold detects "Tipo: Visual".
- `slots`: confirm from divine-pride's `[N]` (the scaffold defaults from the name, usually `0`) — a slotted armor needs `slots: 1`.
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

`EQUIP_ID` grammar: `&&` = all required, `||` = any-of, e.g. `EQUIP_ID[480062||480063]50`. Multiple entries on one key stack: `"atk": ["100", "2---10", "EQUIP_ID[480062]50"]`.

**Bonus-key map (pt-BR phrase → key).** The authoritative key list is `src/app/utils/create-raw-total-bonus.ts` (187 keys). Common ones:

- Stats: `FOR→str AGI→agi VIT→vit INT→int DES→dex SOR→luk`, all → `allStatus`.
- Traits: `POD→pow STA→sta SAB→wis FEI→spl CON→con CRV→crt`, all → `allTrait`.
- `ATQ→atk`, `ATQ +N%→atkPercent`; `ATQM / ATK Mágico→matk`, `+N%→matkPercent`.
- `HP máx→hp`, `+N%→hpPercent`; `SP máx→sp`, `+N%→spPercent`.
- `DEF→def DEFM→mdef RES→res RESM/M.RES→mres`.
- `Velocidade de ataque +N%→aspdPercent`, `ASPD +N→aspd`.
- `Pós-conjuração -N%→acd` · `Conjuração variável -N%→vct` · `Tempo de conjuração fixo -N%→fctPercent`. **Sign: store the reduction as a positive number** — `-5%` → `["5"]` (verified: Expert_Ring `acd:5` ↔ "Pós-conjuração -5%").
- `Crítico→cri` · `Dano de crítico +N%→criDmg` · `Precisão→hit` · `Esquiva→flee` · `Alcance de ataque→range`.
- `P.ATQ→pAtk · S.ATQM→sMatk · C.MAIS→cRate · hplus`.
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
Replace `PHRASE` (e.g. `Pós-conjuração`). Match the key it uses and the sign. **Never guess a key that isn't in `create-raw-total-bonus.ts`** — leaving an effect out is better than a wrong key.

### 4. Combos — only this item's own, matched by id
- Encode **only the combos that appear in THIS item's description** (`Conjunto [Partner]`). The partner item declares its own combos in its own description — don't duplicate.
- Get the partner **ids** + exact bonus from divine-pride (`https://www.divine-pride.net/database/item/<id>` — the "Item Combo / Set" section lists each set's member ids and bonus). The GRF description can be incomplete; divine-pride is the combo source of truth.
- Encode with `EQUIP_ID[<partnerId>]<value>` (implemented in `calculator.ts` — `equipItemIdSet` + the `EQUIP_ID[...]` branch in `validateCondition`). Using the **id** avoids the pt-BR rename / `[Apoio]` bracket problem that breaks name-based `EQUIP[...]`.

Example — 450147 (Colete Ilusión A), description combos with 480062 (ATQ +50) and 480063 (cast delay −10%):
```json
"script": {
  "atk":         ["100", "2---10", "EQUIP_ID[480062]50"],
  "aspdPercent": ["7===10"],
  "acd":         ["EQUIP_ID[480063]10"]
}
```

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

## Rules & gotchas
- One record per id; `id` + a `script` object are required (the script may be `{}` for a pure-stat/vanity item).
- `aegisName` is a label only (no calc effect) — take it from `latam-items.json`.
- Don't re-add an id that's already in item.json (apply.mjs guards this).
- Costume/`[Visual]` items: **add them too — do not skip.** The scaffold routes them to a costume slot (`itemTypeId 9`, subtype 519-522). Their `script` is usually `{}`, but check the description for costume-enchant/stat effects.
- Keep effects you can't confidently map **out** of the script rather than guessing.
