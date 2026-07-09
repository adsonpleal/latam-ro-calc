import { Pipe, PipeTransform } from '@angular/core';
import { ItemModel } from 'src/app/models/item.model';
import { itemDescPopoverHtml } from 'src/app/utils';

/**
 * Item-description popover HTML for a dropdown row: `itemId | itemDescTooltip : items`.
 * Lets slot components without their own tooltip method (shadow gear,
 * costume/visual slots) share the same popover as the main equipment slots.
 */
@Pipe({ name: 'itemDescTooltip' })
export class ItemDescTooltipPipe implements PipeTransform {
  private readonly cache = new Map<number, string>();

  transform(id: number | undefined, items: Record<number, ItemModel> | undefined): string {
    if (!id || !items) return '';
    const cached = this.cache.get(id);
    if (cached !== undefined) return cached;
    const html = itemDescPopoverHtml(items[id]);
    this.cache.set(id, html);
    return html;
  }
}
