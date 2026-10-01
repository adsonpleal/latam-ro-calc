import { Component, Input, OnDestroy, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { ConnectedPositionStrategy, OverlayRef } from 'src/app/ui/overlay';
import { Subscription } from 'rxjs';
import { UiOverlayService } from './overlay.service';

@Component({
  selector: 'app-ui-popover',
  template: `<ng-template #panel><div class="ui-overlaypanel ui-component" [ngClass]="styleClass" role="region" [attr.aria-label]="ariaLabel || null"><div class="ui-overlaypanel-content"><ng-content></ng-content></div></div></ng-template>`,
})
export class UiPopoverComponent implements OnDestroy {
  @Input() styleClass = '';
  @Input() ariaLabel = '';
  @ViewChild('panel', { static: true }) panel!: TemplateRef<any>;
  private ref?: OverlayRef;
  private positionSubscription?: Subscription;
  private stopScroll?: () => void;
  target?: HTMLElement;
  get overlayVisible(): boolean { return !!this.ref; }
  get container(): HTMLElement | null { return this.ref?.overlayElement.querySelector('.ui-overlaypanel') ?? null; }
  constructor(private readonly layers: UiOverlayService, private readonly view: ViewContainerRef) {}
  show(event: Event, target?: HTMLElement): void {
    this.hide();
    this.target = target ?? event.currentTarget as HTMLElement ?? event.target as HTMLElement;
    if (!this.target?.getBoundingClientRect) return;
    const strategy = this.layers.connected(this.target);
    this.watchPosition(strategy);
    this.ref = this.layers.open(this.panel, this.view, {
      positionStrategy: strategy, panelClass: 'ui-popover-pane',
    }, () => this.hide(true), false, this.target);
    this.ref.outsidePointerEvents().subscribe(e => {
      if (this.ref && !this.target?.contains(e.target as Node) && this.layers.isOutside(this.ref, e)) this.hide();
    });
    const document = this.target.ownerDocument;
    const scroll = (event: Event) => {
      if (this.ref && this.layers.isOutside(this.ref, event)) this.hide();
    };
    document.addEventListener('scroll', scroll, { capture: true });
    this.stopScroll = () => document.removeEventListener('scroll', scroll, { capture: true });
    this.align();
  }
  toggle(event: Event, target?: HTMLElement): void { this.ref ? this.hide() : this.show(event, target); }
  hide(restoreFocus = false): void {
    this.positionSubscription?.unsubscribe();
    this.positionSubscription = undefined;
    this.stopScroll?.();
    this.stopScroll = undefined;
    const ref = this.ref;
    this.ref = undefined;
    this.layers.close(ref);
    if (restoreFocus && this.target?.isConnected) this.target.focus({ preventScroll: true });
  }
  /** Re-measure content after switching a formula or expanding a detail. */
  align(centered = false): void {
    if (!this.ref || !this.target) return;
    if (centered) {
      const strategy = this.layers.connected(this.target, [
        { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
        { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
      ]);
      this.watchPosition(strategy);
      this.ref.updatePositionStrategy(strategy);
    }
    this.ref.updatePosition();
    this.updateArrow();
  }
  private watchPosition(strategy: ConnectedPositionStrategy): void {
    this.positionSubscription?.unsubscribe();
    this.positionSubscription = strategy.positionChanges.subscribe(change => {
      this.container?.classList.toggle('ui-overlaypanel-flipped', change.connectionPair.overlayY === 'bottom');
      this.updateArrow();
    });
  }
  private updateArrow(): void {
    const container = this.container;
    if (container && this.target) {
      container.style.visibility = 'visible';
      const rect = container.getBoundingClientRect();
      const anchor = this.target.getBoundingClientRect();
      // The outer triangle is 20px wide. Keep its base clear of the 3px
      // rounded corners, and measure from the padding box used by CSS left.
      const inset = 14;
      const requested = anchor.left + anchor.width / 2 - rect.left - container.clientLeft;
      const maximum = Math.max(inset, container.clientWidth - inset);
      container.style.setProperty('--overlayArrowLeft', `${Math.max(inset, Math.min(maximum, requested))}px`);
    }
  }
  ngOnDestroy(): void { this.hide(); }
}
