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
 * Holds the page still while allowing an overlay's own scrollers to move.
 * Locks belong to panel elements, so nested overlays release independently and
 * detached owners cannot strand the page. Wheel/touch suppression avoids moving
 * the document or changing the coordinates used by anchored descriptions.
 * Keyboard events remain available to the focused control's navigation.
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
   * which is also what a release with no lock behind it does: nothing.
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
