# Changelog

> As notas detalhadas por versão também aparecem no app, em **Novidades** (a lista
> `updates` em `app.topbar.component.ts` é a fonte canônica voltada ao usuário).

## 0.1.19-beta — 2026-07-19

- **Correção:** equipamentos de cabeça que ocupam **mais de uma posição** (ex.:
  **Máscara de Odium**, que equipa em Meio *e* Baixo) apareciam em apenas um dos
  slots. Agora aparecem em **todos** os que ocupam, e escolher a peça em um deles
  marca os outros como **"(ocupado)"** — como no jogo, onde ela toma as duas
  posições e não permite outra peça junto. Uma varredura na base pela linha
  "Equipa em:" das descrições encontrou **118 itens** nessa situação (33
  equipamentos e 85 trajes); nenhum apontava para a posição errada, só de menos.
  (Reportado por **Luís**.)
- **Correção:** o slot **Baixo** mostrava um seletor de **Carta** que não fazia
  nada — a posição não tinha campo de carta em lugar nenhum (nem no modelo, nem
  nas simulações salvas, nem na importação de replay), então o seletor aparecia
  mas não guardava nada. Agora qualquer equipamento de cabeça de posição baixa
  **com slot** aceita carta normalmente, e a escolha é preservada ao salvar e ao
  compartilhar por link.
- **Correção:** o **Conjunto do Diadema Radiante** não dava bônus nenhum — a
  importação em massa dos itens LATAM trouxe só a linha de +2% do próprio diadema
  e descartou o bloco do conjunto. Agora concede **ATQ e ATQM +50**, **+8% de dano
  contra Chefes** e **+10% contra as propriedades Sombrio e Maldito**, com o anel e
  o colar Radiantes **da mesma pedra**. O par **Radiante Topázio** citado na
  descrição não existe no cliente LATAM, então ficou de fora. (Reportado por
  **Luís**.)
- **Correção:** o **Conjunto Sombrio Inicial** (6 peças) computava apenas os 20%
  de bypass. Faltavam **+1% por refino somado do conjunto** (limitado ao +30) e os
  degraus de **+3% no nível base 125** e **+3% no 130** — 20 + 30 + 3 + 3 = **56%**
  com o conjunto todo refinado. (Reportado anonimamente.)
- **Correção:** os escudos **Escudo Sanguinário** e **Sanguinário Purificado** não
  ofereciam **Bônus Aleatórios** — só o **Sanguinário Maldito** estava cadastrado,
  embora os três sejam a mesma peça em versões diferentes. (Reportado por **Luís**.)
- **Correção:** o **Bônus Aleatório de HP** parava em **1.000**; agora vai até
  **5.000**, de 50 em 50. (Reportado por **Luís**.)
- **Correção:** a **Sobrepeliz** e a **Capa do Lobo Cinzento** ofereciam só 3 dos 9
  encantamentos do primeiro slot. Entraram os **Orbe Lupino - Total 1 a 3** e
  **Espelho 1 a 3**. Esses seis só concedem resistência a dano recebido, que a
  calculadora não modela — aparecem na lista para registrar o que está equipado,
  mas não alteram o dano. (Reportado por **Luís**.)
- **Novo:** **Superaprendiz** ganhou **Telecinesia** nas habilidades ativas e
  **Impacto Espiritual** no Resumo de Batalha, como já existiam em Magus. As duas
  andam juntas: Telecinesia aumenta dano da propriedade Fantasma, que é a de
  Impacto Espiritual. (Reportado por **bernardoolimpio**.)
- **Novo:** passar o mouse na habilidade escolhida no **Resumo de Batalha** mostra
  a descrição dela, como já acontecia na aba **Habilidades**.
- **Correção:** em **Windhawk** com **Ilimitar** e **Ventos Sinistros**, marcar
  qualquer **Efeito** (ex.: Instinto) *derrubava* o dano em vez de aumentá-lo — o
  bônus de dano à distância do Ilimitar era descontado de novo a cada recálculo,
  e o Efeito recalculava por cima do estado já degradado.
- **Novidade:** no Resumo de Batalha, **"Hab./s"** e **"Morre em"** passam a ocupar
  uma linha própria, e o "Hab./s" também mostra o valor **da comparação** quando
  ele muda.

