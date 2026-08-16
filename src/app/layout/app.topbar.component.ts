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
        'O Escudo Automatron B não ignorava DEFM nenhuma. A peça estava cadastrada sem efeito algum: os 15% de DEFM ignorada de todas as raças, os 5% a mais a cada 2 refinos e os 10% de dano mágico contra Chefes do refino +7 não existiam no cálculo. No +10 são 40% de DEFM ignorada que a build vinha deixando na mesa. O Escudo Automatron A, o irmão físico, já estava correto e serviu de referência. Reportado por junior.zkt.',
        'Os Escudos Automatron A e B voltaram a aceitar Automódulos. Todas as outras peças Automatron — Colete, Motor, Perna, Soquete e Turbina — já tinham a lista de encantos cadastrada, e só os dois escudos ficaram de fora, com os três espaços vazios. Agora oferecem a coluna do Escudo da tabela de Automódulos: B-DEF, B-DEFM, M-HPMax, M-SPMax, M-Rapidez, P-Robusto e P-Dano. O M-Cura e o P-Refletor, que o escudo também aceita no jogo, seguem fora porque o simulador não calcula efetividade de cura nem resistência a dano refletido — as demais peças Automatron também não os oferecem.',
        'O conjunto do Elmo Mágico de Cinzas com o Cajado de Cinzas passou a valer. Do conjunto só existia o "Dano mágico +7%" do Cajado Duplo; a recarga de Onda Psíquica -1,5 segundo e o bônus por refino da arma — Onda Psíquica e Pó de Diamante +5% a cada 2 refinos — não estavam cadastrados, então refinar o cajado não mudava nada. Entrou junto o degrau que faltava no conjunto com o Cajado Duplo, Impacto Espiritual e Corrente Elétrica +5% a cada 2 refinos. Com o cajado no +10 são 25% de dano a mais em cada uma dessas habilidades.',
        'Os outros cinco Elmos de Cinzas tinham a mesma falha e foram corrigidos junto: o Mortal, o Divino, o Cobiçado, o Bravio e o Certeiro. Todos seguiam o mesmo molde — a linha fixa do conjunto cadastrada e o degrau por refino da arma faltando — somando 13 conjuntos e 30 bônus de perícia que não valiam nada. Entraram também as recargas que faltavam, como a de [Tempestade de Flechas] -2,5 segundos do Elmo Certeiro com o Arco de Cinzas.',
        'A mesma varredura pegou outros três elmos montados do mesmo jeito. O Chapéu Símbolo da Magia não aplicava o conjunto [Mikatsuki] + [Adaga Raksasa], que dá conjuração variável -1% por refino de cada arma e +5% em [Pétalas Flamejantes], [Lança Congelante] e [Lâmina de Vento] a cada 2 refinos somados. A Boina Escarlate-OS estava sem os dois conjuntos, o do Rutilus-OS e o do Rapieira-OS, e sem o dano mágico contra Pequeno e Médio do refino +11. E o Chapéu de Kiwawa não tinha nenhum dos cinco conjuntos de [Olho de ...] cadastrado.',
        'A varredura foi estendida a todo o banco e achou mais 19 peças que prometiam dano de perícia na descrição sem nada cadastrado. Os quatro cajados elementais e suas versões Fortalecidas — do Açoite de Ouro, Aquático, Vermelho e Florestal — não davam o bônus em [Trovão de Júpiter], [Lanças de Gelo], [Lanças de Fogo], [Bolas de Fogo], [Coluna de Pedra] e [Fúria da Terra], que vai de 10% a 30% conforme a versão. As nove armas Iniciais não davam os 15% de dano do refino +7 na perícia de cada uma. A Enciclopédia Ancestral não dava os 15% em [Chute Solar] nem os 20% em [Explosão Solar]. E a Bota Natalina não dava os 15% mais 2% por refino em [Campo Gravitacional], [Vulcão Napalm], [Espíritos Anciões] e [Magnus Exorcismus] — no +10 são 35% em cada uma.',
        'Outras 30 peças com conjunto tiveram o bônus de perícia cadastrado. Entre elas o Microfone Floral, que estava sem efeito nenhum e agora dá os 200% em [Vulcão de Flechas] com o Bracelete Floral; a Maça do Julgamento Fortalecida, que não aplicava a conjuração variável -50% em [Magnus Exorcismus], [Esconjurar], [Adoramus], [Judex] e [Luz Divina]; o Esfíngico Ilusional com o Sobrevivente Ilusional; as Armaduras de Ur e de Elite, a Vestimenta dos Manuks, a Malha das Asas das Sombras, os seis Amuletos de Doram, as Peças Suplementares e a Autopeça - Carburador. Nos conjuntos que também trazem penalidade a penalidade entrou junto — a Malha das Asas das Sombras, por exemplo, agora tira os 7 de velocidade de ataque e os 30% de dano a distância que a descrição cobra.',
        'O Espólio de Celia ainda trazia os efeitos do item de mesmo número no servidor de origem, e quase nenhum número batia com a descrição em pt-BR. A conjuração variável -10% do refino +9 estava cadastrada como velocidade de ataque, então nunca reduziu conjuração nenhuma. Os degraus por refino da arma davam 10% onde a descrição diz 3%, e o dano mágico do conjunto com o Lançarin dava 10% onde a descrição diz 2%. O conjunto com o Castigo Diamante somava dano em [Castigo de Nerthus] no lugar de [Pó de Diamante], e o com a Lança Psíquica em [Onda Psíquica] no lugar de [Lanças dos Aesir]. Faltavam ainda os 3% de dano mágico por propriedade dos dois conjuntos. Saíram os efeitos que a descrição não concede: ATQM por refino, a conjuração fixa do Castigo Diamante e a recarga de [Onda Psíquica] da Lança Psíquica. No geral a peça perde dano em builds que contavam com os degraus de 10%, e ganha a redução de conjuração que deveria ter desde sempre.',
        'A Manopla Sombria de Apoio Químico dava os 15% de dano do conjunto na habilidade errada: o bônus estava em [Tornado de Carrinho], que é a habilidade da linha de recarga logo abaixo, e a descrição o dá em [Canhão de Prótons].',
        'As Botas de Cowboy não davam nada das quatro habilidades que a descrição promete — [Rajada de Flechas], [Arremessar Kunai], [Estilingue] e [Flecha Melódica], 15% mais 2% por refino, o que no +10 são 35% em cada uma — nem os conjuntos com o Arco Vigilante e o Monokage.',
        'Os Fones Danificados e os Fones Amplificadores voltaram a aceitar Bônus Aleatórios, que os dois recebem do Amplificador de Fone. Faltavam também o Comunicador Avançado e o Super Óculos Poring, este último com um bônus só. Reportado por Lobbo.',
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
        'O seletor de grau voltou a aparecer em todas as armas de nível 5 e equipamentos de nível 2 — entre eles as armas Decadentes, Fortificadas, Descartadas e -OSAD, que não ofereciam grau nenhum. O grau agora sai do nível do equipamento, e não mais de uma marcação preenchida à mão que ficava para trás a cada atualização do banco. Reportado por williamcms.',
        'Corrigido o nível de 74 equipamentos que estava em branco ou errado no cadastro. É o nível da arma que define o bônus de ATQ e ATQM por refino, então peças como a Claymore Gloriosa, a Espada Cromada, as Ginnungagap e as armas de aluguel TE não ganhavam nada ao refinar, e o Arco Vigilante rendia o bônus de nível 3 no lugar do de nível 4. Equipamentos de nível 2 também voltaram a receber a DEF extra e os +2 de RES e RESM por refino. A tabela de refino e os multiplicadores de grau (+10% no D, +30% no C, +50% no B e +100% no A) foram conferidos nível a nível e batem com o jogo.',
        'Os Capacetes Fortificado, Decadente e Descartado passaram a aceitar encantamentos nos slots 2, 3 e 4. Os oito encantamentos do Passe de Batalha também foram corrigidos: o cadastro trazia os efeitos da versão coreana, e não os do LATAM. Os encantamentos Decadente, Fortificado e de Sucata têm a descrição cortada no jogo — só aparecem os primeiros conjuntos de armas —, então a lista completa dos oito conjuntos de cada um veio da bROWiki. Reportado por williamcms.',
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
