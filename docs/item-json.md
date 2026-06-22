# Formato do `item.json`

Referência completa do banco de itens da calculadora: **`src/assets/demo/data/item.json`**.

Cada item descreve **o que** ele concede (chaves de bônus), **quanto** (o valor) e **quando**
(condições). O objetivo deste documento é mapear *todos* os parâmetros aceitos, porque a
sintaxe do campo `script` é compacta e pouco óbvia.

> **Nome e descrição em pt-BR são aplicados em runtime.** O `RoService` sobrepõe `name` e
> `description` a partir de `latam-items.json` e marca `presentInLatam`. Por isso, ao
> cadastrar um item você deixa `name` com o nome pt e `description: ""` — não precisa
> preencher a descrição aqui.

> **Prefira identificar por id, não por nome.** Várias condições antigas casam itens e
> perícias pelo **nome** em inglês. Isso quebra quando o nome muda na localização pt-BR ou
> ganha um sufixo como `[Apoio]`. As versões **por id** (`EQUIP_ID`, `SKILL_ID`,
> `ACTIVE_SKILL_ID`, `SKILL_ID2`) são estáveis e devem ser usadas em itens novos. As formas
> por nome estão marcadas como **Legado** nas tabelas abaixo.

---

## 1. Estrutura de uma entrada

O arquivo é um objeto cuja **chave é o id do item**. Exemplo mínimo:

```jsonc
"450147": {
  "id": 450147,
  "aegisName": "Illusion_Vest_A",
  "name": "Colete Ilusión A",
  "unidName": "Armor",
  "resName": "환영의-나뭇잎",
  "description": "",
  "slots": 1,
  "itemTypeId": 2,
  "itemSubTypeId": 513,
  "itemLevel": null,
  "attack": null,
  "defense": 0,
  "weight": 60,
  "requiredLevel": 100,
  "location": null,
  "compositionPos": null,
  "usableClass": ["Swordman"],
  "script": {
    "atk": ["100", "2---10", "EQUIP_ID[480062]50"],
    "aspdPercent": ["7===10"],
    "acd": ["EQUIP_ID[480063]10"]
  }
}
```

### Campos estruturais

| Campo            | Tipo            | Descrição |
|------------------|-----------------|-----------|
| `id`             | número          | Id do item (igual à chave). |
| `aegisName`      | string          | Nome interno (AegisName) do servidor. |
| `name`           | string          | Nome exibido — fica em pt-BR (sobreposto em runtime). |
| `unidName`       | string          | Nome genérico do tipo (ex.: `Armor`). |
| `resName`        | string          | Nome do recurso gráfico (sprite). |
| `description`    | string          | Deixe `""`; a descrição pt-BR vem de `latam-items.json`. |
| `slots`          | número          | Quantidade de cartas. Vem do GRF; **não** infira pelo `[1]` do nome. `0` esconde o slot. |
| `itemTypeId`     | número          | Categoria: `1` arma, `2` equipamento, `9` traje/visual. |
| `itemSubTypeId`  | número          | Subtipo — define onde o item entra nos dropdowns (ver abaixo). |
| `itemLevel`      | número \| null  | Nível do item (usado pela condição `ITEM_LV`). |
| `attack`         | número \| null  | ATQ base (armas). |
| `defense`        | número          | DEF base. |
| `weight`         | número          | Peso. |
| `requiredLevel`  | número          | Nível mínimo para usar. |
| `location`       | string \| null  | Posição para itens de topo/meio/base (ex.: `Upper`, `Lower`). |
| `compositionPos` | string \| null  | Posições combináveis (chapéus multi-slot). |
| `usableClass`    | string[]        | Classes que podem equipar (nomes internos, ex.: `Swordman`). |
| `script`         | objeto          | Os bônus do item — o coração deste documento (seções 2–5). |

**Mapa de `itemSubTypeId`** (equipamento normal, `itemTypeId: 2`): topo `512` (+`location`),
armadura `513`, escudo `514`, capa `515`, calçado `516`, acessório `517` (ou `510` direito /
`511` esquerdo se o bônus for específico do lado). Trajes/`[Visual]` usam `itemTypeId: 9` e
subtipos `519`/`520`/`521`/`522`. Armas usam `itemTypeId: 1` e o `itemSubTypeId` é a classe
da arma. **Não** copie os subtipos `526`–`530`: são equipamentos de sombra.

---

