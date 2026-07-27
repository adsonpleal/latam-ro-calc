import { ItemTypeId } from '../constants/item.const';
import { ItemModel } from '../models/item.model';

/**
 * Whether an item can receive an Enchant Grade (Grau D/C/B/A).
 *
 * The client's rule is a plain level check: a weapon of "Nível da arma 5" or an equipment of
 * "Nível do Equip. 2". Everything else — lower-level gear, ammo, cards, shadow equipment —
 * has no grade slot.
 *
 * This used to be a hand-maintained `canGrade` flag inside item.json, which drifted with
 * every import: the Armas Decadentes and ~70 other LATAM items were level-5 weapons or
 * level-2 equipment with the flag missing, so the calculator greyed out their grade
 * dropdown. Deriving it from `itemLevel` keeps the two in step by construction.
 */
export function canGradeItem(item: Pick<ItemModel, 'itemTypeId' | 'itemLevel'> | undefined | null): boolean {
  if (!item) return false;

  const { itemTypeId, itemLevel } = item;
  if (itemTypeId === ItemTypeId.WEAPON) return itemLevel === 5;
  if (itemTypeId === ItemTypeId.ARMOR) return itemLevel === 2;

  return false;
}
