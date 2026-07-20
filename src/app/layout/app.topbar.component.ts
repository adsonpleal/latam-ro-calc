import { Component } from '@angular/core';
import { LayoutService } from './service/app.layout.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './app.topbar.component.html',
  styleUrls: ['./app.topbar.component.css'],
})
export class AppTopBarComponent {
  constructor(private layoutService: LayoutService) {}

  visibleInfo: boolean = false;
  visibleReference = false;

  readonly feedbackFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSc5wsk9KOLOmPbALe-Cww1dG4AYmjrSraEuBXcrweeyriSoLQ/viewform';
  readonly feedbackSheetUrl = 'https://docs.google.com/spreadsheets/d/1mWGbu4CpMYPnPfipjNfmD37u7xutvurPd_CeE-O67vw/edit';
  readonly discordUrl = 'https://discord.gg/JCXTqqWq9Q';
  // Original changelog/history at the fork point (last upstream release v3.2.19).
  readonly originalChangelogUrl =
    'https://github.com/turugrura/tong-calc-ro/blob/ba4312f/src/app/layout/app.topbar.component.ts';

  infos = [
    'Todos os dados de itens, monstros e habilidades vêm do site "divine-pride".',
    'Mude o tema pelo botão Config, no centro à direita.',
    'Os dados salvos ficam no navegador; se você limpar os dados do navegador, eles também serão apagados.',
    'Condições que dizem "a cada nível de habilidade aprendido" exigem subir o nível no campo "Learn to get bonuses" para receber o bônus; se não houver onde subir, o bônus é contado como Lv MÁX.',
    'As opções na linha da arma ficam sempre disponíveis e podem ser usadas como "e se" (What if).',
    'My Magical Element nas opções = aumenta o dano mágico do elemento...',
    'A comparação de armas de duas mãos ainda não suporta troca da mão esquerda.',
    'Os jobs 61-64 e 66-69 recebem bônus imprecisos por falta de dados.',
    'A aba "Summary" mostra o que foi equipado / quais habilidades foram subidas / todos os cálculos.',
    'A aba "Equipments Summary" mostra um resumo geral dos bônus dos itens.',
    'A aba "Item Descriptions" mostra os bônus e a descrição de cada item (para conferir se os bônus estão corretos).',
  ];

  references: { label: string; link: string; writer: string; date?: string; }[] = [
    {
      label: 'Arch Mage (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/05/arch-mage-2nd-version.html',
    },
    {
      label: 'Dragon Knight (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/08/dragon-knight-2nd-version.html',
    },
    {
      label: 'Shadow Cross (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/06/shadow-cross-2nd-version.html',
    },
    {
      label: 'Abyss Chaser (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/07/abyss-chaser-2nd-version.html',
    },
    {
      label: 'Inquisitor (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/08/inquisitor-2nd-version.html',
    },
    {
      label: 'Imperial Guard (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/08/imperial-guard-2nd-version.html',
    },
    {
      label: 'Troubadour & Trouvere (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/06/troubadour-trouvere-2nd-version.html',
    },
    {
      label: 'Cardinal (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/07/cardinal-2nd-version.html',
    },
    {
      label: 'Biolo (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/07/biolo-2nd-version.html',
    },
    {
      label: 'Elemental Master (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/07/elemental-master-2nd-version.html',
    },
    {
      label: 'Meister (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/07/meister-2nd-version.html',
    },
    {
      label: 'Windhawk (2nd version)',
      writer: 'Sigma the fallen',
      link: 'https://sigmathefallen.blogspot.com/2024/07/windhawk-2nd-version.html',
    },
    {
      label: 'Referências da versão original (pré-fork)',
      writer: 'tong-calc-ro',
      link: 'https://github.com/turugrura/tong-calc-ro',
    },
  ];

