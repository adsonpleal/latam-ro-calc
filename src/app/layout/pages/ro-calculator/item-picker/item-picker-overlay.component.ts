import { CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Output, ViewChild } from '@angular/core';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { filterOptions, searchOptionLeaves } from 'src/app/core/picker-filter';
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
  /** Tree mode: the path drilled so far, root first. */
  trail: OptionTreeNode[] = [];

  readonly rowHeight = ROW_HEIGHT;

  constructor(
    private readonly cdr: ChangeDetectorRef,
    public readonly itemDescriptions: ItemDescriptionStore,
  ) {}

  /** Called by the service right after the portal is attached. */
  init(request: PickerRequest): void {
    this.request = request;
    this.query = '';
    this.trail = [];
    this.active = -1;
    this.rebuild();
  }

  get title(): string {
    return this.request?.title ?? '';
  }

  get items(): Record<number, ItemModel> | undefined {
    return this.request?.mode === 'flat' ? this.request.items : undefined;
  }

  get viewportHeight(): number {
    return Math.min(this.rows.length * ROW_HEIGHT, MAX_VIEWPORT);
  }

  /** Tree mode only, and only while browsing — a search has no place in the tree. */
  get breadcrumb(): OptionTreeNode[] {
    return this.request?.mode === 'tree' && !this.query.trim() ? this.trail : [];
  }

  onQuery(value: string): void {
    this.query = value;
    this.active = -1;
    this.rebuild();
  }

  onKeyDown(event: KeyboardEvent): void {
    const last = this.rows.length - 1;

    switch (event.key) {
      case 'Escape':
        this.dismiss();
        return;
      case 'ArrowDown':
        event.preventDefault();
        this.moveTo(Math.min(this.active + 1, last));
        return;
      case 'ArrowUp':
        event.preventDefault();
        this.moveTo(Math.max(this.active - 1, -1));
        return;
      case 'Enter':
        event.preventDefault();
        this.choose(this.active);
        return;
      case 'ArrowRight': {
        const row = this.rows[this.active];
        if (row?.group) {
          event.preventDefault();
          this.choose(this.active);
        }
        return;
      }
      case 'ArrowLeft':
        if (this.canAscend()) {
          event.preventDefault();
          this.ascend();
        }
        return;
      case 'Backspace':
        // Only when the box is empty, so backspacing a typo never jumps a level.
        if (!this.query && this.canAscend()) {
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
    this.active = -1;
    this.rebuild();
  }

  isSelected(row: PickerRow): boolean {
    return row.value != null && row.value === this.request?.value;
  }

  private canAscend(): boolean {
    return this.request?.mode === 'tree' && !this.query.trim() && this.trail.length > 0;
  }

  private ascend(): void {
    this.trail = this.trail.slice(0, -1);
    this.active = -1;
    this.rebuild();
  }

  private descend(row: PickerRow): void {
    this.trail = [...this.trail, { label: row.label, value: row.value ?? undefined, children: [...(row.children ?? [])] }];
    this.active = -1;
    this.rebuild();
  }

  private moveTo(index: number): void {
    this.active = index;
    if (index >= 0) this.viewport?.scrollToIndex(index);
  }

  private rebuild(): void {
    this.rows = this.request?.mode === 'tree' ? this.treeRows() : this.flatRows();
    this.cdr.markForCheck();
  }

  private flatRows(): PickerRow[] {
    const request = this.request as Extract<PickerRequest, { mode: 'flat' }>;
    this.capped = false;

    return filterOptions(request.options, this.query, request.filterKeys).map((option: DropdownModel) => ({
      label: option.label,
      value: option.value,
      icon: request.iconKey ? (option[request.iconKey] as string | number) : null,
      elementClass: request.elementColoured && option.element ? `property_${option.element}` : undefined,
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
