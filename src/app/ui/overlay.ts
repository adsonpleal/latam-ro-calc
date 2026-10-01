import { ApplicationRef, ComponentRef, EnvironmentInjector, Injectable, Injector, TemplateRef, Type, ViewContainerRef, createComponent } from '@angular/core';
import { Subject } from 'rxjs';

export interface ConnectedPosition {
  originX: 'start' | 'center' | 'end'; originY: 'top' | 'center' | 'bottom';
  overlayX: 'start' | 'center' | 'end'; overlayY: 'top' | 'center' | 'bottom';
  offsetX?: number; offsetY?: number;
}
export interface OverlayConfig {
  positionStrategy?: ConnectedPositionStrategy | GlobalPositionStrategy;
  hasBackdrop?: boolean; backdropClass?: string; panelClass?: string | string[];
  width?: string | number; minWidth?: string | number;
}
export class TemplatePortal {
  constructor(readonly template: TemplateRef<any>, readonly view: ViewContainerRef) {}
}
export class ComponentPortal<T> {
  constructor(readonly component: Type<T>, readonly injector?: Injector) {}
}

/** The four connection fallbacks used by our pickers; no general layout engine. */
export class ConnectedPositionStrategy {
  readonly positionChanges = new Subject<{ connectionPair: ConnectedPosition }>();
  private positions: ConnectedPosition[] = [];
  private margin = 8;
  constructor(private readonly anchor: HTMLElement) {}
  withPositions(positions: ConnectedPosition[]): this { this.positions = positions; return this; }
  withViewportMargin(margin: number): this { this.margin = margin; return this; }
  apply(element: HTMLElement): void {
    const rect = this.anchor.getBoundingClientRect();
    const panel = element.getBoundingClientRect();
    const viewport = this.anchor.ownerDocument.defaultView!;
    const x = (side: string, start: number, length: number) => start + (side === 'center' ? length / 2 : side === 'end' ? length : 0);
    const y = (side: string, start: number, length: number) => start + (side === 'center' ? length / 2 : side === 'bottom' ? length : 0);
    const candidates = this.positions.map(connectionPair => ({
      connectionPair,
      left: x(connectionPair.originX, rect.left, rect.width) - x(connectionPair.overlayX, 0, panel.width) + (connectionPair.offsetX ?? 0),
      top: y(connectionPair.originY, rect.top, rect.height) - y(connectionPair.overlayY, 0, panel.height) + (connectionPair.offsetY ?? 0),
    }));
    const visibleArea = (p: { left: number; top: number }) =>
      Math.max(0, Math.min(p.left + panel.width, viewport.innerWidth - this.margin) - Math.max(p.left, this.margin)) *
      Math.max(0, Math.min(p.top + panel.height, viewport.innerHeight - this.margin) - Math.max(p.top, this.margin));
    const chosen = candidates.find(p => p.left >= this.margin && p.top >= this.margin && p.left + panel.width <= viewport.innerWidth - this.margin && p.top + panel.height <= viewport.innerHeight - this.margin)
      ?? candidates.reduce((best, next) => !best || visibleArea(next) > visibleArea(best) ? next : best, undefined as typeof candidates[number] | undefined);
    if (!chosen) return;
    element.style.left = `${Math.max(this.margin, Math.min(chosen.left, viewport.innerWidth - this.margin - panel.width))}px`;
    element.style.top = `${Math.max(this.margin, Math.min(chosen.top, viewport.innerHeight - this.margin - panel.height))}px`;
    this.positionChanges.next({ connectionPair: chosen.connectionPair });
  }
  dispose(): void { this.positionChanges.complete(); }
}
export class GlobalPositionStrategy {
  private topValue?: string;
  centerHorizontally(): this { return this; }
  centerVertically(): this { this.topValue = undefined; return this; }
  top(value: string): this { this.topValue = value; return this; }
  apply(element: HTMLElement): void {
    // Flex centering preserves text rasterization; transforms create a composited
    // layer and change the appearance of fractional-pixel dialog text.
    const host = element.parentElement!;
    host.style.display = 'flex';
    host.style.justifyContent = 'center';
    host.style.alignItems = this.topValue ? 'flex-start' : 'center';
    element.style.position = 'relative';
    element.style.left = '';
    element.style.top = '';
    element.style.marginTop = this.topValue ?? '';
    element.style.transform = '';
  }
  dispose(): void {}
}