## 2. O objeto `script`

```jsonc
"script": {
  "<chave de bônus>": ["<entrada>", "<entrada>", ...],
  ...
}
```

- A **chave** diz *o que* o item afeta (ATQ, HP, dano de uma perícia, etc.) — seção 3.
- Cada **entrada** da lista é avaliada de forma independente e os resultados são **somados**.
- Uma entrada tem o formato `[condições][valor]`:
  1. As **condições** (seção 5) são "portões". Se *qualquer* uma falhar, a entrada vale `0`.
  2. O **valor** restante (seção 4) é interpretado conforme o separador:
     - contém `---` → bônus por degrau (`floor(base / X) · Y`);
     - contém `===` → limiar de refino (`refino ≥ X ? Y : 0`);
     - caso contrário → valor fixo (número puro).

Exemplo: `"EQUIP_ID[480062]50"` → a condição `EQUIP_ID[480062]` exige que o item `480062`
esteja equipado; passando, sobra `50` (valor fixo).

---

## 3. Chaves de bônus (o "o quê")

A lista **autoritativa** de chaves de atributo está em
[`src/app/utils/create-raw-total-bonus.ts`](../src/app/utils/create-raw-total-bonus.ts)
(187 chaves). **Nunca** invente uma chave fora dessa lista — deixar o efeito de fora é
melhor que uma chave errada. Categorias principais:

| Categoria            | Exemplos de chave |
|----------------------|-------------------|
| Atributos            | `str` `agi` `vit` `int` `dex` `luk`; todos → `allStatus` |
| Atributos de 4ª      | `pow` `sta` `wis` `spl` `con` `crt`; todos → `allTrait` |
| ATQ / ATQM           | `atk` `atkPercent` · `matk` `matkPercent` |
| HP / SP              | `hp` `hpPercent` · `sp` `spPercent` |
| Defesas              | `def` `mdef` `res` `mres` |
| Conjuração / pós     | `aspd` `aspdPercent` · `vct` (conj. variável) · `fctPercent` (conj. fixa) · `acd` (pós-conj.) |
| Crítico / acerto     | `cri` `criDmg` `hit` `flee` |
| Avançados            | `pAtk` `sMatk` `cRate` `hplus` `range` |
| Dano por raça        | `p_race_<raça>` (físico) · `m_race_<raça>` (mágico) |
| Dano por tamanho     | `p_size_<s\|m\|l>` |
| Dano por elemento    | `p_element_<e>` · `m_element_<e>` · `m_my_element_<e>` |
| Penetração           | `p_pene_race_<raça>` · `m_pene_race_<raça>` |
| Dano vs. classe      | `p_class_all` |
| Dano vs. monstro     | `dmg__<aegisDoMonstro>` |
| **Dano de perícia**  | a **chave é o id da perícia** — ex.: `"382"` = Tiro Preciso (ver abaixo) |

Sufixos: raça `all` `formless` `undead` `brute` `plant` `insect` `fish` `demon` `demihuman`
`angel` `dragon`; tamanho `s` `m` `l`; elemento `neutral` `water` `earth` `fire` `wind`
`poison` `holy` `dark` `ghost` `undead`. **Sinais:** reduções de conjuração/pós-conjuração
são guardadas como número **positivo** (`-5%` → `"5"`).

### 3.1 Dano de perícia — por id (preferencial)

Um bônus de "+X% de dano da perícia Y" usa o **id da perícia** como chave. O id sai do
Catálogo de Perícias ([`src/app/skills`](../src/app/skills), campo `id` ao lado do `label`
pt-BR). Exemplo: `"382": ["30"]` = +30% de dano em **Tiro Preciso** (Focused Arrow Strike).

> **Legado:** chaves de perícia por **nome** ainda funcionam (fallback), mas para perícias
> que já têm id no catálogo isso é considerado migração pendente — um teste em
> `item-skills.spec.ts` falha se uma chave ficar num nome que possui id. Use sempre o id.

### 3.2 Modificadores por perícia (prefixos)

Alguns bônus afetam *parâmetros* de uma perícia específica. A chave é `prefixo__<id>`:

| Prefixo        | Efeito na perícia |
|----------------|-------------------|
| `cd__<id>`     | Reduz o tempo de recarga (cooldown). |
| `acd__<id>`    | Reduz o pós-conjuração da perícia. |
| `vct__<id>`    | Reduz a conjuração variável da perícia. |
| `fix_vct__<id>`| Reduz a conjuração fixa da perícia. |
| `fct__<id>` / `fctPercent__<id>` | Reduz o tempo de conjuração fixo. |