### Interno

- Ambiente de desenvolvimento saiu do **Docker** e passou a rodar localmente com
  **pnpm** (`Dockerfile`, `docker-compose.yml` e `nginx.conf` removidos). As
  configurações necessárias do pnpm ficam em `pnpm-workspace.yaml`, e há um
  `CLAUDE.md` na raiz com as instruções. O `bun.lock` obsoleto saiu do repositório
  em favor do `pnpm-lock.yaml`.
- Nova gramática em `item.json`: `REFINE[slots==N(C)]---Y` limita a soma de refinos
  a `C`, para conjuntos do tipo "a cada refino de cada peça (até o +C)".
- Novo campo `locations` em `item.json` para equipamentos de cabeça multi-posição.

## 0.1.18-beta — 2026-07-18

- **Novo:** a fórmula do dano (clique em **"Dano atual"**) virou um **diagrama por
  etapas**. Cada etapa mostra a **% aplicada**, o **valor absoluto que ela somou**
  e o **total resultante** — e "anterior + adicional" sempre fecha exatamente com
  o total exibido, mesmo com os arredondamentos que o jogo faz a cada passo.
- **Novo:** qualquer valor do diagrama é clicável. Os que vêm de equipamento abrem
  a lista de itens de sempre; os que vêm de fórmula (**ATQ Status**, **ATQ da
  Arma**, **ATQ Munição**, **Maestria**) abrem um bloco **"Cálculo"** com a conta
  passo a passo, mostrando o nome em pt-BR e o ícone da habilidade de origem.
- **Correção:** o **multiplicador elemental** do ataque não tinha etapa própria no
  diagrama — ficava embutido na etapa "ATQ", que somava o ATQ Status *e* aplicava
  o elemento ao mesmo tempo. Contra alvos com resistência elemental, o valor
  adicional dessa etapa não batia com o **ATQ Status** mostrado ao lado. Agora é
  uma etapa separada.
- **Correção:** em **Windhawk** com **Ventos Sinistros** e **Ilimitar** ativos ao
  mesmo tempo, o detalhamento de bônus listava os dois contribuindo **+350% de
  dano à distância cada**, somando 767% quando o valor real é 417%. Só um dos dois
  se aplica — o cálculo do dano já estava correto, apenas a lista mostrava a
  contribuição cancelada.
- **Correção:** valores que vêm só de atributos (ex.: **Crítico base + T.Crít**)
  apareciam sem ser clicáveis — justamente quando é mais útil saber que a origem
  são os atributos, e não equipamentos.
- **Novo:** o Resumo de Batalha mostra o **tempo para matar** o alvo ("Morre em"),
  na linha logo abaixo do DPS — o HP do monstro dividido pelo DPS exibido ali
  mesmo, então os dois sempre batem. Na comparação os dois tempos aparecem lado a
  lado, e o tooltip traz também os **golpes para matar** (pelo dano mínimo).
- **Novidade:** todos os números do app passam a usar o **padrão brasileiro**
  (`1.234,5` em vez de `1,234.5`).
- **Novidade:** **Esc** fecha uma camada por vez — primeiro o detalhamento aberto,
  depois o diagrama — em vez de fechar tudo de uma vez.

## 0.1.17-beta — 2026-07-17

- **Correção:** o HP (e DEF/DEFM/resistências/atributos) de 4 monstros da
  instância **Amicitia 2** (Chimera Lava Eter, Fulgor, Napeo e Galensis)
  estava bem abaixo do valor real — a extração de dados do divine-pride
  pegava por engano o bloco de estatísticas do servidor **iRO** em vez do
  **LATAM** (Default), quando a página tem ambos. O script de extração
  (`extract.mjs`) foi corrigido para não repetir o erro em futuras
  atualizações de monstros. (Reportado por **Luís**.)

## 0.1.16-beta — 2026-07-17

- **Novo Resumo de Batalha:** o card do monstro e o da habilidade agora ficam
  lado a lado, com a mesma largura, mostrando a ficha completa do alvo (HP,
  DEF/DEFM, atributos, elemento, raça, tamanho), os efeitos com o ícone do
  item, o **DPS atual** e o **da comparação** alinhados lado a lado, e uma
  visualização do ritmo da habilidade (conjuração fixa + variável em
  sequência, depois pós-conjuração e recarga em paralelo — vale a maior). A
  tela anterior continua disponível na aba **"Resumo de Batalha (antigo)"**.
