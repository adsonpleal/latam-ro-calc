import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChild, ElementRef, HostListener, Input, OnChanges, OnDestroy, TemplateRef } from '@angular/core';

export function virtualRange(count: number, itemSize: number, height: number, scrollTop: number, overscan = 4): { start: number; end: number } {
  const first = Math.floor(Math.max(0, scrollTop) / Math.max(1, itemSize));
  return { start: Math.min(count, Math.max(0, first - overscan)), end: Math.min(count, first + Math.ceil(height / Math.max(1, itemSize)) + overscan) };
}
@Component({
  selector: 'app-virtual-list',
  template: `<div class="ui-virtual-spacer" [style.height.px]="items.length * itemSize"></div><div class="ui-virtual-content" [style.transform]="'translateY(' + start * itemSize + 'px)'"><ng-container *ngFor="let row of visible; let offset = index; trackBy: track"><ng-container [ngTemplateOutlet]="rowTemplate" [ngTemplateOutletContext]="{ $implicit: row, index: start + offset }"></ng-container></ng-container></div>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualListComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() items: any[] = [];
  @Input() itemSize = 28;
  @Input() trackBy: (index: number, item: any) => any = (_index, item) => item;
  @ContentChild(TemplateRef, { static: true }) rowTemplate!: TemplateRef<any>;
  start = 0; visible: any[] = [];
  private observer?: ResizeObserver;
  constructor(private readonly element: ElementRef<HTMLElement>, private readonly change: ChangeDetectorRef) {}
  track = (offset: number, item: any) => this.trackBy(this.start + offset, item);
  ngOnChanges(): void { this.refresh(); }
  ngAfterViewInit(): void {
    this.observer = new ResizeObserver(() => { this.refresh(); this.change.detectChanges(); });
    this.observer.observe(this.element.nativeElement);
    this.refresh(); this.change.detectChanges();
  }
  @HostListener('scroll') refresh(): void {
    const host = this.element.nativeElement;
    const maximum = Math.max(0, this.items.length * this.itemSize - host.clientHeight);
    if (host.scrollTop > maximum) host.scrollTop = maximum;
    const range = virtualRange(this.items.length, this.itemSize, host.clientHeight || parseFloat(host.style.height) || 300, host.scrollTop);
    this.start = range.start;
    this.visible = this.items.slice(range.start, range.end);
    this.change.markForCheck();
  }
  scrollToIndex(index: number): void {
    const host = this.element.nativeElement;
    const top = Math.max(0, Math.min(this.items.length - 1, index)) * this.itemSize;
    if (top < host.scrollTop) host.scrollTop = top;
    else if (top + this.itemSize > host.scrollTop + host.clientHeight) host.scrollTop = top + this.itemSize - host.clientHeight;
    this.refresh(); this.change.detectChanges();
  }
  ngOnDestroy(): void { this.observer?.disconnect(); }
}
