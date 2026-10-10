import { ScrollLocks } from './scroll-locks';
import { needsCompactOverlay } from './input-capabilities';

export interface ConnectedPosition {
  originX: 'start' | 'center' | 'end'; originY: 'top' | 'center' | 'bottom';
  overlayX: 'start' | 'center' | 'end'; overlayY: 'top' | 'center' | 'bottom';
  offsetX?: number; offsetY?: number;
}
export const PICKER_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
];

/** The existing four-position algorithm, independent of the rendering framework. */
export function positionConnected(panel: HTMLElement, anchor: HTMLElement, positions = PICKER_POSITIONS, margin = 8): ConnectedPosition | undefined {
  const rect = anchor.getBoundingClientRect();
  const size = panel.getBoundingClientRect();
  const viewport = anchor.ownerDocument.defaultView!;
  const adaptive = needsCompactOverlay();
  const visible = adaptive ? viewport.visualViewport : null;
  const leftEdge = (visible?.offsetLeft ?? 0) + margin;
  const topEdge = (visible?.offsetTop ?? 0) + margin;
  const rightEdge = (visible?.offsetLeft ?? 0) + (visible?.width ?? viewport.innerWidth) - margin;
  const bottomEdge = (visible?.offsetTop ?? 0) + (visible?.height ?? viewport.innerHeight) - margin;
  const coordinate = (side: string, start: number, length: number) => start + (side === 'center' ? length / 2 : side === 'end' || side === 'bottom' ? length : 0);
  const candidates = positions.map(connection => ({
    connection,
    left: coordinate(connection.originX, rect.left, rect.width) - coordinate(connection.overlayX, 0, size.width) + (connection.offsetX ?? 0),
    top: coordinate(connection.originY, rect.top, rect.height) - coordinate(connection.overlayY, 0, size.height) + (connection.offsetY ?? 0),
  }));
  const area = (candidate: typeof candidates[number]) =>
    Math.max(0, Math.min(candidate.left + size.width, rightEdge) - Math.max(candidate.left, leftEdge)) *
    Math.max(0, Math.min(candidate.top + size.height, bottomEdge) - Math.max(candidate.top, topEdge));
  const chosen = candidates.find(candidate => candidate.left >= leftEdge && candidate.top >= topEdge && candidate.left + size.width <= rightEdge && candidate.top + size.height <= bottomEdge)
    ?? candidates.reduce<typeof candidates[number] | undefined>((best, next) => !best || area(next) > area(best) ? next : best, undefined);
  if (!chosen) return undefined;
  const host = adaptive ? panel.parentElement?.getBoundingClientRect() : null;
  panel.style.left = `${Math.max(leftEdge, Math.min(chosen.left, rightEdge - size.width)) - (host?.left ?? 0)}px`;
  panel.style.top = `${Math.max(topEdge, Math.min(chosen.top, bottomEdge - size.height)) - (host?.top ?? 0)}px`;
  return chosen.connection;
}

interface Layer { panel: HTMLElement; origin: HTMLElement | null; dismiss: () => void; escape: () => void; lock: boolean; }

/** Per-application owner of Escape ordering, child dismissal, and page scroll locks. */
export class LayerManager {
  readonly scrollLocks = new ScrollLocks();
  private depth = 1100;
  private layers: Layer[] = [];
  private readonly parents = new WeakMap<HTMLElement, HTMLElement>();
  private readonly key = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const top = [...this.layers].reverse().find(layer => layer.panel.isConnected);
    if (!top) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    top.escape();
  };
  register(panel: HTMLElement, origin: HTMLElement | null, dismiss: () => void, lock = true, escape = dismiss): () => void {
    const parent = [...this.layers].reverse().find(layer => origin && layer.panel.contains(origin));
    if (parent) this.parents.set(panel, parent.panel);
    if (!this.layers.length) {
      document.addEventListener('keydown', this.key, true);
    }
    panel.parentElement!.style.zIndex = String(++this.depth);
    for (let element = origin; element; element = element.parentElement) {
      const tag = element.tagName.toLowerCase();
      if (tag.startsWith('app-') && !tag.startsWith('app-ui-')) panel.parentElement!.classList.add(`ui-scope-${tag}`);
      for (const name of Array.from(element.classList)) if (name.startsWith('ui-scope-app-')) panel.parentElement!.classList.add(name);
    }
    const layer: Layer = { panel, origin, dismiss, escape, lock };
    if (lock) this.scrollLocks.lock(panel);
    this.layers.push(layer);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const child of [...this.layers].reverse()) if (child !== layer && child.origin && panel.contains(child.origin)) child.dismiss();
      this.layers = this.layers.filter(entry => entry !== layer);
      if (lock) this.scrollLocks.unlock(panel);
      if (!this.layers.length) this.removeListeners();
    };
  }
  isOutside(panel: HTMLElement, target: Node | null, path: readonly EventTarget[] = []): boolean {
    // A React click can replace its row before the document listener runs. The
    // event path retains the original panel even after that target is detached.
    if (!target || path.includes(panel) || panel.contains(target)) return false;
    if (needsCompactOverlay()) for (const element of path) {
      for (let owner = this.parents.get(element as HTMLElement); owner; owner = this.parents.get(owner)) if (owner === panel) return false;
    }
    const at = this.layers.findIndex(layer => layer.panel === panel);
    return !this.layers.slice(at + 1).some(layer => path.includes(layer.panel) || layer.panel.contains(target));
  }
  dispose(): void {
    for (const layer of [...this.layers].reverse()) layer.dismiss();
    this.layers = [];
    this.scrollLocks.dispose();
    this.removeListeners();
  }
  private removeListeners(): void {
    document.removeEventListener('keydown', this.key, true);
  }
}

const focusSelector = 'button,input,select,textarea,a[href],[tabindex],[contenteditable="true"]';
export function trapFocus(panel: HTMLElement): () => void {
  const previous = document.activeElement as HTMLElement | null;
  const focusables = () => Array.from(panel.querySelectorAll<HTMLElement>(focusSelector))
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled,[inert]') && !element.closest('[inert]') && element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
  let alive = true;
  queueMicrotask(() => {
    if (alive) (panel.querySelector<HTMLElement>('[data-focus-initial]') ?? focusables()[0] ?? panel).focus({ preventScroll: true });
  });
  const key = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const elements = focusables();
    const at = elements.indexOf(document.activeElement as HTMLElement);
    if (!elements.length) { event.preventDefault(); panel.focus(); }
    else if (event.shiftKey && at <= 0) { event.preventDefault(); elements[elements.length - 1].focus(); }
    else if (!event.shiftKey && (at < 0 || at === elements.length - 1)) { event.preventDefault(); elements[0].focus(); }
  };
  panel.addEventListener('keydown', key);
  return () => {
    alive = false;
    panel.removeEventListener('keydown', key);
    if (previous?.isConnected) previous.focus({ preventScroll: true });
  };
}
