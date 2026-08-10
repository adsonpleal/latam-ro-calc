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

  transform(id: number | undefined, items: Record<number, ItemModel> | undefined): string {
    if (!id || !items) return '';

    // As descrições chegam depois do mapa de itens. Sem isto, um item cujo
    // tooltip foi montado antes disso ficaria memoizado só com o nome.
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
