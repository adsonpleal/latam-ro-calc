import { Injectable, TemplateRef, ViewContainerRef } from '@angular/core';
import { ConnectedPosition, Overlay, OverlayConfig, OverlayRef } from 'src/app/ui/overlay';
import { TemplatePortal } from 'src/app/ui/overlay';
import { PageScrollLockService } from '../page-scroll-lock.service';
import { OverlayEscapeService } from './overlay-escape.service';

export const PICKER_POSITIONS: ConnectedPosition[] = [
  { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
  { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
  { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
  { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
];

interface Layer { ref: OverlayRef; origin: HTMLElement | null; dismiss: () => void; release: () => void; }

/** One ordering and lifecycle for dialogs, pickers, popovers and descriptions. */
@Injectable({ providedIn: 'root' })
export class UiOverlayService {
  private depth = 1100;
  private layers: Layer[] = [];
  constructor(public readonly overlay: Overlay, private readonly scroll: PageScrollLockService, private readonly escapes: OverlayEscapeService) {}

  connected(anchor: HTMLElement, positions = PICKER_POSITIONS) {
    return this.overlay.position().flexibleConnectedTo(anchor).withPositions(positions).withViewportMargin(8);
  }

  open(template: TemplateRef<any>, view: ViewContainerRef, config: OverlayConfig, dismiss: () => void, lock = true, origin: HTMLElement | null = null, escape = dismiss): OverlayRef {
    const ref = this.overlay.create(config);
    this.inheritScopes(ref, view.element.nativeElement);
    ref.attach(new TemplatePortal(template, view));
    this.adopt(ref, dismiss, lock, origin, escape);
    return ref;
  }

  /** Also used by the existing equipment picker, which owns its component portal. */
  adopt(ref: OverlayRef, dismiss: () => void, lock = true, origin: HTMLElement | null = null, escape = dismiss): void {
    this.inheritScopes(ref, origin);
    const depth = ++this.depth;
    ref.hostElement.style.zIndex = String(depth);
    ref.overlayElement.style.zIndex = String(depth);
    if (ref.backdropElement) ref.backdropElement.style.zIndex = String(depth);
    if (lock) this.scroll.lock(ref.overlayElement);
    const unregister = this.escapes.register({ isOpen: () => ref.hasAttached(), dismiss: escape });
    let released = false;
    const layer: Layer = { ref, origin, dismiss, release: () => {
      if (released) return;
      released = true;
      for (const child of [...this.layers].reverse()) {
        if (child !== layer && child.origin && ref.overlayElement.contains(child.origin)) child.dismiss();
      }
      unregister();
      if (lock) this.scroll.unlock(ref.overlayElement);
      this.layers = this.layers.filter(entry => entry !== layer);
    } };
    this.layers.push(layer);
    ref.detachments().subscribe(layer.release);
  }

  /** Portals leave their feature host. Carry explicit app scopes, never Angular's
   * private encapsulation attributes, so feature CSS can target its own overlays. */
  private inheritScopes(ref: OverlayRef, origin: HTMLElement | null): void {
    for (let element = origin; element; element = element.parentElement) {
      const tag = element.tagName?.toLowerCase();
      if (tag?.startsWith('app-') && !tag.startsWith('app-ui-')) ref.hostElement.classList.add(`ui-scope-${tag}`);
      for (const name of Array.from(element.classList ?? [])) {
        if (name.startsWith('ui-scope-app-')) ref.hostElement.classList.add(name);
      }
    }
  }

  close(ref?: OverlayRef | null): void {
    if (!ref) return;
    this.layers.find(layer => layer.ref === ref)?.release();
    ref.dispose();
  }

  /** A click in a dialog opened from a popover belongs to that child. */
  isOutside(ref: OverlayRef, event: Event): boolean {
    const target = event.target as Node | null;
    if (!target || ref.overlayElement.contains(target)) return false;
    const at = this.layers.findIndex(layer => layer.ref === ref);
    return !this.layers.slice(at + 1).some(layer => layer.ref.overlayElement.contains(target));
  }
}
