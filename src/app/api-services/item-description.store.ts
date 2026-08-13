import { Injectable } from '@angular/core';

/**
 * pt-BR item descriptions, kept outside the item objects.
 *
 * They arrive after everything else (items-desc is nearly half the payload and is only
 * used in the hover tooltip and the search preview, both user-triggered), so whatever
 * renders needs two things: to read a description by id, and to know the load has
 * arrived, so it can discard whatever it memoized while the map was still empty — without
 * that, an item hovered too early would keep an empty popover forever.
 *
 * A separate map, rather than a field on each item: touching 6,630 objects that
 * `Calculator.getItem()` reads in a hot loop forces a hidden-class transition, and a pure
 * pipe does not re-run when only an object's contents change.
 */
@Injectable({ providedIn: 'root' })
export class ItemDescriptionStore {
  private map: Record<string, string> = {};

  /** Increments on every load. Memoized caches compare against this. */
  version = 0;

  set(descriptions: Record<string, string> | null | undefined) {
    this.map = descriptions ?? {};
    this.version++;
  }

  get(id: number | string | undefined): string | undefined {
    return id == null ? undefined : this.map[id];
  }
}
