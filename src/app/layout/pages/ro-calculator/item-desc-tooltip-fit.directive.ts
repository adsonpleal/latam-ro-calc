import { Directive, OnDestroy, OnInit } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/** Minimum gap between the popover and the window edge. */
const MARGEM = 8;

/**
 * Fits the description popover into the window when PrimeNG gives up.
 *
 * The Tooltip's `align()` tries the four positions in order and, on each, checks
 * `isOutOfBounds()` — which rejects the popover if it crosses *any* edge. The problem is
 * the last attempt: it is applied with no check at all. For `tooltipPosition="right"` the
 * order is right, left, top and finally bottom, so a trigger near the footer (the Turbinas
 * Ilusión, for instance) ends up with the popover pinned below it, entirely off screen —
 * gone without a trace. A trigger in the left column with a wide popover falls into the
 * same hole, because left and top both end up with a negative `left`.
 *
 * This does not change the chosen position: it only nudges whatever ended up outside back
 * inside, after PrimeNG has finished.
 */
// No "app" prefix, deliberately: by matching the attribute the item tooltips already
// carry, the fix applies to all of them — including any created later — without having to
// remember to tag each element. A dedicated selector would mean repeating the attribute
// across ~20 occurrences and would silently miss the next ones.
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

    // Degenerate viewport (hidden tab, zero-sized iframe): with no reliable reference,
    // any arithmetic here would throw the popover into the corner. Better to leave it
    // where PrimeNG put it.
    if (larguraJanela < 1 || alturaJanela < 1) return;

    // Fix the right/bottom overflow first and the opposite side after, so that a popover
    // larger than the window rests against the top/left edge instead of disappearing —
    // the top is the part worth reading.
    let dx = 0;
    let dy = 0;
    if (rect.right > larguraJanela - MARGEM) dx = larguraJanela - MARGEM - rect.right;
    if (rect.left + dx < MARGEM) dx = MARGEM - rect.left;
    if (rect.bottom > alturaJanela - MARGEM) dy = alturaJanela - MARGEM - rect.bottom;
    if (rect.top + dy < MARGEM) dy = MARGEM - rect.top;

    if (!dx && !dy) return;

    // The delta comes from viewport coordinates and is added to the inline style, so it
    // works with both absolute and fixed positioning.
    container.style.left = `${parseFloat(container.style.left || '0') + dx}px`;
    container.style.top = `${parseFloat(container.style.top || '0') + dy}px`;

    // The arrow points where PrimeNG thought the popover would land; after the nudge it
    // lies. The next show's preAlign rewrites the className and clears this marker by
    // itself.
    container.classList.add('item_desc_tooltip--encaixado');
  }
}
