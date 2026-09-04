import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
import { UPDATE_DIALOG_STYLE } from './dialog-geometry';
import { isHelpImproveSnoozed } from './help-improve/help-improve-snooze';
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
  visibleMcp = false;
  mcpUrlCopied = false;

  /** Public MCP endpoint. Agents connect here; the browser never calls it. */
  readonly mcpUrl = environment.mcpUrl;

  /** What the server is good at, phrased the way someone would actually ask. */
  readonly mcpExamples: { icon: string; title: string; prompt: string; note: string }[] = [
    {
      icon: 'pi-search',
      title: 'Procurar itens',
      prompt: 'Quais chapéus dão dano de longa distância para Falcão do Vento?',
      note: 'Busca por nome (sem se importar com acentos), por bônus, por habilidade ou por slot. Inclui itens que existem no LATAM mas ainda não foram cadastrados aqui — esses vêm marcados.',
    },
    {
      icon: 'pi-bolt',
      title: 'Calcular dano',
      prompt: 'Quanto de dano essa build faz em Implosão Tóxica contra o dummy neutro?',
      note: 'Usa o mesmo motor do simulador, então o número é idêntico ao que você vê na tela.',
    },
    {
      icon: 'pi-sort-amount-up',
      title: 'Otimizar uma peça',
      prompt: 'Qual a melhor arma para essa build? Testa as opções e me diz o ganho de DPS.',
      note: 'Testa vários candidatos e devolve um link que já abre o simulador na comparação atual → simulado.',
    },
    {
      icon: 'pi-link',
      title: 'Analisar a sua build',
      prompt: 'Cole aqui o link do simulador — o que dá para melhorar?',
      note: 'Qualquer link de compartilhamento (inclusive o encurtado) pode ser lido e devolvido com alterações.',
    },
    {
      icon: 'pi-table',
      title: 'Comparar alvos e builds',
      prompt: 'Compara o dano dessa build contra Osíris, Bafomé e Doppelganger.',
      note: 'Também dá para pôr duas ou mais builds lado a lado contra o mesmo alvo.',
    },
  ];

  // The Google form and spreadsheet are gone: everything became a card on the
  // shared tracker, and what the spreadsheet held was migrated over.
  readonly issuesReportUrl = `${environment.issuesUrl}/novo?projeto=simulador`;
  readonly issuesBoardUrl = `${environment.issuesUrl}/?projeto=simulador`;
  readonly discordUrl = 'https://discord.gg/JCXTqqWq9Q';
  // Original changelog/history at the fork point (last upstream release v3.2.19).
  readonly originalChangelogUrl =
    'https://github.com/turugrura/tong-calc-ro/blob/ba4312f/src/app/layout/app.topbar.component.ts';

  infos = [
    'Os dados de itens e habilidades vêm do cliente do RO LATAM; os de monstros, da API pública do RagnaPlace. Os links de itens, monstros e habilidades levam ao divine-pride para consulta.',
    'Mude o tema pelo botão Config, no centro à direita.',
    'Os dados salvos ficam no navegador; se você limpar os dados do navegador, eles também serão apagados.',
    'Condições que dizem "a cada nível de habilidade aprendido" exigem subir o nível no campo "Learn to get bonuses" para receber o bônus; se não houver onde subir, o bônus é contado como Nv MÁX.',
    'As opções na linha da arma ficam sempre disponíveis e podem ser usadas como "e se" (What if).',
    'My Magical Element nas opções = aumenta o dano mágico do elemento...',
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

  /**
   * Release notes — the single source, with no parallel changelog (CHANGELOG.md was
   * removed after it stalled at 0.1.23-beta while releases kept going out through here).
   *
   * Feeds the "Novidades" dialog and, on publish, the Discord announcement:
   * tools/post-novidades.mjs reads these entries straight out of the file, matching
   * `v: '<version>'` against the package.json version. When adding a release, keep the
   * newest one at the top and the strings in single quotes, and check it with
   * `node tools/post-novidades.mjs --dry-run`.
   *
   * The entries are written in impersonal voice, describing what changed for the user.
   */
  updates: { v: string; date: string; logs: string[]; }[] = [
    {
      v: '0.1.102-beta',
      date: '04-09-2026',
      logs: [
        'Os monstros da Ilusão do Ursinho entraram no banco de alvos. Os oito monstros comuns do mapa — os Ursinhos Azul, Vermelho, Amarelo, Verde e Branco, os Mineradores, o Fragmento de Alma e a Obsidiana Sinistra — não tinham cadastro nenhum, então não apareciam em busca alguma. O Ursinho Brilhante já estava no banco, mas só porque consta da lista de MVPs, e sem o código do mapa; agora ele o carrega. O grupo no seletor de alvo é "150 - 165 ein_d02_i", no mesmo formato das outras cavernas ilusionais. Nível, elemento, raça, tamanho, HP e defesas vêm da mesma extração do cliente que abastece o resto do banco. Reportado por usuário anônimo.',
      ],
    },
    {
      v: '0.1.101-beta',
      date: '02-09-2026',
      logs: [
        'O passo a passo de "Como o dano é calculado" agora explica a rolagem que está na tela. Com um efeito acionado o dano exibido já era o do efeito, mas o detalhamento continuava descrevendo a build sem ele — as duas Botas Desconhecidas, a de FOR e a de SOR, imprimiam o mesmo ATQ Base e o mesmo ATQ Status embora o dano de cada uma fosse diferente. O cálculo nunca esteve errado; o painel é que mostrava a conta sem o efeito. Agora ele acompanha o efeito: com o proc da bota de SOR o ATQ Status soma SOR 358 ÷ 3 no lugar de SOR 133 ÷ 3, e só a bota de FOR mexe no ATQ da Arma, porque só o atributo principal entra no termo ATQ base × FOR ÷ 200. Cada coluna segue os efeitos marcados nela, e a de comparação tem os seus próprios. Reportado por BeLL.',
        'O passo "ATQ (ajuste de classe)" do Mestre Celestial e do Mestre Estelar passou a mostrar a conta inteira. É nele que o Kihop e a Fúria entram, e os dois números — antes e depois — não diziam qual das três Fúrias estava valendo nem de onde saía a porcentagem dela. O detalhamento agora lista o ATQ arredondado, o resultado do Kihop e os termos da Fúria que alcança o alvo — (nível base + SOR + DES) ÷ 3, com FOR só na Estelar — e leva à página da habilidade no bROWiki. Qual delas vale é decidido pelo Tamanho do alvo, então o número pode mudar por causa de um atributo que não aparece em nenhuma outra etapa da conta.',
        'A ferramenta calculate do MCP também devolvia o dano sem os efeitos quando recebia `effects`, enquanto o ATQ ao lado já os contava. Agora as duas metades falam do mesmo cálculo.',
      ],
    },
    {
      v: '0.1.100-beta',
      date: '02-09-2026',
      logs: [
        'A página voltou a rolar depois de fechar um seletor. Enquanto um painel está aberto a rolagem fica travada de propósito, para que o painel não escorregue do ponto em que abriu, e é solta ao fechar. Um seletor que sumia junto com o que o continha — o de dentro de uma janela que se fecha — nunca chegava a avisar, e a trava ficava de pé até recarregar o simulador. Agora cada trava sabe de qual painel é, e uma cujo painel já saiu da tela se solta sozinha. Reportado por usuário anônimo.',
      ],
    },
    {
      v: '0.1.99-beta',
      date: '02-09-2026',
      logs: [
        'O Gorro Felino Mágico voltou a entregar os 0,5 segundos de conjuração fixa no refino +13. A peça tem dois degraus — 0,2 segundo a partir do +7 e mais 0,3 segundo a partir do +13 — e apenas o primeiro estava cadastrado, então o +13 valia o mesmo que o +7. A palavra "adicional" na descrição é o que decide: os degraus somam. O Gorro Felino Poderoso foi conferido junto e está certo, com o único degrau que a descrição dele promete. Reportado por Voilá.',
        'A Moeda Lançável não aplicava nada em nenhum dos dois acessórios. Ela dá coisas diferentes conforme a mão: no esquerdo, dano físico à distância e corpo a corpo +7%; no direito, dano mágico +7% e dano mágico de todas as propriedades +7%. Os dois lados foram cadastrados separadamente, e trocar a peça de espaço troca o bônus. A recuperação de HP e de SP ao derrotar monstros também entrou, como linha exibida na lista de bônus da peça: ela não participa da conta de dano, porque o simulador calcula dano causado e não há etapa onde uma cura caberia. Reportado por usuário anônimo.',
        'Outros trinta e seis registros do banco trazem essa mesma linha de recuperação ao derrotar monstros e ainda não foram revisados; a chave existe agora e eles entram numa próxima passagem.',
        'O custo de SP das habilidades virou uma linha própria e foi cadastrado em oitenta e nove peças. Ele aparece na lista de bônus do item com o sinal que o jogo escreve: a Carta Faraó mostra -30%, o Machado do Apocalipse mostra +100%. Como as demais linhas desse tipo, é informação exibida e não entra na conta de dano — o simulador calcula dano causado e não gasta SP. Entre as peças estão o Xale do Arqueiro, o Cajado do Maestro, os Coturnos Heroicos, os Mantos Mágicos de Geffen, as Tiaras dos Corações Alados e as cartas Faraó, Abelha-Rainha, Maya Silente e Vigia do Tempo.',
        'Os conjuntos Sombrios de Joias, de Gemas, do Fluxo, Conjurante e de Pedras Preciosas também entraram, incluindo as cláusulas que dependem da soma dos refinos de todas as peças. No conjunto de Joias, por exemplo, cada ponto de refino somado tira 1% do custo, e ao chegar a 45 de soma o conjunto passa a cobrar 100% a mais.',
        'Dezessete itens da atualização do cliente entraram no banco. As seis Capas Desconhecidas, que faltavam desde que chegaram, com os conjuntos das Botas Desconhecidas correspondentes. As oito Sombras do Esconderijo e do Furto que ainda não tinham cadastro — a Greva, o Escudo, o Brinco e o Colar dos dois conjuntos; a nota da versão passada dizia que a família inteira havia entrado, mas só a Malha e a Manopla tinham. E três chapéus reformados pela Equipe Licht: as Orelhinhas da Wickebine-LT, o Chapéu de Dourado-LT e o Chapéu de Imp-LT. Reportado por BELLSJF.',
        'O Superaprendiz ganhou três habilidades que faltavam na lista. Nevasca e Chuva de Meteoros são aprendidas na expansão da classe, junto com o restante da linha dos Bruxos. Meteoro Escarlate é diferente: ele não está na árvore, quem o habilita é o conjunto Boina Escarlate-OS com o Rutilus-OS, e por isso ele só calcula dano com as duas peças equipadas — sem elas a habilidade aparece na lista marcada como "Requer", do mesmo jeito que uma habilidade de escudo aparece para quem está sem escudo. Os tempos de conjuração, espera e recarga das três vieram da tabela do próprio cliente. Reportado por usuário anônimo.',
        'A linha dos Bruxos que o Superaprendiz aprende tem mais habilidades ausentes — Trovão de Júpiter, Ira de Thor, Coluna de Fogo, Coluna de Pedra, Supernova, Esfera d\'Água e Congelar. Ficaram para depois, com ficha própria.',
      ],
    },
    {
      v: '0.1.98-beta',
      date: '01-09-2026',
      logs: [
        'As quatro linhas de cura e regeneração saíram do bloco Recursos e passaram a abrir em um botão "Cura e regen.", ao lado do título — do mesmo jeito que "Redução de dano" abre na Defesa. Regen. HP, Regen. SP, Cura recebida e Efetividade de cura continuam com o mesmo valor, a mesma comparação e o mesmo detalhamento por peça ao clicar. O que mudou é que quatro linhas marcando 0% deixaram de ocupar o resumo de quem não carrega nenhuma delas.',
        'A resistência a dano refletido saiu da Defesa e virou uma linha do painel "Redução de dano", junto das reduções planas. Ela aparece quando o build tem alguma e some quando não tem, como as demais linhas daquele painel. Com as duas mudanças, as três colunas do resumo voltaram a ter a mesma altura.',
      ],
    },
    {
      v: '0.1.97-beta',
      date: '01-09-2026',
      logs: [
        'O banco foi sincronizado com a atualização do cliente. Cento e quatro itens novos passaram a ser reconhecidos, entre eles o Diadema Atemporal, as dez Sombras do Esconderijo e do Furto e as vinte Pedras de encantamento — Guerreiro, Mágico, Precisão e Variação, de 1 a 5.',
        'Vinte e sete peças que estavam cadastradas com o texto em inglês chegaram ao servidor e ganharam nome e descrição em português: as vinte Pedras, as quatro Gáleas de Cinzas-LT (Guerreira, Afiada, Mágica e Lutadora), a Bíblia Infernal, a Harpa Celestial e o Chicote Celestial. Os bônus de cada uma foram conferidos contra a descrição em português e batem com o que já estava cadastrado.',
        'Os seis Cordões — do Ninja, do Guerrilheiro, do Asceta, do Mestre, do Animista e do Hiperaprendiz — passaram a declarar Nível do equip. 2, que o cliente não imprimia antes. Com isso eles aceitam Grau de Encantamento e recebem a DEF e a Tenacidade extras por refino, como as demais peças de nível 2.',
        'Dois visuais trocaram de espaço na cabeça e foram corrigidos: o Bebum equipa embaixo e o Gioia Dorminhoco no meio, e não o contrário.',
        'Trinta e dois itens foram renomeados pelo cliente e acompanham o novo nome — o Chicle de Bola virou Super Chiclete, a Joia Mágica Brilhante virou Adorno de Escudo, e as caixas de consumíveis passaram a dizer quantas unidades trazem.',
      ],
    },
    {
      v: '0.1.96-beta',
      date: '31-08-2026',
      logs: [
        'O Traje e a Veste do Lobo Cinzento voltaram a oferecer encanto de DEF e de DEFM. Os seis orbes estavam no banco desde que a linha entrou, com os degraus de refino +7, +9 e +11 corretos; o que faltava era a lista do encantamento, onde eles estavam desativados. Agora aparecem nos dois espaços que os aceitam: DEF 1 a 3 e DEFM 1 a 3 no espaço 2, DEF 1 e 2 e DEFM 1 e 2 no espaço 3. Reportado por Ted e por usuário anônimo.',
        'A lista inteira dos Orbes Lupinos foi conferida contra a tabela publicada, e dezenove orbes não existiam no banco — nenhum deles chegava a aparecer em lugar algum. Entraram o Refletor 1 a 3 e o Maré no primeiro espaço das armaduras; o Cura 1 a 3 no terceiro espaço das Botas e dos Sapatos; e, nos quatro acessórios, o HPR e o SPR 1 a 4 no segundo espaço, mais o Conversão e o Vida no primeiro.',
        'Os acessórios do Lobo Cinzento também estavam com os dois primeiros espaços cadastrados como se fossem a mesma lista. Eles compartilham as quatro famílias de dano e o Atraso, mas divergem depois disso: o primeiro espaço leva os orbes de absorção e o segundo, a escada de regeneração. Enquanto foram um só, nenhum dos dois grupos tinha onde entrar.',
        'Regeneração, efetividade de cura e absorção de dano em HP ou SP não entram na conta de dano — o simulador calcula dano causado, e não existe etapa onde uma cura caberia. Esses orbes aparecem na lista de bônus da peça e nas linhas de Recursos, como as demais peças que trazem essas linhas.',
        'Ficaram de fora o Absorção e o Mente, que existem no cliente e entraram no banco, mas que nenhuma das quatro tabelas publicadas lista em espaço nenhum. Sem uma fonte que diga onde eles caem, ficaria uma escolha inventada.',
      ],
    },
    {
      v: '0.1.95-beta',
      date: '31-08-2026',
      logs: [
        'A resistência a dano físico à distância parou de sumir. O Escudo Ilusión A dá 10%, mais 3% a cada dois refinos, e não somava nada na aba "Redução de dano" — e não estava sozinho: dezesseis peças do banco trazem essa linha e só quatro cartas a tinham cadastrada. Entraram as outras doze, entre elas a Maça Longa e a Maça Longa Ilusional, as Ombreiras de Goibne, o Chapéu da Guarda Real, a Túnica e o Manto de Cerco, a Carta Nuvem Perigosa e o Grande Manto dos Esquecidos. A Maça Longa nem existia no banco. A Carta Transistor entrou junto, com os 30% que ela só paga para Mecânicos. Reportado por Ted.',
        'O próprio Escudo Ilusión A estava com o cadastro de outro servidor. Ele trazia HP e SP máx. +10% e DEF +50 a cada três refinos, que a descrição em português não promete, e vinha com DEF 90 anotada como 95, peso errado e nível 100 em vez de 130. Ficou só o que a peça dá de verdade, mais a resistência a danos mágicos do refino +7, que faltava.',
        'Os conjuntos das Túnicas de Elite voltaram a existir. A Túnica do Arqueiro de Elite pede na descrição as Botas de Batalha, que são exclusivas de Justiceiros — nenhum Arqueiro consegue calçá-las, então aquele conjunto nunca disparava. O Manto do Médico, que é de Noviços, tinha o mesmo problema. As duas gerações de bota estão cadastradas agora, e com o conjunto completo entram DES +3, HP máx. +12%, pós-conjuração -25%, resistência a dano à distância +10% e a penalidade de -200% contra as demais raças.',
        'Duas linhas novas em Recursos: "Cura recebida" e "Efetividade de cura". São coisas diferentes — a primeira é a cura que cai em você, a segunda é a que você lança — e o jogo escreve uma das duas em 117 peças que até agora não mostravam nada por elas. Vieram junto "Regen. HP", "Regen. SP" e, em Defesa, "Res. dano refletido". Nenhuma dessas entra na conta de dano: o simulador calcula dano causado, e não existe etapa onde uma cura ou uma regeneração caberia. Elas estão ali para a peça deixar de parecer vazia.',
        'Com essas linhas, mais de trezentos registros do banco pararam de ser peças mudas. Os oito automódulos da Automatron que apareciam na lista sem valer nada — M-HPR, M-SPR, P-Vida, P-Alma, P-Mental, P-Mana, P-Espelho e P-Refletor — passaram a pontuar, e a absorção de dano em HP ou SP, que aparece em setenta e quatro peças, ficou registrada e sai na lista de bônus do item.',
        'Um detalhe de fórmula conferido de passagem: quando uma peça lista efeitos por Grau de Encantamento ("Grau D ou mais", "Grau C ou mais"…), os degraus somam em vez de substituir um ao outro. No Grau C valem o D e o C. O simulador já fazia assim, e agora isso está verificado contra o script do servidor em vez de suposto.',
      ],
    },
    {
      v: '0.1.94-beta',
      date: '31-08-2026',
      logs: [
        'A faixa de ações ganhou um botão "Limpar". Ele apaga tudo o que foi preenchido — classe, nível, atributos, habilidades, equipamentos e consumíveis — e pede uma confirmação antes. A ação já existia, mas só dentro da janela "Simulações", com o nome "Nova simulação", onde quase ninguém a encontrava. O alvo escolhido no Resumo de Batalha continua onde estava: ele é o contexto de quem está medindo, não um campo preenchido. Sugerido por um usuário anônimo.',
        'Os botões da faixa foram reorganizados para caber tudo na mesma linha. "Importar Replay" passou a se chamar "Importar", e Salvar e Link ficaram só com o ícone; o que cada um faz aparece ao passar o mouse. Sobrou espaço em vez de faltar: mesmo com um botão a mais, a lista de classes ficou mais larga do que era antes e voltou a mostrar o nome inteiro da classe.',
      ],
    },
    {
      v: '0.1.93-beta',
      date: '30-08-2026',
      logs: [
        'A Profanação do Executor voltou a valer. O seletor de acúmulos de [Profanar Arma] já aparecia na lista de habilidades, mas não mexia em número nenhum: o bônus saía por uma chave interna que nenhuma parte do cálculo lia, então marcar 1 ou 20 acúmulos dava exatamente o mesmo dano. Cada acúmulo tira 3% da resistência do alvo a dano físico corpo a corpo, até 20 acúmulos e 60%, e o efeito vale também contra chefes. Ele se multiplica com a Garra Sombria, em vez de somar.',
        'O Crítico da ficha estava errado em todas as classes. A conta usava um terço da SOR; o jogo usa 0,3 por ponto de SOR, mais 1 fixo e mais 0,1 a cada dez níveis de base, e só arredonda uma vez, no fim de tudo. As duas contas se cruzam por volta de SOR 100 — que era justamente onde ninguém percebia — e se afastam para os dois lados: com pouca SOR o simulador mostrava 0% onde o jogo mostra 3%, e com muita mostrava 1 ou 2 pontos a mais. Cinco gravações de personagens diferentes chegam ao mesmo número novo. Quem usa katar continua vendo na ficha o valor sem a duplicação, como o cliente mostra.',
        'O Sicário e o Executor foram conferidos contra quatro gravações, e as Lâminas Retalhadoras batem em todos os estados medidos. Numa delas o personagem tira o equipamento inteiro no meio da gravação e vai recolocando peça por peça: desarmado, o golpe gravado sai igual ao calculado, número por número, e depois cada estado — com a katar, com a toxina aplicada, com o equipamento completo e com [Encantar com Veneno Mortal] ligado — cai dentro da faixa, num intervalo de dano que vai de catorze mil a dois milhões. Cinquenta e oito críticos de ataque básico contra dummies de quatro tamanhos confirmam a penalidade de tamanho da katar.',
        'A Faca Envenenada entrou no banco de itens. Quem importava uma gravação com ela equipada recebia o aviso de item fora do banco de dados. Ela ainda não aparece nas listas, porque o simulador não abre slot de munição para a linha do Sicário, mas a importação parou de perdê-la.',
        'Gravações enviadas por usuários anônimos pelo "Ajude o simulador".',
      ],
    },
    {
      v: '0.1.92-beta',
      date: '28-08-2026',
      logs: [
        'O Renegado foi conferido contra uma gravação, a primeira que a classe teve. A Ofensiva Fatal sai com a razão da tabela do próprio cliente — 1.200% no Nv 10, mais o dobro da AGI, tudo multiplicado pelo nível de base —, o dobro de golpes que a adaga concede está no lugar, e a habilidade não critica, como todos os pacotes gravados mostram. Os dezenove golpes gravados fora de qualquer buff caem dentro da faixa que o simulador calcula.',
        'O Ataque Surpresa entrou na lista de habilidades do Renegado. O efeito que ele deixa no alvo já era calculado — quem apanha passa a receber 30% mais dano, ou 15% se for chefe —, mas a habilidade em si não existia no simulador, então não dava para medir o golpe nem montar a rotação com ela. Agora ela aparece, corpo a corpo e sem crítico, com a razão da tabela do cliente: 200% no Nv 1 até 800% no Nv 5.',
        'A mesma gravação confirma as duas metades do Ataque Surpresa. O golpe gravado cai a 0,1% do centro da faixa que o simulador calcula, e os pacotes de dentro dos dez segundos do efeito ficam 15% acima dos de fora — 15%, e não os 30% que a descrição anuncia primeiro, porque os dummies do campo de treinamento contam como chefes. É por isso que os dois números da descrição estão certos e mesmo assim só um deles aparece ali.',
        'Fica em aberto uma diferença de 1% a 2% nos ataques básicos, com o simulador abaixo do jogo. Ela não vem de buff escondido — a gravação carrega só duas poções, ambas de velocidade de ataque —, nem de efeito com chance de disparar, nem de pacote lido errado; e essa gravação não traz a janela de status, então não há como conferir o ATQ por fora. Uma segunda gravação do Renegado, desarmado ou trocando a adaga durante a gravação, é o que fecharia a conta. Obrigado Leonardo pela gravação.',
      ],
    },
    {
      v: '0.1.91-beta',
      date: '28-08-2026',
      logs: [
        'A seção de equipamentos foi refeita: cada slot virou um cartão. Antes eram listas suspensas empilhadas, em que o nome do slot só aparecia como texto apagado dentro da própria lista. Agora cada slot tem um cartão com o nome no cabeçalho, o ícone do item em tamanho grande e fichas para o que ele carrega — refino, grau, item, cartas, encantamentos e bônus aleatórios. Os cartões vêm agrupados em Equipamento, Visuais e Equipamentos Sombrios, e o cartão só mostra o que aquele slot realmente aceita: uma bota não oferece bônus aleatório, um equipamento sombrio não oferece grau, e os encaixes de carta e de encanto seguem o que o item equipado tem.',
        'Clicar em qualquer ficha abre um seletor ancorado nela, com campo de filtro, uma linha "Nenhum" e as opções com ícone. Ele vira para cima quando não cabe embaixo e se encaixa dentro da janela, as listas longas rolam sem travar, e o teclado funciona: digitar filtra, as setas andam pela lista e Enter escolhe. Passar o mouse sobre uma opção mostra a descrição do item, encantamentos incluídos.',
        'A comparação passou para dentro dos cartões. Cada um tem um botão "Comparar" no cabeçalho, e o que está sendo comparado aparece numa sub-linha âmbar do próprio cartão, em vez de numa segunda coluna longe do original. Uma faixa no alto diz quantos slots estão em comparação e limpa todos de uma vez. A lista de seleção múltipla que fazia esse papel saiu. Links compartilhados e simulações salvas continuam guardando e restaurando a comparação como antes.',
        'O seletor de Bônus Aleatórios navega por categoria — Físico, Raça, Demônio, +12% — e, assim que se digita, passa a procurar em todos os bônus de uma vez, sem precisar saber em que categoria o efeito está.',
        'Esc fecha o seletor aberto na hora. O fechamento pelo teclado levava mais de um segundo, e a espera não era cálculo nenhum: eram cerca de trezentas dicas de texto na página, cada uma escutando a tecla por conta própria. Esc agora fecha só a camada de cima — um seletor aberto dentro de uma janela fecha o seletor e deixa a janela aberta — e o mesmo caminho passou a valer para as janelas e para os quadros do Resumo de Batalha.',
        'A página deixou de rolar por trás de um seletor aberto. A roda do mouse só age dentro do painel enquanto ele estiver aberto, e ao chegar no fim da lista para ali, em vez de arrastar a página junto e levar embora a ficha em que o painel está ancorado.',
        'O ✕ dos cartões de Visual passou a limpar também os encantamentos. Ele tirava a fantasia e deixava os encantos para trás, o que mantinha os bônus deles valendo num slot que na tela aparecia vazio.',
        'Os equipamentos sombrios passaram a usar os nomes do jogo: Manopla, Escudo, Malha, Greva, Brinco e Colar Sombrio, no lugar de "Arma das Sombras", "Armadura das Sombras" e companhia.',
        'Todo valor do "Resumo de atributos" abre a sua conta, mesmo quando ela não vem de equipamento nenhum. Precisão, Esquiva, HP e SP máximos, DEF, DEFM, TEN, TENM, Vel.Atq e Crítico agora são clicáveis e mostram, junto com as peças que somam neles, uma linha com a origem do resto — nível, atributos, base da classe, refino. Antes esses valores não abriam nada, que é justamente quando o número mais precisa se explicar, e os que abriam podiam listar peças somando bem menos do que o valor clicado.',
        'A sub-linha da comparação ganhou o seu próprio X, no canto superior direito, alinhado com o do cartão logo acima. Ele esvazia a alternativa sem desligar a comparação: com o slot comparado e nada dentro dele, o cartão passa a responder "e se eu tirasse esta peça", que o botão Comparar sozinho não consegue perguntar. O X só aparece quando há algo para limpar.',
        'O resumo de um buff passou a falar português. Quando o cliente não traz a descrição da habilidade, o balão lista o que ela concede a partir dos próprios bônus — e essa lista vinha em ATK, MATK, HIT, MDEF, POW, WIS, SPL, CRT, vocabulario que o cliente em português não usa em lugar nenhum. Agora são ATQ, ATQM, Precisão, DEFM, POD, SAB, FEI e CRV, as mesmas abreviações da janela de status. Três bônus não tinham rótulo algum e apareciam como a chave interna (acd, fctPercent, vctBySkill); viraram Pós-conjuração, Conj. Fixa % e Conj. Variável (hab.).',
        'O que ainda aparecia como "ASPD" virou "Vel.Atq". O cliente em português nunca escreve ASPD — "ASPD" só existe como nome interno de item, e o que o jogo mostra é "Velocidade de ataque" nas descrições e "Vel.Atq" nas tabelas de habilidade. A troca alcançou a lista de Bônus Aleatórios, a busca por bônus, o resumo de um buff e o painel de "otimizar a conjuração". É só o rótulo: uma build salva guarda o bônus como aspd, então links e simulações antigas continuam iguais. No caminho, MTEN virou TENM na mesma lista.',
        'As reduções de conjuração pararam de mostrar "-0%". Uma build sem redução alguma aparecia com um zero negativo em Pós-conjuração, Conj. Fixa e Conj. Variável.',
      ],
    },
    {
      v: '0.1.90-beta',
      date: '26-08-2026',
      logs: [
        'O topo da página foi refeito. O que era uma parede de números, cada um no seu bloco preto, virou três cartões: uma faixa com as ações, a classe, o nível e os pontos disponíveis; o quadro de atributos ao lado; e o "Resumo de atributos" em três colunas — Ataque e Conjuração, Mágico e Precisão e crítico, Defesa e Recursos. Cada linha tem o nome à esquerda e o número alinhado à direita, e os fundos escuros atrás dos valores saíram: eram vinte blocos disputando atenção com os próprios números que deviam destacar. Solicitado por Shummuy e Oden.',
        'O resumo passou a mostrar a comparação. Com um slot ativo em "Ative o slot do item para comparar", cada linha que muda ganha uma terceira coluna com o valor da build comparada e a diferença — "132 + 296 → 132 + 275 -21". A linha que não muda não mostra nada, para que a coluna carregue só o que a troca mexeu. A cor segue o proveito, e não o sinal: uma pós-conjuração que fica mais negativa aparece em verde, porque conjurar mais rápido é ganho.',
        'Todo valor abre a sua conta. Clicar em qualquer número do resumo lista os itens, consumíveis, buffs e habilidades que somam nele; clicar no valor comparado abre a mesma lista da build comparada, com as peças trocadas e também com as que a comparação não trocou. Os golpes por segundo abrem o gráfico da curva, e o valor comparado abre o mesmo gráfico com as duas velocidades marcadas. Passar o mouse sobre um valor mostra o nome dele, e no valor comparado o nome vem com "(comparação)" — o que resolve a coluna da direita, onde um "→ 664 -9" sozinho não diz de que linha é.',
        'RES e RESM passaram a se chamar TEN e TENM. Tenacidade e Tenacidade Mágica são os nomes que o cliente em português usa para os dois talentos, e o simulador mostrava a abreviação em inglês. A troca é só de rótulo — a conta é a mesma — e alcançou todos os lugares onde os dois apareciam por escrito, como a redução de dano no Resumo de Batalha. No caminho, "VelAtq" virou "Vel.Atq", como no jogo.',
        'A opção "Estilo de Campo" saiu das configurações. Ela alternava os campos entre contornado e preenchido, e o preenchido pintava cada caixa de um azul claro que brigava com as cores da ficha nova. O simulador usa o contornado sempre; quem tinha o preenchido guardado volta ao contornado sozinho, sem precisar mexer em nada.',
      ],
    },
    {
      v: '0.1.89-beta',
      date: '24-08-2026',
      logs: [
        'Os Brotos Temporais passaram a mostrar os encantamentos. Os seis — FOR, DES, AGI, SOR, VIT e INT — não tinham tabela de encantos no simulador, então os três encaixes apareciam vazios. O encaixe 4 agora oferece Atributo +1, +2 e +3 em qualquer um dos seis atributos; o encaixe 3 oferece HP máx. e SP máx. +3% e +5%, Músculo 1 e 2 (dano físico +3% e +5%), Intelecto 1 e 2 (dano mágico +3% e +5%), Pedra de Encantamento 1 e 2 e Anti-Atraso 1 e 2; e o encaixe 2 oferece Talento +1 e +2 em qualquer um dos seis talentos, mais T.CRÍT, C.Mais, P.ATQ e S.ATQM +1 e +2. Vinte e oito desses encantos também faltavam no banco de dados e foram acrescentados. Reportado por TANK.',
        'A tabela da bROWiki resume os seis brotos numa linha só, com um "Atributo" e um "Talento" genéricos, e são as porcentagens dela que dizem o que isso quer dizer: o encaixe 4 soma 16,66%, exatamente um sexto da rolagem, e o encaixe 2 fecha em 100% com dez encantos em duas faixas. As duas contas só fecham se cada broto aceitar os seis atributos e os seis talentos, e foi assim que a lista foi montada.',
        'O automódulo F-Eternidade entrou na lista da Perna Automatron. Era o único dos seis Fantásticos que faltava. Ele dá VIT +50 por 10 segundos, com 5% de chance ao receber dano físico ou mágico, e entra como bônus de chance ao lado dos outros cinco. A regeneração de 800 de HP a cada 0,4 segundo que ele também concede fica de fora, porque o simulador não mede regeneração. Reportado por Ryuushin.',
        'A tabela de automódulos foi conferida coluna por coluna contra a bROWiki. Além do F-Eternidade, faltava o H-Maré no Colete — a recarga de Proteção da Orla e Festa do Camarão, dos Invocadores. Entrou também o P-Total no Motor: ele é de defesa, e a seção PVP deu ao simulador onde medir isso — contra um atacante jogador, que conta como Normal e Médio, valem as resistências a Normais e Chefes e a todos os tamanhos.',
        'Os outros nove automódulos passaram a aparecer nas listas mesmo sem efeito: M-HPR, M-SPR, M-Cura, P-Vida, P-Alma, P-Mental, P-Mana, P-Espelho e P-Refletor. O simulador não tem como medir cura, regeneração nem dano refletido, então nenhum deles muda um número — mas quem tem um encantado precisa conseguir montar o equipamento como ele é, e uma build ou um replay importado que traga um deles agora o mostra no encaixe em vez de descartá-lo.',
        'A resistência "a todas as raças de monstros" deixou de valer contra jogadores. No PVP ela vinha somando junto com a resistência a Humano ou a Doram em todo golpe, o que dava redução de graça a quem usa U-Total, os Orbe Lupino - Total ou o novo P-Total. A descrição do cliente diz "de monstros", e é essa a divisão que o jogo faz — Humanoide é monstro, Humano é jogador —, então contra outro jogador agora só valem as resistências a Humano e a Doram. Contra monstro nada mudou. O painel de "Redução de dano" acompanha: a linha "Todas as raças" saiu da lista do alvo PVP e continua na dos seus próprios atributos.',
      ],
    },
    {
      v: '0.1.88-beta',
      date: '24-08-2026',
      logs: [
        'O Elementalista ganhou o seletor de Domínio Elemental. Dava para escolher qual Elemental estava invocado, mas não o modo em que ele era mantido — e é o modo que decide o que a invocação entrega, como diz a última linha de toda descrição de "Invocar": "Também possui efeitos diferentes conforme o nível usado de Domínio Elemental". Agora há uma segunda lista, ao lado de Espírito Elemental, com Passivo, Defensivo e Ofensivo. O nível 4 não é oferecido porque apaga o Elemental, e ninguém monta uma build nesse estado. Reportado por Ted.',
        'Os bônus do Modo Passivo passaram a valer — nenhum deles valia. Cada Elemental aumenta o dano de uma habilidade enquanto está em Passivo (Diluvium: Lanças de Gelo +100%; Ardor: Lanças de Fogo +100%; Procella: Relâmpago +80%; Terremotus: Coluna de Pedra +80%; Serpens: Maldição de Jormungand +50%), e essa tabela já existia no simulador desde sempre, guardada sob o nome da habilidade em vez do código dela. Como a conta de dano procura pelo código, nada era encontrado e o bônus nunca entrava. No conserto, o valor de Procella foi corrigido de 100% para 80%, que é o que a bROWiki registra.',
        'A propriedade da Onda Psíquica agora acompanha o modo. Ela passava a ter a propriedade do Elemental assim que um era escolhido; a bROWiki coloca esse efeito dentro do Modo Passivo, junto dos bônus acima. Quem tiver uma build salva com Elemental invocado verá a Onda Psíquica voltar a Neutro até que o modo Passivo também seja escolhido.',
        'Três efeitos ficaram de fora, cada um com a sua ficha. O Modo Defensivo encanta a armadura e mexe em resistências de propriedade, e o simulador não tem onde medir isso. O Modo Ofensivo é um ataque conjurado pelo próprio Elemental, com o ATQM dele e não o do personagem — é outra origem de dano, não uma fórmula a mais. E o "+30% de dano" que cada "Invocar" promete continua sem entrar: a fórmula da habilidade já dobra o coeficiente quando o Elemental correspondente está invocado, e nenhum texto resolve se os dois se somam; isso precisa de uma gravação para ser decidido, em vez de um palpite.',
        'As descrições das habilidades passaram a aparecer em mais lugares. Passar o mouse em cada opção da lista de "Espírito Elemental" mostra a descrição daquela invocação, e o rótulo do seletor mostra a da invocação escolhida — antes as duas listas do Elementalista não traziam texto nenhum. No Resumo de Batalha, a janela de detalhes de um passo da rotação ganhou um bloco "Descrição da habilidade", que começa fechado e abre com um clique — os números continuam sendo a primeira coisa que se vê. Dez habilidades faltavam no catálogo de textos — Domínio Elemental e as nove invocações de Elemental —, e por isso apareciam sem descrição em qualquer lugar do simulador.',
      ],
    },
    {
      v: '0.1.87-beta',
      date: '23-08-2026',
      logs: [
        'O link de uma simulação agora mostra a própria build na prévia. Ao colar o link no Discord, no WhatsApp ou no X, o cartão que aparece traz o boneco do personagem com as gáleas e a capa equipadas, o nome da classe em português, o nível de base e de classe e o quadro de atributos e talentos. Até aqui todo link compartilhado exibia o mesmo cartão genérico do simulador, fosse qual fosse a build.',
        'O motivo era o formato do endereço: a build viajava depois do "#", um pedaço da URL que o navegador nunca envia ao servidor — então quem monta a prévia não tinha como saber de que build se tratava. Os links passaram a ter a forma simulador.latam-tools.com.br/s/<build>, com a build no próprio caminho. Os links antigos continuam abrindo normalmente, e o encurtador segue sendo usado como antes.',
        'O cartão usa as cores do próprio simulador, e a imagem padrão do site — a que aparece quando o link não leva uma build — foi refeita no mesmo desenho. O boneco é desenhado com o que o visual mostra: corpo, cabelo, gáleas e capa, incluindo as fantasias, que cobrem a peça de baixo como no jogo. Ele é pedido sem recorte fixo, então nenhuma gália alta nem capa larga fica cortada — a figura cresce e o cartão a acomoda. Armas e escudos não aparecem, porque o serviço que desenha os personagens ainda não os desenha. Uma classe sem talentos mostra só a faixa de atributos, em vez de seis zeros.',
      ],
    },
    {
      v: '0.1.86-beta',
      date: '22-08-2026',
      logs: [
        'A arma da mão esquerda entrou na lista de "comparar slot". Dava para pesar a arma principal, o escudo e mais vinte e uma peças, mas não a segunda arma: quem empunha duas tinha de trocar a peça, anotar o número e trocar de volta. Agora "Arma Esq." aparece no seletor e ganha a sua própria linha, com cartas, encantos, refino, grau e bônus aleatórios próprios, como qualquer outro slot. Solicitado por Oden.',
        'O slot só é oferecido a quem empunha duas armas: Sicário, Executor, Kagerou, Shinkiro, Oboro e Shiranui. Nas demais classes ele nem aparece na lista, porque a linha nunca seria mostrada, e uma comparação salva ou vinda de um link que caia numa classe sem mão esquerda é descartada ao carregar, em vez de ficar marcada sem fazer nada.',
        'A linha de comparação acompanha a da build principal: some enquanto a mão não estiver livre — com uma arma de duas mãos ou com escudo equipado — e volta com a peça escolhida quando a mão vaga. Enquanto está escondida não entra na conta, para que uma comparação que não se vê não mexa nos números.',
        'A mão esquerda é uma só, e o escudo e a segunda arma disputam o mesmo lugar. Ao comparar um contra uma build que usa o outro, quem perde a mão sai da build comparada em vez de as duas peças somarem juntas: fica o slot que está sendo comparado. Uma arma de duas mãos toma o lugar dos dois.',
        'No caminho, uma conta antiga foi corrigida. Ao comparar uma arma de duas mãos contra uma build que empunha duas, a arma da mão esquerda perdia os bônus, como devia, mas continuava somando o próprio ATQ e a VelAtq de duas armas na coluna comparada. Agora ela sai por inteiro.',
      ],
    },
    {
      v: '0.1.85-beta',
      date: '20-08-2026',
      logs: [
        'As Gáleas de Cinzas-LT entraram no simulador antes de chegarem ao LATAM. São as quatro do conjunto — Guerreira, Afiada, Mágica e Lutadora —, com os dois encantos que o encantador oferece: no primeiro slot, um dos doze Feitiços Cinzentos (Guerreiro, Atirador, Mágico e Lutador, de 1 a 3), onde mora o bônus de conjunto; no segundo, sete Insígnias de 1 a 3 — Dedicação, Talento, Potência, Maestria, Virtude, Resiliência e Afeição. Como o cliente ainda não trouxe as gáleas, elas aparecem com o nome e a descrição em inglês do iRO e levam a etiqueta iRO na lista, para não se confundirem com o que já dá para equipar. Quando o LATAM lançar as peças, o texto em português entra no lugar sozinho. Solicitado por Shummuy.',
        'Cada gálea tem três conjuntos, um por arma de Cinzas-AD, e o encanto acrescenta mais três por cima. A Guerreira responde à Grande Espada, ao Machado e à Lança; a Afiada à Espada, ao Arco e ao par Violino/Chicote; a Mágica ao Cajado, ao Cajado Duplo e à Adaga; a Lutadora à Maça, ao Punho e ao Katar. Só a geração -AD fecha o conjunto: a arma de Cinzas antiga, de mesmo nome, não paga nada. Os doze Feitiços Cinzentos valem em qualquer uma das quatro gáleas, como o encantador os oferece, e quem decide se o bônus sai é a arma equipada.',
        'A Insígnia da Afeição faltava na lista do segundo slot. O encantador oferece sete linhas, e o simulador trazia seis: a Afeição só entrou no banco junto das Coroas do Bem e do Mal, e a lista das gáleas nunca foi refeita depois disso.',
        'Os conjuntos das dezesseis peças passaram a identificar a arma parceira pelo código do item, e não mais pelo nome em inglês — a mesma troca feita nas cartas e nas pedras de encantar. Nada muda no que cada conjunto paga: as 46 medições de referência foram tiradas antes da troca e conferidas depois, arma por arma.',
      ],
    },
    {
      v: '0.1.84-beta',
      date: '20-08-2026',
      logs: [
        'As 402 cartas que faltavam entraram no banco, e agora o simulador tem todas as 1.064 que o jogo publica. Até aqui só era cadastrada a carta cujo texto inteiro cabia na conta de dano, e o resto — as de chance, as que habilitam uma perícia, as de tolerância a estado, as que convertem dano em HP — ficava de fora dos seletores e sumia na importação de replay, com aquele aviso de "fora do banco de dados". Agora aparecem todas: a descrição em português continua completa ao passar o mouse, e o que a conta ainda não modela simplesmente não soma nada.',
        'Das que entraram, 195 já somam alguma coisa, incluindo bônus que dependem de uma condição. Refino a partir de X e a cada X refinos (Carta Bode, Carta Nove Caudas, Carta Remover), atributo base a partir de X e a cada X pontos de atributo (Carta Cochicho, Carta Obsidiana), nível base (Carta Amdarais Imortal) e classe (Carta Frus, Carta Rideword, Carta Alphoccio) são pagos como o jogo os paga. As sete cartas Seladas que mudam de valor no +15 rendem o valor de baixo até o +14 e o de cima daí em diante.',
        'Treze cartas que já estavam cadastradas foram corrigidas contra a própria descrição. A Carta Rei Escorpião dava +20% contra a raça Morto-Vivo, e o que ela promete é +20% contra a propriedade Maldito. As Cartas Goblin, Jurgen e Venenum pagavam só contra Bruto, e a linha diz "Bruto e Doram". As Cartas Fragmento de Thanatos e Rei Goblin não cobravam a perda de resistência que acompanha o dano extra. E as Cartas Esporo, Creamy, Fumacento, Fen, Esfera Marinha, Kobold e Galion, que o jogo põe em "Acessório", só apareciam no acessório direito; agora aparecem nos dois.',
        'Os conjuntos entre cartas passaram a ser calculados. Trinta e nove cartas tinham um bloco "Conjunto" na descrição que o simulador não somava — a Carta Caranguejo com o Molusco e a Estrela-do-Mar, a Carta Agressor com as quatro do conjunto, a Succubus com a Inccubus, a Carta Tritão, a Planta Carnívora, a Poltergeist, a Wickebine Tres e o resto. Agora cada uma só paga com as parceiras que a própria descrição nomeia, e continua sem pagar nada enquanto faltar uma delas.',
        'Quatro conjuntos nunca podiam funcionar, porque o cadastro procurava a parceira pelo nome em inglês. Carta Papel, Carta Caídos, Carta Nuvem Perigosa e Carta Neo Mineral apontavam para cartas que o banco guarda com o nome em português, então a conta não achava ninguém — vinte e duas referências ao todo, nenhuma pagando. Passaram a apontar pelo código do item, como manda o resto do banco. No caminho, a Carta Neo Mineral deixou de dar +3 de DEF por refino da capa sem a Carta Mineral equipada, que é o que a descrição sempre disse.',
        'Cinco cartas guardavam o conjunto da parceira em vez do próprio, e passariam a pagá-lo em dobro. Carta Senhor das Trevas, Batedor Ominoso, Verme Sombrio com Rosto, Necromante de Morroc e Jack Wolf tinham no cadastro a metade que a outra carta do par descreve; cada uma ficou apenas com o que a sua própria descrição promete, e nenhum bônus se perdeu, porque o lado que o descreve agora o paga.',
        'Todos os conjuntos de cartas identificam a parceira pelo código do item, e não mais pelo nome em inglês — são 434 condições em 201 cartas. O nome tinha dois defeitos: mudou a tradução, o bônus parava de sair sem avisar; e como o jogo relança a mesma carta com código novo mantendo o nome antigo, uma condição escrita assim valia para todas as gerações de uma vez. Nada muda no que cada conjunto paga hoje — a troca foi medida carta por carta antes e depois.',
        'A conferência ficou guardada: 251 cartas, 540 medições. Cada carta foi vestida sozinha e depois com cada combinação de parceiras que fecha o conjunto, e o resultado das duas situações foi comparado antes e depois da troca. O boneco usado na medição está refinado no +15, com grau A, atributos altos e a classe que cada linha exige, porque um conjunto que só paga com refino ou para certa classe marcaria zero dos dois lados e passaria despercebido.',
      ],
    },
    {
      v: '0.1.83-beta',
      date: '19-08-2026',
      logs: [
        'Os monstros de três instâncias novas entraram no simulador: Queda do Aeroplano, Arena Noturna e Torre da Constelação. São 48 alvos, e cada instância ganhou o seu grupo na lista — os cinco monstros da Gruta de Mjolnir com a Criatura Desconhecida; os dezesseis oponentes da arena de Geffen, do Arhi ao Fenrir; e os vinte e cinco chefes que aparecem a cada cinco andares da torre, com o Naght Sieger e o Betelgeuse.',
        'O seletor de Aliviar passou a aparecer para os alvos dessas instâncias que usam a habilidade. Na Arena Noturna são todos os oponentes, em nível que sobe conforme a rodada; na Torre da Constelação, o Naght Sieger a usa do nível 6 ao 10, um nível para cada Espinho vivo, e o Betelgeuse conforme as estrelas configuradas na Fonte da Deusa, chegando ao nível 10 à medida que invoca Almas Mortas. Como antes, o nível continua sendo escolhido na tela.',
        'Os MVPs de instância voltaram a aparecer dentro do grupo da própria instância. A lista mandava todo alvo marcado como MVP para o grupo "Boss" antes de olhar o mapa, então quem abria a Torre da Constelação encontrava os monstros dos andares mas não o Naght Sieger, e a Queda do Aeroplano ficava sem a Criatura Desconhecida. Além dos alvos novos, nove MVPs que já estavam cadastrados saíram do "Boss" para o grupo do seu próprio mapa, entre eles o Schulang, a Demi Freya, o Rei Goblin e a Ultra Limacina.',
        'O Betelgeuse aparecia na lista de alvos com o nome em coreano. O nome vinha de uma extração antiga do cliente, e a atual não traz mais o monstro, de modo que nada o corrigiria sozinho; agora ele aparece como Betelgeuse, dentro do grupo da Torre da Constelação.',
        'A RES e a RESM dos monstros passaram a vir da mesma extração que o resto dos atributos, que agora as publica. Isso vale para os alvos novos: os chefes da Torre da Constelação têm 300 de RES e 300 de RESM, e o Naght Sieger 300 e 200 — sem esses números o dano contra eles apareceria bem acima do real. Nenhum alvo já cadastrado mudou.',
        'Parte dos monstros dessas instâncias ainda não pôde ser cadastrada, porque a extração do cliente não os traz: os cinquenta monstros comuns dos andares da Torre da Constelação e dez dos seus chefes, o Espinho e a Alma Morta do Betelgeuse, o Alphonse da Arena Noturna e as quatro variações da Criatura Desconhecida invocadas com Fragmentos de Ymir. Os monstros dos andares mudam de atributo a cada andar, o que pede um alvo por faixa em vez de um só.',
      ],
    },
    {
      v: '0.1.82-beta',
      date: '19-08-2026',
      logs: [
        'Os Sapatos de Cerco, o Manto de Cerco e outros 54 equipamentos não apareciam para a linha dos Noviços. No cadastro, "Noviços" tinha sido lido como "Aprendizes", de modo que peças que o jogo libera para Noviços, Sacerdotes, Monges e suas evoluções ficavam fora das listas — e apareciam para o Hiperaprendiz, que não as equipa. As 56 peças foram acertadas pela linha "Classes" da descrição do próprio jogo, e entre elas estão a Batina, o Chapéu de Enfermeira, o Manto do Médico, a Medalha de Honra (Noviço), os cajados, cetros e varinhas da linha e o conjunto de Cerco. Reportado por Luís.',
        'A Boina Alada com slot não estava no banco de dados. O jogo tem duas: uma sem slot e outra de um slot, ambas com +10% de resistência às raças Humanoide e Humano. Só a primeira estava cadastrada; agora as duas aparecem na lista, e as duas somam a DEF 1 que a descrição promete. Reportado por Luís.',
        'A raça "Semi-humano" passou a se chamar "Humanoide" nas tabelas e na lista de bônus, que é como o cliente do jogo a chama.',
      ],
    },
    {
      v: '0.1.81-beta',
      date: '19-08-2026',
      logs: [
        'As pedras de crítico dos Elmos da Fé não estavam na lista. O encantador oferece seis linhas numa das listas — Espírito do Lutador 3 a 5, e Pedra de Encantamento, Pedra de Crítico, Anti-Atraso, Mira Apurada e Anti-Horário, todas de 1 a 3 — e as sete Insígnias na outra, também de 1 a 3. No lugar disso o simulador trazia Expert Fighter e Expert Magician, que não saem nesses elmos (a abreviação "E. Lutador" da tabela é o Espírito do Lutador, outra família), níveis acima das duas melhorias possíveis, e nenhuma Pedra de Crítico. As duas listas foram refeitas pelos códigos dos itens que a própria tabela referencia, a Insígnia da Afeição entrou, e a correção vale para os 34 Elmos da Fé, não só para o Celestial. Uma build já salva com um encanto que saiu da lista continua abrindo com ele. Reportado por Ted.',
      ],
    },
    {
      v: '0.1.80-beta',
      date: '19-08-2026',
      logs: [
        'O encanto de VIT dos Sombrios Magistrais estava fora da lista. O quarto slot da Manopla Sombria Magistral e do Escudo Sombrio Magistral oferece um encanto para cada atributo — FOR, AGI, VIT, INT, DES e SOR, todos +5 —, e o simulador trazia DES duas vezes e nenhuma opção de VIT, de modo que quem tinha o encanto de VIT não conseguia montar a build como ela está no jogo. As seis opções agora aparecem uma vez cada, na ordem em que o jogo as lista. Reportado por Ronjero.',
      ],
    },
    {
      v: '0.1.79-beta',
      date: '19-08-2026',
      logs: [
        'O HP máximo do equipamento sombrio era contado duas vezes. Cada peça de armadura, escudo, calçado, brinco e colar sombrio promete "HP máx. +10 por refino" na própria descrição, e o simulador pagava esse valor a partir do cadastro da peça e outra vez por uma regra fixa que somava dez pontos por refino sombrio equipado. A mesma regra ainda dava HP a dez peças que não prometem nenhum — a Armadura Sombria Transcendente não tem linha de HP, e a Malha Sombria de Apoio dá cem fixos, não por refino. A regra fixa saiu, e as 34 peças cuja descrição prometia os dez sem que o cadastro os declarasse passaram a declará-los; das 546 peças sombrias desses cinco lugares, todas as 536 que prometem agora pagam, uma vez só. Numa build com um colar sombrio +5, isso são 51 pontos de HP a menos do que o simulador mostrava e exatamente o que a janela de status do jogo mostra.',
        'A Musa foi conferida contra a gravação de Tuévia Ado, e as fórmulas da classe estão certas. A build importada reproduz a janela de status do jogo nos três estados que a gravação mostra — desarmada, só com o Chicote de Cinzas e com o equipamento completo —, tanto no ATQ e no ATQ de equipamento quanto nos bônus de AGI, VIT, INT, DES e SOR; o Temporal de Flechas e o Vulcão de Flechas saem com as razões da tabela do próprio cliente, e a conjuração e a espera de toda a classe já batiam. Fica em aberto uma diferença de cerca de 5%, com o simulador abaixo do jogo, que aparece igual nas duas habilidades e nos dois estados de equipamento e que nenhuma descrição do que ela usava justifica; uma segunda gravação com o mesmo equipamento e outros buffs é o que fecharia a conta. Obrigado Tuévia Ado pela gravação.',
        'Um personagem desarmado voltou a somar o ATQ da munição equipada. O simulador perguntava à arma se o golpe era a distância para decidir se a flecha contava, e de mãos vazias não há arma para responder — a mesma gravação mostra a flecha valendo os seus 30 de ATQ tanto na janela de status quanto nos nove golpes desarmados. Golpes de habilidade corpo a corpo seguem ignorando a munição, como já ignoravam.',
      ],
    },
    {
      v: '0.1.78-beta',
      date: '19-08-2026',
      logs: [
        'As Botas do Bem e do Mal entraram no simulador antes de chegarem ao LATAM, fechando o conjunto que as Coroas do Bem e do Mal abriram. São 18 peças, uma por classe, com dois encantos cada: no primeiro slot, o Good Vigor ou o Evil Vigor da própria classe, onde mora o bônus de conjunto; no segundo, a mesma lista de cinco linhas para todas elas — Pedra de Encantamento 5 a 7, Mira Apurada 3 a 5, Anti-Atraso 2 a 4, Expert Fighter 3 a 5 e Expert Magician 3 a 5. Como o cliente ainda não trouxe as botas, elas aparecem com o nome e a descrição em inglês do iRO e levam a etiqueta iRO na lista, para não se confundirem com o que já dá para equipar; o ícone fica em branco até o cliente publicá-lo. Quando o LATAM lançar as peças, o texto em português entra no lugar sozinho. Solicitado por Ted e Shummuy.',
        'O bônus de conjunto das botas só é pago junto da coroa. Cada Good Vigor exige o Good Spell encaixado na Coroa do Bem e do Mal, e cada Evil Vigor exige o Evil Spell; sem o encanto da coroa, as botas rendem apenas as próprias linhas de refino e de grau, e o encanto do lado errado não paga nada. No Guerrilheiro o bônus ainda muda conforme a coroa — são cinco, uma por arma, e cada uma acende habilidades diferentes.',
        'Postas à mostra pela primeira vez, as 54 peças foram conferidas linha a linha contra a descrição, e um erro veio junto do cadastro antigo. As Botas do Bem e do Mal do Mandraque somavam MATQ +7% no refino 7, dano mágico de todos os atributos no refino 9 e dano mágico por tamanho no Grau C, nada disso descrito, e deixavam de somar o dano físico corpo a corpo do refino 9, que a descrição promete. O conjunto do Mandraque é físico do começo ao fim, coroa e encantos inclusive, e as botas passaram a segui-lo.',
      ],
    },
    {
      v: '0.1.77-beta',
      date: '19-08-2026',
      logs: [
        'As Pedras de Encantar Visual ganharam a família de códigos novos: 255 pedras que o jogo reeditou sob outros códigos e que não existiam no banco. Enquanto as duas versões conviviam, a pedra era encontrada pelo nome antigo e a coisa passava despercebida; onde só a nova existe — as Pedras de Propriedade, as Duais de talento, a Vel.Atq +1 —, a pedra não aparecia em lugar nenhum. As duas gerações agora aparecem nos seletores de Topo, Meio, Baixo, Capa e Capa 2, com o mesmo efeito. Reportado por usuário anônimo.',
        'Os conjuntos passaram a valer misturando as duas gerações. Uma pedra reeditada guarda o nome interno da versão antiga, que é por onde o simulador reconhece parceiro de conjunto, então a Pedra de Corpo (Topo) nova com a Meio e a Baixo antigas paga os mesmos +6% que o trio antigo pagava. Duas linhas dependiam do código em vez do nome e foram abertas à mão: os três parceiros da Pedra de Corpo (Dual), cadastrada na versão passada e que só reconhecia as pedras antigas, e a Invocador (Capa) com a Invocador (Topo).',
        'A Pedra de Pós (Dual) entrou junto com o resto da família, com seus -5% de pós-conjuração. Reportado por Ynk.',
        'A família Propriedade entrou inteira — Topo, Meio, Baixo e Dual —, com o dano mágico de todas as propriedades que ela promete: +3% por peça, +6% adicional no trio, e a Dual com +4% mais +2% por peça acompanhada. O texto do jogo lista "Propriedade (Topo)" entre as parceiras da própria Pedra de Propriedade (Topo), o que exigiria duas pedras de topo ao mesmo tempo; as outras pedras de topo da mesma família, Corpo e Alcance, pedem a Meio e a Baixo, e foi assim que o conjunto ficou cadastrado.',
        'Cinquenta e uma das 255 entraram sem efeito no cálculo. São as gráficas, as que liberam uma perícia — Curar, Teleporte, Ganância, Identificar — e as que prometem coisas que o simulador não mede: cura recebida, efetividade de cura, regeneração ao longo do tempo, conversão de dano em HP ou SP e EXP. Elas aparecem no seletor para que a build possa ser montada como está no jogo, mas não somam nada, e deixar a linha de fora é preferível a inventar um efeito.',
      ],
    },
    {
      v: '0.1.76-beta',
      date: '19-08-2026',
      logs: [
        'A Lança do Destino saía cerca de 14% abaixo do jogo, por causa da razão cadastrada. A descrição do cliente dá 350% por nível, e 500% enquanto o bônus da Espiral Lunar estiver ativo — no Nv 5, 1.750% e 2.500% —, e o cadastro trazia 300% e 450%, os números da versão 2 do blog do Sigma, que o LATAM não roda. O que aponta a tabela certa não depende de nenhum valor absoluto: a gravação liga e desliga o bônus da Espiral Lunar dentro do mesmo estado de buffs, e a razão entre as duas faixas de dano é justamente onde as duas tabelas discordam — 1,41 pela antiga, 1,36 pela do cliente, e o arquivo mede 1,3626 em 27 golpes. Com a correção, os 51 golpes gravados caem dentro da faixa calculada, nas duas metades da gravação e contra os bonecos pequeno, médio e grande.',
        'A Posição de Defesa entrou no simulador. O Guardião Imperial tinha a Posição de Ataque e nenhuma contrapartida para a postura defensiva, que o cliente resume em DEF +300 e ATQ -250 no Nv 5, 50 de cada lado por nível. Quem simulava nessa postura recebia o ATQ da outra, e a gravação é o que mostra o tamanho da diferença: o ATQ de equipamento salta de 572 para 822 no instante em que a postura é trocada, e a faixa de dano do começo do arquivo só fecha com os 250 descontados. As duas metades foram conferidas contra a janela de status da própria gravação — ATQ de equipamento 372 e DEF 791. No jogo as duas posturas se cancelam; o simulador não impede que fiquem ligadas ao mesmo tempo, então isso fica a cargo de quem monta a build. Entraram junto no catálogo de nomes o Escudo Guardião, a Remissão, o Ultimato e a Crux Judicium, que faltavam.',
        'O Golpe do Destino subiu de 60% para 80% por nível, a tabela do cliente (Nv 10: 800%). O que confirma que 80% é a base, e não um número que já embuta a maestria, é o formato das duas habilidades irmãs: o Arremessar Escudo parte dos 600% do cliente e a Crux Tempestas dos 150%, ambas somando a maestria por cima, e o Golpe do Destino era o único que começava abaixo da própria linha. Os valores por nível de maestria seguem sem confirmação — o cliente diz que a Maestria da Guarda e a Perícia com Escudo afetam o dano de algumas habilidades, mas não dá número —, e uma gravação do Golpe do Destino em dois níveis de maestria resolveria.',
        'A Rapidez com Lança passou a valer por nível. Ela dava CRIT +30 e Esquiva +20 em qualquer nível, que é a linha do Nv 10; a tabela do cliente é +3 de CRIT e +2 de Esquiva por nível. O Nv 10 está medido na gravação, que registra o Crítico indo de 33 para 63 e a Esquiva de 500 para 520 no momento em que o buff sobe. O seletor da habilidade virou uma lista de níveis, e quem tinha o antigo "Sim" gravado continua no Nv 10. A parte de velocidade de ataque ficou como estava, porque o cliente diz que ela aumenta sem dizer quanto.',
        'Fora isso, a classe fecha com o jogo. A build foi lida da própria gravação — 19 peças com refino, cartas, encantos e bônus aleatórios — e reproduz a janela de status do arquivo em todos os campos que ela registra: ATQ, ATQ de equipamento, P.ATQ, S.ATQM, Crítico e DEF. O crítico do ataque básico, único número determinístico do arquivo, sai exato na unidade, e a Espiral Lunar já estava certa. Gravação enviada por usuário anônimo.',
      ],
    },
    {
      v: '0.1.75-beta',
      date: '19-08-2026',
      logs: [
        'As fórmulas dos talismãs do Asceta das Almas foram refeitas a partir das tabelas do próprio cliente. Vinham do blog da 2ª versão, que não descreve o LATAM: o blog põe o Talismã do Dragão Nv 1 em 250 + 1.450 onde a linha do cliente diz 900. Duas gravações dão razão ao cliente — em uma delas, cinco disparos de Nv 1 colocam o coeficiente do Dragão entre 3.216 e 3.743, contra os 4.961 que a tabela antiga produzia. Dragão, Tigre, Fênix, Jabuti, Divindades e Ceifeiro passaram a seguir a linha por nível que o jogo mostra, e o dano de todos eles cai.',
        'A segunda coluna de dano de cada talismã estava presa ao Talismã dos Elementos. O cliente a condiciona ao estado [Mandala das Feras], que é outra coisa: o Talismã dos Elementos só dá os 4% de dano por nível contra as propriedades Água, Vento, Terra, Fogo e Neutro, e nunca mexeu em coeficiente nenhum. A Mandala virou seu próprio botão, com os +5 de S.ATQM por nível que ela concede — uma das gravações mostra a janela de status marcando 62 e caindo para 37 quando o estado expira.',
        'Quatro habilidades da classe entraram no simulador. A Mandala das Feras é a ultimate e era a maior linha de dano que faltava; o Talismã do Ceifeiro estava no catálogo mas fora da lista de habilidades, o que deixava sete equipamentos com bônus para ele que nenhuma build conseguia disparar. O Talismã do Guerreiro e o Talismã do Mago entraram como botões de P.ATQ e S.ATQM — os +4 de S.ATQM do Talismã do Mago no Nv 2 são o último 1,7% que faltava para a segunda gravação fechar.',
        'O Talismã das Divindades acertava uma vez a mais no topo. O cliente diz um golpe por Fera que abençoou o usuário, mais um, e 7 só com a Mandala ativa; a opção "quatro direções" dava 7 direto. A ordem das bênçãos também estava trocada: a corrente é Dragão, Tigre, Fênix e Jabuti — Leste, Oeste, Sul e Norte — e os degraus 2 e 3 estavam nomeados como Sul e Oeste. Os valores guardados não mudaram, então as simulações salvas continuam significando o que significavam.',
        'O Espírito da Fada voltou a existir, e as Almas deixaram de dar ATQM. O Espírito estava desligado no código e é real: uma gravação o conjura com quase nada equipado e o ATQM de equipamento sobe de 4 para 54. Já as Almas somavam 3 de ATQM cada uma, o que o jogo não faz — o medidor enche até 20 antes de cada disparo e o ATQM não se move. Juntas, as duas correções levam o erro do estado sem equipamento de 1,26% para 0,08%.',
        'O Diadema Profano ganhou o conjunto que faltava. A descrição paga ATQ e ATQM +50, +8% de dano contra Chefes e +10% contra as propriedades Neutro e Sagrado quando um Anel e um Colar Profano da mesma pedra estão equipados, e nada disso estava cadastrado. A gravação prova a parte fixa na unidade — ao equipar o diadema, o ATQ de equipamento vai de 137 para 187 — e a parte percentual pelo dano: sem ela, o maior pacote gravado fica acima do que o simulador consegue produzir.',
        'Fica em aberto quanto o FEI soma nos talismãs. O cliente não publica essa coluna e o simulador mantém o FEI × 5 do blog; as gravações disponíveis prendem o número entre FEI × 5,5 e FEI × 6,2 no Nv 1, perto mas provavelmente baixo. Uma gravação sem arma alguma, com um talismã no Nv 1 e no Nv 5, resolve: sem arma não há sorteio de ATQM para um coeficiente errado se esconder dentro. Pela mesma razão, o dano da Mandala das Feras ainda não é conferido contra o único pacote gravado dela. As gravações vieram de SPC das Almas e de um usuário anônimo — obrigado pelas duas.',
      ],
    },
    {
      v: '0.1.74-beta',
      date: '19-08-2026',
      logs: [
        'A Perícia com Katar Avançada passou a entrar antes da DEF do alvo, e não no fim da conta. O bônus da perícia — 20% no Nv 5 — era o último multiplicador da fórmula, aplicado depois de a DEF do alvo já ter sido descontada. Com isso a própria DEF era ampliada na mesma proporção: contra um alvo com 50 de DEF suave, o desconto custava 60. O dano saía, portanto, um pouco abaixo do que o jogo entrega, e tanto mais quanto maior a DEF do alvo e menor o golpe. A correção vale para o ataque básico e para as habilidades, e alcança toda a linha do Sicário que aprende a perícia.',
        'A ordem certa veio de uma gravação de Executor nível 240 batendo nos dummies. Ela carrega dois estados do mesmo equipamento — com e sem o efeito da Manopla Sombria do Katar, que tem 30% de chance de conceder dano crítico e dano por tamanho por 5 segundos —, e os dois saíam 35 pontos abaixo do gravado, sempre os mesmos 35. Uma diferença fixa nos dois estados não é multiplicador faltando; é etapa fora de lugar. Das quatro posições possíveis para o bônus do katar, só uma reproduz os dois pacotes, e é a mesma que o servidor usa. Agora os nove pacotes do arquivo batem exatos, sem sobra de um ponto.',
        'As Lâminas Retalhadoras em si não precisaram de mudança. A razão da habilidade vem da tabela do cliente — 2.150% no Nv 5, multiplicados pelo nível de base — e reproduz o arquivo, assim como a taxa de crítico, que passa de 100% nessa build e explica por que todos os golpes gravados são críticos. Obrigado Merda Miserável pela gravação.',
        'O Impacto Brutal voltou a oferecer todos os seus níveis. A habilidade vai até o Nv 10 no cliente, e a lista do simulador parava no Nv 5 — era a única habilidade ofensiva do Executor limitada abaixo do que o jogo permite. Agora dá para escolher do Nv 1 ao Nv 10, e as builds já salvas no Nv 5 continuam abrindo no mesmo nível.',
      ],
    },
    {
      v: '0.1.73-beta',
      date: '19-08-2026',
      logs: [
        'O conjunto dos Manuks voltou a pagar o bônus inteiro. A Vestimenta dos Manuks reúne o Anel, as Botas e o Capuz, e das quatro linhas que a descrição promete só uma estava cadastrada, a de +20% de dano nas Lâminas Retalhadoras; faltavam Dano crítico +40%, CRIT +15 e Esquiva +10. O dano crítico é o que mais pesa: numa build que crita sempre, ele sozinho respondia pela diferença inteira, e os seis golpes gravados ficavam de 5% a 17% acima do teto que o simulador calculava.',
        'O Katar Metálico entrou no banco de itens. Ele não estava lá, e quem o equipava importava a gravação sem arma nenhuma — o ATQ de equipamento caía dos 220 que o jogo mostra para os 25 que vêm do resto do equipamento. Os bônus são os mesmos do Punhal Metálico, trocando os 2 de ATQM por refino por 1% de dano crítico. A Caipirinha, equipamento de cabeça na posição baixa, também entrou; ela não concede bônus algum, mas aparecia como item fora do banco de dados na importação.',
        'A classe em si não precisou de mudança. O Sicário foi conferido pacote a pacote contra uma gravação em que o personagem troca de arma na frente da câmera — Katar de Apoio Crítico +13, Punhal Metálico +7 e Katar Metálico +7 —, o que remonta a janela de status três vezes: ATQ, ATQ de equipamento e VelAtq batem com o jogo nas três. A razão das Lâminas Retalhadoras vem da tabela do cliente e reproduz o arquivo. Fica em aberto o campo Crítico, que sai 2 pontos acima do que o jogo mostra; a diferença está na parcela que vem da SOR, não nos equipamentos, e uma gravação com outra SOR resolveria. Obrigado KZGX pela gravação.',
      ],
    },
    {
      v: '0.1.72-beta',
      date: '19-08-2026',
      logs: [
        'As armas da Luz Radiante, as armas do Pecado e as Coroas do Bem e do Mal entraram no simulador antes de chegarem ao LATAM. São 64 peças — 21 armas de cada lado e as 22 coroas, uma por classe —, com os encantos das três listas: Good Spell e Evil Spell no primeiro slot da coroa e as seis insígnias no segundo; nas armas, Mira Apurada, Expert Fighter e Expert Magician de um lado, Pedra de Crítico, Anti-Atraso, Hit Plus e Caster do outro. Como o cliente ainda não trouxe essas peças, elas aparecem com o nome e a descrição em inglês do iRO — daí os encantos que ainda não têm nome em português — e levam uma etiqueta iRO na lista, para não se confundirem com o que já dá para equipar; o ícone fica em branco até o cliente publicá-lo. Quando o LATAM lançar as peças, o texto em português entra no lugar sozinho. Solicitado por Shummuy.',
        'A Insígnia da Afeição entrou no banco de encantos. Ela é um dos seis sorteios do terceiro slot da Coroa do Bem e do Mal, e faltava: o sorteio aparecia com cinco opções em vez de seis. Os três níveis somam SP máximo.',
        'Postas à mostra pela primeira vez, as peças foram conferidas linha a linha contra a descrição, e quatro erros vieram junto do cadastro antigo. O maior estava nas 22 coroas, que pagavam o bônus de conjunto só com o encanto: bastava encaixar o Good Spell ou o Evil Spell para receber os 15% e os 20% que a descrição promete apenas junto da arma do conjunto, sem arma nenhuma equipada, e o encanto de um lado ainda pagava as habilidades do outro. Cada uma dessas linhas passou a exigir a arma e o encanto ao mesmo tempo.',
        'Os outros três eram números trocados. As Coroas do Bem e do Mal do Mandraque, do Falcão do Vento e do Maestro/Diva davam POD +2 no Grau B, e a descrição das três diz CON +2 — as outras dezenove dizem POD, e o cadastro copiou delas. A coroa do Executor somava 10% de dano físico corpo a corpo a cada 3 refinos da arma, em vez dos 5% descritos. E a Espada da Vitória dava 5% de dano físico corpo a corpo no Grau D, em vez de 10%.',
      ],
    },
    {
      v: '0.1.71-beta',
      date: '18-08-2026',
      logs: [
        'O Estudo de Livros voltou a valer para Feiticeiro e Elementalista. A habilidade promete ATQ de perícia e velocidade de ataque com Livro equipado, e a velocidade de ataque nunca chegava ao cálculo: estava guardada sob um nome que nenhuma parte do simulador lia, de modo que só o ATQ era aplicado. Agora, no Nv 10 e com Livro na mão, são +30 de ATQ de perícia e +5% de velocidade de ataque, e nada com qualquer outra arma. Reportado por Ted.',
        'A Sinfonia Mística passou a somar seus 100% de dano junto com os bônus dos equipamentos, em vez de multiplicar por fora deles. A descrição da habilidade aumenta em 100% o dano de Disparo Rítmico, Atirar Rosas e Arranjo Musical, e essa parcela entra na mesma conta em que entram os equipamentos que também aumentam essas habilidades. Um Chicote Consertado que já vale +35% no Disparo Rítmico passa a somar 135%, e 235% com a ultimate ligada — antes a ultimate dobrava o total, valesse o que valesse o chicote. Vale para Diva e Maestro. Reportado por usuário anônimo.',
        'Os níveis de habilidade passaram a aparecer como "Nv" em toda a interface. Parte das listas ainda dizia "Lv", que convivia com o "Nv" já usado na barra de combate, nas simulações salvas e na lista de alvos.',
        'No seletor de nível da habilidade, na barra de combate, a setinha ficava do lado de fora da moldura do nível. A moldura passou a envolver o conjunto, nível e setinha.',
      ],
    },
    {
      v: '0.1.70-beta',
      date: '18-08-2026',
      logs: [
        'O Projétil Venenoso entrou no banco de itens. A falta dele aparecia de um jeito indireto: ao importar a gravação de quem usava esse projétil, a munição caía no outro maço da bolsa e a build vinha com ATQ 40 no lugar dos 20 que o Projétil Venenoso tem, inflando o dano em cerca de 1%. Os 20 de ATQ estão presos por duas fontes independentes que não se apoiam uma na outra: a descrição do cliente e os críticos da própria gravação, que só fecham exatos com esse número e erram com 19 ou com 21.',
        'A importação de replay passou a escolher a munição certa quando a gravação declara mais de um maço equipado. O jogo só deixa equipar um, mas o retrato guardado no arquivo às vezes marca vários — dois maços de projétil numa gravação de Guerrilheiro, quatro maços de flecha numa de Falcão do Vento —, e antes valia o último da lista, que era o errado nas duas. Quem atira gasta o maço carregado, e o arquivo registra esse consumo por posição da bolsa: é isso que decide agora. A conta fecha sozinha na gravação do Guerrilheiro, que gasta 210 projéteis, exatamente os 30 disparos de Fogo de Supressão a 5 mais os 10 de Artilharia Pesada a 6. A ordem na bolsa virou apenas o critério de desempate, porque sozinha ela não diz nada: o maço certo é o primeiro numa das gravações e o último na outra.',
        'A classe em si não precisou de mudança. A gravação foi conferida pacote a pacote nos quatro estados que ela mostra — quase sem equipamento, equipada, e depois trocando o Lança-Granadas pela Espingarda e pelo Revólver —, e a janela de status bate com o jogo em todos os campos: ATQ, ATQ de equipamento, P.ATQ, S.ATQM, RES, RESM, C.Mais, T.CRÍT e VelAtq. O crítico da Artilharia Pesada, único número determinístico do arquivo, sai exato na unidade, e os 40 pacotes gravados caem dentro da faixa calculada. O Fogo de Supressão não crita, então dele só dá para afirmar que nada escapa da faixa — uma gravação com mais disparos apertaria essa margem. Obrigado Nicolas pela gravação.',
      ],
    },
    {
      v: '0.1.69-beta',
      date: '18-08-2026',
      logs: [
        'O Mestre Celestial ganhou as duas habilidades que faltavam: Amanhecer e Anoitecer. São as que abrem os estados do Espaço Celeste — o primeiro golpe ativa Nascer do Sol ou Nascer da Lua, o segundo Meio-Dia ou Meia-Noite, o terceiro Pôr do Sol ou Pôr da Lua — e são pré-requisito do Firmamento, então todo Mestre Celestial tem as duas. Nenhuma estava na lista de habilidades do simulador, e o Anoitecer não estava nem no catálogo de nomes. As duas agora aparecem no seletor, nos cinco níveis.',
        'O dano do Anoitecer foi medido numa gravação em que o personagem começa sem equipamento nenhum: sem arma não há variação de ATQ, e cada golpe repete o mesmo número inteiro. Com isso o ATQ do personagem e a defesa do boneco ficam determinados, e a razão da habilidade sai exata — a tabela do cliente dá 900% no nível 1, e o que sobra é POD × 3, não o POD × 5 das habilidades de explosão. O Amanhecer ficou com o mesmo POD × 3 do irmão, por simetria: nenhuma gravação recebida até hoje usa o Amanhecer, então esse é o único número da dupla que ainda não foi medido, e uma gravação com ele resolveria a questão.',
        'O resto da classe foi conferido golpe a golpe contra a mesma gravação, nos três estados de equipamento que ela mostra — sem nada, só com a arma e com o equipamento completo —, e fecha com o jogo. A gravação também mediu pela primeira vez os ramos reforçados do Chute Meia-Lua e da Alvorada: a anterior tinha sido feita sob Elo Celestial, que libera as quatro habilidades de estado ao mesmo tempo e por isso não separava o dano dentro do estado do dano fora dele. Nesta, a Alvorada aparece nos dois estados no mesmo arquivo, com 1,32x de diferença — exatamente o que as duas linhas da descrição do jogo dizem. Obrigado Zonnor pela gravação.',
      ],
    },
    {
      v: '0.1.68-beta',
      date: '18-08-2026',
      logs: [
        'A base de itens foi sincronizada com o cliente. O jogo deixou de trazer nome e descrição para 833 itens — quase todos peças antigas, de aluguel ou de eventos fora de circulação —, e eles saíram das listas do simulador junto com o cliente; outros 111 ganharam nome e entraram. Boa parte do que ficou veio retraduzida: cartas, encantos e conjuntos que apareciam com texto do servidor tailandês ou com tradução automática estão agora em português, e vários nomes mudaram — a Carta Madeira Podre virou Carta Árvore Decaída, as cartas "da Arena" viraram "Noturnal", o Traje Anti Conjure virou Uniforme Anti-Magia.',
        'Com o texto novo, três Capacetes revelaram um conjunto pela metade. O Capacete Decadente, o Fortificado e o Descartado dão dano físico e mágico contra todos os tamanhos +10% com qualquer arma da família, mas o cadastro só reconhecia as quatro ou cinco primeiras: a descrição antiga nomeava o resto com nomes que não existiam no jogo ("Cetro Fortificado", "Cauda de Gato Decandente", "Pulverizador Descartado") e não havia como resolver o código da peça. As três listas estão completas — 8, 8 e 10 armas —, então quem usa Lâmina Decadente, Punhal Fortificado ou Revólver Descartado deixou de perder 10% nos dois canais.',
        'O Elmo da Fé Felina II ganhou o bônus do refino +7, que nunca esteve cadastrado: dano mágico contra todos os tamanhos +5%. O cliente descrevia a linha como dano físico, o que não combina com nenhuma outra linha da peça, e o texto novo a corrige para mágico.',
        'O Revólver Primordial-LT e o Gatling Primordial-LT ganharam a resistência a todos os tamanhos +20% que a descrição sempre trouxe — no +7 e no +11, respectivamente. E o Sobrepeliz Mágico de Geffen passou a dar 2% de velocidade de ataque a cada 3 refinos, e não 1%, acompanhando as outras três peças da mesma família.',
        'Três visuais mudaram de posição no cliente e foram acertados: o Leque de Veraneio saiu do topo para baixo, o Laço Alado Gótico saiu do meio para baixo, e o Bebum — que se chamava Marcas do Envergonhado — saiu de baixo para o meio.',
        'Uma varredura atrás do mesmo tipo de falha achou mais doze peças que prometiam dano contra todos os tamanhos e não entregavam nada, e duas que entregavam no canal errado. O Arco Primordial-LT somava a linha como dano contra propriedades, que a descrição dele nem menciona; o Detector de Joias, uma adaga mágica, disparava a versão física de um efeito que o texto diz ser mágico. As outras dez simplesmente não tinham a linha cadastrada: Vingativa, Certeira Ilusional, Gorro Felino Poderoso e Mágico, Malha Sombria de Ferreiro, Maratona Mecânica 2 e 3, e o conjunto Aikuchi-OS + Kuroiro-OS, do qual só o primeiro degrau estava no banco. Os dois Gorros Felinos e as duas peças de Geffen também recuperaram linhas vizinhas que faltavam, como a Precisão perfeita.',
        'De quebra, a Malha Sombria Shinobi somava o dano mágico de todas as propriedades na etapa errada da conta. A descrição diz "dano mágico de todas as propriedades" — o "de" é a parcela que soma; a peça estava na etapa que multiplica, reservada ao "contra oponentes de". É a única das 150 peças com essa frase que estava do lado errado.',
        'Oito equipamentos que o cliente acabou de nomear entraram no banco: os visuais Ornamento de Camélias, Asas de Cupido Rosa, Coroa de Flores Vermelhas, Coroa de Mil Rosas, Peruca Longa de Pétalas e Ramo de Cerejeira, e dois adereços de baixo com efeito de verdade — o Amigo Gioia, que reduz pós-conjuração e soma dano mágico de propriedade Fantasma, e o Bebê Lobo, que soma Precisão perfeita e, com a Carta Fofinho ou a Carta Atroce, velocidade de ataque e dano contra Chefes. A Carta Atroce em si também entrou: ATQ +25 e, no efeito que ela sorteia, velocidade de ataque +100%.',
      ],
    },
    {
      v: '0.1.67-beta',
      date: '18-08-2026',
      logs: [
        'A Centelha das Trevas saía 3% acima do jogo, e a causa eram dois bônus de ATQ somados em golpe que não os recebe. A Perícia com Shuriken dá +30 de ATQ no nível 10, mas só "ao usar Shuriken e Kunai", como diz a descrição no jogo; estava entrando em qualquer ataque do Kagerou e do Shinkiro. E o ATQ da munição equipada entrava do mesmo jeito, em todo mundo: quem é da linha do Kagerou mantém kunai equipada para as habilidades de arremesso e bate de adaga, então os 30 de ATQ da Kunai Ardente iam junto no golpe corpo a corpo. Agora os dois contam só quando o ataque de fato arremessa alguma coisa — as habilidades de Kunai e de Huuma continuam recebendo os dois, e o ataque básico segue a arma. A munição vale para qualquer classe: habilidade corpo a corpo não usa flecha, bala nem kunai. Medido numa gravação enviada por Oden.',
        'Os encantos visuais dos trajes do meio e de baixo sumiam ao importar replay. O traje do topo entrava com o encanto dele, os outros dois entravam vazios — e como um deles costuma ser metade de um conjunto, junto com o encanto ia embora o bônus do conjunto também. Na gravação que mostrou o problema eram Mortal 1, Mortal 3 e, por tabela, o conjunto do Mortal 2: 12% de Dano Crítico que a build tinha e o simulador não via. O replay diz em que traje cada encanto está de duas maneiras diferentes, conforme o momento em que a peça foi vista, e a importação só entendia uma delas. Agora entende as duas.',
        'Com as três correções, a Centelha das Trevas fecha com o jogo até a unidade nos três estados da gravação — sem equipamento, só com a arma e com o equipamento inteiro. De quebra, a gravação resolveu uma dúvida antiga da fórmula: o termo "+ POD × 5" da habilidade era medido em um personagem com POD 8, onde POD e STA davam o mesmo número e não dava para saber qual dos dois era. Este tem POD 100 e STA 0, e o dano só bate com POD. Obrigado Oden pela gravação.',
      ],
    },
    {
      v: '0.1.66-beta',
      date: '18-08-2026',
      logs: [
        'O dano por segundo das habilidades de recarga longa saía muito acima do real: no Firmamento, do Mestre Celestial, 122 vezes maior. A cadência de uso era guardada com uma casa decimal só, e uma habilidade que sai uma vez a cada 61 segundos dá 0,016 usos por segundo — arredondado para baixo, zero. Esse zero era lido como "esta habilidade não tem dados de conjuração", e a conta caía na cadência do ataque básico: dois golpes por segundo para uma habilidade que sai uma vez por minuto. Agora a cadência guarda precisão suficiente para qualquer recarga. São pelo menos 14 habilidades em 11 classes com recarga de 60 segundos, e as de 3 a 10 segundos também estavam subestimadas, em menor grau. O "Hab./s" delas, que aparecia como 0, passou a mostrar a cadência de verdade. Reportado por Ted.',
        'O aviso "Recarga não fecha" parou de aparecer em rotação de uma habilidade só. Sozinha, a habilidade repete no próprio tempo dela e a espera pela recarga é o ciclo — o Firmamento acusava 59,53 segundos faltando numa rotação perfeitamente normal. Do jeito que estava, o aviso saía em vermelho para 244 das 248 habilidades que têm alguma recarga, e a linha do tempo pintava a faixa junto. Com duas habilidades ou mais o aviso continua, que é onde ele quer dizer alguma coisa.',
        'A linha do tempo do ciclo passou a espaçar as marcações conforme a duração. Num ciclo de 61 segundos ela desenhava 62 marcações de um segundo, grudadas como "0s1s2s3s", o que dava a impressão de a habilidade repetir dezenas de vezes; as faixas sempre estiveram certas, o eixo é que não estava. O "Morre em" também deixou de discordar do número ao lado: dividia o HP do alvo pelo DPS sustentado, espalhando uma pancada de 58 milhões pelo minuto inteiro do ciclo, e respondia "24,6s" ao lado de "1 uso". Agora percorre a rotação e diz quando cai o golpe que mata.',
        'Cada linha da rotação passou a mostrar os desfechos por trás do número, e não só a média. Uma habilidade que crita parte das vezes mostra a rolagem sem crítico e a com crítico, cada uma com seu mínimo e máximo; uma que nunca crita mostra a rolagem que tem, que antes não aparecia em lugar nenhum. O número em destaque é a média dos dois desfechos pesada pela taxa de crítico — é ela que a rotação e o DPS usam —, e a etiqueta "média" existe para que a taxa ao lado não seja aplicada de novo por cima. Clicar em cada um abre a explicação daquele número.',
        'Clicar na taxa de crítico passou a abrir a conta inteira, e não só a lista de itens que dão CRIT. A janela mostra cada parcela na ordem em que o jogo aplica: o CRIT que vem do SOR, o dos equipamentos, o valor fixo que a própria habilidade soma — o Tiro Preciso soma 50 —, a parcela do CRIT que a habilidade aproveita, que em algumas é metade, e o escudo de crítico do alvo, que sai do SOR do monstro e era a única parcela que não aparecia em lugar nenhum. A lista de itens continua a um clique.',
        'A etapa de redução na fórmula do dano dizia "Redução de aura (99,9%)" mesmo quando quem reduzia era o Aliviar, e mesmo no nível 5, que corta metade do dano. Agora ela diz qual das duas está agindo e traz a porcentagem que de fato aplica; com as duas ao mesmo tempo, credita as duas, porque se multiplicam.',
        'Habilidades mágicas pararam de exibir "Sem crít." na rotação: magia não crita, então a frase descrevia o tipo de dano e não a habilidade. Numa habilidade física que não crita ela continua. O cursor de interrogação também saiu de cena — os textos que se explicam ao passar o mouse continuam iguais, com o ponteiro normal.',
      ],
    },
    {
      v: '0.1.65-beta',
      date: '17-08-2026',
      logs: [
        'A Postura do Universo entrou na lista de habilidades ativas, e com ela o Mestre Celestial ganha os atributos que faltavam: todos eles sobem +3 no nível 1, +4 no nível 2 e +5 no nível 3, como diz a descrição da habilidade no jogo. Ela é uma habilidade do Mestre Estelar — a bROWiki lista a Postura do Universo na árvore dos Mestres Estelares, e a dos Mestres Celestiais não tem postura nenhuma —, então foi cadastrada ali e o Mestre Celestial a recebe por herança, que é como ele já recebe a Postura Solar e a Postura Estelar. Reportado por Ted.',
        'As posturas passaram a ser exclusivas entre si, como são no jogo. Antes dava para deixar a Postura Solar e a Postura Estelar ligadas ao mesmo tempo e somar os dois bônus, o que nenhum personagem consegue fazer: a descrição de cada uma diz que não pode ser usada em conjunto com as outras. Agora ligar uma desliga a que estiver ligada. A Postura do Universo entra na mesma regra — a descrição dela no cliente não traz a frase, mas a bROWiki traz, e vale para as três. A Postura Lunar continua fora da lista: ela só aumenta o HP máximo, que não entra em nenhuma conta de dano, e um seletor que não muda número nenhum só ocupa espaço.',
        'A Pedra de Corpo (Dual) entrou nas opções de Encantamento Capa 2. Ela concede dano físico corpo a corpo +4%, mais 2% para cada Pedra de Corpo equipada no topo, no meio e embaixo. O que existia no cadastro era o registro tailandês da mesma pedra, com outro código, e esse código o servidor latino-americano nunca recebeu — por isso a pedra não aparecia em lugar nenhum, mesmo com a peça estando no jogo há tempos. Reportado por usuário anônimo.',
      ],
    },
    {
      v: '0.1.64-beta',
      date: '17-08-2026',
      logs: [
        'A segunda arma parou de sumir ao importar replay. Quem luta com uma arma em cada mão via a arma da mão esquerda desaparecer: ela não aparecia nem no lugar dela nem em lugar nenhum. O replay não diz o que está na mão esquerda — o mesmo sinal marca escudo e segunda arma —, e a importação lia tudo como escudo. Daí o sumiço em dobro: a lista de escudos não mostra adagas nem katares, então o campo ficava em branco, e um escudo preenchido é justamente o que faz o simulador esconder o campo da segunda arma. Agora quem decide é o item: arma vai para a segunda arma, com refino, grau, cartas e encantes no lugar certo, e escudo continua indo para o escudo. Arma de duas mãos, que marca as duas mãos no mesmo registro, segue contando como uma só. Foi relatado numa Oboro, mas valia para todas as classes que usam duas armas — Algoz, Renegado, Kagerou, Shiranui e Shinkiro junto com ela. Reportado por usuário anônimo.',
        'O monstro agora pode entrar em Aliviar, e o dano por segundo passa a fechar contra os chefes do Jardim Secreto. Aliviar reduz todo o dano físico e mágico que o monstro recebe, de 10% no nível 1 a 99% no nível 10, e sem ele os números do simulador contra a Pimentinha Kappa e o Pimentão Lambda não tinham como bater com o jogo. No Resumo de Batalha, na ficha do monstro, aparece um seletor de nível — só para os monstros que usam a habilidade; para todos os outros a ficha continua igual. O nível é escolhido à mão porque no jogo ele é situacional: abaixo de 90% de HP o chefe tem 40% de chance de ligar Aliviar, e o nível acompanha o Escudo de Energia, que o grupo derruba matando as quatro Peças de Guardião dos cantos. A escolha fica guardada como o próprio alvo fica, e é ignorada ao trocar para um monstro que não usa a habilidade. Sugerido por Ynk.',
        'O Sopro Draconiano saiu da lista de habilidades do Cavaleiro Draconiano. A habilidade existe no jogo coreano e é de verdade — não é a Aura Draconiana com outro nome —, mas não é uma das que o servidor latino-americano recebeu: ela não está na tabela de habilidades do cliente, a bROWiki não a lista na árvore da classe, e os vinte itens que dão bônus para ela são todos itens que não existem por aqui. Era a única habilidade da classe sem a descrição do jogo, porque o nome em português tinha sido inventado, e era por isso também que o ícone dela vinha quebrado no seletor. Nada que dava para usar se perdeu: o dano de dragão do Cavaleiro Draconiano vem do Sopro do Dragão e do Bafo do Dragão lançados sob a Aura Draconiana, e os dois continuam na lista, com o bônus da aura contando neles.',
        'O pet entrou na lista de "comparar slot", e dá para pesar um ovo contra outro como já se pesa arma ou armadura. A faixa de lealdade vem junto: o ovo comparado tem o seletor de lealdade dele, separado do da build principal. Isso importa porque as faixas se substituem em vez de somar — o Ovo de Drops dá ATQ +3 na Lealdade Normal e +5 na Alta, nunca +8 —, então comparar dois ovos numa faixa só responderia outra pergunta. Sugerido por Ynk.',
        'O "Por uso" e o "Por ciclo" passaram a mostrar de quanto foi a diferença ao comparar, em porcentagem, como o DPS logo acima já mostrava. Antes a linha trazia os dois números e a seta, mas quem lia tinha de subtrair de cabeça dois números de nove dígitos para saber se a troca valeu. A porcentagem é a do próprio dano, e não a do DPS: as duas coincidem enquanto a build comparada mantém o mesmo ritmo, e se separam assim que muda conjuração ou recarga. Sugerido por Ynk.',
      ],
    },
    {
      v: '0.1.63-beta',
      date: '17-08-2026',
      logs: [
        'Entraram 13 cartas que estavam na fila como se não tivessem onde encaixar, e tinham: a Carta Raggler, a Carta Mao Guai, a Carta Solidificador, a Carta Atirador de Pedras, a Carta Mineral, a Carta Alicel e as sete cartas de dano mágico por raça, entre elas a Carta Naga, a Carta Nepenthes e a Carta Ovo de Draco. Não faltava conta nenhuma para elas: cada linha da descrição já cabia no que o simulador calcula. O que faltava era ler a peça em que a carta entra, porque o levantamento procurava a linha "Equipa em:" e essas cartas, mais antigas, escrevem "Utilização:" ou "Equipado em:". Carta sem peça não existe — toda carta encaixa em algo —, então uma carta que parece não ter posição é falha da leitura, não da carta.',
        'A fila de cartas faltando também parou de contar o que não é carta. Eram 18 registros que começam com "Carta" e não são equipamento: cartas no sentido de correspondência, como a Carta da Mamãe e a Carta de Lugen, três letras de um evento de Halloween, a Carta de Amor, que é isca de mascote, e a Carta Fenris Fenrir, que é consumível. Nenhuma delas tem peça onde encaixar, e era justamente por isso que apareciam na conta como cartas sem posição. O cliente traz 1.065 cartas de verdade, 662 já estão cadastradas e restam 403 — 182 misturam um efeito que dá para calcular com outro que não dá, e 221 são só efeito de proc ou de utilidade.',
        'As duas cartas cuja descrição realmente não diz onde encaixam ficaram resolvidas pelo divine-pride: a Carta Rastreador vai no escudo e a Carta Titã de Gelo no calçado. As duas seguem fora do cálculo por outro motivo — cada uma promete, além do bônus fixo, um efeito que o simulador não modela: habilitar [Petrificar] e tolerância a Petrificação numa, e uma chance ao ser atingido na outra.',
      ],
    },
    {
      v: '0.1.62-beta',
      date: '17-08-2026',
      logs: [
        'O conjunto do Cachecol Físico de Schmidt com o Brasão de Schmidt AGI passou a valer. Ele concede CRIT à distância +25, que na versão anterior ficou de fora justamente porque o cálculo não separava crítico à distância de crítico em geral; agora separa. O bônus conta só no ataque básico e só com arma à distância, como no jogo — habilidade nenhuma o recebe. Por isso o CRIT que aparece na ficha do personagem continua sendo o crítico que todo ataque leva, e ganha um "*" ao lado quando a build tem esse bônus: clicando no número, o detalhamento diz onde ele se aplica e de onde vem, com o cachecol listado como fonte. A outra metade desse conjunto, "Aumenta a velocidade de movimento", segue de fora, porque o simulador não calcula velocidade de movimento para item nenhum. Reportado por usuário anônimo.',
        'Entraram outras 35 cartas que faltavam no banco, entre elas as mais pedidas: a Carta Chonchon, a Carta Rocker, a Carta Zangão, a Carta Larva de Andre, a Carta Deviling, a Carta Guerreiro Orc, a Carta Crocodilo e a série de cartas de escudo por propriedade que começa na Carta Tatacho. Elas passavam no mesmo critério da leva anterior — toda linha da descrição tem de caber no que o simulador calcula — e ficaram para trás só porque a redação delas não era reconhecida: "a oponentes de propriedade", listas de várias propriedades ou raças na mesma linha, dois bônus separados por vírgula, "Resistência a danos físicos a distância", "monstros Normais e Chefes", "X e Y +1" dividindo um único valor, e "Crítico" quando se trata de CRIT e não de dano crítico. Nenhum número foi digitado à mão: cada valor vem da própria linha em português, e a posição de encaixe foi confirmada duas vezes antes de a carta ser cadastrada. Com esta leva e a Carta Drosera, a seguir, são 649 cartas no banco e restam 434, sempre pelo mesmo critério: 169 misturam um efeito que dá para calcular com outro que não dá, 216 são só proc ou utilidade, e 49 não trazem na descrição a linha que diz em que peça a carta entra. Reportado por usuário anônimo.',
        'A Carta Drosera entrou no banco, e é uma carta de arma. A descrição dela tem uma linha só, "CRIT a distância +15", e era exatamente essa linha que o simulador não sabia calcular: sem uma conta para o crítico à distância, a carta ficava na fila das que faltavam e não aparecia em lista nenhuma. Com o crítico à distância agora separado do crítico comum, ela passou a caber inteira. São duas as peças do servidor que concedem esse bônus — esta carta e o conjunto do Cachecol Físico de Schmidt com o Brasão AGI —, e nas duas ele vale só no ataque básico com arma de longo alcance.',
        'A Carta Lobo entregava três bônus que a descrição dela não promete. Ela e a Carta Wolf estavam cadastradas com um conjunto herdado do banco de origem — Dano físico +5%, Dano mágico +5% e dano contra tamanho Médio +5% — que dependia de uma "Poe Richard Card", nome que era resolvido para a Carta Poe. Como essa carta existe aqui, o conjunto não era letra morta: quem usava a Carta Lobo junto com a Carta Poe recebia os três de verdade. A descrição em português da Carta Lobo não traz conjunto nenhum, e a da Carta Wolf traz outro, então os dois blocos saíram. O conjunto que existe de fato é o que a própria Carta Poe declara, com a [Carta Wolf], e agora está cadastrado nela, apontando para a parceira pelo número em vez de pelo nome — ler "[Carta Wolf]" como se fosse a Carta Lobo, que é outra carta, foi o que cruzou os fios. Quem usa Carta Wolf com Carta Poe fica com os mesmos 5% de cada; quem usava Carta Lobo com Carta Poe perde os três, que eram dano que o jogo não dá. O conjunto próprio da Carta Wolf continua fora: ele pede a Carta Po e a Carta Isaac, e a Carta Isaac não existe no cliente latino-americano, então cadastrá-lo mostraria um bônus que nunca valeria.',
        'A Tx. Crít. do ataque básico ficou clicável no detalhamento que abre pelo (i) da rotação. Clicando nela, a janela mostra de onde vem cada ponto de crítico, o CRIT à distância incluído — que não entra no CRIT da ficha do personagem, porque só conta no ataque básico com arma de longo alcance, e quando a build tem esse bônus a janela diz quanto dele está naquele número. A taxa que aparece na própria linha da rotação abre a mesma janela: antes as duas discordavam, porque a linha listava só o crítico comum mesmo no passo de ataque básico.',
        'O ataque básico voltou a aparecer na lista de habilidades da rotação, para todas as classes. Ele havia saído dessa lista por causa da opção "Ocultar Ataque Básico" do painel de configuração, que existe desde 2023 e serve para esconder o painel do ataque básico no Resumo de Batalha antigo. Como ela vem ligada por padrão, quem nunca a desligou não tinha como colocar o ataque básico na rotação, e nada indicava que a opção era o motivo. Agora a lista sempre oferece o ataque básico, em primeiro lugar, e a opção segue fazendo o que sempre fez no resumo antigo.',
      ],
    },
    {
      v: '0.1.61-beta',
      date: '17-08-2026',
      logs: [
        'Entraram 64 cartas que faltavam no banco, entre elas a Carta Doppelganger e a Carta Marionete Demoníaca, que foram as reportadas. Cada uma já aparece na lista da sua posição — arma, armadura, escudo, capa, calçado, acessório ou cabeça — com o efeito da descrição do jogo: as cartas de atributo, de ATQ e ATQM, de HP e SP, de Precisão, Esquiva e CRIT, as de dano contra propriedade e as de resistência a raça e a propriedade. Esta leva é só a das cartas em que toda a descrição cabe no que o simulador calcula. Ficaram de fora, por enquanto, 470: 197 misturam um efeito que dá para calcular com outro que não dá — do tipo "5% de chance de" —, 222 são só efeito de proc ou de utilidade, como habilitar uma habilidade ou dar tolerância a um estado, e 51 não trazem na descrição a linha que diz em que peça a carta entra. Meia carta cadastrada é pior do que carta faltando, porque passa a impressão de estar contabilizada, então essas seguem numa ficha própria no rastreador. Reportado por usuário anônimo.',
        'A Centelha das Trevas contava o "Dano Crítico +N%" do equipamento inteiro, e no jogo a habilidade aproveita só metade dele. Com Dano Crítico +15% no equipamento o crítico subia 15%, quando deveria subir 7,5%. É a mesma regra que todas as outras habilidades de 4ª que critam já seguiam aqui, e ela não foi inventada: numa gravação do Guerrilheiro sem equipamento nenhum, o mascote dava Dano Crítico +1% e o crítico saiu multiplicado por 1,005, e não por 1,01. Vale para o Shiranui e para o Shinkiro, que dividem a habilidade. A outra metade do multiplicador — os 140% de base mais a T.Crít que vem da CRV — não muda: essa parte nunca foi pela metade, e é a que as gravações da Centelha já tinham medido. Elas não pegaram o erro porque o personagem gravado estava sem equipamento, então não havia Dano Crítico nenhum para contar errado. Builds de crítico do Shiranui e do Shinkiro vão ver o dano crítico cair conforme o Dano Crítico que o equipamento entrega. Reportado por usuário anônimo.',
      ],
    },
    {
      v: '0.1.60-beta',
      date: '16-08-2026',
      logs: [
        'O Escudo Excelion ainda trazia os efeitos do item de mesmo número no servidor de origem, e nenhum deles é o que a peça faz aqui: estavam cadastrados DEFM +5 e HP e SP máximos por refino, quando a descrição em português concede conjuração variável -10%, custo de SP das habilidades -1% a cada 2 refinos e pós-conjuração -5% a partir do nível de base 130. A DEF base e o peso também eram os de lá, 95 e 120 no lugar de 50 e 100. Agora o escudo reduz conjuração e pós-conjuração como deveria. O custo de SP fica de fora porque o simulador não calcula gasto de SP. Reportado por usuário anônimo.',
        'O Escudo Excelion e a Perna Excelion voltaram a aceitar Diagramas. O Colete e o Motor já tinham a lista de encantos cadastrada e as outras duas peças ficaram de fora, com os três espaços vazios. Agora oferecem a coluna delas na tabela de Diagramas: A-DEF, A-ATQ, A-ATQM, A-HP, A-SP e A-VdA. O A-ESQV segue fora porque no jogo só o Colete e o Motor o aceitam, e as categorias E-, I-, R- e C- — propriedade, imunidade a congelamento, resistência e regeneração — não têm item cadastrado no banco. Reportado por usuário anônimo.',
        'A Runa Othila inflava a velocidade de ataque. A [Aura de Combate] estava somando 4% de VelAtq por nível de [Perícia em Runas], o que no nível 10 dava 40%, e a habilidade não concede porcentagem nenhuma: ela dá um valor fixo, que encolhe conforme o VelAtq que o equipamento já entrega, pela conta 4 × (100 − VelAtq% do equipamento). Com 24% vindos do equipamento são +3 de VelAtq; com 40%, +2; sem nada, o teto de +4. [Perícia em Runas] é pré-requisito para usar a runa e não multiplica o bônus. Reportado por usuário anônimo.',
        'Os encantos dos equipamentos das Cavernas Ilusionais estavam repartidos entre os dois espaços: o primeiro oferecia atributos e HP máximo, o segundo só as Runas. No jogo os dois espaços sorteiam da mesma tabela, e agora os dois oferecem a lista inteira — FOR, VIT, INT e SOR de +1 a +4, HP +1% a +4% e as seis Runas. Saíram AGI e DES, que a tabela de equipamento não sorteia: são da tabela de acessório, que continua como estava. Vale para as doze peças ilusionais de elmo, armadura, capa, escudo e calçado, entre elas o Sapato Corredor Ilusional. Reportado por usuário anônimo.',
        'O Cachecol Físico de Schmidt não anulava a penalidade de tamanho da arma. Do conjunto com o Brasão de Schmidt FOR só a Esquiva perfeita +25 estava cadastrada, e a anulação, que vale a partir de FOR base 125, não. Ao conjunto com o Brasão SOR faltava a outra metade também: Dano físico corpo a corpo +10% a partir de SOR base 125, ao lado do ATQ +25 que já valia. O CRIT à distância +25 do conjunto com o Brasão AGI continua de fora, porque o cálculo não separa crítico à distância de crítico em geral. Reportado por usuário anônimo.',
        'O Amuleto Oriental e o Amuleto Ocidental não existiam no banco, e por isso não apareciam para classe nenhuma. Cada um dá Dano físico e mágico +5% e eles ocupam lados opostos — o Oriental no acessório esquerdo, o Ocidental no direito —, então valem juntos, 10% de cada. O conjunto dos dois habilita [Bolas de Fogo] nível 3 e dá chance de petrificar quem ataca, que são efeitos fora do que o simulador calcula. Reportado por usuário anônimo.',
        'A Carta Mosca Caçadora não aparecia na lista de cartas de arma. Ela estava cadastrada, mas com a posição de encaixe no formato do servidor em vez do que a lista de cartas usa, e assim não entrava em lista nenhuma. Agora aparece entre as cartas de arma. O efeito dela — 3% de chance de converter 15% do dano físico causado em HP — não entra na conta, porque o simulador não calcula absorção de HP. Reportado por usuário anônimo.',
      ],
    },
    {
      v: '0.1.59-beta',
      date: '16-08-2026',
      logs: [
        'Os botões Feedback e Backlog viraram Reportar e Acompanhar, e levam ao rastreador de issues das ferramentas do RO LATAM em issues.latam-tools.com.br, já filtrado no simulador. O formulário do Google e a planilha saíram de cena: o que era enviado por ali agora vira uma ficha num quadro, com as colunas Reportado, Backlog, Em progresso, Resolvido e Não será feito. Dá para votar no que já foi reportado, e o que estava na planilha foi migrado — inclusive o que já tinha sido resolvido.',
        'As gravações enviadas pelo "Ajude o simulador a acertar as contas" passaram a ir para esse mesmo lugar, junto com as 24 que já tinham sido enviadas. Elas entram na fila de conferência sem aparecer no quadro público, e o arquivo continua ilegível para quem não administra — só quando uma gravação é aproveitada é que a ficha dela vai para o Backlog e fica visível. Quem enviar um nick continua sendo creditado nas Novidades se a gravação levar a alguma correção; o Discord informado nunca aparece no site.',
      ],
    },
    {
      v: '0.1.58-beta',
      date: '16-08-2026',
      logs: [
        'O Resumo de Batalha passou a calcular uma rotação inteira, e não uma habilidade de cada vez. A rotação é uma lista ordenada: dá para colocar quantas habilidades quiser, repetir a mesma habilidade mais de uma vez, incluir o ataque básico como um passo e arrastar pela alça para mudar a ordem. O número em destaque deixou de ser o dano de uma habilidade e passou a ser o DPS do ciclo completo — o dano somado de uma volta inteira dividido pelo tempo que essa volta leva. Cada linha mostra o dano daquele passo e quanto ele representa do dano do ciclo. A rotação foi baseada no trabalho de Kiulg no rocalc.',
        'Abaixo da rotação há uma linha do tempo do ciclo, com uma faixa por habilidade na mesma escala de tempo. Cada faixa separa conjuração fixa, conjuração variável, pós-conjuração e recarga, e as faixas hachuradas são a espera imposta pela velocidade de ataque — o tempo em que o personagem está pronto mas ainda não pode agir. É por ali que se vê por que uma habilidade não sai logo depois da anterior: ou a pós-conjuração da anterior ainda está correndo, ou a recarga dela própria não fechou, ou o VelAtq está segurando. Quando a recarga de uma habilidade não fecha dentro do ciclo, a faixa fica marcada e a linha diz quanto tempo falta.',
        'O botão Otimizar reordena a rotação procurando o maior DPS. Como o dano de cada habilidade não depende da posição dela na fila, a única coisa que a ordem muda é o tempo parado: o que o Otimizar faz é encaixar as habilidades sem conjuração dentro da pós-conjuração das outras e adiar as de recarga longa. A ordem anterior pode ser desfeita logo depois, e a rotação entra no link de compartilhamento e nas simulações salvas junto com o resto da build.',
        'O ícone de cada habilidade, na lista e na linha do tempo, abre os detalhes daquele passo: dano, taxa e dano de crítico, tempos de conjuração e espera, e a fórmula passo a passo. O dano e a taxa de crítico da própria linha também são clicáveis e abrem de onde aquele número vem. Comparando duas builds, cada número aparece como "atual → simulado", e as duas linhas do tempo são desenhadas na mesma escala. A seção de dano contra jogadores recebeu a rotação também.',
        'Um aviso sobre os números: o DPS da rotação é o dano real dividido pelo tempo real, sem os arredondamentos que o cálculo antigo aplica em duas etapas. Em habilidades rápidas os dois valores coincidem; em habilidades lentas o cálculo antigo arredonda para baixo e chega a mostrar bem menos do que a habilidade realmente causa por segundo. A aba "Resumo de Batalha (antigo)" continua exatamente como estava, com a tabela de vários alvos e os números de sempre, para quem quiser comparar.',
      ],
    },
    {
      v: '0.1.57-beta',
      date: '16-08-2026',
      logs: [
        'Os ovos de mascote entregavam a faixa de Lealdade Alta em qualquer lealdade. Cada ovo concede um bônus diferente conforme a intimidade do bicho — Baixa ou Baixíssima, Nenhuma, Normal e Alta — e as faixas se substituem, não se somam. De 38 ovos cadastrados, 37 tinham só a linha da Alta no cálculo, sem condição alguma: quem escolhia uma lealdade menor no seletor ao lado do mascote continuava recebendo o bônus máximo. Agora as quatro faixas de cada ovo estão cadastradas, cada uma com o valor que a descrição em português do próprio ovo informa. No Ovo de Grand Orc, por exemplo, são ATQ +10 na Lealdade Baixa e +25 na Alta, e não +25 sempre. O Ovo de Abelha-Rainha era o caso mais visível: "Anula a penalidade de tamanho da arma" só existe na Lealdade Alta e valia em todas.',
        'Isso derruba o dano de quem tem o mascote fora da Lealdade Alta. Builds salvas antes desta versão e importações de gravação sem intimidade seguem entrando na Lealdade Alta, que é o padrão, e por isso não mudam de número; o que muda é escolher uma faixa menor, que antes não fazia diferença nenhuma. O Ovo de Orc Herói já estava cadastrado com as quatro faixas e serviu de molde para os outros 37.',
        'O Ovo de Unicórnio ficou sem efeito nenhum. Ele estava concedendo P.ATQ e S.ATQM +5, dano físico e mágico contra todas as raças +5% e contra Chefes +20% — nada disso aparece na descrição em português, que promete apenas regeneração de HP e SP ao derrotar monstros, na Lealdade Alta. Era um bloco de bônus herdado do banco de origem, de um item que na versão latino-americana é outro, e foi removido. Quem usava esse ovo perde bastante dano, mas era dano que o jogo não dava.',
        'Entraram 71 ovos de mascote que o cliente tem e o simulador não, já com as faixas de lealdade cadastradas. Eram ovos que não apareciam na lista de mascotes de jeito nenhum — entre eles os básicos, como o Ovo de Poring, o de PecoPeco, o de Guerreiro Orc e o de Golem, e também o Ovo de Vigia do Tempo, o de Metaller e o de Bafinho Caótico. Com isso a importação de gravação passa a reconhecer o mascote em 109 das 141 espécies que o cliente lista, contra 38 antes: a importação já sabia de que ovo era cada bicho, mas descartava o mascote quando o ovo não estava cadastrado. Seis dos ovos novos entraram sem efeito no cálculo — um não promete efeito nenhum na descrição, e os outros cinco só prometem coisas que o simulador não modela: regeneração natural de HP e SP, chance de converter dano causado em HP, e dano contra os monstros de mapas específicos.',
        'A Cesta de Mascotes cresceu junto. O conjunto dela muda conforme a família do mascote equipado, e quatro dos quinze bichos que a descrição lista estavam de fora das condições justamente porque os ovos não existiam no banco: o Vigia do Tempo, que fecha o conjunto de Dano mágico de todas as propriedades +10%, e o Pouring, o Quinding e o Esqueleão, que fecham o de Pós-conjuração e Conjuração variável -5%. Agora os quinze valem.',
      ],
    },
    {
      v: '0.1.56-beta',
      date: '16-08-2026',
      logs: [
        'A importação de replay passou a trazer os talentos (POD/STA/SAB/FEI/CON/CRV). Até agora o simulador avisava que era preciso preenchê-los à mão, porque nenhum dos blocos do arquivo os guarda. Eles existem em um lugar só: um pacote que o servidor manda sempre que o personagem entra num mapa — o mesmo que preenche a janela de status ao entrar no jogo. Quem gravou depois de se teleportar tem os seis dentro do arquivo; quem ficou o tempo todo parado no mesmo mapa não tem nenhum. O caminho para ler esse pacote foi compartilhado por Kiulg, que mantém o rocalc.',
        'Os seis entram juntos ou não entra nenhum. Quando uma habilidade mexe num talento no meio da gravação, o servidor manda só aquele, e aproveitar um valor solto deixaria os outros cinco em zero se passando por alocação de verdade. Numa das gravações usadas nos testes o arquivo traz apenas FEI 100, enquanto a janela de status do mesmo personagem marca também STA 31 e SAB 31 — importar o que estava ali teria zerado 62 pontos investidos sem dizer nada. Nesses casos o aviso continua aparecendo e os talentos seguem para ajuste manual.',
        'A leitura foi conferida contra uma gravação cujos talentos já eram conhecidos por outro caminho: quem a enviou tinha digitado POD 100 e CON 59 no formulário, e é exatamente isso que sai do pacote, campo por campo. Essa comparação virou teste automático.',
        'O "Ajude o simulador" parou de pedir os talentos quando a gravação já os traz. O formulário perguntava sempre; agora eles aparecem no bloco de conferência junto com o resto do que foi lido, e o campo só é mostrado quando o arquivo de fato não os tem — pedir de novo um número que já se tem é como um número certo vira errado. Cada envio também registra de onde eles vieram, da gravação ou do formulário, o que separa o que o servidor informou do que alguém copiou da tela.',
        'O roteiro de gravação ganhou um passo por causa disso: sair do campo de treinamento e voltar, uma vez, ainda gravando. É essa volta que registra os talentos no arquivo. A gravação precisa começar dentro do campo, porque é o mapa de início que o envio confere — quem começar a gravar fora dele continua tendo o envio recusado.',
      ],
    },
    {
      v: '0.1.55-beta',
      date: '14-08-2026',
      logs: [
        'O Hiperaprendiz tem dois supremos, um para cada tipo de dano, e só o mágico existia aqui. O Anjo do Poder não estava cadastrado: quem monta o Hiperaprendiz físico via o dano do simulador parar em dois terços do que o jogo faz com o supremo ligado. Agora os dois aparecem separados, cada um valendo só para as suas quatro habilidades, com as porcentagens que a descrição do cliente informa — Anjo do Poder: Golpe de Tyr +50%, Choque Violento +50%, Cortar em Espiral +100% e Lâminas Devastadoras +100%; Anjo da Magia como já estava. A descrição do Anjo do Poder também faltava no catálogo de habilidades e foi preenchida.',
        'O número foi conferido contra o jogo antes de entrar. Numa gravação em que o equipamento não muda entre um trecho e o outro, o dano de Choque Violento sobe exatamente 1,5 vez quando o Anjo do Poder é ativado — o mesmo +50% que o cliente informa. A mesma gravação virou teste automático: ela começa sem nenhum equipamento, veste o escudo sozinho, depois a arma e depois o resto peça por peça, o que permite conferir cada etapa isoladamente. Sem arma o dano não tem variação, e os nove golpes desse trecho saem todos com o mesmo número, o que dá uma conta exata em vez de uma faixa. Obrigado Cafe Underground pela gravação.',
      ],
    },
    {
      v: '0.1.54-beta',
      date: '14-08-2026',
      logs: [
        'O simulador vinha importando mascotes que não eram do personagem. No protocolo o mascote é uma criatura na tela e não uma peça de equipamento, então a gravação lista todos os que estavam à vista — inclusive os dos outros jogadores em volta — e nada no registro diz de quem é cada um. A importação pegava o primeiro da lista. Numa das gravações, feita num mapa com 23 jogadores por perto, o personagem não tinha mascote nenhum e mesmo assim a build entrou com um Ovo de Abelha-Rainha na lealdade mais alta, que é o padrão quando não vem intimidade junto. Em outra, a espécie veio do Angeling de um estranho enquanto a intimidade vinha do mascote do próprio jogador. Agora o mascote sai do bloco que o jogo grava para a Janela de Mascote, que é só de quem gravou; quando a espécie não está no arquivo — o que acontece se o bicho nunca apareceu na tela — o mascote fica de fora em vez de ser adivinhado. De 11 gravações conferidas, 2 vinham com o mascote errado. Encontrado nas gravações enviadas por Ted e por um usuário anônimo.',
        'Cinco itens que apareciam equipados nas gravações da comunidade não existiam no banco e por isso sumiam da build importada: a Carta Polvo Gigante (HP máx. +12%), a Chama da Liberdade (Pistola, ATQ 100, nível de arma 3), o Projétil de Prata (Munição, ATQ 15, propriedade Sagrado) e os dois gráficos de traje Pegada: Pandas Coloridos e Gráfico: Ventania. Dos 315 itens equipados no conjunto de gravações conferido eram os únicos que faltavam — os outros 310 já estavam cadastrados e nenhum deles prometia efeito na descrição sem ter o efeito cadastrado. A Carta Polvo Gigante também concede [Esfera D\'água] nível 5, que é uma habilidade e não um atributo, então essa parte fica de fora da conta. Gravações enviadas por Naitok e por usuários anônimos.',
        'O "Ajude o simulador" passou a pedir um tipo específico de gravação, e a recusar o resto. Esta etapa procura itens cadastrados errados e fórmulas erradas, e para isso o alvo precisa ter números conhecidos: agora só entram gravações feitas no campo de treinamento (tra_fild) e com pelo menos um golpe seu em um dummy. Fora dali o monstro tem DEF e RES próprias e revida, e a conta passa a ter duas incógnitas ao mesmo tempo — não dá para saber se a diferença veio do item ou da fórmula. Buffs de fora (Bênção, Agilidade, Bragi, comidas) não barram o envio, mas aparecem como aviso antes de enviar, porque inflam todos os números sem dizer em que etapa entraram. O passo a passo dentro da janela foi reescrito: ele mandava ligar os buffs e ir bater em monstros de verdade, que é o contrário do que esta etapa precisa.',
        'A janela de Novidades voltou a ter largura de leitura. Ela estava sem largura definida e crescia até o tamanho da tela — num monitor largo o texto passava de 1900 pixels por linha — e ainda ficava encostada no topo em vez de centralizada. Agora tem 60rem, no máximo 95% da tela, e fica centralizada.',
        'O Schulang entrou na lista de alvos. É o Chefe de nível 224 que faltava na Villa of Deception, ao lado do Twisted God Freyja que já estava lá. Junto com ele veio uma correção que vale para o cadastro de monstros em geral: a fonte de dados do cliente não publica RES nem RESM, então todo monstro cadastrado por ela entrava com os dois zerados, ou seja, sem resistência alguma. Para o Schulang são 205 de RES e 368 de RESM. Sem eles o dano simulado contra ele ficava mais de três vezes acima do que o servidor realmente causou na gravação; com eles a diferença cai para um quarto disso. Gravação enviada por Ynk.',
      ],
    },
    {
      v: '0.1.53-beta',
      date: '13-08-2026',
      logs: [
        'O Escudo Automatron B não ignorava DEFM nenhuma. A peça estava cadastrada sem efeito algum: os 15% de DEFM ignorada de todas as raças, os 5% a mais a cada 2 refinos e os 10% de dano mágico contra Chefes do refino +7 não existiam no cálculo. No +10 são 40% de DEFM ignorada que a build vinha deixando na mesa. O Escudo Automatron A, o irmão físico, já estava correto e serviu de referência. Reportado por usuário anônimo.',
        'Os Escudos Automatron A e B voltaram a aceitar Automódulos. Todas as outras peças Automatron — Colete, Motor, Perna, Soquete e Turbina — já tinham a lista de encantos cadastrada, e só os dois escudos ficaram de fora, com os três espaços vazios. Agora oferecem a coluna do Escudo da tabela de Automódulos: B-DEF, B-DEFM, M-HPMax, M-SPMax, M-Rapidez, P-Robusto e P-Dano. O M-Cura e o P-Refletor, que o escudo também aceita no jogo, seguem fora porque o simulador não calcula efetividade de cura nem resistência a dano refletido — as demais peças Automatron também não os oferecem.',
        'O conjunto do Elmo Mágico de Cinzas com o Cajado de Cinzas passou a valer. Do conjunto só existia o "Dano mágico +7%" do Cajado Duplo; a recarga de Onda Psíquica -1,5 segundo e o bônus por refino da arma — Onda Psíquica e Pó de Diamante +5% a cada 2 refinos — não estavam cadastrados, então refinar o cajado não mudava nada. Entrou junto o degrau que faltava no conjunto com o Cajado Duplo, Impacto Espiritual e Corrente Elétrica +5% a cada 2 refinos. Com o cajado no +10 são 25% de dano a mais em cada uma dessas habilidades.',
        'Os outros cinco Elmos de Cinzas tinham a mesma falha e foram corrigidos junto: o Mortal, o Divino, o Cobiçado, o Bravio e o Certeiro. Todos seguiam o mesmo molde — a linha fixa do conjunto cadastrada e o degrau por refino da arma faltando — somando 13 conjuntos e 30 bônus de perícia que não valiam nada. Entraram também as recargas que faltavam, como a de [Tempestade de Flechas] -2,5 segundos do Elmo Certeiro com o Arco de Cinzas.',
        'A mesma varredura pegou outros três elmos montados do mesmo jeito. O Chapéu Símbolo da Magia não aplicava o conjunto [Mikatsuki] + [Adaga Raksasa], que dá conjuração variável -1% por refino de cada arma e +5% em [Pétalas Flamejantes], [Lança Congelante] e [Lâmina de Vento] a cada 2 refinos somados. A Boina Escarlate-OS estava sem os dois conjuntos, o do Rutilus-OS e o do Rapieira-OS, e sem o dano mágico contra Pequeno e Médio do refino +11. E o Chapéu de Kiwawa não tinha nenhum dos cinco conjuntos de [Olho de ...] cadastrado.',
        'A varredura foi estendida a todo o banco e achou mais 19 peças que prometiam dano de perícia na descrição sem nada cadastrado. Os quatro cajados elementais e suas versões Fortalecidas — do Açoite de Ouro, Aquático, Vermelho e Florestal — não davam o bônus em [Trovão de Júpiter], [Lanças de Gelo], [Lanças de Fogo], [Bolas de Fogo], [Coluna de Pedra] e [Fúria da Terra], que vai de 10% a 30% conforme a versão. As nove armas Iniciais não davam os 15% de dano do refino +7 na perícia de cada uma. A Enciclopédia Ancestral não dava os 15% em [Chute Solar] nem os 20% em [Explosão Solar]. E a Bota Natalina não dava os 15% mais 2% por refino em [Campo Gravitacional], [Vulcão Napalm], [Espíritos Anciões] e [Magnus Exorcismus] — no +10 são 35% em cada uma.',
        'Outras 30 peças com conjunto tiveram o bônus de perícia cadastrado. Entre elas o Microfone Floral, que estava sem efeito nenhum e agora dá os 200% em [Vulcão de Flechas] com o Bracelete Floral; a Maça do Julgamento Fortalecida, que não aplicava a conjuração variável -50% em [Magnus Exorcismus], [Esconjurar], [Adoramus], [Judex] e [Luz Divina]; o Esfíngico Ilusional com o Sobrevivente Ilusional; as Armaduras de Ur e de Elite, a Vestimenta dos Manuks, a Malha das Asas das Sombras, os seis Amuletos de Doram, as Peças Suplementares e a Autopeça - Carburador. Nos conjuntos que também trazem penalidade a penalidade entrou junto — a Malha das Asas das Sombras, por exemplo, agora tira os 7 de velocidade de ataque e os 30% de dano a distância que a descrição cobra.',
        'O Espólio de Celia ainda trazia os efeitos do item de mesmo número no servidor de origem, e quase nenhum número batia com a descrição em pt-BR. A conjuração variável -10% do refino +9 estava cadastrada como velocidade de ataque, então nunca reduziu conjuração nenhuma. Os degraus por refino da arma davam 10% onde a descrição diz 3%, e o dano mágico do conjunto com o Lançarin dava 10% onde a descrição diz 2%. O conjunto com o Castigo Diamante somava dano em [Castigo de Nerthus] no lugar de [Pó de Diamante], e o com a Lança Psíquica em [Onda Psíquica] no lugar de [Lanças dos Aesir]. Faltavam ainda os 3% de dano mágico por propriedade dos dois conjuntos. Saíram os efeitos que a descrição não concede: ATQM por refino, a conjuração fixa do Castigo Diamante e a recarga de [Onda Psíquica] da Lança Psíquica. No geral a peça perde dano em builds que contavam com os degraus de 10%, e ganha a redução de conjuração que deveria ter desde sempre.',
        'A Manopla Sombria de Apoio Químico dava os 15% de dano do conjunto na habilidade errada: o bônus estava em [Tornado de Carrinho], que é a habilidade da linha de recarga logo abaixo, e a descrição o dá em [Canhão de Prótons].',
        'As Botas de Cowboy não davam nada das quatro habilidades que a descrição promete — [Rajada de Flechas], [Arremessar Kunai], [Estilingue] e [Flecha Melódica], 15% mais 2% por refino, o que no +10 são 35% em cada uma — nem os conjuntos com o Arco Vigilante e o Monokage.',
        'Os Fones Danificados e os Fones Amplificadores voltaram a aceitar Bônus Aleatórios, que os dois recebem do Amplificador de Fone. Faltavam também o Comunicador Avançado e o Super Óculos Poring, este último com um bônus só. Reportado por usuário anônimo.',
        'A janela de Redução de dano dos atributos mostrava só a linha de tamanho Médio. Ela reaproveitava a lista montada para o alvo PVP, onde o atacante é sempre um jogador e por isso só Médio pode valer — mas nos atributos a pergunta é o que a build resiste contra qualquer coisa. Agora aparecem Pequeno, Médio e Grande, as raças de monstro e a linha de Chefe. Quem usa a Carta Cavaleiro Branco com a Carta Cavaleira Khalitzburg via 30% contra Médio e nada contra Grande, quando os 30% valem para os dois. A janela do alvo PVP continua como estava. Reportado por usuário anônimo.',
      ],
    },
    {
      v: '0.1.52-beta',
      date: '13-08-2026',
      logs: [
        'Os tempos de conjuração e de espera de todas as habilidades ofensivas foram conferidos contra a janela "Informação de Conjuração" do próprio cliente, que passou a ser publicada junto com o resto dos dados do jogo. São as quatro colunas que aparecem no jogo — Fixa, Variável, Pós e Recarga —, e o simulador guarda exatamente essas quatro. De 216 habilidades, 136 já estavam certas e 80 não; as 80 foram acertadas. Quase todas vinham erradas desde o projeto de origem, algumas ainda com o nome em tailandês do lado: a Ira de Thor, por exemplo, estava com 1,68 de conjuração fixa e 6,72 de variável, que são os números de outro servidor, contra 1,5 e 4,5 do cliente daqui.',
        'A mudança mais sentida é nas habilidades definitivas, que estavam com recarga de 2 a 5 segundos e no cliente têm 60: Meteoro Ômega, Círculo Elemental, Punho Labareda e Firmamento. Como a recarga é o que separa um uso do outro, o dano por segundo dessas quatro cai bastante — e agora corresponde ao que o jogo faz. Na direção oposta, o Punho do Dragão, a Ruína e a Tempestade Espiritual perderam 1 segundo de espera pós-conjuração que não existe no cliente, e as Lanças de Fogo, as Lanças de Gelo e o Relâmpago passaram de 2,8 para 1,4 segundo.',
        'Habilidades cujo tempo muda a cada nível deixaram de ter um valor único. Na linha do Hiperaprendiz isso pega quase tudo: a Chuva de Meteoritos tem recarga de 2,1 segundos no nível 1 subindo até 3 no nível 10, a Ira da Terra faz o caminho inverso, de 2,5 para 0,7, e a Tempestade de Júpiter, o Esquife Congelante e a Zona Gravitacional têm conjuração variável própria em cada nível. Antes o simulador usava o valor do nível 10 em todos os níveis, o que deixava a conta errada para quem não usa a habilidade no máximo.',
        'Dois erros antigos apareceram na conferência. O Disparo Rítmico da Diva estava com a espera pós-conjuração e a recarga trocadas de lugar em relação ao do Maestro, que é a mesma habilidade com os mesmos números. E a Ressonância, usada por Trovador, Musa, Maestro e Diva, estava com 1,5 de conjuração variável em vez de 1 e sem os 0,15 segundo de recarga.',
        'Para os valores não voltarem a se perder, a tabela do cliente passou a ser guardada no projeto e um teste automático cobra dela todas as habilidades de todas as classes, em cada nível que o simulador oferece. Se uma atualização do jogo mexer em algum tempo, o teste aponta qual habilidade e qual coluna mudaram.',
        'A barra passou a se chamar "Conjuração/Espera", como no jogo, e o "Detalhes da habilidade" foi refeito em tabelas de verdade. As de conjuração são duas, uma embaixo da outra e com as colunas na mesma ordem da janela do jogo — Nv., Conjuração (Fixa e Variável) e Espera (Pós e Recarga). A de cima, "Conjuração/Espera", traz o que a build realmente paga; a de baixo, "Conjuração/Espera - Base", traz o que o cliente publica para aquele nível, sem redução nenhuma. Dá para ver de onde cada desconto saiu: o Esquife Congelante nível 5 tem 2 segundos de conjuração variável na tabela base e cai para 0,495 com DES e INT altos. A base continua aparecendo mesmo com a Liberação Mágica do Arcano ligada, que zera a conjuração — antes esse caso mostrava só zero contra zero.',
      ],
    },
    {
      v: '0.1.51-beta',
      date: '13-08-2026',
      logs: [
        'O Bloqueio entrou na lista "Aprenda para ganhar bônus" do Superaprendiz — e, por herança, do Hiperaprendiz. A habilidade é do Templário, mas o Superaprendiz EX também a aprende, e sem ela o conjunto da Guardião Real II (Capa) com o Paladino II (Topo) não entregava nada: a linha "A cada 2 níveis de [Bloqueio]: Conjuração fixa -0,1 segundo" precisa ler o nível aprendido, e não havia onde marcá-lo. Com Bloqueio 10 são 0,5 segundo a menos de conjuração fixa. Reportado por Paracelso.',
        'O resto do conjunto foi conferido junto e já estava certo. A capa sozinha dá os 15% de dano da Luz da Criação, o Paladino II (Meio) soma os 5% de dano mágico Sagrado e o Paladino II (Baixo) soma os outros 15% da Luz da Criação. A linha de dano Sagrado do próprio Paladino II (Baixo) depende de Crux Magnum, que não está no acervo do Superaprendiz — só o Crux Divinum está —, então ela continua, corretamente, sem valer para ele.',
      ],
    },
    {
      v: '0.1.50-beta',
      date: '13-08-2026',
      logs: [
        'As reduções de dano das guerras foram atualizadas para os valores que entram no jogo em 18/08: 90% de redução no ataque básico corpo a corpo, 95% no ataque básico à distância e 90% nas habilidades — e agora valem igual nas duas, tanto na guerra normal quanto na TE. Antes a guerra normal cortava 70% em tudo e a TE deixava o corpo a corpo cheio, cortando 20% à distância e 40% nas habilidades. O simulador já está com os números novos, então até o dia 18 ele mostra menos dano dentro do castelo do que o servidor: a âncora do "asuro 1kk no PVP" sai 100k na guerra em vez dos 300k de hoje. A redução de 20% na esquiva não mudou. Anunciado pela Staff, reportado por Luís.',
        'O alvo da aba PVP deixou de ser da raça Humanoide e passou a ser Humano — Doram, se a simulação salva for de Invocador. As duas são raças diferentes, e o jogador nunca é Humanoide: com o alvo cadastrado errado, todo bônus anti-Humanoide do equipamento entrava no cálculo contra ele. O Tempestivo e o Penetrante eram os que mais distorciam a conta, e a Sinfonia Mística, que a descrição limita às raças Peixe e Humanoide, dobrava dano em cima de player. Nenhum dos três vale mais contra jogador. Reportado por Luís.',
        'Os itens foram reclassificados junto, porque a separação está na própria descrição: "Humano" é a raça do jogador e "Humanoide" a do monstro. Dos 105 itens que davam dano ou perfuração contra Humanoide, 64 diziam "contra as raças Humano e Humanoide" e agora contam nos dois; o Katar Ancestral e o Katar Primordial dizem "Bruto, Doram, Humano e Humanoide" e ganharam também a parte Doram; a Lança de Vellum diz só "raça Humano" e deixou de valer contra mob Humanoide; e 16 são de fato só contra Humanoide e ficaram como estavam. Os que continuam sem cadastro nenhum de raça — as armas TE de aluguel, a Máscara de Despero, a Peixeira — entram numa próxima passada.',
        'As Asas de Garuda estavam com metade da descrição de fora. Faltavam o "Dano físico e mágico +4%" do refino +7 e a linha inteira do +13, que ignora 10% da DEF e da DEFM de monstros normais. Também faltava a duplicação: para Odaliscas, Arruaceiros, Monges, Mercenários e evoluções — ou seja, Musa, Diva, Renegado, Mandraque, Sicário, Executor, Shura e Inquisidor — todos os efeitos da capa valem em dobro, o que num +13 significa ATQ e ATQM +96 em vez de +48, corpo a corpo, à distância e dano mágico de todas as propriedades +14% em vez de +7%. Reportado por Luís.',
        'Os encantamentos de Malangdo apareceram em 166 armas que não ofereciam a opção, entre elas a Faca de Combate e o Rondel com slot. A lista do NPC Snow foi cadastrada inteira a partir da bROWiki, em todas as versões de cada arma, com ou sem slot, como o NPC aceita — dois encantos por arma, ou um só nas de 3 slots. O que travava a maioria delas era o nome interno: mais de mil itens do banco guardam o nome do recurso do cliente, em coreano, e a tabela de encantos procurava pelo nome do item_db, que nunca batia. Agora a busca é pelo id. Reportado por Luís.',
      ],
    },
    {
      v: '0.1.49-beta',
      date: '13-08-2026',
      logs: [
        'O Firmamento entrou na lista de habilidades do Mestre Celestial — faltava. A fórmula foi medida numa gravação sem nenhum equipamento, em que cada golpe é um número fixo: os 6.576.267 de dano do pacote gravado saem exatos, como 3 golpes de 2.192.089. Contra Humanoide e Demônio são 3 golpes cheios, e não um dano repartido em três mostradores como nas outras habilidades da classe; contra as demais raças é 1. A Maestria Celestial não entra no cálculo, apesar de a descrição dizer que entra: a tabela do cliente para o Firmamento é a única da classe sem a coluna "Nv. Maestria", que é de onde sai esse termo nas outras. Obrigado Ted pela gravação.',
        'O Kihop estava duplicado, aparecendo tanto como habilidade ativa quanto como passiva, e o +85% de ATQ só valia quando marcado na aba de ativas. O cliente o descreve como passiva, e é assim que ele fica agora — o que também conserta a importação de replay, que nunca conseguia trazê-lo: ela só importa habilidades ativas cujo efeito estava ligado na gravação, e uma passiva não tem efeito para ligar. Quem tinha o Kihop marcado na aba de ativas precisa marcá-lo na de passivas.',
        'O ataque básico ignorava o ajuste de ATQ da classe, que valia só para as habilidades. Na linha do Taekwon isso deixava o básico 1,85 vez menor do que o do jogo, porque o Kihop ficava de fora: a mesma gravação marca 4.295 de ataque básico e o simulador mostrava 2.299.',
        'A Fúria Solar e a Fúria Lunar entraram na lista do Gladiador Estelar — existia só a Estelar. As três não são variações do mesmo bônus: a Oposição Solar, Lunar e Estelar marca o alvo com um alinhamento de acordo com o Tamanho dele, Solar para Pequeno, Lunar para Médio (a partir de 6.000 de HP) e Estelar para Grande (a partir de 20.000). Então um boss de tamanho Médio é alvo Lunar, e é a Fúria Lunar que vale nele. Só a Estelar soma a FOR; as outras duas usam SOR, DES e nível base. Dá para deixar as três marcadas: contra um alvo qualquer, no máximo uma se aplica. Reportado por Luís.',
        'A Fúria Estelar, por consequência, deixou de valer contra alvos que não são de tamanho Grande — antes ela dava bônus contra qualquer tamanho, só deixando a FOR de fora fora do Grande. Contra jogador não há trava de tamanho nem de HP, como diz a descrição da Oposição.',
      ],
    },
    {
      v: '0.1.48-beta',
      date: '13-08-2026',
      logs: [
        'A importação de replay passou a trazer o Grau de Encantamento das peças. Ele estava sendo perdido em silêncio: uma gravação de Falcão do Vento mostrou o tamanho do estrago, com o Gakkung Primordial-LT Grau C entrando sem grau nenhum e a build perdendo ATQ +3%, P.ATQ +1 e dano à distância +15% — 12% de dano a menos sem buff e 6% a menos com Ilimitar. O grau sempre esteve no arquivo (quem assiste à gravação no cliente lê "+11 [C] Gakkung Primordial-LT"); o que faltava era o leitor enxergá-lo. O leitor de .rrf foi refeito para percorrer a cadeia de campos do registro de equipamento em vez dos endereços fixos herdados do leitor de referência, que paravam antes do grau. Obrigado Shummuy pela gravação.',
        'As fórmulas do Falcão do Vento foram conferidas contra essa mesma gravação e estão corretas. Tiro Preciso, Vendaval de Flechas e Tiro Crescente, cada um em dois estados — sem buff e com Ilimitar 5 mais Ventos Sinistros —, batem exatamente nos cinco críticos gravados, na unidade; os três disparos sem crítico do Vendaval caem dentro da faixa calculada. O acúmulo do Tiro Crescente também confere: os quatro disparos em sequência sobem de +190.020 em +190.020. É a primeira classe da linha do Arqueiro com gravação conferida no simulador.',
        'Um pedido de ajuda passou a abrir junto com a página, e o botão "Ajude o simulador" na barra de cima o traz de volta a qualquer momento: ele recebe gravações .rrf da comunidade. Toda fórmula daqui é conferida contra os pacotes de dano que o servidor mandou numa gravação de verdade, e as classes menos jogadas simplesmente não têm gravação nenhuma — conseguir uma dependia de pedir no Discord e combinar o resto por mensagem. O arquivo é lido no próprio navegador antes de sair dele: gravação de classe que o simulador não conhece, sem a árvore de habilidades ou maior que 900 KB é recusada na hora, com o motivo na tela. Antes do envio aparece o que foi lido — personagem, classe, níveis, duração, quantos golpes e quantas trocas de equipamento — para conferência.',
        'O arquivo enviado vai para os servidores do simulador e pode virar um teste no código, que é aberto; isso está escrito na tela e precisa ser confirmado para o envio liberar. Também dá para deixar um nick, que entra aqui nas Novidades se a gravação levar a alguma correção, e um contato do Discord. Marcando a caixa no rodapé, o pedido para de abrir sozinho por três dias.',
        'As instruções de como gravar vieram junto, no mesmo modal. A parte que mais custa a descobrir é que as Opções do gravador decidem o que entra no arquivo: sem a caixa "Skill" marcada a árvore de habilidades não é gravada, e sem ela não há como conferir fórmula nenhuma. As caixas só podem ser mexidas antes de começar a gravar, então uma gravação assim está perdida. Vale também desmarcar "Chatting", que leva junto o chat público e as conversas particulares. O roteiro sugerido é uma gravação só: bater no dummy do campo de testes sem nenhum equipamento, depois só com a arma e por fim com tudo, já que cada troca de equipamento fica registrada com a hora e as fases são separadas depois.',
        'Os talentos são pedidos no formulário, porque a gravação não os guarda — o jogo só exibe os da última sessão. O campo é o mesmo seletor usado na tela do simulador e pede o valor investido, o primeiro número da janela de status, sem o bônus de classe entre parênteses: em POD 90 (+15), o que vale é 90.',
      ],
    },
    {
      v: '0.1.47-beta',
      date: '12-08-2026',
      logs: [
        'A árvore mágica do Hiperaprendiz foi conferida pacote a pacote contra uma gravação nova, bem mais completa que a anterior: cada habilidade lançada no Nv 1 e no Nv 5, sem nenhum equipamento, depois só com a arma e por fim com o equipamento inteiro, com e sem a ultimate. Sem equipamento não existe variação de ATQM, então cada golpe é um número fixo — e os 36 números batem exatamente com o que o servidor mandou. Com equipamento, todos os 2.987 golpes gravados caem dentro da faixa que o simulador calcula. Obrigado Asbrun pela gravação.',
        'A Chuva de Meteoritos estava com as duas partes trocadas: a queda usava a porcentagem da explosão e a explosão a da queda. As duas colunas da descrição do cliente marcam 600% no Nv 1, então a troca era invisível numa gravação só de Nv 1; no Nv 5 a queda é 1.800% e a explosão 1.200%. O bônus de dano do Mágico Autodidata também mudou de lado: ele alcança a queda e não a explosão, ao contrário do que acontece no Esquife Congelante e na Zona Gravitacional.',
        'O Grácil, o Ilustre e o Nobre Anel Mágico entregavam menos dano mágico do que deviam — na build da gravação, cerca de 5%. Os três dão "dano mágico contra oponentes de todas as propriedades", que é um multiplicador separado, e estavam cadastrados como "dano mágico de todas as propriedades", que entra numa soma única com a de todos os outros equipamentos. A diferença crescia junto com o resto da build: quanto mais bônus de propriedade já havia somado, menos o anel rendia.',
        'A mesma troca foi corrigida no Feitiço Primordial-LT, no refino +7, e no Bastão Ilusional, na linha do conjunto com o Sobrevivente Ilusional que pede soma de refinos 18. No Bastão vale reparar: por serem "contra oponentes de propriedade Água, Vento, Terra e Fogo", esses 15% agora só valem contra alvos dessas quatro propriedades, e não mais contra qualquer alvo.',
        'Na aba Habilidades, as três colunas — Buffs, Aprenda para ganhar bônus e Habilidades/efeitos ativos — ficavam coladas uma na outra e ganharam espaço entre si.',
      ],
    },
    {
      v: '0.1.46-beta',
      date: '12-08-2026',
      logs: [
        'Munição guardada no carrinho não é mais importada como munição equipada. Ao ler uma gravação, mochila, carrinho e equipamento entravam numa lista só; como cada um numera suas posições a partir do zero, uma pilha de balas de canhão parada no carrinho podia ocupar o espaço de Munição da build importada, somando o ATQ dela no cálculo de quem não estava com munição nenhuma equipada. Agora cada container é lido separado.',
        'O leitor de arquivos .rrf virou um projeto à parte, o rrfparser (github.com/adsonpleal/rrfparser), compartilhado com o RagnaRecap e o mercado. Eram três cópias do mesmo leitor seguindo caminhos diferentes, cada uma sabendo ler algo que as outras não sabiam; agora é uma só, com o melhor das três. Fora a correção da munição, a build importada de uma gravação sai idêntica: a troca foi conferida decodificando 566 gravações reais com o leitor antigo e o novo lado a lado, exigindo que toda diferença tivesse explicação.',
      ],
    },
    {
      v: '0.1.45-beta',
      date: '11-08-2026',
      logs: [
        'As habilidades do Hiperaprendiz foram refeitas a partir da descrição do cliente. Só a Tempestade de Júpiter estava certa; as outras nove usavam a tabela da 2ª versão do rebalanceamento, que o LATAM não usa. No Nv 1 passam a ser Golpe de Tyr 300%, Lâminas Devastadoras 950%, Choque Violento 700% e Cortar em Espiral 750% na árvore física, e Ira da Terra 1.550%, Espectro Napalm 500%, Esquife Congelante 200% na esfera e 400% na explosão e Zona Gravitacional 4.500% no impacto e 700% no campo na mágica — sempre somadas ao nível do Autodidata, ao POD ou à FEI e ao nível de base. Os dez níveis de cada uma passaram a ser selecionáveis, já que raramente ficam no máximo. Obrigado Asbrun pela gravação.',
        'A Chuva de Meteoritos entrou na lista de habilidades ofensivas; ela não existia no simulador. Estão as duas partes que o jogo manda em pacotes separados: a queda do meteoro e a explosão que vem depois.',
        'O Anjo da Magia, a ultimate mágica, foi cadastrado. Com ele ligado o dano sobe ×1,70 na Tempestade de Júpiter, na Ira da Terra e no Esquife Congelante, ×1,50 na Chuva de Meteoritos e na Zona Gravitacional e ×2,00 no Espectro Napalm. O cliente não publica descrição para essa habilidade, então as porcentagens são as medidas na gravação. O Anjo do Poder, a ultimate física, segue de fora por falta de gravação.',
        'O bônus de dano do Físico Autodidata e do Mágico Autodidata passou a valer. As duas passivas somam +1% de dano por nível às habilidades da sua árvore, e +2% no Choque Violento e no Espectro Napalm; esse trecho estava cadastrado de um jeito que o cálculo não enxergava, então valia zero em qualquer build. A gravação também mostrou que o bônus alcança o dano repetido das habilidades de área, mas não o primeiro golpe delas.',
        'As tabelas de bônus de atributos e de talentos do Hiperaprendiz foram refeitas a partir da iROwiki. A coluna de STA dava pontos a mais em todos os níveis de classe — no 50 eram +10 no lugar de +4 —, a DES parava em +5 e chega a +6, e a SOR começava três níveis tarde. Muda a TEN, o HP, o ATQ e o ATQM de qualquer build da classe.',
        'A velocidade de ataque do Hiperaprendiz não tinha tabela própria e caía na de mãos livres, sem as penalidades de arma e de escudo. Com cajado e escudo o simulador mostrava VelAtq 178 onde o jogo mostra 145. Passou a usar a tabela do Superaprendiz, a classe base.',
        'O Escudo Ilusión B ainda trazia os efeitos do item de mesmo número no servidor tailandês: ATQ e ATQM +15 a cada 3 refinos e HP e SP máx. +10%, que não existem na versão do LATAM, além de DEF base 60 no lugar de 20. Agora vale o que está na descrição em pt-BR — dano físico e mágico contra Chefes +5%, mais 2% a cada 2 refinos, e os conjuntos com o Soquete e a Turbina Ilusión B. No +9 o simulador vinha somando 45 de ATQ e 45 de ATQM que a peça não dá.',
        'A Manopla Sombria FEI passou a conceder ATQ e ATQM +1 por refino, a primeira linha da descrição, que não estava no cadastro — no +9 são 9 de cada. A mesma correção já tinha sido feita na versão POD.',
      ],
    },
    {
      v: '0.1.44-beta',
      date: '11-08-2026',
      logs: [
        'A base do simulador passou a vir pronta de uma fonte única, que acompanha o cliente do jogo. Os nomes e as descrições em pt-BR dos itens, a quantidade de slots de cada equipamento, a lista de classes disponíveis, os sprites usados no boneco do personagem e as estatísticas dos monstros eram lidos de uma instalação do jogo na máquina de quem mantém o simulador, e só chegavam aqui quando essa cópia era atualizada à mão. Agora tudo isso vem do ragassets — o mesmo serviço que já entrega os ícones e o desenho do personagem —, então uma atualização do jogo passa a se refletir no simulador em uma etapa só. Os dados desta versão são exatamente os mesmos de antes: o que muda é o caminho por onde eles chegam.',
      ],
    },
    {
      v: '0.1.43-beta',
      date: '10-08-2026',
      logs: [
        'As estatísticas dos monstros passaram a vir do servidor LATAM, e 35 alvos mudaram. Doze tiveram o HP corrigido — entre eles o R48-85-Bestia, que estava com 8.885.000 e tem 4.885.000, e a dupla Acidus/Ferus de Lago Abissal. Lorde Seyren, Algoz Eremes e Desordeira Gertie eram tratados como Humanoide e são Demônio, o que muda todo bônus de raça usado contra eles. Vinte alvos tiveram a marcação de Chefe ou de MVP acertada: a Miragem de Himmelmez, a Miragem de Amdarais, o Fragmento de Thanatos, a Espadachim Anônima e o Schmidt Corrompido do modo difícil passaram a contar como MVP; os quatro Thanatos, o Duque e o Barão Corvo e o Orc Falso deixaram de receber a proteção de Chefe que não têm.',
        'A base de itens foi refeita a partir do cliente atualizado. Entraram as cartas da Arena de Geffen, os dez Elmos da Fé e mais 79 itens novos; alguns nomes trocados no cliente foram acertados, como Esboço de Shuriken e Esboço de Huuma, que estavam invertidos. O Gorro de Carneirinho (e a versão rosa) e a Máscara de Pesar ocupavam só uma posição de cabeça no simulador e ocupam mais de uma no jogo — agora bloqueiam as posições certas.',
        'Sete equipamentos que faltavam foram cadastrados: Botas da Fonte, Sapato Quimera, Protetor Pænitentia, Amuleto de Lobo Físico, Amuleto de Lobo Mágico e as cartas Sugador de Cérebro e Forma de Vida Não Identificada — com os degraus de refino, os bônus por grau e os conjuntos de cada um.',
        'Corrigida a Carta Ju da Arena: os +30% de dano em Fire Bolt, Cold Bolt e Lightning Bolt do refino +14 valiam em qualquer arma, mas a descrição os prende à condição de livro da mesma frase.',
        'Corrigidos os quatro mantos e cachecóis Barreira Mágica e Ravage Mágico, que somavam 1% de HP máximo a cada refino em vez de a cada 2 refinos — no +15 davam 15% em vez de 7%.',
        'O popover de descrição do item voltou a ser uma coluna só. Descrições longas eram distribuídas em duas colunas para caber na tela, o que partia a leitura no meio; agora elas rolam na vertical. Para a rolagem ser alcançável, o popover deixou de sumir quando o ponteiro sai do item: dá para levar o cursor até ele, rolar até o fim e fechar saindo dos dois ou apertando Esc.',
      ],
    },
    {
      v: '0.1.42-beta',
      date: '10-08-2026',
      logs: [
        'A abertura do simulador ficou bem mais leve. O banco de itens era baixado cru a cada visita — 18 MB de JSON, com mais da metade do peso em descrições que eram descartadas e reescritas em pt-BR assim que chegavam —, e o download só começava depois que o pacote da página terminava de baixar e executar. Agora esses dados são preparados na publicação, já mesclados e sem os campos que a tela não usa: o que precisa chegar antes da primeira conta caiu de 1.281 KB para 319 KB, e começa a baixar junto com o resto da página em vez de esperar por ela.',
        'Voltar ao simulador deixou de baixar tudo de novo. Os arquivos de dados passaram a levar a versão no próprio nome, o que permite ao navegador guardá-los sem prazo: da segunda visita em diante nenhum deles é pedido ao servidor enquanto a base de itens não mudar. Antes cada visita revalidava os seis arquivos, mesmo sem nada ter mudado. As descrições dos itens, que só aparecem ao passar o mouse, ficaram num arquivo à parte que carrega depois que a tela já está pronta.',
        'O carregamento inicial virou uma tela só. Antes a abertura piscava entre três estados — a tela de espera, um intervalo em branco enquanto a página montava e outro indicador enquanto a build era remontada —, e no fim ainda apareciam os indicadores de cada painel. Agora é um único indicador do primeiro instante até os números aparecerem, e a barra de rolagem deixou de surgir e sumir no meio do processo.',
        'Abrir o simulador e trocar de classe deixaram de esperar à toa. As duas rotinas tinham pausas fixas somando cerca de 1,3 s na abertura e 0,9 s na troca de classe, herdadas de quando a tela precisava de folga para se redesenhar entre as etapas. Ficaram em 0,05 s cada.',
        'O popover de descrição do item deixou de sumir. Eram três causas distintas. Descrições longas ficavam mais altas que a janela e o popover era jogado para o canto com o resto fora da tela — o Chapéu de Kiwawa, com 56 linhas, ocupava 885 px numa janela de 720 px; descrições acima de 28 linhas passam a ser distribuídas em colunas. Itens perto do rodapé recebiam o popover colado logo abaixo deles, inteiro fora da tela, porque a última posição tentada era aplicada sem conferência. E a mais difícil de perceber: o popover podia ficar montado, posicionado e com o texto certo, mas com opacidade 0 — invisível, sem nada de errado para investigar —, quando a animação de entrada não chegava a rodar. Era esta que fazia o problema desaparecer com o DevTools aberto.',
      ],
    },
    {
      v: '0.1.41-beta',
      date: '31-07-2026',
      logs: [
        'O crítico base deixou de ganhar um ponto de graça. A conta era 1 + SOR ÷ 3 e o certo é só SOR ÷ 3: com SOR 107 o simulador mostrava Crítico 36 e o servidor manda 35. Vale para toda classe e muda a taxa de crítico, o DPS e a chance de crítico contra o alvo de qualquer build.',
        'As habilidades de ataque do Guarda Noturno foram refeitas a partir da descrição do cliente. Seis das sete usavam a tabela da 2ª versão do rebalanceamento, que o LATAM não usa, e erravam de 25% a 55%. No Nv 1 passam a ser Tiro Único 1.350% com rifle e 2.500% com pistola, Atirar em Espiral 1.300% com rifle e 2.000% com lança-granadas, Artilharia Pesada 500% por golpe, Fogo de Supressão 2.000% com espingarda e 1.800% com lança-granadas, Arremessar Explosivo 1.900% e Explosão Gradual 2.400% por golpe — sempre somadas aos pontos de foco, ao CON e ao nível de base. A Vigília Noturna já estava certa. Os cinco níveis de cada uma passaram a ser selecionáveis, já que raramente ficam no máximo. Gravações por shummuy.',
        'A Cesta de Mascotes ganhou os quatro conjuntos por família de mascote que faltavam no cadastro: dano físico a distância +10% com Orc Herói, Bafomé ou Abelha-Rainha; corpo a corpo +10% com Kiel-D-01, Freeoni ou Flor do Luar; dano mágico de todas as propriedades +10% com Lady Branca, Pesar Noturno ou Senhor das Trevas; e pós-conjuração e conjuração variável -5% com Patinho ou Unicórnio. É o único conjunto do banco cujo parceiro é o mascote, e sozinho ele respondia por 5% do dano que faltava nas gravações.',
        'O Ovo de Orc Herói passou a ter as quatro faixas de lealdade da descrição, com um seletor próprio: dano físico +1% na Baixa, +2% na Nenhuma, +4% e dano crítico +1% na Normal, +7% e +3% na Alta. O cadastro guardava só a faixa mais alta. Atenção ao rótulo do cliente: "Lealdade Nenhuma" é a segunda faixa, não a ausência de mascote. Os outros 37 mascotes seguem na faixa máxima por enquanto.',
        'A importação de replay passou a trazer o mascote e a lealdade dele. O bicho chega como criatura, não como item do inventário, e a intimidade vem gravada no arquivo numa escala de 0 a 1.000 — a mesma que o jogo usa para escrever a linha "Lealdade" na Janela de Mascote: até 249 é Baixa ou Baixíssima, até 749 é Nenhuma, até 909 é Normal e daí para cima é Alta. Não precisa mais escolher a faixa à mão depois de importar. Gravações por shummuy.',
        'A Manopla Sombria POD passou a conceder ATQ e ATQM +1 por refino, a primeira linha da descrição, que não estava no cadastro — no +9 são 9 de cada. Cadastrada também a Pistola Aprimorável, que faltava no banco.',
        'As descrições das habilidades das classes 4ª Expandida saíram do inglês. O cliente passou a trazer o texto em pt-BR, e as 97 descrições que estavam desatualizadas foram trocadas por ele. Vieram junto 17 nomes que o cliente mudou desde o cadastro original, entre eles Tiro Único, Fogo de Supressão, Arremessar Explosivo, Explosão Gradual e Perícia com Explosivos no Guarda Noturno, Explosão Crepuscular no Mestre Celestial e Pacto com Tigre, Unhas de Tigre e Rugido do Tigre no Espiritualista.',
        'O painel de bônus do item passou a mostrar os talentos em pt-BR — POD, SAB, FEI e CRV no lugar de POW, WIS, SPL e CRT —, além de C.Mais, da resistência por tamanho separada por tipo de dano, do crítico por raça e das reduções de pós-conjuração e de conjuração fixa por habilidade, que apareciam como "acd__156".',
        'O ícone da habilidade voltou a aparecer ao lado do nome depois de escolhida, nos seletores que têm nível. A contagem de mira do Guarda Noturno passou a se chamar Pontos de Foco, como no cliente, e a tabela de bônus de atributos da classe foi corrigida: a SOR chegava um nível de classe cedo demais e a AGI ficava um ponto atrás entre os níveis 25 e 31.',
      ],
    },
    {
      v: '0.1.40-beta',
      date: '30-07-2026',
      logs: [
        'Os golpes por segundo deixaram de ser arredondados para baixo. O simulador guardava só a parte inteira, então VelAtq 151 e VelAtq 174 rendiam 1 golpe/s e exatamente o mesmo DPS — os 24 pontos entre uma e outra não valiam nada. Agora vale a curva do jogo, 50 ÷ (200 − VelAtq): 151 dá 1,02 golpes/s, 174 dá 1,92 e o teto de 193 dá 7,14. O número foi conferido em 61.320 ataques comuns de 358 gravações, cujos pacotes trazem o tempo de ataque que o servidor manda ao cliente: 99,6% deles caem em frações, e não em números inteiros. O DPS de ataque básico e o de habilidade mudam em qualquer build; quem estava em VelAtq intermediária via até 22% a menos do que o jogo entrega.',
        'A dica de otimizar a conjuração parou de culpar a VelAtq sem motivo. Como ela comparava o ritmo da conjuração com aquele número arredondado, uma build em VelAtq 174 aparecia com teto de 1 uso por segundo no lugar de 1,92, e toda habilidade entre esses dois valores era marcada como limitada pela VelAtq — mandando atrás de velocidade de ataque que já existia.',
        'O valor de Hits/s no resumo virou um gráfico. Clicando nele abre a curva de golpes por segundo com a posição da build marcada, quanto renderiam mais 10 de VelAtq a partir dali e a tabela de referência de VelAtq de cada golpe/s cheio. Como a curva é hiperbólica, o mesmo punhado de pontos vale pouco embaixo e muito perto do teto: +10 saindo de 150 rende 25% mais golpes, e saindo de 180 rende 100%.',
        'Adicionadas as Correntes Sagradas e a Coleira de Espinhos, que formam conjunto: dano crítico +7% com as Correntes sem slot e +5% com a de um slot. Reportado por Ted.',
        'Adicionados os Fones COR, que formam conjunto com o CD Antiquado: dano mágico de todas as propriedades +7% com os Fones sem slot e +5% com o de um slot. Esses itens e os acima entraram na atualização do cliente de 24 de julho e ainda não constavam no banco.',
      ],
    },
    {
      v: '0.1.39-beta',
      date: '30-07-2026',
      logs: [
        'As habilidades do Mestre Celestial foram refeitas a partir da descrição do cliente. Cinco das seis usavam a tabela da 2ª versão do rebalanceamento, que o LATAM não usa. As taxas passam a ser as da descrição de cada uma — Entardecer 6.000% de ATQ no Nv 5, Explosão Crepuscular 2.400%, Chute Meia-Lua 5.500% e 7.500% em Meia-Noite, Alvorada 2.300% e 3.300% em Pôr da Lua —, sempre somadas ao nível de Maestria Celestial e ao POD. A Explosão Galática já estava certa. Gravações por Ted.',
        'A Constelação e o Colapso Estelar entraram na lista de habilidades ofensivas; nenhuma das duas existia no simulador. A Constelação pode ser escolhida em qualquer nível, já que costuma ficar baixa por ser só o pré-requisito da Explosão Galática.',
        'Os seletores Rising Sun e Rising Moon viraram um só, o Espaço Celeste, com os seis estados e o Elo Celestial. Os seis nunca podem estar ativos ao mesmo tempo, e o Elo Celestial cancela todos eles e libera o Entardecer, a Explosão Crepuscular, o Chute Meia-Lua e a Alvorada no efeito máximo — inclusive o crítico das duas primeiras. Quem tiver um link salvo de Mestre Celestial precisa reescolher o estado.',
        'A Corrida passou a somar ATQ com as mãos livres, +10 por nível da habilidade, o que dá +100 no Nv 10. Vale para toda a linha Taekwon, e some ao equipar qualquer arma. Era o que faltava para o dano do simulador bater com o das gravações: sem arma o ATQ sobe de 4.008 para 4.193 na build gravada, e com arma continua onde estava.',
        'A Explosão Galática passou a repartir o dano em 3 golpes, e não em 1. O total muda pouco, mas o valor por golpe e o arredondamento mudam.',
        'Corrigida a tabela de bônus de talentos do Mestre Celestial, cuja coluna de STA dava pontos a mais em todos os níveis de classe: no nível 46 eram STA +12 no lugar de +7. Refeita a partir da iROwiki e conferida contra a janela de Talentos no jogo, que confere nos doze atributos. Muda a TEN e o HP das builds da classe.',
        'O Kihop passou a multiplicar o ATQ já arredondado, e não a fração que o P.ATQ deixa para trás. Altera em uma unidade o ATQ de algumas builds de Mestre Estelar, Mestre Celestial e Espiritualista.',
      ],
    },
    {
      v: '0.1.38-beta',
      date: '28-07-2026',
      logs: [
        'A resistência por tamanho voltou a somar na Redução de dano. Das 65 peças cuja descrição concede "Resistência a oponentes de tamanho...", apenas a Carta Yeti de Cristal tinha o efeito cadastrado, então a linha "Todos os tamanhos" nunca aparecia e o resumo mostrava só o tamanho da carta. Foram cadastradas 48 peças, entre elas a Autopeça - Carburador, a Chave Maxi, a Memória de Howard, a Manopla e o Escudo Sombrio do Infinito, a Malha Sombria Perfeita, o Colar Sombrio Infinito, o Escudo Gigante, o Escudo de Platina, as Blasti-OS e OSAD, a Bastarda e o Arco Primordial-LT e as Cartas Hodremlin, Tirfing, Mysteltainn, Executor, Marechal Tartaruga, Gárgula Congelada e Khalitzburg. Reportado por Luís.',
        'O conjunto das armas da Mina de Einbech com a Medalha Rubra ou Azul e a Dragona Rubra ou Azul passou a conceder os 3% de resistência a todos os tamanhos, em qualquer uma das 18 armas do conjunto.',
        'Os Orbes Lupinos - Total 1, 2 e 3 e o encantamento U-Total estavam sem efeito nenhum no cadastro. Agora concedem a resistência descrita a monstros normais e chefes, a todas as propriedades, a todos os tamanhos e a todas as raças, cada uma no seu degrau de refino. A Tiara de Astrea também ganhou os quatro degraus de resistência que faltavam, do +9 ao +12.',
        'Resistência apenas física ou apenas mágica a um tamanho passou a ser tratada à parte, já que só vale contra o seu tipo de dano. Com isso entraram a Capa de Astrea, as Botas de Astrea e a Carta Grote, e o resumo passou a separar essas linhas das que valem para os dois tipos.',
      ],
    },
    {
      v: '0.1.37-beta',
      date: '28-07-2026',
      logs: [
        'A Centelha das Trevas passou a critar. A habilidade sai como crítico na mesma taxa de crítico do personagem, e o multiplicador é aplicado golpe a golpe — são 4 golpes, e não 1 como o simulador contava. Nem a descrição no jogo nem a bROWiki mencionam o crítico: ele foi identificado nas gravações, em que 41% das usadas saem exatamente no multiplicador de crítico das demais, com o personagem marcando 41 de crítico. Reportado por Ted.',
        'Corrigida a taxa da Centelha das Trevas, que estava abaixo da do jogo. A tabela passa a ser a da descrição da habilidade — 2.500% de ATQ no Lv 1 até 9.700% no Lv 10, mais o nível da Dança das Trevas × 100 por nível da habilidade —, no lugar da tabela da 2ª versão do rebalanceamento, que o LATAM não usa. Com a taxa e o crítico acertados, o dano do simulador bate número a número com o das gravações, com e sem crítico. Gravações por Ted.',
        'Corrigidas as tabelas de bônus de classe e de talentos do Shinkiro e da Shiranui, que davam atributos a mais em quase todos os níveis de classe: no nível 46, por exemplo, FOR +12 e POD +9 no lugar de FOR +10 e POD +8. Nos talentos, a Shiranui ainda usava a tabela do Shinkiro, o que lhe dava POD +11 e SAB +2 no máximo, quando a classe é justamente a metade de SAB (POD +3 e SAB +10). As duas foram refeitas a partir da iROwiki e conferidas contra os atributos que o cliente grava no replay — ATQ base, P.ATQ e T.Crít batem nos três. Isso muda o ATQ, o ATQM e o dano de qualquer build das duas classes.',
      ],
    },
    {
      v: '0.1.36-beta',
      date: '27-07-2026',
      logs: [
        'Corrigida a Coroa Scaraba, que aplicava o "Dano físico +10%" do refino +7 como um multiplicador sobre o dano já reduzido pela DEF do alvo, em vez de somar ao ATQ. Reportado por Lorigan.',
        'O mesmo erro foi corrigido em outros 65 equipamentos com a linha "Dano físico +N%" ou "Dano mágico +N%" — entre eles os Anéis Forte e Mágico do Éden, as Luvas de Orleans, as Medalhas de Honra, a Armadura de Brynhildr, os Diademas e Coroas do zodíaco, os Elmos de Cinzas e as Cotas Evolutivas. A porcentagem dessas peças agora entra no ATQ e no ATQM, como nos outros ~690 equipamentos que já traziam a mesma frase, e o dano deles muda de valor.',
      ],
    },
    {
      v: '0.1.35-beta',
      date: '27-07-2026',
      logs: [
        'O seletor de grau voltou a aparecer em todas as armas de nível 5 e equipamentos de nível 2 — entre eles as armas Decadentes, Fortificadas, Descartadas e -OSAD, que não ofereciam grau nenhum. O grau agora sai do nível do equipamento, e não mais de uma marcação preenchida à mão que ficava para trás a cada atualização do banco. Reportado por usuário anônimo.',
        'Corrigido o nível de 74 equipamentos que estava em branco ou errado no cadastro. É o nível da arma que define o bônus de ATQ e ATQM por refino, então peças como a Claymore Gloriosa, a Espada Cromada, as Ginnungagap e as armas de aluguel TE não ganhavam nada ao refinar, e o Arco Vigilante rendia o bônus de nível 3 no lugar do de nível 4. Equipamentos de nível 2 também voltaram a receber a DEF extra e os +2 de RES e RESM por refino. A tabela de refino e os multiplicadores de grau (+10% no D, +30% no C, +50% no B e +100% no A) foram conferidos nível a nível e batem com o jogo.',
        'Os Capacetes Fortificado, Decadente e Descartado passaram a aceitar encantamentos nos slots 2, 3 e 4. Os oito encantamentos do Passe de Batalha também foram corrigidos: o cadastro trazia os efeitos da versão coreana, e não os do LATAM. Os encantamentos Decadente, Fortificado e de Sucata têm a descrição cortada no jogo — só aparecem os primeiros conjuntos de armas —, então a lista completa dos oito conjuntos de cada um veio da bROWiki. Reportado por usuário anônimo.',
        'Corrigido o Conjunto Goibne Ilusional, que não concedia nada: o elmo procurava as outras três peças pelo nome em inglês, que deixou de existir quando o banco passou para o português. Entraram junto os efeitos do conjunto que faltavam no cadastro — resistência às propriedades Vento, Fogo, Água e Terra +10% e HP máx. +10% adicional com as quatro peças no +7 —, a DEF do refino +9 da Armadura Goibne Ilusional e o dano físico contra oponentes de propriedade Fogo, Terra, Água e Vento da Ombreira Goibne Ilusional. Reportado anonimamente.',
        'Adicionada a Carta Gerente (INT +1 e Conjuração variável -5%), junto das Cartas Alarme, Relógio e Punk, para que o conjunto das quatro — DEF e DEFM +3 — possa ser montado no simulador.',
        'Nas listas de cartas de acessório, as marcações [Right] e [Left] passaram a ser [Direito] e [Esquerdo].',
      ],
    },
    {
      v: '0.1.34-beta',
      date: '27-07-2026',
      logs: [
        'Adicionado o servidor MCP, que permite conectar uma IA (Claude, ChatGPT e outras) ao simulador: dá para pedir que ela procure itens, calcule o dano de uma build, compare builds ou teste as peças de um slot atrás do maior DPS. Todo cálculo passa pelo mesmo motor desta página, então os números batem com os daqui. O caminho mais direto é colar o link da sua build na conversa — a IA lê classe, níveis, atributos e cada peça com refino, cartas e encantamentos, e devolve outro link pronto para abrir de volta no simulador, já com a peça sugerida na comparação. A busca de itens também enxerga o que existe no LATAM mas ainda não foi cadastrado aqui, marcando esses casos. O endereço e as instruções de conexão estão no botão MCP, na barra de cima. Recurso altamente experimental: pode mudar, sair do ar ou errar sem aviso.',
        'O link de compartilhamento passou a levar também a comparação de peças: se houver uma comparação ativa quando o link for gerado, quem abrir cai direto na visão peça atual → simulado, e não apenas na build. Links gerados antes desta versão continuam funcionando como antes.',
      ],
    },
    {
      v: '0.1.33-beta',
      date: '24-07-2026',
      logs: [
        'A Implosão Tóxica passou a usar a taxa maior quando o alvo está sofrendo de [Infecção], como descreve a habilidade no jogo: 1.500%, 2.000%, 2.500%, 3.000% e 3.500% de ATQM do Lv 1 ao Lv 5, no lugar dos 1.300% a 2.500% aplicados a um alvo sem o efeito. Antes o simulador usava sempre a taxa menor, mesmo dentro da nuvem da Maldição de Jormungand. Gravações por Ted.',
        'Corrigida a ordem do cálculo do dano mágico: o multiplicador elemental — elemento do ataque contra o elemento do alvo, incluindo as reduções de resistência [Infecção], [Intoxicação], [Geladinho] e Oratio — passou a multiplicar o ATQM antes da taxa da habilidade, e não mais o dano final. Com isso a DEFM branda do alvo é descontada uma única vez, depois do aumento, e o dano deixa de sair abaixo do real sempre que há vantagem elemental ou redução de resistência. Gravações por Ted.',
      ],
    },
    {
      v: '0.1.32-beta',
      date: '24-07-2026',
      logs: [
        'Adicionadas as cartas do conjunto da Coroa Scaraba (Carta Rainha Scaraba, Carta Rainha Scaraba Dourada e Carta Rainha Scaraba Selada), que faltavam no simulador, e ativados os bônus de conjunto da coroa: com a Carta Rainha Scaraba, Dano físico contra Chefes +35%; com a Carta Rainha Scaraba Dourada, P.ATQ. +20 e Dano crítico +10% por refino da coroa. A Carta Rainha Scaraba Dourada também concede INT +3 e resistência à raça Inseto. Reportado por Guto.',
      ],
    },
    {
      v: '0.1.31-beta',
      date: '24-07-2026',
      logs: [
        'A comparação de peças (Comparar peça) agora é salva junto com a simulação e permanece ao atualizar a página. Ao salvar uma simulação, a peça em comparação e seus valores são guardados e restaurados quando ela é carregada de novo; a comparação em andamento também sobrevive a um recarregamento do navegador.',
      ],
    },
    {
      v: '0.1.30-beta',
      date: '24-07-2026',
      logs: [
        'Corrigidos os conjuntos do Espinho Violeta e do Núcleo Concentrado com os Fones (Amplificadores e Danificados), as Asas de Sigrún e a Venda Sombria: os bônus de conjunto do Núcleo Concentrado não estavam sendo aplicados e foram refeitos para casar as peças por id, em vez do nome. No conjunto com as Asas de Sigrún, o dano físico corpo a corpo com a Capa em refino +9 passou a somar +10% (antes somava +5% por engano). Também foi adicionada a Venda Sombria (sem fenda), que faltava no simulador. Reportado por Shummuy.',
      ],
    },
    {
      v: '0.1.29-beta',
      date: '23-07-2026',
      logs: [
        'Adicionadas as Cartas de Cristal Yeti (efeitos de conjunto de redução por tamanho: Médio com a Titã, Pequeno com a Gazeti), Titã (DEF +5 e +5 por refino) e Gazeti. Reportado por Luís.',
        'Modelada a redução de dano físico à distância (Carta Gazeti de Cristal), que reduz o dano recebido de ataques físicos à distância — ataque básico com arco ou habilidades à distância — na seção de PVP.',
      ],
    },
    {
      v: '0.1.28-beta',
      date: '23-07-2026',
      logs: [
        'Adicionada a classe Animista, a 4ª classe do Invocador, com suas habilidades de ataque (Chulho Sonic Claw, Howling of Chulho, Hogogong Strike, Hyunrok Breeze e Hyunrok Cannon). As fórmulas de dano seguem a 2ª versão publicada por Sigma the Fallen.',
      ],
    },
    {
      v: '0.1.27-beta',
      date: '23-07-2026',
      logs: [
        'Os itens que chegaram na última atualização do cliente agora aparecem no simulador — novos equipamentos (como a Coroa Scaraba e o Punhal Enferrujado), equipamentos sombrios, cartas, encantos e trajes.',
        'As classes de 4ª expandida (Mestre Celestial, Asceta das Almas, Shinkiro, Shiranui, Guerrilheiro e Hiperaprendiz) passaram a ser reconhecidas pela atualização do cliente.',
      ],
    },
    {
      v: '0.1.26-beta',
      date: '23-07-2026',
      logs: [
        'Adicionado o efeito [Intoxicação] que a habilidade Poço Venenoso (Elementalista) aplica no alvo, disponível entre os debuffs: o alvo passa a receber +25% de dano da propriedade Veneno — uma redução de −25% na resistência a Veneno, que aparece na coluna "R.R. Elem." da tabela de Elemento e soma com a [Infecção] — e tem a DEF física zerada. (reportado por Ted.)',
        'Adicionadas as habilidades Esquife Congelante (Jack Frost Nova) e Zona Gravitacional (Ground Gravitation) do Hiperaprendiz, ambas mágicas. Cada uma aparece na lista de habilidades em duas entradas: "(Inicial)", o golpe único de impacto, e "(Contínuo)", o dano que se repete na área. (reportado por Reny.)',
        'Adicionado o efeito [Geladinho] do Esquife Congelante entre os debuffs: reduz em 15% a resistência do alvo à propriedade Água (coluna "R.R. Elem."), aumentando o dano de qualquer ataque de Água. (reportado por Reny.)',
        'Adicionado o efeito [Gravitação] da Zona Gravitacional entre os debuffs: o alvo passa a receber +10% de dano físico e mágico. Não tem efeito em monstros do tipo Chefe. (reportado por Reny.)',
      ],
    },
    {
      v: '0.1.25-beta',
      date: '22-07-2026',
      logs: [
        'Adicionados os dez níveis da Miragem de Amdarais como alvos (Nível 1 ao 10), agrupados na seção MVPs e na ordem Nível 1 → 10. Os níveis se diferenciam apenas pelo HP (de 600 milhões no Nível 1 a 2 bilhões no Nível 10); as demais estatísticas seguem as do Amdarais. O "Dano Absorvido" da tabela do jogo é uma cura da própria Miragem (ela recupera o HP perdido nos últimos 2 segundos), e não uma redução de dano recebido, por isso não entra no cálculo. (reportado por Ted.)',
        'A aba "Resumo de Batalha" passou a abrir expandida por padrão ao carregar o simulador.',
      ],
    },
    {
      v: '0.1.24-beta',
      date: '22-07-2026',
      logs: [
        'Adicionada a habilidade Maldição de Jormungand (Killing Cloud) do Feiticeiro e do Elementalista: uma nuvem venenosa que causa dano mágico de propriedade Veneno a cada 0,5s. O efeito [Infecção] que ela aplica no alvo foi colocado entre os debuffs e reduz a resistência do alvo à propriedade Veneno em 5% por nível (−25% no Lv 5), aumentando o dano de qualquer ataque de Veneno. Essa redução passou a aparecer numa coluna própria, "R.R. Elem.", na tabela de Elemento, e o ícone da habilidade foi corrigido. (reportado por Ted.)',
        'Na aba "Bônus de Habilidade / Multiplicadores", ao comparar dois builds cada tabela agora mostra a diferença com uma seta "atual → simulado" nos valores que mudam, e o valor simulado é clicável para ver quais itens do build comparado o concedem. (reportado por Ted.)',
        'Os valores das tabelas de resumo (Classe, Raça, Tamanho, Elemento e Multiplicadores) passaram a exibir o sinal de porcentagem, deixando claro que são bônus percentuais.',
      ],
    },
    {
      v: '0.1.23-beta',
      date: '22-07-2026',
      logs: [
        'Corrigida a Velocidade de Ataque (VelAtq) do Superaprendiz: a tabela de VelAtq base por tipo de arma estava errada e, mais visível, o Cajado (Bastão) não aplicava a redução de −25, deixando o ASPD alto demais. Os valores foram conferidos contra a tabela do jogo e o servidor de referência (Adaga −15, Espada −17, Maça −10, Machado −10, Cajado −25). (reportado por Reny.)',
        'Tabela de VelAtq base de todas as classes conferida contra o bROWiki, com correção das que estavam erradas: Insurgente e Guerrilheiro usavam a tabela do Justiceiro (agora Sem arma 151, Espingarda −30, Lança-Granada −35, Escudo −10, etc.); o Inquisidor passa a usar a mesma tabela do Shura (Sem arma 158, Maça −5, Cajado de 2 mãos −12); Mestre Estelar e Mestre Celestial tinham −10 genérico em toda arma, quando só o Livro (−5) e o Escudo (−3) contam; Feiticeiro e Elementalista com Livro −5 (era −3; o Escudo do Elementalista é −4); Musa e Diva com Chicote −5; e Kagerou, Oboro, Shinkiro e Shiranui com a Adaga na mão esquerda em −11.',
        'No detalhamento da VelAtq, itens que dão bônus fixo e percentual ao mesmo tempo (ex.: S-Rapidez, Joia Temporal AGI) mostravam os dois somados num número só, parecendo "+7". Agora aparecem separados, na unidade certa: "+1 +6%". A Poção do Despertar deixou de aparecer como "+6%" (é bônus fixo) e a seção "Extras" virou "Bônus Aleatórios". O cálculo do ASPD já estava certo; a mudança é só no detalhamento.',
        'Importação de replay: os buffs que já estavam ativos no começo da gravação (Bênção, Aumentar Agilidade, poções de VelAtq como a do Despertar, e ainda Impositio, Expiatio, Competentia, Religio, Benedictum, Grito de Guerra, Força Violenta, Manejo Perfeito, Adrenalina, Encanto de Órion, Marcha de Prontera e Chuva de Mariscos) agora são importados, além de habilidades ativas de efeito próprio como Concentrar e Telecinesia. Eles ficam num contêiner de status do arquivo que o leitor ignorava — antes só entravam os buffs reativados durante a gravação. Buffs que variam por nível entram no nível base; é só ajustar se precisar. Um efeito só é ligado quando o status dele foi mesmo registrado na gravação.',
      ],
    },
    {
      v: '0.1.22-beta',
      date: '21-07-2026',
      logs: [
        'Novo atalho "Redução de dano" nos atributos e no HUD do alvo PVP: abre uma janela com as reduções do build por categoria — raça (Humano/Doram), elemento, tamanho, classe, redução plana e, no alvo, a redução da guerra. Cada linha é clicável e mostra quais equipamentos concedem aquela redução. (por Luís.)',
        'No gráfico "Como o dano é calculado", a redução do PVP deixou de ser um passo único: agora aparece um passo por tipo (Redução Humano, Redução Neutro, Redução plana…) mais o passo da Redução da guerra. Cada passo de equipamento é clicável e mostra os itens do oponente que causam aquela redução.',
        'Continuei cadastrando as reduções de dano recebido de jogadores que faltavam: resistências por raça (Humano/Doram) e por elemento, reduções planas, e agora também os bônus por refino e de conjunto — como os sets de Cerco (+15% contra Humano), dos Malditos, de Cinzas, de Goibne e das Marés, além de cartas como Sapo de Thara e Raydric. Corrigi também o elemento "Maldito", que é a propriedade Morto-Vivo, e não Sombrio. Esse tipo de efeito só vale no PVP. (por Luís.)',
      ],
    },
    {
      v: '0.1.21-beta',
      date: '20-07-2026',
      logs: [
        'Nova seção PVP: escolha o modo (PVP, WOE ou WOE TE) e um oponente a partir das suas simulações salvas para ver o dano de verdade contra outro jogador. Diferente do dano contra monstro, aqui entram as defesas do alvo pelas fórmulas de jogador (DEF suave, RES, esquiva) e as reduções que o equipamento dele concede. Dentro dos castelos vale ainda a redução da guerra: no castelo normal todo o dano cai para 30%; no TE, o corpo a corpo fica cheio, o ataque à distância cai para 80% e as habilidades para 60%, e a esquiva do alvo cai 20% nos dois. Todas as suas simulações salvas já aparecem como alvo. (Fórmulas e testes em campo por Luís.)',
        'Passei a mapear reduções de dano recebido que antes eram ignoradas: a Máscara de Odium, por exemplo, reduz em 5% o dano físico e mágico recebido de jogadores. Esse tipo de efeito só importa no PVP e vai sendo cadastrado aos poucos. (Por Luís.)',
      ],
    },
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
        'Nomes em português acertados pelo bROWiki: Asceta virou Asceta das Almas, Crepúsculo Explosivo virou Crepúsculo do Poente e o Talismã da Fênix estava grafado "Talimã". As descrições dessas seis classes ainda aparecem em inglês porque o cliente LATAM não traz o texto em português delas.',
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
        'Superaprendiz agora tem Telecinesia nas habilidades ativas e Impacto Espiritual no Resumo de Batalha. (Reportado por usuário anônimo.)',
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
        'Adicionada a Bala de Guaraná aos consumíveis: ativa [Aumentar Agilidade] nv. 5 e o efeito da Poção da Concentração. Os efeitos não acumulam com fontes mais fortes — uma poção de ASPD selecionada substitui o efeito de Concentração, e um [Aumentar Agilidade] de nível maior substitui o da bala. Sugerido por usuário anônimo.',
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
        'Descrições dos Itens: bônus percentuais agora exibem "%". Reportado por usuário anônimo.',
        'Reduções de conjuração agora aparecem como negativas — Pós-conjuração e Conj. Variável em -x% e Conj. Fixa em segundos negativos.',
        'Novo debuff no monstro: Oratio (reduz a resistência à propriedade Sagrado do alvo).',
        'A comparação de itens agora inclui o slot de Escudo.',
        'Na comparação, as ativações (Efeitos) do item comparado também passam a aparecer.',
        'Pós-conjuração de Tiro Crescente (Crescive Bolt) ajustada para 0,5s. Reportado por usuário anônimo.',
        'Rótulos e descrições para os bônus de ativação (chance) e para os combos de itens.',
        'Resumo de Batalha: rótulos de conjuração padronizados em pt-BR (Conj. Fixa, Conj. Variável, Recarga, VelAtq).',
        'Habilidades repetidas com propriedades diferentes agora exibem o elemento no nome (ex.: "Adoramus - Sagrado" e "Adoramus - Neutro").',
        // Importação de replay
        'Importação de Bônus Aleatórios e da aparência do personagem a partir do replay (.rrf).',
        'Replay: leitura do sexo do personagem, mensagens separadas de carregamento e de aviso de talentos, e preservação de encantamentos ausentes na tabela kRO.',
        // Itens & monstros
        'Mais de 282 itens LATAM adicionados ao banco de dados (preenchimento via replays).',
        'Novos itens: Manto Branco (Físico e Mágico), Cachecol Mágico de Schmidt, Selo de Paus, Selo de Ouros, Pingente da Celine e os encantamentos do Automatron B-Básico (DEF/DEFM).',
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
  /** Reading width for the changelog; see dialog-geometry.ts. */
  readonly updateDialogStyle = UPDATE_DIALOG_STYLE;

  lastestVersion = this.updates[0].v;

  unreadVersion = this.updates.findIndex((a) => a.v === this.localVersion);
  showUnreadVersion = this.unreadVersion === -1 ? this.updates.length + 1 : this.unreadVersion;

  // Don't auto-open the changelog on load; it's still reachable via the "what's new" button.
  visibleUpdate = false;

  // The call for .rrf recordings, on the other hand, *does* open on load — it is
  // the only way most people hear about it. Ticking its checkbox hides it for a
  // few days; just closing it doesn't.
  visibleHelpImprove = !isHelpImproveSnoozed();

  showHelpImproveDialog() {
    this.visibleHelpImprove = true;
  }

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

  showMcpDialog() {
    this.mcpUrlCopied = false;
    this.visibleMcp = true;
  }

  async copyMcpUrl() {
    try {
      await navigator.clipboard.writeText(this.mcpUrl);
      this.mcpUrlCopied = true;
    } catch (error) {
      // Clipboard access can be denied (insecure context, permissions); the URL is
      // on screen and selectable, so this is not worth interrupting the user for.
      console.error(error);
    }
  }

  openItemSearch() {
    this.layoutService.openItemSearch();
  }

  openConfig() {
    this.layoutService.showConfigSidebar();
  }
}
