import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { ItemModel } from 'src/app/models/item.model';
import { ChipView } from './chip-view.model';

/**
 * One picker, drawn as a chip: dashed and muted while empty, solid once filled, with a ✕
 * on hover that clears just this field.
 *
 * The `[pTooltip]` contract is written out the same way the old dropdown rows wrote it,
 * because `ItemDescTooltipHoverDirective` and `ItemDescTooltipFitDirective` attach by
 * matching `[pTooltip][tooltipStyleClass="item_desc_tooltip"]` — the popover keeps its
 * grace period and its viewport fitting for free.
 */
@Component({
  selector: 'app-equipment-chip',
  templateUrl: './equipment-chip.component.html',
  styleUrls: ['./equipment-chip.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EquipmentChipComponent {
  @Input({ required: true }) view!: ChipView;
  @Input() items?: Record<number, ItemModel>;
  /** Amber styling for the chips of a comparison row. */
  @Input() compare = false;

  @Output() readonly pick = new EventEmitter<HTMLElement>();
  @Output() readonly clear = new EventEmitter<void>();

  constructor(public readonly itemDescriptions: ItemDescriptionStore) {}

  onPick(event: MouseEvent): void {
    this.pick.emit(event.currentTarget as HTMLElement);
  }

  /**
   * ragassets does not serve every icon. At 19px a gap went unnoticed; on a chip a broken
   * image box does not, so drop the element instead.
   */
  onIconError(event: Event): void {
    (event.target as HTMLElement).style.display = 'none';
  }
}
