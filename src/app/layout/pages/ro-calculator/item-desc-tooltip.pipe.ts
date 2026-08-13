import { Pipe, PipeTransform } from '@angular/core';
import { ItemModel } from 'src/app/models/item.model';
import { itemDescPopoverHtml } from 'src/app/utils';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';

/**
 * Item-description popover HTML for a dropdown row: `itemId | itemDescTooltip : items`.
 * Lets slot components without their own tooltip method (shadow gear,
 * costume/visual slots) share the same popover as the main equipment slots.
 */
@Pipe({ name: 'itemDescTooltip' })
export class ItemDescTooltipPipe implements PipeTransform {
  private readonly cache = new Map<number, string>();
  /** Versão do store refletida no cache; ver o descarte abaixo. */
  private cachedVersion = -1;

  constructor(private readonly descriptions: ItemDescriptionStore) {}

  /**
   * `descVersion` exists only so Angular knows it has to re-evaluate: this pipe is pure,
   * so it only re-runs when one of its input references changes — and the descriptions
   * arriving changes neither `id` nor `items`. Without that argument the tooltip stays
   * frozen on the value computed before items-desc arrived — that is, with the item name
   * alone. Pass `itemDescriptions.version` from the component.
   */
  transform(id: number | undefined, items: Record<number, ItemModel> | undefined, descVersion?: number): string {
    void descVersion;
    if (!id || !items) return '';

    if (this.cachedVersion !== this.descriptions.version) {
      this.cache.clear();
      this.cachedVersion = this.descriptions.version;
    }

    const cached = this.cache.get(id);
    if (cached !== undefined) return cached;
    const html = itemDescPopoverHtml(items[id], this.descriptions.get(id));
    this.cache.set(id, html);
    return html;
  }
}
