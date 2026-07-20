import { HeadGearLocation } from '../constants/head-gear-location';
import { ItemSubTypeId } from '../constants/item-sub-type.enum';
import { ItemTypeEnum } from '../constants/item-type.enum';

/**
 * Head gear that occupies more than one slot — a Middle+Lower mask, an Upper+Middle helm.
 * In game the item fills every slot it lists, so nothing else can go there.
 *
 * item.json states this as `locations: ["Middle", "Lower"]`. It is only present on the
 * ~118 multi-slot items; everything else keeps the single `location` string (or, for
 * costumes, nothing at all — the sub type already says which slot it belongs to).
 */

/** Head slots top-to-bottom. Every list this module returns follows this order. */
const SLOT_ORDER = [HeadGearLocation.Upper, HeadGearLocation.Middle, HeadGearLocation.Lower] as const;

const COSTUME_SUB_TYPE_LOCATION: Partial<Record<ItemSubTypeId, HeadGearLocation>> = {
  [ItemSubTypeId.CostumeUpper]: HeadGearLocation.Upper,
  [ItemSubTypeId.CostumeMiddle]: HeadGearLocation.Middle,
  [ItemSubTypeId.CostumeLower]: HeadGearLocation.Lower,
};

const EQUIP_SLOT: Record<HeadGearLocation, ItemTypeEnum> = {
  [HeadGearLocation.Upper]: ItemTypeEnum.headUpper,
  [HeadGearLocation.Middle]: ItemTypeEnum.headMiddle,
  [HeadGearLocation.Lower]: ItemTypeEnum.headLower,
};

const COSTUME_SLOT: Record<HeadGearLocation, ItemTypeEnum> = {
  [HeadGearLocation.Upper]: ItemTypeEnum.costumeUpper,
  [HeadGearLocation.Middle]: ItemTypeEnum.costumeMiddle,
  [HeadGearLocation.Lower]: ItemTypeEnum.costumeLower,
};

/** Every model field a head gear can live in — real slots then costume slots, in slot order. */
export const HEAD_SLOTS = [...SLOT_ORDER.map((l) => EQUIP_SLOT[l]), ...SLOT_ORDER.map((l) => COSTUME_SLOT[l])];

interface HeadGearLike {
  itemSubTypeId?: number;
  location?: unknown;
  locations?: unknown;
}

/** Exported for the specs; the module's own callers reach it through the two below. */
export function isCostumeHeadGear(item: HeadGearLike | null | undefined): boolean {
  return COSTUME_SUB_TYPE_LOCATION[item?.itemSubTypeId as ItemSubTypeId] !== undefined;
}

function isHeadGear(item: HeadGearLike | null | undefined): boolean {
  return item?.itemSubTypeId === ItemSubTypeId.Upper || isCostumeHeadGear(item);
}

/**
 * Which head positions an item occupies, in slot order. Falls back to the single
 * `location` (and, for a costume, to its sub type) so the ~2.3k single-slot head gears
 * need no data change at all. `location` is `null` on plenty of upper head gears, which
 * is why Upper is the last resort rather than an error.
 */
export function getHeadGearLocations(item: HeadGearLike | null | undefined): HeadGearLocation[] {
  if (!isHeadGear(item)) return [];

  const declared = Array.isArray(item.locations) ? item.locations : [];
  const known = SLOT_ORDER.filter((l) => declared.includes(l));
  if (known.length) return known;

  const single = SLOT_ORDER.find((l) => l === (item.location as HeadGearLocation));
  if (single) return [single];

  return [COSTUME_SUB_TYPE_LOCATION[item.itemSubTypeId as ItemSubTypeId] ?? HeadGearLocation.Upper];
}

/**
 * Which model fields the item fills — the costume family and the equipment family are
 * disjoint, so an item only ever occupies slots within its own.
 */
export function getHeadGearSlots(item: HeadGearLike | null | undefined): ItemTypeEnum[] {
  const map = isCostumeHeadGear(item) ? COSTUME_SLOT : EQUIP_SLOT;

  return getHeadGearLocations(item).map((l) => map[l]);
}

interface HeadSlotOccupancy {
  /** Slot the player cannot use -> the slot holding the item that spans it. */
  occupiedBy: Partial<Record<ItemTypeEnum, ItemTypeEnum>>;
  /** Slots that must be emptied because two items are fighting over the same position. */
  toClear: ItemTypeEnum[];
}

/**
 * Works out which head slots are taken over by a multi-slot item sitting elsewhere, and
 * which selections have to go because they collide with one.
 *
 * `equipped` holds only the head slots that currently have an item. `priority` names the
 * slots the player just touched: when two items overlap, the one they did *not* just
 * choose loses, so picking a plain hat frees the mask's slot rather than being rejected.
 * With no priority (or both sides in it, as on a share-link load) the spanning item wins,
 * since it is the one the game would actually let you wear.
 */
export function resolveHeadSlotOccupancy(
  equipped: Partial<Record<ItemTypeEnum, HeadGearLike>>,
  priority: ReadonlySet<ItemTypeEnum> = new Set(),
): HeadSlotOccupancy {
  const occupiedBy: Partial<Record<ItemTypeEnum, ItemTypeEnum>> = {};
  const toClear = new Set<ItemTypeEnum>();

  for (const [slot, item] of Object.entries(equipped) as [ItemTypeEnum, HeadGearLike][]) {
    if (!item) continue;

    for (const covered of getHeadGearSlots(item)) {
      if (covered === slot) continue;
      occupiedBy[covered] = slot;
      if (!equipped[covered]) continue;
      // The covered slot loses unless it alone is the fresh pick.
      toClear.add(priority.has(covered) && !priority.has(slot) ? slot : covered);
    }
  }

  return { occupiedBy, toClear: [...toClear] };
}
