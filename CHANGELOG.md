# Changelog

> As notas detalhadas por versão também aparecem no app, em **Novidades** (a lista
> `updates` em `app.topbar.component.ts` é a fonte canônica voltada ao usuário).

## 0.1.12-beta — 2026-07-08

- **Importação de replay:** mais de **1.000 trajes visuais (Visuais)** LATAM que
  faltavam no banco de dados foram adicionados, extraídos do cliente — agora
  aparecem nos seletores e são importados dos replays. (Reportado pelo **William**.)
- **Importação de replay:** corrigida a leitura dos **encantos dos trajes visuais**
  nas posições **Meio** e **Baixo**, que não estavam sendo importados do replay —
  o encanto fica numa posição de carta fixa por slot (Topo/Meio/Baixo) e a leitura
  sequencial pulava o de Meio/Baixo. (Reportado pelo **William**.)
- **Importação de replay:** os **encantos de arma** (ex.: **Memória de Cecil**)
  agora são importados no campo de encanto correto (`weaponEnchant`), em vez de
  caírem num slot de carta oculto. As posições da arma são divididas pela sua
  quantidade de slots: as primeiras são cartas, as demais são encantos. Antes o
  encanto aparecia no resumo mas não no seletor da arma — e podia ser contado em
  dobro ao ser adicionado de novo. (Reportado pelo **Breviglieri**.)

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
  (Sugerido pelo Ted.)

## 0.1.2-beta — 2026-06-26

- Adicionados os **Bônus Aleatórios** ao conjunto Selo de Loki: o Selo de Loki e
  os selos de Copas, Espadas, Ouros e Paus agora aceitam 2 bônus aleatórios cada.
  Bônus aleatórios também foram habilitados para elmos de posição **Baixo**.
  (Correção sugerida pelo Ted.)
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
