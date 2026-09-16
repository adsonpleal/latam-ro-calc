import { SLOTS_BY_KEY } from '../app-config/equipment-slots';
import { MainItemWithRelations } from '../constants/item-type.enum';
import { DEFAULT_PET_LOYALTY } from '../constants/pet-loyalty';
import { MainModel } from '../models/main.model';
import { CompareState, copyStatsFields } from './compare-state';

/**
 * An imported build (a replay or a share link) turned into a comparison against the
 * build on screen: every comparable slot, plus level, job level, stats and traits.
 *
 * Every slot goes in, including the ones the imported build leaves empty. The
 * comparison replaces whatever was being compared, and a slot left out would quietly
 * keep the current build's item on the compared side — "the imported build" would then
 * be a mix of both.
 *
 * `slots` is the caller's list of what the current class may compare (the off-hand
 * weapon is not offered to every class), so the result never holds a slot the screen
 * cannot draw.
 */
export function buildComparisonFromImport(imported: MainModel, slots: readonly string[]): CompareState {
  const source = imported as unknown as Record<string, any>;
  const model2: Record<string, any> = { rawOptionTxts: [...(imported.rawOptionTxts ?? [])] };

  for (const slot of slots) {
    const itemId = source[slot] || null;
    model2[slot] = itemId;
    for (const related of MainItemWithRelations[slot] ?? []) {
      model2[related] = itemId ? source[related] || null : null;
    }

    // Same loose fields the compare pass keeps per slot, off the same descriptor.
    const descriptor = SLOTS_BY_KEY.get(slot as any);
    if (descriptor) {
      model2[`${slot}Refine`] = itemId ? source[`${slot}Refine`] || 0 : null;
      model2[`${slot}Grade`] = itemId ? source[`${slot}Grade`] || null : null;
    }
    if (descriptor?.loyalty) model2['petLoyalty'] = itemId ? source['petLoyalty'] || DEFAULT_PET_LOYALTY : null;
    if (descriptor?.converter) model2['propertyAtk'] = itemId ? source['propertyAtk'] || null : null;
    if (descriptor?.ammo) model2['ammo'] = itemId ? source['ammo'] || null : null;
  }

  copyStatsFields(source, model2);

  return { itemNames: [...slots], model2, stats: true };
}
