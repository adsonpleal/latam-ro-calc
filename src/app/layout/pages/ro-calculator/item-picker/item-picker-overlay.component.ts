import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { buildFilterIndex, filterOptions, searchOptionLeaves } from 'src/app/core/picker-filter';
import { DropdownModel } from 'src/app/models/dropdown.model';
import { ItemModel } from 'src/app/models/item.model';
import { OptionTreeNode, PickerRequest, PickerResult } from './item-picker.model';

/** One rendered line. `group` rows drill into the tree instead of committing. */
interface PickerRow {
  label: string;
  value: string | number | null;
  icon?: string | number | null;
  elementClass?: string;
  preRelease?: boolean;
  group?: boolean;
  children?: readonly OptionTreeNode[];
}

const ROW_HEIGHT = 28;
const MAX_VIEWPORT = 300;
/**
 * Above this many options the list is virtualised — and a virtualised list has to be a
 * fixed width, since its rows are out of flow. Below it, a plain list lets the panel size
 * itself to the longest label. Decided from the *source* list, not the filtered rows, so
 * the choice never flips mid-filter; `pinnedWidth` then holds the width still.
 */
const VIRTUALISE_ABOVE = 100;
/** Below this the list is short enough that virtualising it only costs a layout pass. */
const SEARCH_LIMIT = 1000;

/**
 * The panel behind every chip in the equipment picker.
 *
 * It replaces a `p-dropdown` (item, card, enchant, refine, grade, ammo, converter,
 * loyalty) or a `p-cascadeSelect` (Bônus Aleatório) — hence the two modes. The keyboard
 * contract is the one people already had from PrimeNG: type to filter, arrows to move,
 * Enter to choose, Esc to close; tree mode adds left/right to walk the breadcrumb.
 */
