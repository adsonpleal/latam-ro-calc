import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Output, QueryList, ViewChildren } from '@angular/core';
import { MAX_SLOT_COLOR_LABEL, SLOT_COLORS, SlotColor, SlotColorLabels, slotColorLabel } from 'src/app/core/slot-colors';
import { SlotColorPickerEvent, SlotColorPickerRequest } from './slot-color-picker.model';

/**
 * The slot-highlight palette, as a panel: pick a colour, clear it, or rename one.
 *
 * A panel of its own rather than a `ItemPickerService` request, because a row here is
 * two controls — choose and rename — and that picker's rows are single buttons. It
 * borrows that panel's surface variables so the two read as the same control.
 */
@Component({
  selector: 'app-slot-color-picker',
  templateUrl: './slot-color-picker.component.html',
  styleUrls: ['../picker-tokens.css', './slot-color-picker.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SlotColorPickerComponent {
  @Output() readonly event = new EventEmitter<SlotColorPickerEvent>();
  /** At most one is rendered at a time — only the row being edited draws an input. */
  @ViewChildren('rename') renameInputs!: QueryList<ElementRef<HTMLInputElement>>;

  readonly colors = SLOT_COLORS;
  readonly maxLabel = MAX_SLOT_COLOR_LABEL;

  value: string | null = null;
  labels: SlotColorLabels = {};
  /** Palette id whose name is being edited, if any. */
  editing: string | null = null;
  draft = '';

  constructor(private readonly cdr: ChangeDetectorRef) {}

  init(request: SlotColorPickerRequest, labels: SlotColorLabels): void {
    this.value = request.value ?? null;
    this.labels = { ...labels };
    this.cdr.markForCheck();
  }

  labelOf(color: SlotColor): string {
    return slotColorLabel(color, this.labels);
  }

  trackColor = (_: number, color: SlotColor) => color.id;

  choose(value: string | null): void {
    this.event.emit({ kind: 'pick', value });
  }

  // ── renaming ─────────────────────────────────────────────────────────────────

  startRename(color: SlotColor, event: Event): void {
    event.stopPropagation();
    this.editing = color.id;
    this.draft = this.labelOf(color);
    this.cdr.markForCheck();
    // The box does not exist until this pass renders; `cdkFocusInitial` only runs when
    // the trap is first attached, so the focus is placed by hand here instead.
    setTimeout(() => this.renameInputs?.first?.nativeElement.select());
  }

  /**
   * Commit the edit and stay open — naming a colour is not choosing one, and a player
   * setting up their own vocabulary will name several in a row. An empty box is how
   * the palette's own name is restored, so it clears the entry rather than storing "".
   */
  commitRename(color: SlotColor): void {
    if (this.editing !== color.id) return;

    const next = { ...this.labels };
    const trimmed = this.draft.trim().slice(0, MAX_SLOT_COLOR_LABEL);
    if (trimmed && trimmed !== color.label) next[color.id] = trimmed;
    else delete next[color.id];

    this.labels = next;
    this.closeEdit();
    this.event.emit({ kind: 'rename', labels: next });
  }

  cancelRename(): void {
    this.closeEdit();
  }

  private closeEdit(): void {
    this.editing = null;
    this.draft = '';
    this.cdr.markForCheck();
  }

  onRenameKeyDown(color: SlotColor, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      this.commitRename(color);
      return;
    }
    if (event.key === 'Escape') {
      // Consumed here so the panel itself stays open: the first Escape backs out of
      // the edit, a second one closes the panel.
      event.stopPropagation();
      this.cancelRename();
    }
  }

  /**
   * Escape closes the panel, and never reaches the page.
   *
   * Not tidiness: PrimeNG binds `document:keydown.escape` once per pTooltip and there
   * are hundreds on this screen, each re-entering the Angular zone. The item picker
   * carries the same guard for the same measured reason.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    this.event.emit({ kind: 'dismiss' });
  }
}
