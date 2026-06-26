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
  readonly discordUrl = 'https://discord.gg/S4uEwGqK';
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
