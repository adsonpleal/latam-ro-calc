# Dano recebido de monstros

O cartão **Dano recebido** fica abaixo do cartão do monstro em Batalha e Auto-conjuração. Começa recolhido e calcula o dano de uma habilidade contra a build atual, incluindo os efeitos selecionados. A primeira implementação atende somente ao Betelgeuse (20994), conforme o [pedido original](https://issues.latam-tools.com.br/?card=bE74EtfiFav0P6dY4Pld).

O resultado inclui intervalo mínimo/máximo, porcentagem do HP máximo, dano por golpe/onda e etapas da fórmula. Clicar numa redução abre as contribuições da própria build. Não usa as reduções do alvo PvP, do castelo ou da aura defensiva do monstro.

## Habilidades e fontes

A [aba Skills do Divine Pride](https://www.divine-pride.net/database/monster/20994/betelgeuse) foi consultada em 09/10/2026. Entradas repetidas por estado/condição foram deduplicadas por ID. Maldição, quebra de equipamentos, remoção sombria e Ganbantein não causam dano direto e ficam fora do seletor.

| ID / habilidade | Nível | Base e dano antes das defesas |
| --- | --- | --- |
| 708 / NPC_COMET — Cometa | 4 | ATQM × 45 no centro; ×40 a 4–5 células, ×35 a 6–7, ×30 a 8–9. Neutro. |
| 2217 / WL_TETRAVORTEX — Tetra Vortex | 5 | 4 golpes de ATQM × 28. Neutro quando usado por monstros. |
| 768 / NPC_HELLJUDGEMENT2 — Julgamento Infernal | 5 | ATQ × 5. Físico Neutro. |
| 340 / NPC_DARKSTRIKE — Ataque Sombrio | 10 | 5 golpes de ATQM × 1. Sombrio. |
| 83 / WZ_METEOR — Chuva de Meteoros | 10 listado | 15 golpes de ATQM × 1,25 por impacto NPC, conforme replays LATAM. Fogo. |
| 783 / NPC_KILLING_AURA — Aura Assassina | 4 | 10.000 por segundo, fixo. |
| 750 / NPC_EARTHQUAKE_K — Terremoto | 4 | 3 ondas de ATQ × 8, cada uma dividida entre os alvos vivos. Neutro. |

Betelgeuse usa os intervalos publicados ATQ 8.259–12.158 e ATQM 4.938–8.827. A escolha de dificuldade existente modifica seu HP; não há uma curva comprovada de ATQ/ATQM por dificuldade nesta implementação.

As fórmulas foram confrontadas com rAthena, revisão [`d4b8e7b8f16061cc2496d377ac8f777ce72a4f39`](https://github.com/rathena/rathena/tree/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39):

- [Cometa de monstro](https://github.com/rathena/rathena/blob/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39/src/map/skills/npc/comet2.cpp): `2500 + (nível − faixa + 1) × 500`%, com `faixa = clamp(floor(distância/2), 1, 4)`. Não usar a fórmula de Cometa de jogador (2213). Os 20 números visuais dividem um único dano; não descontam DEFM 20 vezes. `HitCount: -20` e `battle_apply_div_fix` arredondam o total para `floor(dano/20) × 20`, com mínimo de 1 por golpe conectado. Os pacotes LATAM corroboram esse arredondamento.
- [Julgamento Infernal](https://github.com/rathena/rathena/blob/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39/src/map/skills/npc/hellsjudgement2.cpp) e [Ataque Sombrio](https://github.com/rathena/rathena/blob/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39/src/map/skills/npc/soulstrikeofdarkness.cpp), também descritos no [bROWiki](https://browiki.org/wiki/Julgamento_Infernal) e [iROWiki](https://irowiki.org/wiki/Dark_Strike).
- [Tetra Vortex](https://browiki.org/wiki/Tetra_Vortex): o bROWiki explicita a propriedade Neutro para monstros. rAthena utiliza uma sequência elemental; a implementação segue a descrição regional. Nenhuma escala de nível base do jogador é aplicada ao monstro.
- [Chuva de Meteoros](https://browiki.org/wiki/Chuva_de_Meteoros): o seletor representa os meteoros que efetivamente acertam, de 1 a 7; não assume que todos os meteoros gerados atingem o personagem. O número de golpes por impacto vem dos replays do Betelgeuse: 15, diferente dos 7 da tabela comum de nível 10. [skill_db.yml](https://github.com/rathena/rathena/blob/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39/db/re/skill_db.yml) também prevê 15 golpes na variante NPC de nível 11. Os pacotes não informam o nível efetivo; a interface preserva o nível listado no Divine Pride. O multiplicador de 125% e o máximo de meteoros ainda precisam de validação exata LATAM.
- [Aura Assassina](https://browiki.org/wiki/Aura_Assassina): ignora equipamento e defesas; habilidades que bloqueiam o dano não são simuladas.
- [Terremoto no bROWiki](https://browiki.org/wiki/Terremoto) e [iROWiki](https://irowiki.org/wiki/Earthquake): nível 4 ignora DEF/DEFM e resistências de raça, propriedade, tamanho e chefe. rAthena avisa em [battle.cpp](https://github.com/rathena/rathena/blob/d4b8e7b8f16061cc2496d377ac8f777ce72a4f39/src/map/battle.cpp) que sua versão 653 está correta somente para pré-Renewal e que 750 ainda não está implementada. Não a copiamos como validação de Renewal.

## Defesas, equipamento e hipóteses

TEN/TENM usam `1 − min(0,5; 0,8 × resistência / (resistência + 400))`, conforme [Talentos no bROWiki](https://browiki.org/wiki/Talentos) e o cálculo já utilizado pelo projeto. DEF usa `(4000 + DEF)/(4000 + 10 × DEF)`; DEFM usa `(1000 + DEFM)/(1000 + 10 × DEFM)`. A defesa de atributos é subtraída em seguida.

Para magia Renewal, as reduções de equipamento incidem no ATQM antes do multiplicador, TENM e DEFM. Para ataques físicos de monstros, incidem depois de TEN, DEF e propriedade da armadura. Cada etapa arredonda para baixo. Essa ordem segue as rotas de monstro em battle.cpp. O cálculo compartilha as categorias de `defenderReductionSteps` com PvP: bônus da mesma categoria somam, categorias diferentes multiplicam, valores negativos aumentam o dano e cada categoria é limitada a 100%.

A categoria racial é a do atacante (Dragão), o tamanho é Grande, a classe é Chefe e a propriedade ofensiva vem da habilidade. Resistência a Sombrio não substitui resistência a Neutro por o monstro ter propriedade Sombrio.

O elemento automático vem de `ItemModel.armorElement`: carta na armadura tem prioridade sobre a propriedade da armadura. Os dados são explícitos no banco; não dependem de carregar descrições na interface. É possível simular outra propriedade no seletor. A armadura sempre tem nível elemental 1 e usa a tabela `ElementMapper` existente. Essa tabela usa ×0,9 para Neutro contra Fantasma 1; o artigo de Terremoto do iROWiki cita ×0,7. Conservamos a tabela regional do projeto; essa diferença precisa de replay LATAM para validação.

Hipóteses que ainda exigem confirmação por replay LATAM:

- Julgamento Infernal 768 aplica resistência física à distância quando o monstro está a mais de 3 células, seguindo a classificação de alcance de rAthena; o artigo regional descreve outra versão do ID.
- Terremoto ignora TEN/TENM junto das defesas ordinárias e permite a categoria geral `dmg_taken_magical`/`dmg_taken_all`. O bypass das resistências ordinárias está nas wikis; a aplicação da redução geral é uma inferência. A UI informa a regra aplicada.
- O mesmo número de alvos permanece vivo nas três ondas de Terremoto. Quem morrer durante o ataque deixa de dividir as ondas seguintes no jogo.

O resultado supõe todos os golpes conectando e não modela esquiva, bloqueios, habilidades defensivas, debuffs impostos pelo monstro, quebra/remoção de equipamento, dano periódico secundário ou distribuição probabilística dos meteoros. Efeitos já selecionados que alteram a ficha ou os bônus defensivos são considerados.

## Auditoria das descrições

`node tools/audit-defender-bonuses.mjs` percorre todas as 14.232 descrições LATAM e compara as cláusulas defensivas com os scripts do banco. `--report=caminho.json` salva o relatório e `--apply` aplica somente cláusulas compreendidas. O relatório da alteração está em [damage-taken-item-audit.json](damage-taken-item-audit.json).

A auditoria registra bônus por refino, atributos base, combinações por IDs, vulnerabilidades, exclusões de elementos/raças e resistências limitadas ao canal físico/mágico. Corrige a cópia genérica de Yeti de Cristal para físico apenas; mantém `subclass_all` como a única representação de “Normais e Chefes”. Acrescenta propriedades permanentes de 26 armaduras/cartas, incluindo Ghostring, Bathory, Druida Maligno e as couraças elementais.

Cláusulas com condições desconhecidas, parceiros ambíguos, bônus específicos de um monstro e itens fora do banco permanecem no relatório. Scripts existentes conflitantes são preservados. Procs não viram bônus permanentes. A auditoria é uma ferramenta de manutenção, não um parser em tempo de execução.

As novas chaves `subrace_*_physical`, `subrace_*_magical`, `subele_*_physical` e `subele_*_magical` também aparecem na busca de itens, nos rótulos e na lista de reduções.

## Ampliação e validação

`constants/monster-offensive-skills.ts` guarda o registro por ID de monstro. `core/monster-damage-taken.ts` é uma função pura sobre o perfil ofensivo do monstro, a ficha do defensor e as opções do ataque. A UI só oferece o cartão para monstros registrados. Novos monstros podem reutilizar as fórmulas cadastradas; habilidades, níveis ou mecânicas diferentes devem acrescentar sua fórmula e referências, com testes independentes.

Os testes de `monster-damage-taken.spec.ts` cobrem multiplicadores, elementos, etapas de defesa, casos especiais e itens reais pelo pipeline de equipamento. `tools/audit-defender-bonuses.spec.ts` cobre condições e preservação dos registros. `e2e/damage-taken.spec.ts` verifica posição do cartão, teclado, seletor, propriedade da carta, divisão de Terremoto, dano fixo, contribuições e largura do cartão.

### Confronto parcial com RagnaRecap — 10/10/2026

As verificações de 09/10 eram contra fórmulas publicadas e regressões do código; não validavam dano recebido em replay. O teste existente `ShadowCross.betelgeuse-replay.spec.ts` verifica dano **causado ao monstro** e não serve como confirmação deste cartão.

Em 10/10 foram decodificadas 11 gravações públicas do [RagnaRecap](https://recap.latam-tools.com.br), incluindo o fixture local `sc-betelgeuse-fawxx.rrf`. A amostra contém 943 pacotes das sete habilidades com origem em entidades de view 20994. Há 29 pacotes positivos contra os próprios gravadores; os demais pertencem ao grupo, cujos equipamentos completos não estão disponíveis. IDs, URLs, hashes SHA-256, contagens e os pacotes recebidos pelos gravadores estão em [damage-taken-replay-audit.json](damage-taken-replay-audit.json).

| Evidência | O que confirma e o que permanece aberto |
| --- | --- |
| [@Fawxx / GXnMMf89Yo](https://recap.latam-tools.com.br/?r=GXnMMf89Yo): Aura, de 87,456 a 91,462 s | Cinco ticks consecutivos de **10.000**, separados por aproximadamente 1 s, coincidem exatamente com o dano fixo. O primeiro tick anterior foi **3.688**, com Kyrie encerrando no mesmo instante: absorção defensiva não é simulada. |
| Cometa: 54 pacotes positivos em toda a amostra, todos com 20 golpes exibidos | Os totais são múltiplos de 20; o arredondamento foi acrescentado. O pacote de @Fawxx de **76.780** é compatível com algumas faixas de distância, mas faltam o centro do Cometa e valores completos de buffs para confirmar a fórmula até a unidade. Compatibilidade com um intervalo não é validação exata. |
| Meteoros: 15 pacotes em três sessões, todos com 15 golpes | Corrigidos os **7 para 15 golpes por impacto**. [Tigerstrike / WGbWZGCqXo](https://recap.latam-tools.com.br/?r=WGbWZGCqXo) recebe **25.725** e **41.460** em pacotes de 15 golpes. Isso confirma a estrutura do pacote, não o multiplicador nem todas as reduções. |
| Ataque Sombrio e Tetra Vortex | Ataque Sombrio exibe 5 golpes; Tetra aparece em sequências de 4 pacotes. Os valores/elementos e as reduções ainda não foram validados exatamente. |
| [Terremoto / nkgSjnzRHL](https://recap.latam-tools.com.br/?r=nkgSjnzRHL) | Três ondas em 126,307, 126,606 e 126,890 s: **18.074 / 16.676 / 12.743** no gravador. A sequência coincide; falta reconstruir os alvos vivos e o ATQ efetivo para validar o dano. |
| [Julgamento Infernal / eDxX4jcFyb](https://recap.latam-tools.com.br/?r=eDxX4jcFyb), arquivo `20261009Betel50+400pt3.rrf` | **8.579.232** recebidos e ataques básicos de aproximadamente **1,4–1,6 milhão**. Esses valores não são explicados pelo ATQ publicado de 8.259–12.158. A build importada, com defesas registradas e ATQ de referência, estima **9.443–13.951** para Julgamento. O replay não fornece o ATQ efetivo do monstro; não se ajustou um multiplicador arbitrário para fazê-lo coincidir. |

Portanto, **as sete fórmulas ainda não estão validadas contra os valores finais dos replays**. A dificuldade pode alterar os atributos ofensivos e os pacotes de dano têm nível de habilidade `-1` (desconhecido). Os buffs defensivos, trocas de equipamento, posição e divisão por alvos também precisam ser reconstruídos para uma comparação exata. A interface explicita que aumentos de ataque por dificuldade ainda não estão incluídos. Os quatro testes de `monster-damage-taken-replay.spec.ts` fixam somente as partes observáveis descritas acima.

Somente os registros 27111, 27264, 300122 e 300123 do baseline de conjuntos foram atualizados: as diferenças defensivas estão descritas acima e verificadas separadamente. As demais contribuições e combinações do fixture permanecem iguais.

Validação em 09/10/2026: 344 arquivos e 6.600 testes de regressão passaram; os 5 testes de navegador passaram. Compilação, verificações de tipos (React, Worker e backend) e verificação de fontes também passaram. Uma nova execução da auditoria não propõe alterações adicionais; as cláusulas não resolvidas e conflitos preservados permanecem registrados.

Após as correções de replay em 10/10/2026: os 18 testes dos dois arquivos de dano recebido passaram, assim como a verificação de tipos React e as verificações de fontes (782 arquivos TypeScript). Esses resultados não tornam as comparações de dano ainda incompletas em confirmações exatas.
