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
