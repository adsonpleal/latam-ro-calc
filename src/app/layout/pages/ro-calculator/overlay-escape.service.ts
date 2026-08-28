import { Injectable, NgZone, OnDestroy } from '@angular/core';

/**
 * Everything on a page of this app that legitimately acts on Escape: a showing tooltip
 * (the item-description popover closes on it), a dialog or confirm dialog, an overlay
 * panel, a sidebar, a context menu, and any CDK overlay — the equipment chip picker's own
 * panel among them.
 *
 * When none of these is in the DOM the keypress has nowhere to go, and letting it through
 * is not free: PrimeNG's Tooltip binds `document:keydown.escape` as a host listener, per
 * instance, for the directive's whole life rather than while it is showing. This page
 * carries ~300 of them, and Angular re-enters the zone for each one it fires — a full
 * change-detection pass apiece. Measured on the untouched build: **an Escape that does
 * nothing costs 480-750ms**, against 3-5ms for any other key. Switching the tooltips'
 * `hideOnEscape` off does not help, because the cost is the zone round trip and not the
 * handler body; the only cure is for the event not to reach them.
 */
const ESCAPE_CONSUMERS = '.p-tooltip, .p-dialog, .p-confirm-dialog, .p-overlaypanel, .p-sidebar, .p-contextmenu, .cdk-overlay-pane';

/** An overlay that knows whether it is showing and how to put itself away. */
export interface DismissibleOverlay {
  isOpen(): boolean;
  /** The keypress is handed on so a component that wants it (p-dialog's `close`) can
   *  preventDefault the real event rather than a synthetic stand-in. */
  dismiss(event: KeyboardEvent): void;
  /** The overlay's own element. Only stacked overlays need it — see `topmost`. */
  element?(): HTMLElement | null | undefined;
}

/**
 * The overlay Esc should close: the one on top.
 *
 * PrimeNG's autoZIndex stamps each overlay with a higher z-index than the last as it
 * opens, so the largest is the most recent — which is what "on top" means both visually
 * and to the reader. Closing every open overlay instead would tear down the graph a
 * breakdown dialog was opened *from*, costing a re-open on every node click.
 */
function topmost(overlays: DismissibleOverlay[]): DismissibleOverlay {
  // Measured once each: getComputedStyle forces a style read, and re-measuring the
  // incumbent on every step of the fold would do it twice per overlay.
  const depth = (overlay: DismissibleOverlay): number => {
    const el = overlay.element?.();

    return el ? Number.parseInt(getComputedStyle(el).zIndex, 10) || 0 : 0;
  };

  return overlays
    .map((overlay): [DismissibleOverlay, number] => [overlay, depth(overlay)])
    .reduce((top, entry) => (entry[1] >= top[1] ? entry : top))[0];
}

/**
 * Routes Esc to the fast close on whichever PrimeNG picker is open.
 *
 * PrimeNG has two closes and they are not equivalent. `Overlay.hide()` — what a click
 * outside runs — takes about 30ms. `Dropdown.onKeydown` case 27, which is what a real Esc
 * hits because the component binds it on the focused element, calls the picker's own
 * `hide()` and takes **over a second**: measured repeatedly at 600-1140ms, with the whole
 * gap sitting between the leave animation starting and its done callback arriving, no long
 * task and no frames in between. Nothing is computing; it is simply waiting.
 *
 * So this listens in the capture phase, ahead of the component's own handler, stops the
 * event, and calls the fast one instead.
 *
 * Capture also gives the right layering: Esc closes the topmost thing, so a picker open
 * inside a dialog does not take the dialog down with it. When no picker is open the event
 * is left completely alone and `closeOnEscape` still works.
 */
@Injectable({ providedIn: 'root' })
export class OverlayEscapeService implements OnDestroy {
  private readonly overlays = new Set<DismissibleOverlay>();
  private unlisten?: () => void;

  constructor(private readonly zone: NgZone) {}

  /** Returns the deregistration callback — call it from the caller's ngOnDestroy. */
  register(overlay: DismissibleOverlay): () => void {
    this.overlays.add(overlay);
    this.listen();

    return () => this.overlays.delete(overlay);
  }

  ngOnDestroy(): void {
    this.unlisten?.();
    this.unlisten = undefined;
  }

  /**
   * One listener for every picker on the page rather than one each: a page carries a few
   * dozen, and a listener apiece would mean a few dozen change-detection runs per
   * keystroke. Registered outside Angular for the same reason, and re-entered only when
   * something is actually closed.
   */
  private listen(): void {
    if (this.unlisten) return;

    this.zone.runOutsideAngular(() => {
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;

        const open = [...this.overlays].filter((overlay) => overlay.isOpen());
        if (open.length) {
          event.stopPropagation();
          const target = topmost(open);
          this.zone.run(() => target.dismiss(event));
          return;
        }

        // Nothing on screen can act on this keypress, so stop it here rather than let it
        // reach the bubble phase — see ESCAPE_CONSUMERS.
        if (!document.querySelector(ESCAPE_CONSUMERS)) event.stopPropagation();
      };

      document.addEventListener('keydown', onKeyDown, true);
      this.unlisten = () => document.removeEventListener('keydown', onKeyDown, true);
    });
  }
}
