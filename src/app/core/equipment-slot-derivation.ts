import { EquipmentSlotDescriptor } from '../app-config/equipment-slots';
import { getEnchants, getMalangdoEnchants } from '../constants/enchant_item';
import { ExtraOptionTable } from '../constants/extra-option-table';
import { DropdownModel } from '../models/dropdown.model';
import { ItemModel } from '../models/item.model';
import { createNumberDropdownList } from '../utils/create-number-dropdown-list';
import { getGradeList } from '../utils/to-grade-list';

/**
 * What a slot offers once an item is in it: how many card sockets, which enchants each
 * position accepts, whether a grade and a refine apply, how many Bônus Aleatórios roll.
 *
 * This used to live inside EquipmentComponent, mixed with the emit bookkeeping, which is
 * why none of it was ever tested. Framework-free here so it can be.
 */
export interface SlotDerivation {
  /** Card chips to draw — the item's sockets, clamped to the fields the slot has. */
  cardSlots: number;
  /** Aligned with `descriptor.enchantFields`. `null` where the slot exposes no position. */
  enchantLists: (DropdownModel[] | null)[];
  gradeList: DropdownModel[];
  refineList: DropdownModel[];
  /** Bônus Aleatório chips to draw. */
  optionSlots: number;
}

export interface DeriveSlotInput {
  descriptor: EquipmentSlotDescriptor;
  /** The equipped item, or undefined when the slot is empty. */
  item: ItemModel | undefined;
  mapEnchant: Map<string, ItemModel>;
  /** The shared 0-18 list. */
  refineList: DropdownModel[];
  /** The shared 0-10 list. */
  shadowRefineList: DropdownModel[];
}

const toEnchantOptions = (aegisNames: unknown, mapEnchant: Map<string, ItemModel>): DropdownModel[] =>
  ((aegisNames ?? []) as string[])
    .map((aegisName) => mapEnchant.get(aegisName))
    .filter((enchant): enchant is ItemModel => !!enchant)
    .map((enchant) => ({ label: enchant.name, value: enchant.id, preRelease: enchant.preRelease }));

/**
 * The refine list a slot offers. Accessories are the only ones decided by the item: the
 * picker has to disappear on a non-refinable one, and the caller then forces refine to 0.
 */
const refineListFor = ({ descriptor, item, refineList, shadowRefineList }: DeriveSlotInput): DropdownModel[] => {
  switch (descriptor.refine) {
    case 'equip':
      return refineList;
    case 'shadow':
      return shadowRefineList;
    case 'accessory':
      return item?.isRefinable ? createNumberDropdownList({ from: 0, to: 18 }) : [];
    default:
      return [];
  }
};

const optionSlotsFor = (descriptor: EquipmentSlotDescriptor, item: ItemModel | undefined): number => {
  const offered = descriptor.optionSlotSource === 'weapon' ? 3 : descriptor.optionSlotSource === 'table' ? ExtraOptionTable[item?.aegisName] || 0 : 0;

  // The descriptor is the ceiling: ExtraOptionTable can name an item whose slot has no
  // rawOptionTxts index to write into (every boot, for one).
  return Math.min(offered, descriptor.optionIndexes.length);
};

export function deriveSlot(input: DeriveSlotInput): SlotDerivation {
  const { descriptor, item, mapEnchant } = input;
  const { id, aegisName, name, canGrade, slots } = item ?? ({} as ItemModel);

  // The Malangdo list matches by id and comes last, so an item already covered by the
  // aegisName-keyed table keeps the enchant slots that table gives it.
  const enchants = getEnchants(aegisName) ?? getEnchants(name) ?? getMalangdoEnchants(id, slots);
  const positions = Array.isArray(enchants) ? enchants : [];

  return {
    cardSlots: Math.min(slots || 0, descriptor.cardFields.length),
    enchantLists: descriptor.enchantFields.map((field, index) => (field ? toEnchantOptions(positions[index], mapEnchant) : null)),
    gradeList: descriptor.grade && canGrade ? getGradeList() : [],
    refineList: refineListFor(input),
    optionSlots: optionSlotsFor(descriptor, item),
  };
}

export interface ReconcileEnchantsInput {
  /** Straight from `deriveSlot`. */
  enchantLists: (DropdownModel[] | null)[];
  /** Current model values, aligned with `descriptor.enchantFields`. */
  current: (number | undefined)[];
  /** Whether the slot holds an item at all. */
  hasItem: boolean;
  items: Record<number, ItemModel>;
  mapEnchant: Map<string, ItemModel>;
  /**
   * True when the values are being loaded (share link, preset, replay import) rather than
   * chosen. See the note below — it is the whole point of this function.
   */
  isHydration: boolean;
}

export interface ReconcileEnchantsResult {
  /** `enchantLists`, with any rescued value appended to its position. */
  lists: (DropdownModel[] | null)[];
  /** Positions whose value has to be emptied. */
  clear: number[];
}

/**
 * Settles enchant values that the derived lists do not offer.
 *
 * The predefined enchant table is kRO-derived and can omit enchants a LATAM item
 * legitimately carries (a replay-imported U-Mental on an Illusion accessory, say). On
 * hydration, a value that is a real enchant item is surfaced in its position instead of
 * wiping the import; only values that aren't a real enchant are cleared. A user-driven
 * item swap always clears an enchant that isn't valid for the newly selected item.
 */
export function reconcileEnchants({
  enchantLists,
  current,
  hasItem,
  items,
  mapEnchant,
  isHydration,
}: ReconcileEnchantsInput): ReconcileEnchantsResult {
  const lists = [...enchantLists];
  const clear: number[] = [];

  lists.forEach((list, index) => {
    const value = current[index];
    if (!list || !hasItem || value == null) return;
    if (list.some((option) => option.value === value)) return;

    const enchant = isHydration ? items?.[value] : undefined;
    if (enchant && mapEnchant?.has(enchant.aegisName)) {
      lists[index] = [...list, { label: enchant.name, value: enchant.id }];
    } else {
      clear.push(index);
    }
  });

  return { lists, clear };
}

/**
 * Card positions to empty because the new item has fewer sockets than the old one.
 * Highest index first, matching the order the old picker cleared them in.
 */
export function cardsToClear(cardSlots: number, current: (number | undefined)[]): number[] {
  const stale: number[] = [];
  for (let index = current.length - 1; index >= 0; index -= 1) {
    if (index >= cardSlots && current[index]) stale.push(index);
  }

  return stale;
}