Ex.: `"cd__5330": ["EQUIP[Angel Wing Bow]GRADE[weapon==C]===1.3"]` = −1.3s de recarga em
Vendaval de Flechas (id 5330) quando equipado com o arco de grau C.

### 3.3 Chance (proc) — `chance__`

A chave `chance__<algo>` registra uma **chance** (em %) de um efeito, exibida na lista de
chances em vez de somar direto ao status. Pode empilhar com outros prefixos
(ex.: `chance__cd__<id>`).

---

## 4. Valores (o "quanto")

Formas que o valor de uma entrada pode assumir (depois que as condições passam):

| Forma                      | Significado | Exemplo |
|----------------------------|-------------|---------|
| `"100"`                    | Valor fixo. | `"atk": ["100"]` → ATQ +100 |
| `"X---Y"`                  | Por degrau de refino: `floor(refino / X) · Y`. | `"2---10"` → +10 a cada 2 refinos |
| `"X===Y"`                  | Limiar de refino: `+Y` se `refino ≥ X`. | `"7===10"` → +10 com refino ≥ 7 |
| `"Y(texto)"`               | Valor fixo `Y`; o texto entre parênteses é só anotação (ignorado). | `"50(90 seg)"` → 50 |
| `"<status>:N---Y"`         | Por ponto de status: `floor(status / N) · Y`. `<status>` ∈ `level jobLevel str int dex agi vit luk`. | `"dex:10---1"` |
| `"<status>:N===Y"`         | `+Y` se `model[status] ≥ N`. | `"str:80===10"` |
| `"level:N(min-max)---Y"`   | A cada `N` níveis dentro da faixa: escala por `(min(max, nível) − min + 1)`. | `"level:1(1-125)---1"` |
| `"SUM[a,b==N]---Y"`        | `floor((soma dos status a,b) / N) · Y`. | `"SUM[str,luk==80]---6"` |
| `"REFINE[slot==N]---Y"`    | `floor((refino somado dos slots) / N) · Y`. | `"REFINE[boot==1]---2"` |
| `"REFINE_NAME[Nome==N]---Y"` | Como acima, mas o slot é identificado por **nome** do item. *(por nome — ver Legado)* | `"REFINE_NAME[Judgment Slasher==3]---5"` |
| `"GVALUE[slot==N]---Y"`    | `floor((valor do grau do slot) / N) · Y` (D=1, C=2, B=3, A=4). | `"GVALUE[weapon==1]---2"` |

---

## 5. Condições (o "quando")

Portões avaliados antes do valor. Podem ser **encadeados** numa mesma entrada
(ex.: `EQUIP[...]GRADE[weapon==C]===20`); todos precisam passar. Dentro de `[...]`,
`&&` = "todos" e `||` = "qualquer um".

| Condição | Significado | Legado? |
|----------|-------------|---------|
| `str:N&&<resto>` | Atributo principal ≥ N (forma `status:N&&valor===`). | — |
| `LEVEL[N]` / `LEVEL[min-max]` | Nível de base na faixa. | — |
| `WEAPON_LEVEL[N]` | Nível da arma equipada é N. | — |
| `WEAPON_TYPE[bow\|\|...]` | Tipo da arma (categoria). | — |
| `[weaponType=Pistol]` | Subtipo específico da arma. | — |
| `GRADE[slot==A]` | Grau do item no slot ≥ A (D<C<B<A). `me` = este item. | — |
| `GRADES[a==A&&b==A]` | Vários graus de uma vez. | — |
| `SUM[str,luk==N]` | Soma de atributos ≥ N. | — |
| `REFINE[N]` | Refino **deste** item ≥ N. | — |
| `REFINE[slot==N]` / `REFINE[a,b==N]` | Refino somado dos slots ≥ N. | — |
| `XREFINEX[slot==N]` | Refino de um slot ≥ N (até 3 por entrada). | — |
| `ITEM_LV[me==N]` / `ITEM_LV[slot==N]` | `itemLevel` do item no slot é N. | — |
| `POS[slot]` | Este item está no slot indicado. | — |
| `SPAWN[mapa1\|\|mapa2]` | O monstro-alvo aparece em algum dos mapas. | — |
| `USED[Classe\|\|...]` | A classe atual é uma das listadas. | — |
| **`EQUIP_ID[id]`** | **Item `id` também equipado (combo).** | **Use esta** |
| `EQUIP[Nome]` | Item por **nome** equipado (combo). | ⚠️ Legado → `EQUIP_ID` |
| `POS_SPECIFIC[slot==Nome]` | Item específico (por **nome**) num slot. | por nome¹ |
| `REFINE_NAME[Nome==N]` | Refino somado de itens por **nome**. | por nome¹ |
| **`SKILL_ID[id==lv]`** | **Perícia passiva `id` aprendida em nível ≥ `lv`.** | **Use esta** |
| `LEARN_SKILL[Nome==lv]` | Perícia passiva por **nome** aprendida ≥ `lv`. | ⚠️ Legado → `SKILL_ID` |
| **`SKILL_ID2[id==lv]`** | Variante de `SKILL_ID` (gramática de `LEARN_SKILL2`). | **Use esta** |
| `LEARN_SKILL2[Nome==lv]` | Variante por **nome**. | ⚠️ Legado → `SKILL_ID2` |
| **`ACTIVE_SKILL_ID[id]`** | **Perícia ativa/em uso `id`.** | **Use esta** |
| `ACTIVE_SKILL[Nome]` | Perícia ativa por **nome**. | ⚠️ Legado → `ACTIVE_SKILL_ID` |

