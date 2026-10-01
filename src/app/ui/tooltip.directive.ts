import { Component, ComponentRef, Directive, ElementRef, HostListener, Input, OnChanges, OnDestroy } from '@angular/core';
import { OverlayRef, ConnectedPosition } from 'src/app/ui/overlay';
import { ComponentPortal } from 'src/app/ui/overlay';
import { UiOverlayService } from './overlay.service';

let tooltipId = 0;
@Component({
  selector: 'app-ui-tooltip-content',
  template: `<div class="ui-tooltip-arrow"></div><div class="ui-tooltip-text" *ngIf="escape" [textContent]="text"></div><div class="ui-tooltip-text" *ngIf="!escape" [innerHTML]="text"></div>`,
})
export class UiTooltipContentComponent { text = ''; escape = true; }

const POSITIONS: Record<string, ConnectedPosition> = {
  right: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
  left: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  top: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  bottom: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
};

/** Delayed hover with a crossing grace period for scrollable item descriptions. */
@Directive({ selector: '[appTooltip]' })
export class UiTooltipDirective implements OnDestroy, OnChanges {
  @Input('appTooltip') text: any = '';
  @Input() tooltipPosition = 'right';
  @Input() tooltipStyleClass = '';
  @Input() showDelay = 0;
  @Input() hideDelay = 0;
  @Input() escape = true;
  @Input() tooltipDisabled = false;
  private ref?: OverlayRef;
  private content?: ComponentRef<UiTooltipContentComponent>;
  private showTimer?: ReturnType<typeof setTimeout>;
  private hideTimer?: ReturnType<typeof setTimeout>;
  private cleanup: (() => void)[] = [];
  private readonly id = `ui-tooltip-${++tooltipId}`;
  constructor(private readonly host: ElementRef<HTMLElement>, private readonly layers: UiOverlayService) {}

  @HostListener('mouseenter') @HostListener('focusin') activate(): void {
    this.cancelHide();
    if (this.ref || this.showTimer || this.tooltipDisabled || !this.text) return;
    this.showTimer = setTimeout(() => { this.showTimer = undefined; this.show(); }, this.showDelay);
  }
  @HostListener('mouseleave') @HostListener('focusout') deactivate(): void {
    clearTimeout(this.showTimer);
    this.showTimer = undefined;
    this.cancelHide();
    this.hideTimer = setTimeout(() => this.hide(), this.tooltipStyleClass.includes('item_desc_tooltip') ? 150 : this.hideDelay);
  }
  private cancelHide(): void { clearTimeout(this.hideTimer); this.hideTimer = undefined; }
  private show(): void {
    if (this.tooltipDisabled || !this.text || !this.host.nativeElement.isConnected) return;
    const direction = this.tooltipPosition in POSITIONS ? this.tooltipPosition : 'right';
    const positions = [POSITIONS[direction], ...Object.entries(POSITIONS).filter(([key]) => key !== direction).map(([, value]) => value)].map(position => ({ ...position }));
    const strategy = this.layers.connected(this.host.nativeElement, positions);
    const ref = this.layers.overlay.create({ positionStrategy: strategy, panelClass: ['ui-tooltip', `ui-tooltip-${direction}`, ...this.tooltipStyleClass.split(' ').filter(Boolean)] });
    this.ref = ref;
    const component = ref.attach(new ComponentPortal(UiTooltipContentComponent));
    this.content = component;
    component.instance.text = String(this.text);
    component.instance.escape = this.escape;
    component.changeDetectorRef.detectChanges();
    const element = ref.overlayElement;
    element.setAttribute('role', 'tooltip');
    element.id = this.id;
    const described = this.host.nativeElement.getAttribute('aria-describedby');
    this.host.nativeElement.setAttribute('aria-describedby', [described, this.id].filter(Boolean).join(' '));
    this.layers.adopt(ref, () => this.hide(), false, this.host.nativeElement);
    const enter = () => this.cancelHide();
    const leave = () => this.deactivate();
    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    this.cleanup.push(() => { element.removeEventListener('mouseenter', enter); element.removeEventListener('mouseleave', leave); });
    // Dismiss on outside scrolling, but let long descriptions scroll within their box.
    const document = this.host.nativeElement.ownerDocument;
    const scroll = (event: Event) => {
      if (!element.contains(event.target as Node)) this.hide();
    };
    document.addEventListener('scroll', scroll, { capture: true });
    this.cleanup.push(() => document.removeEventListener('scroll', scroll, { capture: true }));
    strategy.positionChanges.subscribe(change => {
      for (const key of Object.keys(POSITIONS)) element.classList.remove(`ui-tooltip-${key}`);
      const chosen = Object.entries(POSITIONS).find(([, p]) => p.originX === change.connectionPair.originX && p.originY === change.connectionPair.originY)?.[0] ?? direction;
      element.classList.add(`ui-tooltip-${chosen}`);
      // Keep the historical whole-pixel centering and padding. Using layout
      // margins instead of transforms also preserves text rasterization.
      const correction = (element.getBoundingClientRect().height - element.offsetHeight) / 2;
      element.style.marginTop = chosen === 'right' || chosen === 'left' ? `${correction}px` : '0';
    });
    ref.updatePosition();
  }
  hide(): void {
    clearTimeout(this.showTimer); this.showTimer = undefined;
    this.cancelHide();
    this.cleanup.splice(0).forEach(fn => fn());
    const ref = this.ref; this.ref = undefined;
    this.content = undefined;
    this.layers.close(ref);
    const host = this.host.nativeElement;
    const ids = (host.getAttribute('aria-describedby') ?? '').split(' ').filter(id => id && id !== this.id).join(' ');
    ids ? host.setAttribute('aria-describedby', ids) : host.removeAttribute('aria-describedby');
  }
  ngOnChanges(): void {
    if (!this.text || this.tooltipDisabled) { this.hide(); return; }
    if (this.content) {
      this.content.instance.text = String(this.text);
      this.content.instance.escape = this.escape;
      this.content.changeDetectorRef.detectChanges();
      this.ref?.updatePosition();
    }
  }
  ngOnDestroy(): void { this.hide(); }
}
