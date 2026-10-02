import { Store } from '../state/store';

/** A view action requests an anchor; React owns the resulting portal and its cleanup. */
export class PopoverHandle extends Store<HTMLElement | null> {
  container: HTMLElement | null = null;
  constructor() { super(null); }
  get overlayVisible(): boolean { return this.getSnapshot() != null; }
  get target(): HTMLElement | null { return this.getSnapshot(); }
  toggle(event: Event, target?: EventTarget | null): void { this.overlayVisible ? this.hide() : this.show(event, target); }
  show(event: Event, target?: EventTarget | null): void {
    const anchor = target ?? event.currentTarget ?? event.target;
    if (anchor instanceof HTMLElement) this.set(anchor);
  }
  hide(_event?: Event): void { this.set(null); }
  align(_reveal?: boolean): void { window.dispatchEvent(new Event('resize')); }
}
