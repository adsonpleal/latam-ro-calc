import { Injectable } from '@angular/core';

/**
 * Single source of truth for the LATAM shop server selection and the external
 * item links (Divine Pride database + GnJoy LATAM market). Shared by the
 * "Descrições dos Itens" section and the item-search dialog so both selectors
 * stay in sync and the link logic lives in one place.
 *
 * LATAM shops are split per server, so the market link below points at whichever
 * server is selected; the choice is persisted to localStorage.
 */
@Injectable({ providedIn: 'root' })
export class ItemShopService {
  private static readonly STORAGE_KEY = 'ro-shop-server';

  readonly serverOptions = [
    { label: 'Freya', value: 'FREYA' },
    { label: 'Nidhogg', value: 'NIDHOGG' },
  ];

  private _server = localStorage.getItem(ItemShopService.STORAGE_KEY) || 'FREYA';

  get server(): string {
    return this._server;
  }

  set server(value: string) {
    this._server = value;
    localStorage.setItem(ItemShopService.STORAGE_KEY, value);
  }

  /** Divine Pride database page for the given item. */
  divinePrideItemUrl(itemId: number): string {
    return itemId ? `https://www.divine-pride.net/database/item/${itemId}` : '';
  }

  /** GnJoy LATAM market (buy orders) search for the item name on the selected server. */
  marketItemUrl(itemName: string): string {
    if (!itemName) return '';
    const params = new URLSearchParams({
      storeType: 'BUY',
      serverType: this._server,
      searchWord: itemName,
    });
    return `https://ro.gnjoylatam.com/pt/intro/shop-search/trading?${params.toString()}`;
  }
}
