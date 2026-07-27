/**
 * Which equipment slots an item can occupy, ported from
 * `RoCalculatorComponent#setItemList` (the itemTypeId → itemSubTypeId → compositionPos
 * cascade). Returns tags instead of pushing into thirty arrays.
 *
 * The two-switch structure is load-bearing: itemTypeId 9 (costume), 10 (shadow) and
 * 3333 (custom consumables) have no `ItemTypeId` enum member, so anything keyed off
 * that enum alone would miss 2.4k items. The subtype switch is what catches them.
 */
import { CardPosition } from 'src/app/constants/card-position.enum';
import { HeadGearLocation } from 'src/app/constants/head-gear-location';
import { ItemSubTypeId } from 'src/app/constants/item-sub-type.enum';
import { ItemTypeId } from 'src/app/constants/item.const';
import { getHeadGearLocations } from 'src/app/utils';

/** Every slot an item can be offered for. Single source of truth: the `SlotTag`
 *  union below is derived from it, so the two can never drift. */
export const SLOT_TAGS = [
  'weapon', 'leftWeapon', 'ammo', 'consumable',
  'headUpper', 'headMiddle', 'headLower',
  'shield', 'armor', 'garment', 'boot',
  'accLeft', 'accRight', 'pet',
  'shadowWeapon', 'shadowArmor', 'shadowShield', 'shadowBoot', 'shadowEarring', 'shadowPendant',
  'costumeUpper', 'costumeMiddle', 'costumeLower', 'costumeGarment',
  'costumeEnchantUpper', 'costumeEnchantMiddle', 'costumeEnchantLower',
  'costumeEnchantGarment', 'costumeEnchantGarment2', 'costumeEnchantGarment4',
  'enchant',
  'weaponCard', 'headCard', 'shieldCard', 'armorCard', 'garmentCard', 'bootCard', 'accCard',
] as const;

export type SlotTag = (typeof SLOT_TAGS)[number];

const SUBTYPE_TAG: Record<number, SlotTag> = {
  [ItemSubTypeId.Shield]: 'shield',
  [ItemSubTypeId.Armor]: 'armor',
  [ItemSubTypeId.Garment]: 'garment',
  [ItemSubTypeId.Boot]: 'boot',
  [ItemSubTypeId.Pet]: 'pet',
  [ItemSubTypeId.ShadowArmor]: 'shadowArmor',
  [ItemSubTypeId.ShadowShield]: 'shadowShield',
  [ItemSubTypeId.ShadowBoot]: 'shadowBoot',
  [ItemSubTypeId.ShadowEarring]: 'shadowEarring',
  [ItemSubTypeId.ShadowPendant]: 'shadowPendant',
  [ItemSubTypeId.ShadowWeapon]: 'shadowWeapon',
  [ItemSubTypeId.CostumeGarment]: 'costumeGarment',
  [ItemSubTypeId.CostumeEnhUpper]: 'costumeEnchantUpper',
  [ItemSubTypeId.CostumeEnhMiddle]: 'costumeEnchantMiddle',
  [ItemSubTypeId.CostumeEnhLower]: 'costumeEnchantLower',
  [ItemSubTypeId.CostumeEnhGarment]: 'costumeEnchantGarment',
  [ItemSubTypeId.CostumeEnhGarment2]: 'costumeEnchantGarment2',
  [ItemSubTypeId.CostumeEnhGarment4]: 'costumeEnchantGarment4',
};

const CARD_TAGS: Record<number, SlotTag[]> = {
  [CardPosition.Weapon]: ['weaponCard'],
  [CardPosition.Head]: ['headCard'],
  [CardPosition.Shield]: ['shieldCard'],
  [CardPosition.Armor]: ['armorCard'],
  [CardPosition.Garment]: ['garmentCard'],
  [CardPosition.Boot]: ['bootCard'],
  [CardPosition.AccL]: ['accCard'],
  [CardPosition.AccR]: ['accCard'],
  [CardPosition.Acc]: ['accCard'],
  // Fits any socket (e.g. Essências de Morroc) — offered in every card picker.
  [CardPosition.All]: ['weaponCard', 'headCard', 'shieldCard', 'armorCard', 'garmentCard', 'bootCard', 'accCard'],
};

/** Head-gear masks span several slots; the app offers the item under each of them. */
const headTags = (item: any, prefix: 'head' | 'costume'): SlotTag[] =>
  getHeadGearLocations(item).map((slot: string) => {
    if (slot === HeadGearLocation.Middle) return (prefix === 'head' ? 'headMiddle' : 'costumeMiddle') as SlotTag;
    if (slot === HeadGearLocation.Lower) return (prefix === 'head' ? 'headLower' : 'costumeLower') as SlotTag;
    return (prefix === 'head' ? 'headUpper' : 'costumeUpper') as SlotTag;
  });

export function classifyItem(item: any): SlotTag[] {
  const { itemTypeId, itemSubTypeId, compositionPos } = item;

  switch (itemTypeId) {
    case ItemTypeId.WEAPON:
      // Daggers (256) and one-handed swords (257) can also go in the off-hand.
      return itemSubTypeId === 256 || itemSubTypeId === 257 ? ['weapon', 'leftWeapon'] : ['weapon'];
    case ItemTypeId.CONSUMABLE:
      return ['consumable'];
    case ItemTypeId.AMMO:
      return ['ammo'];
  }

  if (itemSubTypeId === ItemSubTypeId.Upper) return headTags(item, 'head');
  if (
    itemSubTypeId === ItemSubTypeId.CostumeUpper ||
    itemSubTypeId === ItemSubTypeId.CostumeMiddle ||
    itemSubTypeId === ItemSubTypeId.CostumeLower
  ) {
    return headTags(item, 'costume');
  }
  if (itemSubTypeId === ItemSubTypeId.Acc_L) return ['accLeft'];
  if (itemSubTypeId === ItemSubTypeId.Acc_R) return ['accRight'];
  if (itemSubTypeId === ItemSubTypeId.Acc) return ['accLeft', 'accRight'];

  const direct = SUBTYPE_TAG[itemSubTypeId];
  if (direct) return [direct];

  if (itemTypeId === ItemTypeId.CARD) return CARD_TAGS[compositionPos] ?? [];
  if (itemTypeId === ItemTypeId.ENCHANT) return ['enchant'];

  return [];
}
