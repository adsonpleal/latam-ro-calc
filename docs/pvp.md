# Seção PVP — design e roadmap

> **Documento vivo.** Registra o desenho da seção PVP e as decisões de
> implementação por fase, para que sessões futuras retomem o trabalho com todo o
> contexto sem precisar redescobri-lo. **Atualize o checklist de fases conforme
> cada parte é entregue.**

**Crédito:** o Luís está ajudando ativamente nas fórmulas e na validação
in-game — creditar "por Luís" na entrada de novidades (nunca "pelo Luís").

---

## 1. Contexto

Hoje a calculadora só computa dano **contra monstros**. Existe uma única
abstração de alvo — o objeto de domínio `Monster` (`src/app/domain/monster.ts`) —
consumida em todo lugar via `this.monster.{race,size,element,type,data.*}`.

A seção **PVP** espelha o "Resumo de Batalha", mas mira **outros jogadores**
(carregados de simulações salvas), em três modos: **PVP / WOE / WOE-TE**.

Duas coisas não existem hoje e precisam ser construídas:

1. **Redução de dano do lado do defensor.** O dano vs jogador usa as *mesmas*
   fórmulas de ataque, mas soma reduções que o motor ignora inteiramente hoje:
   soft/hard DEF + RES do alvo calculadas com as **fórmulas de jogador**, mais
   reduções por **raça/elemento/tamanho** e reduções planas (`dmg_taken`)
   concedidas pelo equipamento do alvo (ex.:
   [item 436003 "Máscara do Ódio de Thanatos"](https://www.divine-pride.net/database/item/436003):
   *"reduz o dano físico e mágico recebido de jogadores em 5%"* — hoje ignorado),
   mais uma **camada global de redução dos castelos de guerra**.
2. **Um modelo de alvo-jogador.** Jogadores contam como: tipo de monstro
   **Normal**, tamanho **Médio**, elemento **Neutro** (escopo V1 — detecção de
   armadura elemental fica para depois), raça **RC_Player_Human** (ou
   **RC_Player_Doram** para classes Doram/summoner).

### Como o jogador difere de um monstro (importante)

As defesas do jogador usam fórmulas **diferentes** das do monstro. Já são
computadas hoje em `calcAllDefs()` (`src/app/core/calculator.ts`) e no
`HpSpCalculator` — mas só como stats de exibição do atacante, nunca aplicadas
contra dano recebido:

| Stat | Fórmula do monstro (`monster.ts`) | Fórmula do jogador (`calcAllDefs`) |
|---|---|---|
| softDef | `floor((level + vit) / 2)` | `floor(totalVit/2 + totalAgi/5 + level/2)` |
| softMdef | `floor((level + int) / 4)` | `floor(totalInt + totalVit/5 + totalDex/5 + level/4)` |
| res | do JSON | `res + totalSta + floor(totalSta/3)*5 + bonusRes` |
| mres | do JSON | `mres + totalWis + floor(totalWis/3)*5 + bonusRes` |

Por isso o alvo-jogador **não** pode reaproveitar as fórmulas do `Monster`: ele
recebe os números **já computados** pela build salva.

---

## 2. Tabela de reduções do Luís (fonte da verdade)

Validada contra o bROwiki + horas de teste dentro dos castelos. **rAthena é só
referência secundária** de mecânica (nomes `subele`/`subrace`/`subsize`,
semântica `RC_Player_*`), nunca a autoridade.

| Canal | PVP (aberto) | WOE (castelo normal) | WOE-TE (castelo) |
|---|---|---|---|
| Físico normal ("dano físico normal": atq básico, golpe titânico, duplo…) | 100% | **30%** (−70%) | 100% |
| Físico à distância ("ataque a distância": atq básico de **arco**) | 100% | **30%** (−70%) | **80%** (−20%) |
| Habilidades (qualquer skill, física ou mágica) | 100% | **30%** (−70%) | **60%** (−40%) |
| Esquiva (flee) | 100% | **−20%** | **−20%** |

Âncora de validação do Luís: *"se eu asuro 1kk no PVP, no mesmo player nas mesmas
condições, asuro 300k dentro do castelo"* → skill ×0,30 no castelo normal.

**Classificação de canal no motor:** *é skill?* → balde de habilidade. Senão é
atq básico: `isMelee` → balde físico-melee; à distância → balde à distância. O
modo **PVP aberto** não aplica redução global de castelo (1:1 contra o
alvo-jogador); só valem as reduções do equipamento/DEF/RES do próprio alvo.

### Nota do Luís a validar (parte de raça)

> "A parte de Raça é a que costuma dar problema, pq existe a separação do que
> afeta player e o que não afeta."

Player é: monstro Normal, Médio (exceto baby/doram = pequenos), Neutro (exceto
armadura elemental → elemento da armadura nível 1), **Human** (`RC_Player_Human`,
não demi-human) ou **Doram** (`RC_Player_Doram`). Casos de borda de "o que afeta
player" devem ser registrados aqui conforme validados.

**Chave para resolver a confusão de raça (descoberta na passada de itens):** a
descrição pt-BR já separa os dois mundos com termos distintos, e é a fonte da
verdade:

| Termo pt-BR na descrição | Raça no motor | Afeta player? |
|---|---|---|
| **Humano** | `player_human` (`RC_Player_Human`) | **Sim** — atacante jogador |
| **Doram** | `player_doram` (`RC_Player_Doram`) | **Sim** — atacante summoner |
| **Humanoide** | `demihuman` (`RC_DemiHuman`, monstro) | **Não** — só mobs |

Então "Resistência às raças Humano e Humanoide +30%" (Sapo de Thara, 4058) vira
`subrace_player_human: 30` **+** `subrace_demihuman: 30` — e é a parte *Humano*
que corta 30% do dano vindo de um jogador. A parte *Humanoide* fica inerte no
PVP (nunca dispara contra atacante-jogador), mas é registrada por fidelidade.
Cartas de resistência clássicas ("de Humanoide") que a galera lembra reduzindo
dano de player continuam funcionando porque **sempre** vêm pareadas com a parte
*Humano* na descrição LATAM.

---

## 3. Arquitetura

O `app-battle-hud` é **agnóstico ao alvo**: renderiza o que estiver em
`totalSummary.monster` + `.calcSkill`/`.calc`. A jogada vencedora é **produzir um
perfil de alvo-jogador com o mesmo formato de `PreparedMonsterModel`** e
alimentar o HUD + pipeline de dano **existentes**, adicionando estágios de
redução condicionados a um flag "é alvo PVP". Isso ganha
comparação/castbar/grafo-de-fórmula/multi-alvo de graça e mantém o caminho
vs-monstro intacto.

```
sim salva (PresetModel, só entradas)
   └─► [Builder de perfil de alvo] roda o preset num Calculator descartável
        (mesmo padrão da build de comparação: calculator2 / totalSummary2,
         ro-calculator.component.ts:838)
        → lê getTotalSummary().calc {maxHp, def, softDef, mdef, softMdef, res,
          mres} + flee + bônus de redução DEFENSIVOS agregados + classId
   └─► empacota num PlayerTarget (compatível com PreparedMonsterModel: Normal /
        Médio / Neutro / RC_Player_Human|Doram, defesas por fórmula de jogador)
   └─► Calculator.setPlayerTarget(target, pvpMode)   ← novo, paralelo a setMonster()
   └─► pipeline aplica DEF/RES do alvo + reduções defensivas + camada WoE
   └─► app-battle-hud renderiza (reaproveitado como está)
```

**Principal risco:** `loadItemSet` (que transforma preset→`MainModel`) está
acoplado ao componente. O passo preset→calc-resolvido deve ser fatorado num
caminho reutilizável compartilhado com a feature de comparação.

---

## 4. Namespace de bônus defensivo (convenção para itens)

Espelha a convenção do atacante (`p_race_*`/`m_race_*`) no lado do defensor. As
chaves agregam no `totalEquipStatus` **do alvo** (descrevem o equipamento do
*defensor*), não do atacante. Adicionadas em
`src/app/models/equipment-summary.model.ts` e usadas no `item.json` como
qualquer outra chave de `script`:

| Chave | Efeito |
|---|---|
| `subrace_<raça>` | % de redução de dano recebido daquela raça de atacante |
| `subele_<elemento>` | % de redução por elemento do ataque |
| `subsize_<s\|m\|l>` | % de redução por tamanho do atacante |
| `subclass_<normal\|boss>` | % de redução por tipo do atacante |
| `dmg_taken_physical` | redução plana % de todo dano físico recebido |
| `dmg_taken_magical` | redução plana % de todo dano mágico recebido |
| `dmg_taken_all` | redução plana % de físico **e** mágico |

Raças enumeradas hoje: `formless, undead, brute, plant, insect, fish, demon,
demihuman, angel, dragon` — a lista de raça é estendida com `player_human` e
`player_doram` para que `subrace_player_human`/`subrace_player_doram` resolvam.
Elementos: `neutral, water, earth, fire, wind, poison, holy, dark, ghost,
undead`. Tamanhos: `s, m, l`. Classes: `normal, boss`.

Exemplo (Máscara do Ódio de Thanatos, id 436003):
```jsonc
"script": { "dmg_taken_all": ["5"] }
```

Ordem de aplicação no `skillFormula`, logo após o bloco DEF/RES existente
(físico ~linhas 1303–1320, mágico ~1688–1707 em
`src/app/core/damage-calculator.ts`), usando o trace `push()`/`emit()` para
aparecer no grafo de fórmula:
1. `subrace_<raça>` × `subele_neutral` × `subsize_m` × `subclass_normal`
2. `dmg_taken_<canal>` / `dmg_taken_all` (plano)
3. **camada global WoE** — multiplicador por modo + canal (tabela §2)

A esquiva −20% dos modos de castelo aplica ao **flee do alvo** usado no cálculo
de acerto do atacante (não ao dano).

---

## 5. Checklist de fases

> Marque `[x]` conforme cada fase é entregue e testada. Cada fase é entregável e
> testável de forma independente, mesmo com o V1 mirando paridade total de HUD.

- [x] **Fase 1 — Fundação do motor.** Namespace defensivo em
  `equipment-summary.model.ts` + `create-raw-total-bonus.ts`; a agregação já é
  genérica (`updateTotalStatus`), então as chaves somam automaticamente. Testado
  em `calculator.spec.ts` ("defender-side reduction bonuses"). Sem UI.
- [x] **Fase 2 — Modelo de alvo-jogador + camada WoE.** Módulo puro
  `core/pvp.ts` (tabela do Luís + reduções, testado em `pvp.spec.ts`);
  `Monster.setPlayerTargetData()`; `Calculator.setPlayerTarget(profile, mode)`
  com classificador de Doram (`_class instanceof Doram`); estágios de redução no
  `skillFormula` físico e mágico; flee −20% via `hitRequireFor100`.
  `runChain` aceita `playerTarget`/`pvpMode`. Ancorado no teste "1kk → 300k"
  ponta-a-ponta em `pvp-integration.spec.ts`.
- [x] **Fase 3 — Builder headless de alvo (API do motor).**
  `Calculator.getAsPlayerTarget(name)` extrai def/softDef/mdef/softMdef/res/mres/
  hp/flee + stats + bônus defensivos (`pickDefenderBonus`) de uma build resolvida.
  Testado em `pvp-integration.spec.ts` (extração + round-trip). **Falta** a cola
  no componente: carregar o `PresetModel` da sim salva numa calc temporária
  (padrão do compare) e chamar `getAsPlayerTarget` — feito junto da Fase 4.
- [x] **Fase 4 — Aba PVP na UI.** `<p-accordionTab header="PVP">` com seletor de
  modo (`p-selectButton`), picker de alvo (`p-dropdown` das sims salvas), estado
  vazio e `app-battle-hud` reaproveitado. O alvo é montado com **cache no save**:
  `confirmSave` chama `calculator.getAsPlayerTarget` e guarda o perfil no
  `SavedSimulation.targetProfile`. **Sims antigas** (sem perfil em cache) são
  resolvidas sob demanda ao serem selecionadas por `buildProfileFromPreset`
  (espelha o solve do `prepare()` usando a classe própria do preset, via
  `Characters[].instant`, num calculador descartável) e o perfil é gravado de
  volta — então toda sim salva aparece como alvo. `prepare()` e `runChain` recebem
  `playerTarget`/`pvpMode`; `calculatePvp()` usa um `calculatorPvp` dedicado.
  **Verificado no app:** salvar → alvo com HP/DEF/RES/esquiba corretos → dano
  skill 1237 (PVP) → 371 (WOE, 0,30×) → 742 (WOE TE, 0,60×), esquiva 200→160 na
  guerra. **Pendente (única lacuna de paridade):** a tabela multi-alvo (comparar
  vários alvos salvos de uma vez) — ver §6.
- [x] **Fase 5 — Semear item PVP + crédito.** Máscara de Odium (436003) ganhou
  `dmg_taken_all: 5` (efeito antes ignorado). Entrada de novidades 0.1.21-beta
  creditando Luís ("por Luís"). Outros itens de redução seguem como passada
  contínua (§6).
- [x] **Fase 6 — Popover "Redução de dano".** Botão + `p-overlayPanel` que lista as
  reduções por categoria (Raça: Humano/Doram · Elemento · Tamanho · Classe · plana ·
  camada Guerra/WoE), cada linha **clicável** abrindo o modal de breakdown com os itens
  que a concedem. Nos **stats principais** usa o build atual (`getDefenderBonus`, modo
  `pvp` sem camada WoE); no **HUD do alvo PVP** usa o `defenderBonus` do alvo + a camada
  WoE do modo ativo, e o drill-down cai nos itens do **oponente** (fonte + `slot→id` do
  alvo capturados em `buildProfileFromPreset`; `showBonusBreakdown`/`resolveBonusSource`
  ganharam `sources`/`itemMap` opcionais). Math pura em `reduction-breakdown.ts`
  (testada). Verificado no app: Chapéu de Angeling → "Raça: Humano 10%" → drill-down
  nomeando o item; alvo em WOE mostra as linhas −70%.
- [x] **Fase 6b — Split da redução no grafo de fórmula.** O nó único "Redução PVP"
  virou **dois** passos (`damage-calculator.ts`, `getPvpReductionParts` → `{defender,
  woe, keys}`): **"Redução por equip."** (reduções do equip do alvo, com as `keys`
  exatas lidas naquele hit → **clicável**, drill-down nos itens do oponente via a
  heurística "keys só-defensivas ⇒ fontes do alvo" em `canBreakdown`/
  `showBonusBreakdown`) e **"Redução da guerra"** (camada WoE, sem keys, não clicável).
  Só emite o passo cujo multiplicador ≠ 1. Dano do ataque básico usa o combinado
  `defender×woe` (não tem grafo pra dividir). Verificado: nó −10% clicável → "Chapéu
  de Angeling +10%"; nó −70% da guerra.
- [x] **Fase 6c — Um nó por TIPO de redução.** O passo único de equip virou **um nó
  por categoria** que se aplica (`defenderReductionSteps` em `pvp.ts`, testado):
  "Redução Humano/Doram" (raça do atacante), "Redução {elemento}" (elemento do
  ataque), "Redução Médio", "Redução Normal", "Redução plana" — cada um nomeado, com
  suas `keys`, clicável no item que o concede. Os fatores multiplicam de volta ao
  `defender` combinado (dano inalterado). Verificado: alvo com Humano +10% + Neutro
  +15% → nós "Redução Humano" (−10% → Chapéu de Angeling) e "Redução Neutro" (−15% →
  Manteau de Vali), mais "Redução da guerra" (−70%).

---

## 6. Decisões abertas (fases futuras — registrar aqui conforme validadas)

- **Re-mapeamento completo de itens** para efeitos defensivos (passada contínua,
  como o audit de conjuntos).
  - **Passada 1 (feita) — cláusulas incondicionais.** 174 itens ganharam
    `subrace_*`/`subele_*` a partir das linhas de resistência **do corpo
    principal** da descrição (não-condicionais). Parser em bloco: separa por
    linhas tracejadas; um bloco é condicional se tem cabeçalho terminando em `:`
    ou menciona `Conjunto`/`refino`/`ou mais`. Mapeamento de raça/elemento pela
    tabela §2 acima (Humano→player_human, Humanoide→demihuman, Doram→player_doram,
    "propriedade X"→subele_X). Resistências negativas viram vulnerabilidade
    (`subrace_angel: -20` = Deviling). O seed antigo da Odium (436003) trocou o
    stand-in `dmg_taken_all: 5` pelas chaves fiéis `subrace_player_human/doram: 5`.
    Rótulos pt-BR das chaves defensivas em `bonus-key-label.ts`
    ("Resistência (Raça: Humano)", "Redução de dano recebido de jogadores").
  - **Passada 2 (feita) — cláusulas condicionais self-contained.** 78 itens
    ganharam entradas condicionais (mais a fixação do mapa de elementos, abaixo).
    Um **parser unificado** recomputa TODA a script defensiva por item e
    **sobrescreve** só as chaves defensivas (0 regressões; superset da passada 1).
    Por bloco (separado por `---`): só o bloco **Conjunto** é adiado inteiro
    (a resistência ali é travada pela posse do set mas não fica sob cabeçalho `:`);
    todo outro portão vem como **cabeçalho terminando em `:`** e o walk resolve por
    linha — `Refino +N ou mais:` → `N===X`; `A cada K refinos:` → `K---X`; base
    incondicional no topo do bloco → fixo. Cabeçalho **desconhecido** (status
    `X base 90 ou mais:`, proc `Efeito:`/`Ao receber:`, cap `a partir do +5 até
    +12:`) → a linha é **pulada** (nunca vira fixo), evitando falsos positivos
    (ex.: 2589 Arcanjo, 450145 Oceânica proc, 2576 Mochila status-gated). Isso
    também **corrigiu bases** que a passada 1 perdeu por dividirem bloco com um
    cabeçalho (`5307` Fogo +5%, `15046` Cerco Humano +2%).
    **Fix de dado importante:** elemento **"Maldito" = Undead** (propriedade 10),
    **"Sombrio" = Dark**; o mapa antigo mandava os dois pra `dark` — corrigido
    (Refletor/Capa/Botas dos Malditos viraram `subele_undead`; escudos "todos os
    elementos" deixaram de duplicar `subele_dark`). "Maldito" (elemento undead) ≠
    "Morto-Vivo" (raça undead), desambiguados por `propriedade` vs `raça` no texto.
  - **Passada 3 (feita) — bônus de CONJUNTO defensivos FLAT.** 72 entradas
    `EQUIP_ID[<parceiros>]===<X>` em 46 itens (set de **Cerco** +15% Humano, **Cruz
    Divina**, **Goibne**, bastões elementais −50%, **Preamar**, **das Marés**, combos
    de carta Raydric/Caídos, Cinzas…). O gerador foi **unificado** (passadas 2+3):
    além de separar por `---`, agora **quebra em CADA linha `Conjunto`** — o pré-set
    vira conteúdo normal (isso resgatou bases perdidas em descrições **sem
    separadores**, ex.: cartas 27166/27167) e cada segmento `Conjunto` é um combo
    independente (ex.: Carta Neo Punk tem 2 sets → `EQUIP_ID[4626]===5` +
    `EQUIP_ID[4627]===5`, não `&&`). **Contagem dupla:** análise por assinatura de
    set mostrou só **1** set multi-portador, e lá cada peça dá resistência
    **diferente** — risco nulo na prática (a convenção LATAM declara o combo numa
    peça só, como Cerco); além disso o motor tem `isAreadyCalcCombo` como rede.
    Nomes entre colchetes → id resolvido preferindo o que está no `item.json`;
    **se qualquer parceiro não resolve, o set é adiado** (gate incompleto dispararia
    fácil demais). O `+X% adicional` é natural (entradas somam: base + `EQUIP_ID===X`).
  - **Passada 4 (feita) — sets refine-scaled.** 11 itens ganharam bônus de
    conjunto **escalados por refino**: `EQUIP_ID[parc]REFINE[<slot>==1]---X` (por
    refino de uma peça; ex.: Capa dos Malditos `EQUIP_ID[2158]REFINE[garment==1]---1`,
    sets Solar/Coral/Cerúleo, Lumiere, Preamar, das Marés) e o limiar por peça
    `EQUIP_ID[parc]XREFINEX[<slot>==N]===X` (ex.: Gema de Aquário boot +7/+9). O
    "peça"→slot vem de um mapa pt-BR (escudo→shield, capa→garment, armadura→armor,
    calçado/bota→boot, elmo→headUpper, arma→weapon). Ambas as gramáticas são
    atestadas no `item.json` (REFINE step 1090×; XREFINEX é gate validado) e foram
    **verificadas ponta-a-ponta** num teste efêmero (Cerco flat: set completo
    2+2+2+15 = 21; Malditos refine: −5 base + 9 = 4; `subele_undead` 5+5 = 10).
  - **Passada 5 (pendente) — o resto.** ~21 cláusulas de set adiadas por **parceiro
    não resolvido** (variação de nome pt-BR, ex.: "Orbe Aquática" vs item "Orbe
    Aquático"; "Escudo Cerúleo/Coral"/"Bastão do Sobrevivente" fora do banco) ou por
    serem **soma-de-refinos-do-conjunto** de sets Sombrios (24027/24051, slots
    shadow) + ~13 travadas por classe/status/proc.
  - **Itens fora do `item.json`** (~94, ex.: equipamentos [Aluguel]/TE) têm
    cláusula defensiva mas não estão no banco — entram quando/se forem portados.
  - **Novo tipo de efeito visto e ainda sem chave:** "Resistência a danos físicos
    **a distância** +N%" (redução só de ranged) — hoje só aparece em bônus de
    conjunto; se virar comum, criar `dmg_taken_ranged` no namespace + estágio no
    canal `phys_ranged`.
- **Detecção de elemento por armadura elemental do alvo** (V1 é só Neutro).
  *Decisão a registrar:* ler card/encantamento da armadura → elemento nível 1.
- **Nuance Human/Doram e separação classe-vs-raça** que o Luís sinalizou ("Raça é
  a que costuma dar problema" — o que afeta player vs o que não afeta). Registrar
  casos de borda conforme validados.
- **Tabela multi-alvo** na aba PVP (comparar vários alvos salvos numa `p-table`,
  como o `Resumo de Batalha` faz com monstros). A V1 entrega só o HUD de um alvo
  por vez. Reaproveitar `calcDamages`/`selectedColumns` com `playerTarget` por
  linha.
- **Mecânicas específicas de WoE** além da tabela §2 (interações com
  guardião/emperium, tetos de dano PvP por skill etc.).

---

## 7. Arquivos-chave

| Arquivo | Papel |
|---|---|
| `src/app/models/equipment-summary.model.ts` | onde entram as chaves defensivas |
| `src/app/core/pvp.ts` (novo) | math pura + tipos `PlayerTargetProfile`/`PvpContext`/`PvpMode` |
| `src/app/domain/monster.ts` | `setPlayerTargetData()` — alvo como perfil de jogador |
| `src/app/core/calculator.ts` | `setPlayerTarget()`, `calcAllDefs()` |
| `src/app/core/calculator-controller.ts` | `runChain` aceita `playerTarget`/`pvpMode` |
| `src/app/core/damage-calculator.ts` | `getPvpFinalMultiplier` + estágios no `skillFormula` |
| `src/app/core/saved-simulations.ts` | `SavedSimulationStore.list()` p/ o picker |
| `src/app/pipes/char-sprite.pipe.ts` | `buildCharSpriteUrl` p/ cards paper-doll |
| `src/app/layout/pages/ro-calculator/battle-hud/` | HUD reaproveitado |
| `src/app/layout/pages/ro-calculator/ro-calculator.component.{ts,html}` | aba PVP + estado |
| `src/assets/demo/data/item.json` | seed dos itens PVP |