  updates: { v: string; date: string; logs: string[]; }[] = [
    {
      v: '0.1.20-beta',
      date: '20-07-2026',
      logs: [
        'As Classes Expandidas de Classe 4 agora aparecem no seletor de classe: Mestre Celestial, Asceta das Almas, Shinkiro, Shiranui, Guerrilheiro e Hiperaprendiz. As fórmulas já existiam, mas as classes ficavam escondidas porque o cliente LATAM ainda não traz o ícone delas — enquanto isso, o seletor mostra a cabeça do sprite no lugar. Druida segue fora, porque as habilidades dela ainda não estão modeladas.',
        'Guerrilheiro: Vigília Noturna com Espingarda somava CON x 5 em vez de CON x 3, inflando o dano.',
        'Asceta das Almas: Exorcizar Assombração estava com os coeficientes invertidos — ficar no Totem de Tutela enfraquecia a habilidade em vez de fortalecê-la. O Talismã do Jabuti reforçado usava base 1.850 em vez de 2.300, e foram acertadas as recargas do Talismã da Fênix e do Jabuti e as conjurações do Exorcizar Assombração e do Talismã das Divindades.',
        'Hiperaprendiz: Cortar em Espiral aplicava o multiplicador de tamanho do alvo só à parte da fórmula que varia por nível, e não ao termo inteiro. Tempestade de Júpiter usava 1.600 no lugar de 1.800 por nível, e Golpe de Tyr estava sem a conjuração fixa de 0,35s.',
        'Mestre Celestial: Explosão Galática tinha recarga de 0,3s e conjuração variável de 1s; o correto é 5s de recarga e sem conjuração variável.',
        'Shinkiro e Shiranui: Huuma Aderente tratava os 20 golpes como repetição de tela, e não como golpes de verdade — o DPS saía 20x menor. Dança das Trevas virou instantânea e Centelha das Trevas teve a recarga corrigida para 0,5s.',
        'Acessibilidade: os números e distintivos clicáveis do simulador (DPS, dano, bônus "+N", linhas das tabelas de resumo) agora respondem ao teclado — dá para chegar neles com Tab e abrir o detalhamento com Enter ou Espaço, não só com o mouse. Quem só usa mouse não vê diferença.',
        'Nomes em português acertados pela bROWiki: Asceta virou Asceta das Almas, Crepúsculo Explosivo virou Crepúsculo do Poente e o Talismã da Fênix estava grafado "Talimã". As descrições dessas seis classes ainda aparecem em inglês porque o cliente LATAM não traz o texto em português delas.',
      ],
    },
    {
      v: '0.1.19-beta',
      date: '19-07-2026',
      logs: [
        'Equipamentos de cabeça que ocupam mais de uma posição (ex.: Máscara de Odium, em Meio e Baixo) agora aparecem em todos os slots que ocupam. Ao escolher um deles, os outros slots ficam marcados como "(ocupado)" — como no jogo, onde a peça toma as duas posições e não dá para usar outra junto. Foram 118 itens corrigidos, entre equipamentos e trajes. (Reportado por Luís.)',
        'O slot Baixo mostrava um seletor de Carta que não fazia nada — a posição não tinha campo de carta em lugar nenhum. Agora qualquer equipamento de cabeça de posição baixa com slot aceita carta, e a escolha é guardada ao salvar e ao compartilhar por link.',
        'Corrigido o Conjunto do Diadema Radiante, que não estava dando bônus nenhum: ATQ e ATQM +50, +8% de dano contra Chefes e +10% contra as propriedades Sombrio e Maldito, com o anel e o colar Radiantes da mesma pedra. (Reportado por Luís.)',
        'Corrigido o Conjunto Sombrio Inicial, que só computava os 20% de bypass: agora entram também +1% por refino somado das 6 peças (até o +30) e +3% ao chegar no nível 125 e outros +3% no 130 — 56% no total. (Reportado anonimamente.)',
        'Os escudos Escudo Sanguinário e Sanguinário Purificado agora aceitam Bônus Aleatórios (só o Sanguinário Maldito aceitava). (Reportado por Luís.)',
        'O Bônus Aleatório de HP agora vai até 5.000 (antes parava em 1.000). (Reportado por Luís.)',
        'A Sobrepeliz e a Capa do Lobo Cinzento ganharam os 6 encantamentos que faltavam no primeiro slot: Orbe Lupino - Total 1 a 3 e Espelho 1 a 3. (Reportado por Luís.)',
        'Superaprendiz agora tem Telecinesia nas habilidades ativas e Impacto Espiritual no Resumo de Batalha. (Reportado por bernardoolimpio.)',
        'Passar o mouse na habilidade escolhida no Resumo de Batalha agora mostra a descrição dela, como já acontecia na aba Habilidades.',
        'Corrigido: em Windhawk com Ilimitar e Ventos Sinistros, marcar qualquer Efeito (ex.: Instinto) derrubava o dano em vez de aumentá-lo — o bônus de dano à distância era descontado uma vez a cada recálculo.',
        'No Resumo de Batalha, "Hab./s" e "Morre em" agora ficam numa linha própria, e o "Hab./s" também mostra o valor da comparação quando ele muda.',
      ],
    },
    {
      v: '0.1.18-beta',
      date: '18-07-2026',
      logs: [
        'A fórmula do dano (clique em "Dano atual") agora é um diagrama: cada etapa mostra a % aplicada, quanto ela somou em valor absoluto e o total resultante — e "anterior + adicional" sempre fecha com o total exibido.',
        'Clique em qualquer valor do diagrama para ver de onde ele vem. Valores que não vêm de equipamento (ATQ Status, ATQ da Arma, ATQ Munição, Maestria) abrem um "Cálculo" explicando a conta, com o nome e o ícone da habilidade de origem.',
        'O multiplicador elemental do ataque virou uma etapa própria do diagrama. Antes ele ficava embutido na etapa "ATQ", que somava o ATQ Status e aplicava o elemento ao mesmo tempo — fazendo o valor adicional não bater com o ATQ Status mostrado ao lado.',
        'Corrigido: em Windhawk com Ventos Sinistros e Ilimitar ativos ao mesmo tempo, a lista de bônus mostrava os dois somando +350% de dano à distância cada. Só um dos dois vale (o cálculo do dano já estava certo) — agora a lista mostra apenas o que realmente se aplica.',
        'O Resumo de Batalha mostra o tempo para matar o alvo ("Morre em"), na linha logo abaixo do DPS: é o HP do monstro dividido pelo DPS exibido ali mesmo. Na comparação aparecem os dois tempos, e o tooltip traz também os golpes para matar.',
        'Todos os números do app agora usam o padrão brasileiro: 1.234,5 em vez de 1,234.5.',
        'Tecle Esc para fechar: primeiro o detalhamento aberto, depois o diagrama — sem perder o diagrama ao consultar um valor.',
      ],
    },
    {
      v: '0.1.17-beta',
      date: '17-07-2026',
      logs: [
        'Corrigido o HP (e DEF/DEFM/resistências/atributos) de 4 monstros da instância Amicitia 2 (Chimera Lava Eter, Fulgor, Napeo e Galensis), que estavam bem abaixo do valor real — a extração de dados do divine-pride estava pegando o bloco de estatísticas do servidor errado (iRO) em vez do LATAM. (Reportado por Luís.)',
      ],
    },
    {
      v: '0.1.16-beta',
      date: '17-07-2026',
      logs: [
        'Novo Resumo de Batalha: o card do monstro e o da habilidade agora ficam lado a lado (mesma largura), com a ficha completa do alvo, os efeitos mostrando o ícone do item, o DPS atual e o da comparação alinhados um do lado do outro, e uma visualização do ritmo da habilidade (conjuração fixa e variável, depois pós-conjuração e recarga). A tela anterior continua disponível na aba "Resumo de Batalha (antigo)".',
        'O botão "otimizar" no novo Resumo de Batalha aponta o que está limitando o DPS da habilidade, incluindo quando é o ASPD (VelAtq) — antes o cálculo tratava o ASPD por engano como se ele reduzisse a pós-conjuração.',
        'Corrigido: em listas de itens compridas (ex.: Botas), passar o mouse sobre uma opção perto do fim da lista às vezes fechava a descrição sozinha logo depois de abrir.',
        'Corrigido: os seletores de Encantamento não mostravam a descrição do item ao passar o mouse na lista de opções — só no item já selecionado.',
      ],
    },
    {
      v: '0.1.15-beta',
      date: '14-07-2026',
      logs: [
        'Os checkboxes de Efeitos agora mostram o nome traduzido do bônus (ex.: "Dano Mágico (Tamanho: Todos)") em vez do código interno (ex.: "m_size_all").',
        'Corrigidos nomes de monstros em português que estavam genéricos ou errados (ex.: variações de Goblin e Kobold por tipo de arma, cores de Pitaya e Dimik), usando uma extração mais precisa dos dados do cliente.',
        'Trocar o item de um slot agora limpa os encantamentos que não valem para o novo item — antes um encantamento do item anterior podia continuar selecionado por engano.',
        'Corrigido o cálculo da Comparação quando um Efeito selecionado pertence só a um dos itens comparados: o outro lado agora mostra o dano base corretamente, em vez de "0" (e a porcentagem não aparece mais como "NaN%"). (Reportado por Ted.)',
      ],
    },
    {
      v: '0.1.14-beta',
      date: '10-07-2026',
      logs: [
        'A classe Inquisidor (Inquisitor) foi validada: as fórmulas de dano de Técnica da Mão Explosiva e Punho Labareda foram conferidas contra os danos reais registrados em jogo — a reconstrução completa do ATQ a partir do replay reproduz exatamente os valores observados (inclusive o bônus de ATQ das Esferas Espirituais). Obrigado Luís por compartilhar os replays.',
        'Corrigido o bônus de dano de Punho Labareda contra as raças Bruto e Demônio, que por engano verificava a raça Humanoide no lugar de Demônio.',
      ],
    },
    {
      v: '0.1.13-beta',
      date: '09-07-2026',
      logs: [
        'Adicionada a habilidade Encantar com Chama (encanto de Fogo do Professor/Feiticeiro/Elementalista), que faltava nas listas "Aprenda para ganhar bônus" e "Habilidades/efeitos ativos" — as outras três (Geada, Ventania e Terremoto) já existiam. Ela também passa a ser importada dos replays. (Reportado por Ted.)',
        'O popover de descrição dos itens não é mais cortado nas bordas da janela — agora ele é reposicionado para ficar sempre visível. (Reportado por Ted.)',
        'O popover de descrição agora também aparece nos equipamentos Sombrios (e seus encantamentos), nos trajes visuais, nos encantamentos de traje e no Pet — antes esses slots não mostravam a descrição ao passar o mouse.',
      ],
    },
    {
      v: '0.1.12-beta',
      date: '08-07-2026',
      logs: [
        'Importação de replay: mais de 1.000 trajes visuais (Visuais) LATAM que faltavam no banco de dados foram adicionados, extraídos do cliente — agora aparecem nos seletores e são importados dos replays. (Reportado por William.)',
        'Importação de replay: corrigida a leitura dos encantos dos trajes visuais nas posições Meio e Baixo, que não estavam sendo importados do replay. (Reportado por William.)',
        'Importação de replay: os encantos de arma (ex.: Memória de Cecil) agora são importados no campo de encanto correto, em vez de num slot de carta oculto. Antes o encanto aparecia no resumo mas não no seletor da arma, e podia ser contado em dobro ao ser adicionado novamente. (Reportado por Breviglieri.)',
      ],
    },
    {
      v: '0.1.11-beta',
      date: '07-07-2026',
      logs: [
        'A classe Elementalista (Elemental Master) foi validada: as fórmulas de dano das habilidades (Execução Aurora, Conflagração, Tormenta, Tremor de Terra, Poço Venenoso e Círculo Elemental) foram conferidas contra os danos reais registrados em jogo. Obrigado ao Ted por compartilhar os replays.',
        'Habilidade Punho Arcano traduzida; no seletor, cada variação agora mostra o nome e o ícone da magia lançada (Lanças de Fogo, Lanças de Gelo e Relâmpago) em vez do prefixo repetido.',
        'Seletor de Espírito Elemental agora exibe os ícones e os nomes corretos das invocações (Agni, Varuna, Vayu e Chandra; e Diluvium, Ardor, Procella, Terremotus e Serpens).',
        'Importação de replay: buffs e habilidades ativas (como Encantar com Fogo/Gelo/Terra) agora só são importados quando o efeito estava realmente ativo no replay — antes vinham ligados apenas por estarem aprendidos.',
        'Botões Yes/No traduzidos para Sim/Não em todo o simulador.',
      ],
    },
    {
      v: '0.1.10-beta',
      date: '06-07-2026',
      logs: [
        'Novos equipamentos do EP18 adicionados ao banco: armaduras Astrais, capacetes RTC (Decadente/Fortificado/Descartado) e Máscara de Pesar (com seus conjuntos), Sinete Estelar e trajes visuais. Encantos Decadente/Fortificado/de Sucata ganharam os bônus de dano por arma do conjunto.',
        'Agora é possível filtrar pelos itens pelo ID em todos os seletores (armas, equipamentos, cartas, encantos, munição, pets etc.) — digite o número do item na busca do seletor.',
        'O detalhamento de bônus (ao clicar em um valor do resumo) agora mostra também as contribuições de consumíveis, buffs e habilidades passivas — antes só os equipamentos apareciam. A VelAtq lista as poções de ASPD (Concentração/Despertar/Fúria) selecionadas.',
        'Passe o mouse sobre um equipamento (no seletor ou na lista) para ver a descrição do item em um popover, igual à seção "Descrições dos Itens".',
        'Adicionada a habilidade Tempering (buff de P.ATQ) para o Cientista.',
      ],
    },
    {
      v: '0.1.9-beta',
      date: '06-07-2026',
      logs: [
        'Adicionada a Bala de Guaraná aos consumíveis: ativa [Aumentar Agilidade] nv. 5 e o efeito da Poção da Concentração. Os efeitos não acumulam com fontes mais fortes — uma poção de ASPD selecionada substitui o efeito de Concentração, e um [Aumentar Agilidade] de nível maior substitui o da bala. Obrigado ao luishviana por sugerir.',
      ],
    },
    {
      v: '0.1.8-beta',
      date: '06-07-2026',
      logs: [
        'Link de compartilhamento agora é encurtado automaticamente (via short.latam-tools.com.br) — chega de links gigantes. Se o encurtador estiver fora do ar, o link completo continua funcionando.',
      ],
    },
    {
      v: '0.1.7-beta',
      date: '03-07-2026',
      logs: [
        'Adicionado o acessório Anulus Ira, incluindo o bônus de conjunto com as armas da linha dos pecados (Ira, Invidia, Superbia, Glutonia, Acedia, Pigritia, Avaritia, Luxuriae, Furiae e Hypocritae). Obrigado ao Ted por reportar.',
      ],
    },
    {
      v: '0.1.6-beta',
      date: '03-07-2026',
      logs: [
        'Grande adição de equipamentos LATAM que faltavam no banco de dados: 333 equipamentos para cabeça, 473 armas, 207 acessórios, 129 armaduras, 92 calçados, 92 mantos, 40 escudos e 359 trajes (visuais) — mais de 1.700 itens no total.',
        'Bônus, restrições de classe (incluindo evoluções), níveis, ATQ/ATQM das armas e bônus de conjunto (via item par equipado) foram preenchidos a partir das descrições do cliente LATAM.',
        'Corrigido cálculo dos bônus de conjunto, que estavam sendo aplicados de forma permanente em vez de dependerem do item par estar equipado.',
        'Adicionado o acessório Comunicador Avançado.',
      ],
    },
    {
      v: '0.1.5-beta',
      date: '03-07-2026',
      logs: [
        'Estatísticas de monstros corrigidas para os valores oficiais do LATAM (divine-pride): 41 monstros tiveram HP, atributos, DEF/DEFM, resistências (Res/MRes) e/ou raça ajustados. Obrigado ao Ted por reportar.',
      ],
    },
    {
      v: '0.1.4-beta',
      date: '02-07-2026',
      logs: [
        'Adicionados 206 Equipamentos Sombrios (Shadow Gear) que faltavam no banco de dados, extraídos do cliente LATAM. Obrigado a quem reportou o Escudo Sombrio de Sigrun.',
        'Todos os Equipamentos Sombrios com "HP máx. +10 por refino" agora aplicam esse bônus no cálculo.',
      ],
    },
    {
      v: '0.1.3-beta',
      date: '01-07-2026',
      logs: [
        'Adicionadas as Essências de Morroc (FOR, AGI, VIT, INT, DES e SOR, níveis 1 a 3), que podem ser combinadas em qualquer equipamento ou arma com slot. Obrigado ao Ted por sugerir.',
      ],
    },
    {
      v: '0.1.2-beta',
      date: '26-06-2026',
      logs: [
        'Bônus Aleatórios habilitados para o conjunto Selo de Loki: Selo de Loki, Selo de Copas, Selo de Espadas, Selo de Ouros e Selo de Paus aceitam 2 bônus aleatórios cada. Obrigado ao Ted por sugerir.',
        'Corrigida a tradução do bônus de dano mágico por propriedade: "Meu Elemento Mágico" passou a "Dano Mágico por Propriedade" (ex.: "Dano mágico Fogo +N%").',
      ],
    },
    {
      v: '0.1.1-beta',
      date: '25-06-2026',
      logs: [
        // Calculadora & interface
        'Descrições dos Itens: bônus percentuais agora exibem "%". Obrigado ao luishviana por reportar.',
        'Reduções de conjuração agora aparecem como negativas — Pós-conjuração e Conj. Variável em -x% e Conj. Fixa em segundos negativos.',
        'Novo debuff no monstro: Oratio (reduz a resistência à propriedade Sagrado do alvo).',
        'A comparação de itens agora inclui o slot de Escudo.',
        'Na comparação, as ativações (Efeitos) do item comparado também passam a aparecer.',
        'Pós-conjuração de Tiro Crescente (Crescive Bolt) ajustada para 0,5s. Obrigado ao vinicius_mdantas por reportar.',
        'Rótulos e descrições para os bônus de ativação (chance) e para os combos de itens.',
        'Resumo de Batalha: rótulos de conjuração padronizados em pt-BR (Conj. Fixa, Conj. Variável, Recarga, VelAtq).',
        'Habilidades repetidas com propriedades diferentes agora exibem o elemento no nome (ex.: "Adoramus - Sagrado" e "Adoramus - Neutro").',
        // Importação de replay
        'Importação de Bônus Aleatórios e da aparência do personagem a partir do replay (.rrf).',
        'Replay: leitura do sexo do personagem, mensagens separadas de carregamento e de aviso de traços, e preservação de encantes ausentes na tabela kRO.',
        // Itens & monstros
        'Mais de 282 itens LATAM adicionados ao banco de dados (preenchimento via replays).',
        'Novos itens: Manto Branco (Físico e Mágico), Cachecol Mágico de Schmidt, Selo de Paus, Selo de Ouros, Pingente da Celine e os encantes do Automatron B-Básico (DEF/DEFM).',
        'Novos monstros: Glastheim Infernal, Werner e Villa, além dos MVPs do browiki (com grupo de MVPs e redução de dano por aura vermelha).',
        'Contagem de slots dos itens e banco de itens/monstros LATAM atualizados após a atualização do jogo.',
        // Correções
        'Correções de recarga em habilidades (Disparo Perfurante, Zero Absoluto) e de scripts/combos de vários itens (Cachecol de Schmidt, Manto Branco, itens da Celine).',
        'Removida a habilidade Chamas de Hela (Hell Inferno), que aparecia incorretamente em Arcebispo e Cardeal.',
        'Correções internas no motor de cálculo: catálogo de habilidades por ID, condições de refino por slot e migração de itens/habilidades para IDs.',
      ],
    },
    {
      v: '0.1.0-beta',
      date: '18-06-2026',
      logs: [
        'Fork e tradução do tong-calc-ro para o Ragnarok Online LATAM.',
        'Interface traduzida para português (pt-BR).',
        'Rebalanceamento de classes e habilidades para a versão LATAM (2nd version).',
        'Importação de personagem via replay (.rrf).',
        'Beta: alguns itens podem estar faltando ou imprecisos. A única classe totalmente validada até agora é Falcão do Vento.',
        'Histórico completo do projeto original disponível no link abaixo.',
      ],
    },
  ];
  localVersion = localStorage.getItem('version') || '';
  lastestVersion = this.updates[0].v;

  unreadVersion = this.updates.findIndex((a) => a.v === this.localVersion);
  showUnreadVersion = this.unreadVersion === -1 ? this.updates.length + 1 : this.unreadVersion;

  // Don't auto-open the changelog on load; it's still reachable via the "what's new" button.
  visibleUpdate = false;

  showUpdateDialog() {
    this.visibleUpdate = true;
  }

  showReferenceDialog() {
    this.visibleReference = true;
  }

  onHideUpdateDialog() {
    // localStorage.setItem('version', this.updates[0].v);
    // this.showUnreadVersion = 0;
  }

  onReadUpdateClick(version: string) {
    localStorage.setItem('version', version);
    this.unreadVersion = this.updates.findIndex((a) => a.v === version);
    this.showUnreadVersion = this.unreadVersion === -1 ? this.updates.length + 1 : this.unreadVersion;
  }

  showInfoDialog() {
    this.visibleInfo = true;
  }

  openItemSearch() {
    this.layoutService.openItemSearch();
  }

  openConfig() {
    this.layoutService.showConfigSidebar();
  }
}