- **Novo:** o botão **"otimizar"** no Resumo de Batalha aponta o gargalo do
  ritmo da habilidade, incluindo quando é o **ASPD (VelAtq)** — antes o
  cálculo tratava o ASPD por engano como se reduzisse a pós-conjuração, em
  vez de ser um teto separado sobre a taxa de uso da habilidade.
- **Correção:** em listas de itens compridas (ex.: Botas), passar o mouse
  sobre uma opção perto do fim da lista às vezes fechava a descrição sozinha
  (um scroll interno da lista disparava o auto-hide do tooltip).
- **Correção:** os seletores de **Encantamento** não mostravam a descrição do
  item ao passar o mouse na lista de opções — só no item já selecionado.

## 0.1.15-beta — 2026-07-14

- **Correção:** os checkboxes de **Efeitos** mostravam o código interno do bônus
  (ex.: `m_size_all`) em vez do nome traduzido — agora exibem o texto em pt-BR
  (ex.: "Dano Mágico (Tamanho: Todos)").
- **Correção:** vários **nomes de monstros** em português estavam genéricos ou
  errados (ex.: variações de Goblin e Kobold por tipo de arma, cores de Pitaya e
  Dimik agrupadas sob um único nome) — corrigidos usando uma extração mais
  precisa dos dados do cliente.
- **Correção:** trocar o item equipado em um slot agora limpa os encantamentos
  que não são válidos para o novo item — antes um encantamento do item anterior
  podia continuar selecionado por engano.
- **Correção:** na **Comparação**, quando um Efeito selecionado pertence só a um
  dos itens comparados, o outro lado agora mostra o dano base corretamente em vez
  de "0" (e a porcentagem não aparece mais como "NaN%"). (Reportado por **Ted**.)

## 0.1.14-beta — 2026-07-10

- **Inquisidor validado:** as fórmulas de dano de **Técnica da Mão Explosiva**
  (Explosion Blaster) e **Punho Labareda** (Massive Flame Blaster) foram conferidas
  contra os danos reais registrados em jogo — a reconstrução completa do ATQ a
  partir do replay reproduz exatamente os valores observados (inclusive o bônus de
  ATQ das Esferas Espirituais). (Replays compartilhados por **Luís** — obrigado!)
- **Correção:** o bônus de dano de **Punho Labareda** contra as raças **Bruto** e
  **Demônio** verificava por engano a raça **Humanoide** no lugar de Demônio.

## 0.1.13-beta — 2026-07-09

- **Habilidades:** adicionada a habilidade **Encantar com Chama** (encanto de Fogo
  do Professor/Feiticeiro/Elementalista), que faltava nas listas "Aprenda para
  ganhar bônus" e "Habilidades/efeitos ativos" — as outras três (Geada, Ventania e
  Terremoto) já existiam. Também passa a ser importada dos replays. (Reportado por
  **Ted**.)
- **Interface:** o popover de descrição dos itens não é mais cortado nas bordas da
  janela — agora é reposicionado para ficar sempre visível. (Reportado por **Ted**.)
- **Interface:** o popover de descrição agora também aparece nos equipamentos
  Sombrios (e seus encantamentos), nos trajes visuais, nos encantamentos de traje e
  no Pet — antes esses slots não mostravam a descrição ao passar o mouse.

## 0.1.12-beta — 2026-07-08

- **Importação de replay:** mais de **1.000 trajes visuais (Visuais)** LATAM que
  faltavam no banco de dados foram adicionados, extraídos do cliente — agora
  aparecem nos seletores e são importados dos replays. (Reportado por **William**.)
- **Importação de replay:** corrigida a leitura dos **encantos dos trajes visuais**
  nas posições **Meio** e **Baixo**, que não estavam sendo importados do replay —
  o encanto fica numa posição de carta fixa por slot (Topo/Meio/Baixo) e a leitura
  sequencial pulava o de Meio/Baixo. (Reportado por **William**.)
