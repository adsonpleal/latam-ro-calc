import { Component } from '@angular/core';
import { environment } from 'src/environments/environment';
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
      prompt: 'Quanto de dano essa build faz em Implosão Tóxica contra o boneco neutro?',
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
