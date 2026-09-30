import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, TemplateRef, ViewChild, ViewContainerRef, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { OverlayRef } from '@angular/cdk/overlay';
import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { UiOverlayService } from './overlay.service';
import { UiValueControl, optionLabel, optionValue, toggleSelection } from './value-control';

interface OptionRow { option: any; group?: boolean; }
let selectId = 0;
@Component({
  selector: 'app-ui-dropdown,app-ui-multi-select,app-ui-cascade-select',
  templateUrl: './select.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiSelectComponent), multi: true }],
})
export class UiSelectComponent extends UiValueControl implements OnChanges, OnDestroy, AfterViewInit {
  @Input() options: any[] = [];
  @Input() optionLabel = '';
  @Input() optionValue = '';
  @Input() group = false;
  @Input() filter = false;
  @Input() filterBy = 'label';
  @Input() filterPlaceholder = '';
  @Input() placeholder = '';
  @Input() defaultLabel = '';
  @Input() selectedItemsLabel = '{0} selecionados';
  @Input() showClear = false;
  @Input() showToggleAll = true;
  @Input() resetFilterOnHide = false;
  @Input() autoDisplayFirst = true;
  @Input() autofocus = false;
  @Input() scrollHeight = '200px';
  @Input() panelStyleClass = '';
  @Input() emptyFilterMessage = 'Nenhum resultado encontrado';
  @Input() virtualScroll = false;
  @Input() virtualScrollItemSize = 38;
  @Input() optionGroupLabel = 'label';
  @Input() optionGroupChildren: string[] = ['items'];
  @Output() opened = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
  @Output() cleared = new EventEmitter<void>();
  @ViewChild('panel', { static: true }) panel!: TemplateRef<any>;
  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLButtonElement>;
  @ViewChild(CdkVirtualScrollViewport) viewport?: CdkVirtualScrollViewport;
  readonly id = `ui-select-${++selectId}`;
  readonly multi: boolean;
  readonly cascade: boolean;
  readonly kind: string;
  query = '';
  rows: OptionRow[] = [];
  active = -1;
  keyboardActive = false;
  path: any[] = [];
  private leaves: any[] = [];
  private ref?: OverlayRef;
  private destroyed = false;