- **Importação de replay:** os **encantos de arma** (ex.: **Memória de Cecil**)
  agora são importados no campo de encanto correto (`weaponEnchant`), em vez de
  caírem num slot de carta oculto. As posições da arma são divididas pela sua
  quantidade de slots: as primeiras são cartas, as demais são encantos. Antes o
  encanto aparecia no resumo mas não no seletor da arma — e podia ser contado em
  dobro ao ser adicionado de novo. (Reportado por **Breviglieri**.)

## 0.1.11-beta — 2026-07-07

- A classe **Elementalista** (Elemental Master) foi **validada**: as fórmulas de
  dano das habilidades (Execução Aurora, Conflagração, Tormenta, Tremor de Terra,
  Poço Venenoso e Círculo Elemental) foram conferidas contra os danos reais
  registrados em jogo. Obrigado ao **Ted** por compartilhar os replays.
- Habilidade **Punho Arcano** traduzida; no seletor, cada variação passa a mostrar
  o nome e o ícone da magia lançada (Lanças de Fogo/Gelo, Relâmpago) sem o prefixo
  repetido.
- Seletor de **Espírito Elemental** agora exibe os ícones e os nomes corretos das
  invocações (Agni, Varuna, Vayu, Chandra; Diluvium, Ardor, Procella, Terremotus,
  Serpens).
- **Importação de replay:** buffs e habilidades ativas (ex.: Encantar com
  Fogo/Gelo/Terra) só são importados quando o efeito estava realmente ativo no
  replay — antes vinham ligados apenas por estarem aprendidos.
- Botões **Yes/No** traduzidos para **Sim/Não** em todo o simulador.

## 0.1.4-beta — 2026-07-02

- Adicionados **206 Equipamentos Sombrios** (Shadow Gear) que faltavam no banco de
  dados, extraídos do cliente LATAM (incluindo o Escudo Sombrio de Sigrun, que foi
  reportado). Estruturas, scripts de bônus e combos por conjunto foram preenchidos.
- Todos os Equipamentos Sombrios com **"HP máx. +10 por refino"** agora aplicam
  esse bônus no cálculo (inclusive os itens já existentes que não o tinham).

## 0.1.3-beta — 2026-07-01

- Adicionadas as **Essências de Morroc** (FOR, AGI, VIT, INT, DES e SOR, níveis 1
  a 3), que podem ser combinadas em qualquer equipamento ou arma com slot.
  (Sugerido por Ted.)

## 0.1.2-beta — 2026-06-26

- Adicionados os **Bônus Aleatórios** ao conjunto Selo de Loki: o Selo de Loki e
  os selos de Copas, Espadas, Ouros e Paus agora aceitam 2 bônus aleatórios cada.
  Bônus aleatórios também foram habilitados para elmos de posição **Baixo**.
  (Correção sugerida por Ted.)
- Corrigida a tradução do bônus de dano mágico por propriedade: "Meu Elemento
  Mágico" → "Dano Mágico por Propriedade" (ex.: "Dano mágico Fogo +N%"),
  alinhada ao texto oficial do cliente.

## 0.1.1-beta — 2026-06-25

- Diversos ajustes de cálculo e interface (exibição de "%", reduções de conjuração
  negativas, debuff Oratio, comparação de Escudo/Efeitos).
- Importação de Bônus Aleatórios e da aparência do personagem via replay (`.rrf`).
- Mais de 282 itens LATAM e novos monstros (Glastheim Infernal, MVPs do bROWiki).
- Correções de scripts/combos e do motor de cálculo. Lista completa em **Novidades**.

## 0.1.0-beta — 2026-06-18

Primeiro lançamento beta do **Simulador RO LATAM**, um fork e tradução do projeto
[tong-calc-ro](https://github.com/turugrura/tong-calc-ro) de turugrura, adaptado para o
servidor Ragnarok Online LATAM.

- Interface traduzida para português (pt-BR).
- Rebalanceamento de classes e habilidades para a versão LATAM (2nd version).
- Importação de personagem via replay (`.rrf`).
- **Beta:** alguns itens podem estar faltando ou imprecisos. A única classe totalmente
  validada até agora é **Falcão do Vento**.

---

O histórico de versões anterior ao fork pertence ao projeto original e pode ser consultado
na última release upstream (`v3.2.19`):
<https://github.com/turugrura/tong-calc-ro/blob/ba4312f/src/app/layout/app.topbar.component.ts>
