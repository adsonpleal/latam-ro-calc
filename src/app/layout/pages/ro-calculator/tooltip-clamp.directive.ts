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

    this.guardSpuriousHide(tooltip);
  }

  /**
   * PrimeNG's Tooltip hides unconditionally on any `window` resize
   * (onWindowResize -> hide()) and on any `scroll` of an ancestor of the
   * hover target (its ConnectedOverlayScrollHandler -> hide()) — including
   * the scrollable list the hovered option itself lives in (e.g. a long
   * item picker). Hovering an option near the bottom edge of such a list
   * can, on its own, nudge that list's scrollTop a moment after the tooltip
   * appears (the browser/PrimeNG bringing the hovered/focused row into
   * view), which immediately fires that scroll handler and closes the
   * tooltip before it's readable — it "blinks" and vanishes. Scrolling the
   * list so the option sits further from the edge removes that self-nudge,
   * which is why the tooltip then shows fine — confirming the hide is
   * spurious, not a genuine "user scrolled away".
   *
   * Suppress hide() calls that land within a short grace window right after
   * show(), unless the user actually moved the mouse off the target
   * (mouseleave -> deactivate() -> hide(), which is always let through).
   *
   * This guard applies globally to every [pTooltip] in the app by design, not just
   * the scrollable-picker-list case that motivated it — PrimeNG exposes no public
   * API to scope or disable the scroll-hide behavior per-instance (verified: there
   * is no `hideOnScroll`/equivalent input on PrimeNG's Tooltip; `autoHide` only
   * controls whether hovering over the tooltip's own content keeps it open, which
   * is a different, unrelated behavior). Since PrimeNG gives no per-instance hook,
   * the only place to intercept the spurious hide is here, on every tooltip.
   *
   * The 250ms `graceMs` value is a deliberately short "long enough to absorb a
   * self-inflicted scroll-into-view nudge, short enough that a genuine scroll-away
   * still hides promptly" tradeoff. It is not a measured/derived constant — it
   * hasn't been tuned against real scroll-nudge timings, it's a reasonable guess.
   */
  private guardSpuriousHide(tooltip: Tooltip) {
    const graceMs = 250;
    let shownAt = 0;
    let userLeaving = false;

    const show = tooltip.show.bind(tooltip);
    tooltip.show = () => {
      shownAt = Date.now();
      show();
    };

    const deactivate = tooltip.deactivate.bind(tooltip);
    tooltip.deactivate = () => {
      userLeaving = true;
      deactivate();
      userLeaving = false;
    };

    const hide = tooltip.hide.bind(tooltip);
    tooltip.hide = () => {
      if (!userLeaving && Date.now() - shownAt < graceMs) return;
      hide();
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
