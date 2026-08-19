/**
 * The LATAM overlay merge, lifted framework-free from `RoService`'s item pipeline
 * (src/app/api-services/ro.service.ts, the `map` inside `cachedItems$`).
 *
 * Kept as its own module so a spec can assert it stays behaviourally identical to
 * the service — the calculator's set/combo scripts depend on the `enName` it
 * preserves, so a drift here would silently change damage numbers.
 */

/** A `latam-items.json` record: pt-BR name/description, plus the Korean resource
 *  string (confusingly stored as `aegisName`) and the slot count when non-zero. */
export interface LatamItem {
  name: string;
  description?: string;
  aegisName?: string;
  slots?: number;
}

export type ItemMap = Record<string, any>;

/**
 * Applies the pt-BR overlay onto `item.json` in place and returns it, exactly as the
 * app does at startup: flags `presentInLatam`, preserves the English display name as
 * `enName`, then swaps in the pt-BR name and description.
 *
 * Note this only ever visits ids present in `item.json`. The ~7.7k LATAM ids with no
 * mechanical record are invisible here by design — the search index unions them back
 * in separately (see item-index.ts).
 */
export function mergeLatamItems(items: ItemMap, latam: Record<string, LatamItem>): ItemMap {
  for (const id of Object.keys(items)) {
    const item = items[id];
    const pt = latam[id];
    // `preRelease` is the hand-authored opt-in for items LATAM has not shipped yet,
    // listed with their iRO English text. It forces the flag on in the app's build step
    // (tools/build-web-data.mjs) and has to do the same here, or get_item would report
    // an item the calculator happily lists as absent from the server.
    item.presentInLatam = !!pt || !!item.preRelease;
    if (pt) {
      // Set/combo scripts (EQUIP[...], POS_SPECIFIC[...], REFINE_NAME[...]) match
      // partner items by their English display name. Preserve it before swapping
      // in the pt-BR name so those bonuses keep resolving after localization.
      item.enName = item.name;
      item.name = pt.name;
      if (pt.description) item.description = pt.description;
    }
  }
  return items;
}

/** The monster equivalent: `latam-monsters.json` is a flat id → pt-BR name map. */
export function mergeLatamMonsters(monsters: ItemMap, latam: Record<string, string>): ItemMap {
  for (const id of Object.keys(monsters)) {
    const pt = latam[id];
    if (pt) monsters[id].name = pt;
  }
  return monsters;
}
