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
   * `descVersion` existe só para o Angular saber que precisa reavaliar: este pipe é
   * puro, então ele só reexecuta quando alguma referência de entrada muda — e a
   * chegada das descrições não muda nem o `id` nem o `items`. Sem esse argumento o
   * tooltip fica congelado no valor calculado antes de items-desc chegar, ou seja,
   * só com o nome do item. Passe `itemDescriptions.version` do componente.
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
