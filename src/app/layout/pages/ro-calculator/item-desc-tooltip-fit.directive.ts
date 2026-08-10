import { Directive, OnDestroy, OnInit } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/** Folga mínima entre o popover e a borda da janela. */
const MARGEM = 8;

/**
 * Encaixa o popover de descrição na janela quando o PrimeNG desiste.
 *
 * O `align()` do Tooltip tenta as quatro posições em ordem e, a cada uma, checa
 * `isOutOfBounds()` — que reprova se o popover ultrapassar *qualquer* borda. O
 * problema é a última tentativa: ela é aplicada sem checagem nenhuma. Para
 * `tooltipPosition="right"` a ordem é direita, esquerda, cima e por fim baixo,
 * então um gatilho perto do rodapé (as Turbinas Ilusión, por exemplo) acaba com o
 * popover colado abaixo dele, inteiro fora da tela — some sem deixar rastro. Um
 * gatilho na coluna da esquerda com popover largo cai no mesmo buraco, porque
 * esquerda e cima ficam com `left` negativo.
 *
 * Aqui não se troca a posição escolhida: só se desloca o que ficou para fora de
 * volta para dentro, depois que o PrimeNG terminou.
 */
// Sem prefixo "app" de propósito: casando com o atributo que os tooltips de item já
// têm, a correção vale para todos eles — inclusive os que forem criados depois — sem
// precisar lembrar de marcar cada elemento. Um seletor próprio exigiria repetir o
// atributo nas ~20 ocorrências e silenciosamente não pegaria as próximas.
// eslint-disable-next-line @angular-eslint/directive-selector
@Directive({ selector: '[pTooltip][tooltipStyleClass="item_desc_tooltip"]' })
export class ItemDescTooltipFitDirective implements OnInit, OnDestroy {
  private alignOriginal?: () => void;

  constructor(private readonly tooltip: Tooltip) {}

  ngOnInit(): void {
    this.alignOriginal = this.tooltip.align.bind(this.tooltip);
    this.tooltip.align = () => {
      this.alignOriginal?.();
      this.encaixarNaJanela();
    };
  }

  ngOnDestroy(): void {
    if (this.alignOriginal) this.tooltip.align = this.alignOriginal;
  }

  private encaixarNaJanela(): void {
    const container = this.tooltip.container as HTMLElement | undefined;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const { innerWidth: larguraJanela, innerHeight: alturaJanela } = window;

    // Viewport degenerada (aba oculta, iframe de tamanho zero): sem referência
    // confiável, qualquer conta aqui jogaria o popover para o canto. Melhor deixar
    // como o PrimeNG posicionou.
    if (larguraJanela < 1 || alturaJanela < 1) return;

    // Corrige primeiro o excesso à direita/embaixo e depois o lado oposto, para que
    // um popover maior que a janela encoste na borda superior/esquerda em vez de
    // sumir — o topo é o que interessa ler.
    let dx = 0;
    let dy = 0;
    if (rect.right > larguraJanela - MARGEM) dx = larguraJanela - MARGEM - rect.right;
    if (rect.left + dx < MARGEM) dx = MARGEM - rect.left;
    if (rect.bottom > alturaJanela - MARGEM) dy = alturaJanela - MARGEM - rect.bottom;
    if (rect.top + dy < MARGEM) dy = MARGEM - rect.top;

    if (!dx && !dy) return;

    // O delta vem de coordenadas de viewport e é somado ao inline style, então
    // funciona tanto com posicionamento absoluto quanto fixo.
    container.style.left = `${parseFloat(container.style.left || '0') + dx}px`;
    container.style.top = `${parseFloat(container.style.top || '0') + dy}px`;

    // A seta aponta para onde o PrimeNG achou que o popover ficaria; depois do
    // deslocamento ela mente. O preAlign da próxima exibição reescreve o className
    // e limpa esta marca sozinho.
    container.classList.add('item_desc_tooltip--encaixado');
  }
}
