import { Injectable, NgZone } from '@angular/core';

/**
 * Whether this element is a scroller with somewhere left to go — the same two questions the
 * browser asks when it picks what a wheel gesture acts on.
 */
function canScroll(el: Element): boolean {
  if (el.scrollHeight <= el.clientHeight) return false;
  const overflow = getComputedStyle(el).overflowY;

  return overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';
}

/**
 * Freezes the page behind an open panel.
 *
 * Reference-counted because the events that drive it nest: a picker opened from inside a
 * dialog must not thaw the page when it closes.
 *
 * **It suppresses the scroll rather than moving the page, and that is the whole point.**
 * This used to hold the CDK's block strategy, which pins `<html>` with `position: fixed`
 * and a compensating `top`. That does hold the page still — but it also translates the
 * document out from under everything that positions itself in *document* coordinates, and
 * `pageYOffset` reads 0 while it is on. PrimeNG's Tooltip is one of those: `DomHandler`
 * offsets are `getBoundingClientRect() + pageYOffset`, so every item-description popover in
 * every picker rendered exactly `scrollY` pixels too high — at the top of the window on a
 * page scrolled any real distance. Preventing the wheel changes no layout at all, so
 * nothing is left to compensate for and nothing has to be restored on close.
 *
 * What passes is decided structurally — "does this gesture belong to a scroller that isn't
 * the page?" — rather than by a list of overlay class names. A list has to be extended for
 * every new panel, and the failure when it isn't is silent: the panel simply stops
 * scrolling, with nothing thrown and nothing a test would catch. The structural question
 * needs no knowledge of PrimeNG, and it answers correctly for the two cases a class list
 * gets wrong in opposite directions — a backdrop, which is *inside* the overlay container
 * and must still be blocked, and a sidebar or dialog body nobody thought to list.
 *
 * Keys are deliberately not blocked. Scrolling by keyboard needs focus on the page behind,
 * which an open overlay does not leave it with, and a PrimeNG dropdown keeps focus on its
 * *trigger* while its panel is open — so blocking the arrows there would break the picker's
 * own keyboard navigation to stop a scroll that cannot happen.
 *
 * ## Every lock names the panel it is held for, so a missed release cannot strand the page
 *
 * A plain counter cannot survive its callers, and one of them is PrimeNG, which does not
 * pair its own events. `onBeforeShow` and `onBeforeHide` are emitted from a single place —
 * the overlay content's Angular animation `start` callback, on `:enter` and on `:leave`
 * (`primeng-overlay`, `onOverlayContentAnimationStart`). A panel that goes away without its
 * leave transition ever playing therefore never announces it, and the plainest way for that
 * to happen is for the panel's component to be destroyed while it is open — a picker inside
 * a dialog that is closed, a section behind an `*ngIf` that flips. `Overlay.ngOnDestroy`
 * calls its own `hide()`, which raises `onHide` and *not* `onBeforeHide`. One such close and
 * a bare counter never returns to zero: the page is frozen for the rest of the visit, with
 * nothing on screen to explain it and a reload the only way out. That is what
 * `GgGPCGQUNQGRWZthqfS2` reported.
 *
 * So a lock is held *for an element* — the panel's own root, which the caller already has —
 * and a holder whose element has left the document is dropped on the spot. The check runs
 * where the answer is needed, on the gesture itself, which is both the cheapest place (there
 * is nothing to poll and nothing to unsubscribe) and the only one that matters. It turns a
 * missed release from a dead page into a single swallowed wheel tick.
 */
@Injectable({ providedIn: 'root' })
export class PageScrollLockService {
  /** One entry per lock held, newest last. `null` is a lock whose owner was not named. */
  private readonly holders: (Element | null)[] = [];
  private unlisten?: () => void;

  constructor(private readonly zone: NgZone) {}

  /**
   * @param owner the panel's root element. Naming it is what lets the lock be reclaimed if
   *   the panel is torn down without a matching `unlock` — pass it whenever there is one.
   */
  lock(owner?: Element | null): void {
    this.holders.push(owner ?? null);
    if (this.holders.length === 1) this.listen();
  }

  /**
   * Releases the lock taken for `owner`, or the newest unnamed one when it is not held —
   * which is also what a release with no lock behind it does: nothing. PrimeNG raises those
   * from animations.
   */
  unlock(owner?: Element | null): void {
    const held = owner ? this.holders.lastIndexOf(owner) : -1;
    this.release(held >= 0 ? held : this.holders.lastIndexOf(null));
  }

  private release(at: number): void {
    if (at < 0) return;
    this.holders.splice(at, 1);
    if (this.holders.length === 0) {
      this.unlisten?.();
      this.unlisten = undefined;
    }
  }

  /** Locks held for a panel that is no longer in the document — see the class comment. */
  private dropStaleHolders(): void {
    for (let i = this.holders.length - 1; i >= 0; i -= 1) {
      const owner = this.holders[i];
      if (owner && !owner.isConnected) this.release(i);
    }
  }

  private listen(): void {
    this.zone.runOutsideAngular(() => {
      const onScrollAttempt = (event: Event) => {
        this.dropStaleHolders();
        if (this.holders.length === 0) return;
        if (this.belongsToAnOverlayScroller(event.target as Element | null)) return;
        event.preventDefault();
      };

      // Capture, so a page-level handler cannot act on the gesture first; non-passive,
      // because a passive listener is not allowed to preventDefault a wheel.
      const options = { capture: true, passive: false };
      document.addEventListener('wheel', onScrollAttempt, options);
      document.addEventListener('touchmove', onScrollAttempt, options);
      this.unlisten = () => {
        document.removeEventListener('wheel', onScrollAttempt, options);
        document.removeEventListener('touchmove', onScrollAttempt, options);
      };
    });
  }

  /**
   * Walks up from where the gesture landed to the first thing that could consume it. True
   * when that is a scroller of its own — a picker's list, a dialog's body, the description
   * popover; false when the walk reaches the page, which is what a gesture aimed at a
   * backdrop, at a panel's header, or at the page itself does.
   */
  private belongsToAnOverlayScroller(target: Element | null): boolean {
    const page = document.scrollingElement;
    for (let el = target; el && el !== page; el = el.parentElement) {
      if (canScroll(el)) return true;
    }

    return false;
  }
}
