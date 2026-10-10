import { needsCompactOverlay } from './input-capabilities';

/** Owned locks preserve scrolling inside overlays while suppressing the page. */
export class ScrollLocks {
  private readonly anonymousOwner = { isConnected: true } as Element;
  private readonly holders: Element[] = [];
  private listening = false;
  private readonly attempt = (event: Event) => {
    for (let index = this.holders.length - 1; index >= 0; index--) if (!this.holders[index].isConnected) this.holders.splice(index, 1);
    if (!this.holders.length) { this.unlisten(); return; }
    const top = this.holders[this.holders.length - 1];
    if (needsCompactOverlay() && top !== this.anonymousOwner && !top.contains(event.target as Node)) { event.preventDefault(); return; }
    for (let element = event.target as Element | null; element && element !== document.scrollingElement; element = element.parentElement) {
      if (element.scrollHeight > element.clientHeight && ['auto', 'scroll', 'overlay'].includes(getComputedStyle(element).overflowY)) return;
    }
    event.preventDefault();
  };
  lock(owner: Element = this.anonymousOwner): void {
    this.holders.push(owner);
    if (this.listening) return;
    this.listening = true;
    document.addEventListener('wheel', this.attempt, { capture: true, passive: false });
    document.addEventListener('touchmove', this.attempt, { capture: true, passive: false });
  }
  unlock(owner: Element = this.anonymousOwner): void {
    const index = this.holders.lastIndexOf(owner);
    if (index >= 0) this.holders.splice(index, 1);
    if (!this.holders.length) this.unlisten();
  }
  dispose(): void { this.holders.length = 0; this.unlisten(); }
  private unlisten(): void {
    if (!this.listening) return;
    this.listening = false;
    document.removeEventListener('wheel', this.attempt, true);
    document.removeEventListener('touchmove', this.attempt, true);
  }
}