/** Owns DOM, Angular view, event listeners and observers for a single layer. */
export class OverlayRef {
  readonly hostElement: HTMLElement;
  readonly overlayElement: HTMLElement;
  readonly backdropElement: HTMLElement | null;
  private readonly detached = new Subject<void>();
  private readonly backdrop = new Subject<MouseEvent>();
  private readonly outside = new Subject<MouseEvent>();
  private cleanupView?: () => void;
  private attached = false;
  private disposed = false;
  private observer?: ResizeObserver;
  private frame = 0;
  private readonly click = (event: MouseEvent) => { if (this.attached && !this.hostElement.contains(event.target as Node)) this.outside.next(event); };
  private readonly backdropListener = (event: MouseEvent) => this.backdrop.next(event);
  private readonly position = () => this.updatePosition();

  constructor(private readonly config: OverlayConfig, private readonly app: ApplicationRef, private readonly environment: EnvironmentInjector, private readonly injector: Injector) {
    this.hostElement = document.createElement('div');
    this.hostElement.className = 'ui-overlay-host';
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'ui-overlay-pane';
    this.overlayElement.classList.add(...(Array.isArray(config.panelClass) ? config.panelClass : (config.panelClass ?? '').split(' ')).filter(Boolean));
    this.hostElement.append(this.overlayElement);
    this.backdropElement = config.hasBackdrop ? document.createElement('div') : null;
    if (this.backdropElement) {
      this.backdropElement.className = `ui-overlay-backdrop ${config.backdropClass ?? ''}`;
      this.hostElement.prepend(this.backdropElement);
      this.backdropElement.addEventListener('click', this.backdropListener);
    }
    document.body.append(this.hostElement);
    this.updateSize(config);
    document.addEventListener('click', this.click);
    window.addEventListener('resize', this.position);
    document.addEventListener('scroll', this.position, true);
  }
  attach<T>(portal: ComponentPortal<T>): ComponentRef<T>;
  attach(portal: TemplatePortal): void;
  attach<T>(portal: ComponentPortal<T> | TemplatePortal): ComponentRef<T> | void {
    if (this.attached || this.disposed) throw new Error('Overlay already attached or disposed');
    this.attached = true;
    let detect: () => void;
    let result: ComponentRef<T> | undefined;
    if (portal instanceof TemplatePortal) {
      const view = portal.view.createEmbeddedView(portal.template);
      view.rootNodes.forEach(node => this.overlayElement.append(node));
      detect = () => view.detectChanges();
      this.cleanupView = () => view.destroy();
    } else {
      result = createComponent(portal.component, { environmentInjector: this.environment, elementInjector: portal.injector ?? this.injector });
      this.overlayElement.append(result.location.nativeElement);
      this.app.attachView(result.hostView);
      const component = result;
      detect = () => component.changeDetectorRef.detectChanges();
      this.cleanupView = () => { this.app.detachView(component.hostView); component.destroy(); };
    }
    // Services initialize component inputs synchronously after attach.
    queueMicrotask(() => {
      if (this.disposed) return;
      detect();
      this.updatePosition();
      this.observer = new ResizeObserver(this.position);
      this.observer.observe(this.overlayElement);
      this.frame = requestAnimationFrame(this.position);
    });
    return result;
  }
  hasAttached(): boolean { return this.attached; }
  detachments() { return this.detached.asObservable(); }
  backdropClick() { return this.backdrop.asObservable(); }
  outsidePointerEvents() { return this.outside.asObservable(); }
  updateSize(size: Pick<OverlayConfig, 'width' | 'minWidth'>): void {
    for (const key of ['width', 'minWidth'] as const) if (size[key] != null) this.overlayElement.style[key] = typeof size[key] === 'number' ? `${size[key]}px` : size[key] as string;
  }
  updatePositionStrategy(strategy: OverlayConfig['positionStrategy']): void {
    this.config.positionStrategy?.dispose();
    this.overlayElement.style.transform = '';
    this.config.positionStrategy = strategy;
  }
  updatePosition(): void { if (!this.disposed) this.config.positionStrategy?.apply(this.overlayElement); }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.attached = false;
    this.observer?.disconnect(); cancelAnimationFrame(this.frame);
    document.removeEventListener('click', this.click);
    window.removeEventListener('resize', this.position);
    document.removeEventListener('scroll', this.position, true);
    this.backdropElement?.removeEventListener('click', this.backdropListener);
    this.cleanupView?.(); this.hostElement.remove();
    this.config.positionStrategy?.dispose();
    this.detached.next(); this.detached.complete(); this.backdrop.complete(); this.outside.complete();
  }
}
@Injectable({ providedIn: 'root' })
export class Overlay {
  constructor(private readonly app: ApplicationRef, private readonly environment: EnvironmentInjector, private readonly injector: Injector) {}
  create(config: OverlayConfig): OverlayRef { return new OverlayRef(config, this.app, this.environment, this.injector); }
  position() {
    return { flexibleConnectedTo: (anchor: HTMLElement) => new ConnectedPositionStrategy(anchor), global: () => new GlobalPositionStrategy() };
  }
}