  constructor(private readonly host: ElementRef<HTMLElement>, private readonly layers: UiOverlayService, private readonly view: ViewContainerRef) {
    super();
    this.multi = host.nativeElement.tagName.toLowerCase() === 'app-ui-multi-select';
    this.cascade = host.nativeElement.tagName.toLowerCase() === 'app-ui-cascade-select';
    this.kind = this.multi ? 'multiselect' : this.cascade ? 'cascadeselect' : 'dropdown';
  }
  get overlayVisible(): boolean { return !!this.ref; }
  get panelElement(): HTMLElement | null { return this.ref?.overlayElement ?? null; }
  get element(): HTMLElement { return this.host.nativeElement; }
  get panelHeight(): number { return Math.min(parseFloat(this.scrollHeight) || 200, this.rows.length * this.virtualScrollItemSize); }
  ngAfterViewInit(): void { if (this.autofocus) queueMicrotask(() => { if (!this.destroyed) this.trigger.nativeElement.focus(); }); }
  override setDisabledState(disabled: boolean): void { super.setDisabledState(disabled); if (disabled) this.hide(); }
  ngOnChanges(): void {
    const collect = (options: any[], depth = 0): any[] => (options ?? []).flatMap(o => this.cascade && this.childrenOf(o, depth).length ? collect(this.childrenOf(o, depth), depth + 1) : [o]);
    this.leaves = this.group ? (this.options ?? []).flatMap(o => o.items ?? []) : collect(this.options);
    this.rebuild();
    if (this.disabled) this.hide();
  }
  labelOf(option: any): string { return optionLabel(option, this.optionLabel); }
  optionValueOf(option: any): any { return optionValue(option, this.optionValue, this.optionLabel); }
  selected(option: any): boolean { const value = this.optionValueOf(option); return this.multi ? (this.value ?? []).includes(value) : this.value === value; }
  get selectedOption(): any {
    return this.leaves.find(option => this.selected(option)) ?? (!this.multi && !this.placeholder && this.autoDisplayFirst && this.value == null ? this.leaves[0] : null);
  }
  get label(): string {
    if (this.multi) {
      const selected = this.leaves.filter(o => this.selected(o));
      return selected.length > 3 ? this.selectedItemsLabel.replace('{0}', String(selected.length)) : selected.length ? selected.map(o => this.labelOf(o)).join(', ') : this.placeholder || this.defaultLabel || '\u00a0';
    }
    return this.selectedOption != null ? this.labelOf(this.selectedOption) : this.placeholder || '\u00a0';
  }
  get hasValue(): boolean { return this.multi ? !!this.value?.length : this.value != null; }
  toggle(): void { this.ref ? this.hide() : this.show(); }
  show(): void {
    if (this.ref || this.disabled || this.destroyed) return;
    this.rebuild();
    this.path = [];
    this.keyboardActive = false;
    this.active = this.rows.findIndex(r => !r.group && this.selected(r.option));
    if (this.active < 0) this.active = this.rows.findIndex(r => !r.group && !r.option?.disabled);
    const anchor = this.trigger.nativeElement.parentElement;
    this.ref = this.layers.open(this.panel, this.view, {
      positionStrategy: this.layers.connected(anchor),
      minWidth: anchor.getBoundingClientRect().width,
      panelClass: ['ui-select-pane', ...this.panelStyleClass.split(' ').filter(Boolean)],
    }, () => this.hide(true), true, anchor);
    this.ref.outsidePointerEvents().subscribe(event => {
      if (this.ref && !this.host.nativeElement.contains(event.target as Node) && this.layers.isOutside(this.ref, event)) this.hide();
    });
    queueMicrotask(() => {
      if (!this.ref) return;
      this.ref.overlayElement.querySelector<HTMLInputElement>('.ui-dropdown-filter')?.focus({ preventScroll: true });
      this.revealActive();
      this.opened.emit();
    });
  }
  hide(restoreFocus = false): void {
    if (!this.ref) return;
    const ref = this.ref; this.ref = undefined;
    this.layers.close(ref);
    if (this.resetFilterOnHide) { this.query = ''; this.rebuild(); }
    this.blur();
    if (restoreFocus && this.trigger.nativeElement.isConnected) this.trigger.nativeElement.focus({ preventScroll: true });
    this.closed.emit();
  }
  setPanelWidth(width: number, alignEnd = false): void {
    if (!this.ref) return;
    this.ref.updateSize({ width, minWidth: width });
    if (alignEnd) this.ref.updatePositionStrategy(this.layers.connected(this.trigger.nativeElement.parentElement, [
      { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
      { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
    ]));
    this.ref.updatePosition();
  }
  onFilter(query: string): void { this.query = query; this.keyboardActive = false; this.rebuild(); this.active = this.rows.findIndex(r => !r.group && !r.option?.disabled); }
  private rebuild(): void {
    const query = this.query.toLocaleLowerCase('pt-BR').trim();
    const matches = (option: any) => !query || this.filterBy.split(',').some(key => String(option?.[key.trim()] ?? this.labelOf(option)).toLocaleLowerCase('pt-BR').includes(query));
    this.rows = this.group
      ? (this.options ?? []).flatMap(group => { const options = (group.items ?? []).filter(matches); return options.length ? [{ option: group, group: true }, ...options.map(option => ({ option }))] : []; })
      : (this.options ?? []).filter(matches).map(option => ({ option }));
  }
  choose(option: any, event: Event): void {
    if (option?.disabled) return;
    const value = this.optionValueOf(option);
    this.commit(this.multi ? toggleSelection(this.value, value) : value, event);
    if (!this.multi) this.hide(true);
  }
  clear(event: Event): void { event.stopPropagation(); this.commit(this.multi ? [] : null, event); this.cleared.emit(); }
  toggleAll(event: Event): void {
    const options = this.rows.filter(r => !r.group && !r.option?.disabled).map(r => this.optionValueOf(r.option));
    const all = options.every(v => (this.value ?? []).includes(v));
    this.commit(all ? (this.value ?? []).filter(v => !options.includes(v)) : [...new Set([...(this.value ?? []), ...options])], event);
  }
  onKey(event: KeyboardEvent): void {
    if (this.disabled) return;
    if (event.key === 'Escape' && this.ref) { event.preventDefault(); event.stopPropagation(); this.hide(true); return; }
    if (event.key === 'Tab') { this.hide(true); return; }
    const editing = (event.target as HTMLElement).tagName === 'INPUT';
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter'].includes(event.key) || (!editing && event.key === ' ')) {
      event.preventDefault(); event.stopPropagation();
      if (!this.ref) { this.show(); return; }
      if (this.cascade) { this.panelElement?.querySelector<HTMLButtonElement>('.ui-cascadeselect-item-content')?.focus(); return; }
      if (event.key === 'Enter' || event.key === ' ') { const row = this.rows[this.active]; if (row && !row.group) this.choose(row.option, event); return; }
      this.keyboardActive = true;
      const enabled = this.rows.map((r, i) => !r.group && !r.option?.disabled ? i : -1).filter(i => i >= 0);
      const index = enabled.indexOf(this.active);
      this.active = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled[enabled.length - 1] : enabled[Math.max(0, Math.min(enabled.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))];
      this.revealActive();
    } else if (!editing && event.key.length === 1) {
      const next = this.rows.findIndex(r => !r.group && !r.option?.disabled && this.labelOf(r.option).toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()));
      if (next >= 0) { this.active = next; if (this.ref) this.revealActive(); else if (!this.multi && !this.cascade) this.choose(this.rows[next].option, event); }
    }
  }
  private revealActive(): void {
    this.viewport?.scrollToIndex(Math.max(0, this.active));
    this.ref?.overlayElement.querySelector<HTMLElement>(`#${this.id}-option-${this.active}`)?.scrollIntoView({ block: 'nearest' });
  }
  childrenOf(option: any, depth: number): any[] { return option?.[this.optionGroupChildren[depth] ?? this.optionGroupChildren[this.optionGroupChildren.length - 1] ?? 'items'] ?? []; }
  expand(option: any, depth: number): void {
    if (option?.disabled) return;
    this.path = [...this.path.slice(0, depth), option];
    requestAnimationFrame(() => this.fitSubmenus());
  }
  private fitSubmenus(): void {
    // Each level can flip independently near the right edge. Bound its height so
    // long bonus categories remain reachable at narrow viewport sizes.
    this.panelElement?.querySelectorAll<HTMLElement>('.ui-cascadeselect-sublist').forEach(list => {
      list.style.left = '100%'; list.style.right = 'auto'; list.style.top = '0';
      list.style.maxHeight = `${window.innerHeight - 16}px`;
      const rect = list.getBoundingClientRect();
      if (rect.right > window.innerWidth - 8) { list.style.left = 'auto'; list.style.right = '100%'; }
      if (rect.bottom > window.innerHeight - 8) list.style.top = `${Math.max(8 - rect.top, window.innerHeight - 8 - rect.bottom)}px`;
    });
  }
  treePick(option: any, depth: number, event: Event): void { this.childrenOf(option, depth).length ? this.expand(option, depth) : this.choose(option, event); }
  treeKey(option: any, depth: number, event: KeyboardEvent): void {
    const button = event.target as HTMLElement;
    if (event.key === 'ArrowRight' && this.childrenOf(option, depth).length) {
      event.preventDefault(); this.expand(option, depth);
      requestAnimationFrame(() => button.parentElement?.querySelector<HTMLElement>(':scope > ul > li > button:not(:disabled)')?.focus());
    } else if (event.key === 'ArrowLeft' && depth > 0) {
      event.preventDefault(); const parent = button.closest('ul')?.parentElement; this.path = this.path.slice(0, depth - 1); parent?.querySelector<HTMLElement>('button')?.focus();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const siblings = Array.from(button.closest('ul')?.querySelectorAll<HTMLButtonElement>(':scope > li > button:not(:disabled)') ?? []);
      const at = siblings.indexOf(button as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? siblings.length - 1 : Math.max(0, Math.min(siblings.length - 1, at + (event.key === 'ArrowDown' ? 1 : -1)));
      siblings[next]?.focus();
    } else if (event.key === 'Escape') { event.preventDefault(); this.hide(true); }
    event.stopPropagation();
  }
  ngOnDestroy(): void { this.destroyed = true; this.hide(); }
}