¹ `POS_SPECIFIC` e `REFINE_NAME` casam por nome e não têm equivalente por id hoje; use-os
só quando não houver alternativa.

> **Como achar o id de uma perícia:** no Catálogo de Perícias
> ([`src/app/skills`](../src/app/skills)) cada entrada tem `id` (id do jogo) ao lado do
> `label` (nome pt-BR). Ex.: `Tiro Preciso` → `Focused Arrow Strike` → `382`.

---

## 6. Combos (bônus de conjunto)

Cadastre **apenas** os combos descritos na própria descrição **deste** item (o parceiro
declara os dele). Identifique o parceiro pelo **id** com `EQUIP_ID[<id>]`:

```jsonc
"script": {
  "atk": ["100", "2---10", "EQUIP_ID[480062]50"],
  "acd": ["EQUIP_ID[480063]10"]
}
```

`&&` exige todos os parceiros, `||` aceita qualquer um:
`EQUIP_ID[480062||480063]50`.

---

## 7. Exemplos reais comentados

### 7.1 Conjunto por id (recomendado) — `450147` Colete Ilusión A

```jsonc
"script": {
  "atk":         ["100", "2---10", "EQUIP_ID[480062]50"], // +100 fixo; +10 a cada 2 refinos; +50 se 480062 equipado
  "aspdPercent": ["7===10"],                              // +10% Vel.Atq com refino ≥ 7
  "acd":         ["EQUIP_ID[480063]10"]                   // -10% pós-conjuração se 480063 equipado
}
```

### 7.2 Dano de perícia por id + modificadores — trecho de `490430` Record of Archer 2

```jsonc
"script": {
  "382":      ["30"],                                       // +30% dano de Tiro Preciso (Focused Arrow Strike)
  "2418":     ["30"],                                       // +30% dano de Temporal de Flechas (Severe Rainstorm)
  "vct__382": ["EQUIP[Record of Archer]USED[Ranger]===100"],// -100% conj. variável de Tiro Preciso (combo, só Ranger)
  "aspdPercent": ["10"]
}
```

> Aqui o combo ainda usa `EQUIP[Record of Archer]` (por **nome**, legado). Em um item novo,
> prefira `EQUIP_ID[<id do Record of Archer>]`.

### 7.3 Forma legada → como modernizar — `15461` Apollo Armor

```jsonc
"script": {
  "hpPercent": ["15", "LEARN_SKILL[Increase HP Recovery==2]---1"], // +1% HP a cada 2 níveis da perícia (legado, por nome)
  "acd":       ["EQUIP[2nd Anniversary Card]===5"]                 // -5% pós-conj. com a carta equipada (legado, por nome)
}
```

Equivalente recomendado (Aumentar Recuperação de HP = id `4`; 2nd Anniversary Card = id `27417`):

```jsonc
"script": {
  "hpPercent": ["15", "SKILL_ID[4==2]---1"],
  "acd":       ["EQUIP_ID[27417]===5"]
}
```
