import { Directive } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

/**
 * Keeps every pTooltip popover inside the window. PrimeNG's Tooltip tries
 * right → left → top → bottom and, when none fits (e.g. the wide item-description
 * popover on an equipment slot near a window edge), leaves the last attempt
 * partially off-screen — it never clamps. This companion directive (same
 * selector, so it rides along on every pTooltip) shifts the container back
 * into the viewport after each PrimeNG alignment pass.
 */
@Directive({ selector: '[pTooltip]' })
export class TooltipClampDirective {
  constructor(tooltip: Tooltip) {
    const align = tooltip.align.bind(tooltip);
    tooltip.align = () => {
      align();
      this.clampIntoViewport(tooltip.container as HTMLElement);
    };
  }

  private clampIntoViewport(container: HTMLElement | null | undefined) {
    if (!container) return;
    const pad = 4;
    const rect = container.getBoundingClientRect();

    // Never wider/taller shifts than needed; when the tooltip is bigger than the
    // viewport the max() pins its start edge, letting the overflow spill right/down.
    let dx = 0;
    if (rect.right > window.innerWidth - pad) dx = window.innerWidth - pad - rect.right;
    dx = Math.max(dx, pad - rect.left);

    let dy = 0;
    if (rect.bottom > window.innerHeight - pad) dy = window.innerHeight - pad - rect.bottom;
    dy = Math.max(dy, pad - rect.top);

    if (dx) container.style.left = `${(parseFloat(container.style.left) || 0) + dx}px`;
    if (dy) container.style.top = `${(parseFloat(container.style.top) || 0) + dy}px`;
  }
}