@Component({
  selector: 'app-item-picker-overlay',
  templateUrl: './item-picker-overlay.component.html',
  styleUrls: ['./item-picker-overlay.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemPickerOverlayComponent {
  @Output() readonly closed = new EventEmitter<PickerResult>();

  @ViewChild(CdkVirtualScrollViewport) private viewport?: CdkVirtualScrollViewport;

  request!: PickerRequest;
  query = '';
  /** -1 is the "Nenhum" row, which sits outside the scroller and is always reachable. */
  active = -1;
  rows: PickerRow[] = [];
  capped = false;
  virtualise = false;
  /** Tree mode: the path drilled so far, root first. */
  trail: OptionTreeNode[] = [];
  /** Flat mode: the lowercased haystack for `request.options`, built once on open. */
  private filterIndex: string[] = [];
  /**
   * Frozen width for a content-sized panel, in px. A plain list sizes the panel to its
   * longest label, so filtering it would resize the panel under the pointer — the weapon
   * list went from 271px to 202px on the first keystroke. Measured the moment before the
   * first filter is applied and held for the rest of the panel's life. Virtualised panels
   * are already a fixed width and never take one.
   */
  pinnedWidth: number | null = null;

  readonly rowHeight = ROW_HEIGHT;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly host: ElementRef<HTMLElement>,
    public readonly itemDescriptions: ItemDescriptionStore,
  ) {}

  /** Called by the service right after the portal is attached. */
  init(request: PickerRequest): void {
    this.request = request;
    this.query = '';
    this.trail = [];
    this.active = this.minIndex;
    // Tree mode always virtualises: its flat search can return a thousand leaves, and a
    // panel that changed width between browsing and searching would be worse than a wide one.
    this.virtualise = request.mode === 'tree' || request.options.length > VIRTUALISE_ABOVE;
    this.filterIndex = request.mode === 'flat' ? buildFilterIndex(request.options, request.filterKeys) : [];
    this.rebuild();
  }

  get title(): string {
    return this.request?.title ?? '';
  }

  get items(): Record<number, ItemModel> | undefined {
    return this.request?.mode === 'flat' ? this.request.items : undefined;
  }

  /** An icon column only earns its width when the list actually carries icons. */
  get showIcons(): boolean {
    return this.request?.mode === 'flat' && !!this.request.iconKey;
  }

  /** Whether the "Nenhum" row is offered — and therefore whether index -1 is reachable. */
  get clearable(): boolean {
    return this.request?.clearable !== false;
  }

  private get minIndex(): number {
    return this.clearable ? -1 : 0;
  }

  get viewportHeight(): number {
    return Math.min(this.rows.length * ROW_HEIGHT, MAX_VIEWPORT);
  }

  /** Tree mode only, and only while browsing — a search has no place in the tree. */
  get breadcrumb(): OptionTreeNode[] {
    return this.request?.mode === 'tree' && !this.query.trim() ? this.trail : [];
  }

  onQuery(value: string): void {
    this.pinWidth();
    this.query = value;
    this.active = this.minIndex;
    this.rebuild();
  }

  onKeyDown(event: KeyboardEvent): void {
    const last = this.rows.length - 1;

    // A key this panel acts on is its own: it does not carry on to the page underneath.
    // That matters beyond tidiness — PrimeNG binds `document:keydown.escape` once per
    // pTooltip, ~300 of them here, and Angular re-enters the zone for every one it
    // reaches. Letting Escape bubble cost 727ms; keeping it costs nothing.
    const consume = () => event.stopPropagation();

    switch (event.key) {
      case 'Escape':
        consume();
        this.dismiss();
        return;
      case 'ArrowDown':
        consume();
        event.preventDefault();
        this.moveTo(Math.min(this.active + 1, last));
        return;
      case 'ArrowUp':
        consume();
        event.preventDefault();
        this.moveTo(Math.max(this.active - 1, this.minIndex));
        return;
      case 'Enter':
        consume();
        event.preventDefault();
        this.choose(this.active);
        return;
      case 'ArrowRight': {
        const row = this.rows[this.active];
        if (row?.group) {
          consume();
          event.preventDefault();
          this.choose(this.active);
        }
        return;
      }
      case 'ArrowLeft':
        if (this.canAscend()) {
          consume();
          event.preventDefault();
          this.ascend();
        }
        return;
      case 'Backspace':
        // Only when the box is empty, so backspacing a typo never jumps a level.
        if (!this.query && this.canAscend()) {
          consume();
          event.preventDefault();
          this.ascend();
        }
        return;
      default:
        return;
    }
  }

  /** `index` of -1 is the "Nenhum" row. */
  choose(index: number): void {
    if (index < 0) {
      if (!this.clearable) return;
      this.closed.emit({ committed: true, value: null });
      return;
    }

    const row = this.rows[index];
    if (!row) return;

    if (row.group) {
      this.descend(row);
      return;
    }

    this.closed.emit({ committed: true, value: row.value });
  }

  hover(index: number): void {
    this.active = index;
  }

  dismiss(): void {
    this.closed.emit({ committed: false });
  }

  /** Jump straight to a level from the breadcrumb; index -1 is the root. */
  goToLevel(index: number): void {
    this.trail = this.trail.slice(0, index + 1);
    this.active = this.minIndex;
    this.rebuild();
  }

  isSelected(row: PickerRow): boolean {
    return row.value != null && row.value === this.request?.value;
  }

  /**
   * Snapshots the rendered width so the panel stops growing and shrinking with its
   * contents. Done here rather than on open because the panel is certainly laid out by
   * the time someone has typed into it, which no lifecycle hook can promise for a portal
   * the overlay attaches and change-detects on its own schedule.
   */
  private pinWidth(): void {
    if (this.virtualise || this.pinnedWidth != null) return;

    const panel = this.host.nativeElement.querySelector<HTMLElement>('.picker');
    if (panel?.offsetWidth) this.pinnedWidth = panel.offsetWidth;
  }

  /**
   * ragassets does not serve every icon. A broken-image box in a list of thirty rows is
   * worse than a gap, so drop the element — same as the chips do.
   */
  /** rebuild() returns fresh row literals on every keystroke, so without this the default
   *  differ tears down and recreates every rendered row — each an <img> and a tooltip
   *  directive — per character typed. Rows are already identified by value. */
  trackRow = (_: number, row: { value: any }): any => row.value;

  onIconError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
  }

  private canAscend(): boolean {
    return this.request?.mode === 'tree' && !this.query.trim() && this.trail.length > 0;
  }

  private ascend(): void {
    this.trail = this.trail.slice(0, -1);
    this.active = this.minIndex;
    this.rebuild();
  }

  private descend(row: PickerRow): void {
    this.trail = [...this.trail, { label: row.label, value: row.value ?? undefined, children: [...(row.children ?? [])] }];
    this.active = this.minIndex;
    this.rebuild();
  }

  private moveTo(index: number): void {
    this.active = index;
    if (index < 0) return;

    if (this.virtualise) {
      this.viewport?.scrollToIndex(index);
      return;
    }
    // A plain list has no viewport to drive; nudge the row itself into view.
    this.host.nativeElement.querySelector<HTMLElement>(`.picker__row[data-index="${index}"]`)?.scrollIntoView({ block: 'nearest' });
  }

  private rebuild(): void {
    this.rows = this.request?.mode === 'tree' ? this.treeRows() : this.flatRows();
    this.cdr.markForCheck();
  }

  private flatRows(): PickerRow[] {
    const request = this.request as Extract<PickerRequest, { mode: 'flat' }>;
    this.capped = false;

    return filterOptions(request.options, this.query, this.filterIndex).map((option: DropdownModel) => ({
      label: option.label,
      value: option.value,
      icon: request.iconKey ? (option[request.iconKey] as string | number) : null,
      elementClass:
        request.colourClasses?.[String(option.value)] ??
        (request.elementColoured && option.element ? `property_${option.element}` : undefined),
      preRelease: !!option['preRelease'],
    }));
  }

  private treeRows(): PickerRow[] {
    const request = this.request as Extract<PickerRequest, { mode: 'tree' }>;
    const term = this.query.trim();

    if (term) {
      // Six thousand leaves are four levels down; searching beats drilling once the
      // reader knows the words.
      const { matches, capped } = searchOptionLeaves(request.leafIndex, term, SEARCH_LIMIT);
      this.capped = capped;
      return matches.map((match) => ({ label: match.label, value: match.value }));
    }

    this.capped = false;
    const level = this.trail.length ? (this.trail[this.trail.length - 1].children ?? []) : request.roots;

    return level.map((node) => ({
      label: node.label,
      value: node.value ?? null,
      group: !!node.children?.length,
      children: node.children,
    }));
  }
}
