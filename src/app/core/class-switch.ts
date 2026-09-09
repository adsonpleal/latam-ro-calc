import { EQUIPMENT_SLOTS, EquipmentSlotDescriptor, SlotClassFilter } from '../app-config/equipment-slots';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { DEFAULT_PET_LOYALTY } from '../constants/pet-loyalty';
import { WeaponTypeName, WeaponTypeNameMapBySubTypeId } from '../constants/weapon-type-mapper';
import { CharacterBase } from '../jobs/_character-base.abstract';
import { ClassName } from '../jobs/_class-name';
import { ItemModel } from '../models/item.model';
import { MainModel } from '../models/main.model';

/**
 * Switching class while keeping the build.
 *
 * The class dropdown used to wipe the model down to class/level/job, so every switch was
 * a fresh start whether or not that was wanted. Keeping the build instead is only safe
 * once the parts that belong to the old class are taken out of it, and this module is
 * that subtraction: which equipped items the new class cannot wear, and what else in the
 * model stops meaning anything once the class changes.
 *
 * Framework-free so the rules can be tested without the picker. The dialog only renders
 * what `findClassSwitchLosses` returns and hands the choice back to `applyClassSwitch`.
 */

/** The two fields an item (or a picker row built from one) carries about who may wear it. */
export interface ClassUsage {
  usableClass?: string[];
  unusableClass?: string[];
}

/**
 * The plain class test, and the one the equipment dropdowns run.
 *
 * `unusableClass` is checked first and wins outright: a few items name the classes that
 * may *not* wear them and leave `usableClass` open. An item that names neither goes on
 * anyone.
 */
export const isUsableByClass = (usage: ClassUsage | undefined, classNameSet: Set<string>): boolean => {
  if (!usage) return true;

  const { usableClass, unusableClass } = usage;
  if (Array.isArray(unusableClass) && unusableClass.length > 0 && unusableClass.some((name) => classNameSet.has(name))) {
    return false;
  }
  if (Array.isArray(usableClass)) {
    return usableClass.some((name) => classNameSet.has(name));
  }

  return true;
};

/**
 * The six one-handed types a Super Novice may carry at weapon level 4, on top of whatever
 * its own `usableClass` rows allow. Mirrors the picker's long-standing exemption.
 */
const SUPER_NOVICE_WEAPON_TYPES = new Set<WeaponTypeName>(['dagger', 'sword', 'axe', 'mace', 'rod', 'twohandRod']);

/**
 * Whether `item` may sit in a slot filtered by `rule` on `cClass`.
 *
 * An id with no record behind it is left alone — the picker cannot judge it either, and
 * dropping an item because its record failed to load would be worse than keeping it.
 */
export const isEquipableInSlot = (rule: SlotClassFilter, item: ItemModel | undefined, cClass: CharacterBase): boolean => {
  if (!item || rule === 'none') return true;

  if (cClass.className === ClassName.SuperNovice) {
    if (rule === 'headGear') return true;
    if (rule === 'weapon' && item.itemLevel === 4 && SUPER_NOVICE_WEAPON_TYPES.has(WeaponTypeNameMapBySubTypeId[item.itemSubTypeId])) {
      return true;
    }
  }

  return isUsableByClass(item as ClassUsage, cClass.classNameSet);
};

/** Why a slot has to be emptied. */
export type ClassSwitchLossReason =
  /** The new class is not on the item's `usableClass`, or is on its `unusableClass`. */
  | 'class'
  /** A second weapon, on a class that does not dual wield — the row is not even drawn. */
  | 'offHand';

export interface ClassSwitchLoss {
  key: ItemTypeEnum;
  /** pt-BR slot heading, straight from the descriptor. */
  slotLabel: string;
  itemId: number;
  /** pt-BR item name, or the bare id when the record is missing. */
  itemName: string;
  reason: ClassSwitchLossReason;
}

export interface ClassSwitchInput {
  model: MainModel;
  items: Record<number, ItemModel>;
  nextClass: CharacterBase;
  /** Whether the new class may hold a weapon in the off hand (`AllowLeftWeaponMapper`). */
  canWieldOffHandWeapon: boolean;
}

/**
 * Every equipped item the new class would have to give up, in picker order.
 *
 * Cards, enchants and the pet are absent by construction: their lists are not filtered by
 * class (`classFilter: 'none'`), so they survive any switch. A card socketed in a weapon
 * the class cannot hold still goes, but as part of that weapon's slot rather than on its
 * own row — see `clearSlots`.
 */
export function findClassSwitchLosses({ model, items, nextClass, canWieldOffHandWeapon }: ClassSwitchInput): ClassSwitchLoss[] {
  const losses: ClassSwitchLoss[] = [];

  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = model[slot.key] as number;
    if (!itemId) continue;

    const item = items?.[itemId];
    const reason: ClassSwitchLossReason | undefined =
      slot.key === ItemTypeEnum.leftWeapon && !canWieldOffHandWeapon
        ? 'offHand'
        : isEquipableInSlot(slot.classFilter, item, nextClass)
          ? undefined
          : 'class';

    if (!reason) continue;

    losses.push({ key: slot.key, slotLabel: slot.label, itemId, itemName: item?.name ?? String(itemId), reason });
  }

  return losses;
}

/** Empty a slot: the item, its refine, grade, cards, enchants, random options and chips. */
const clearSlot = (model: MainModel, slot: EquipmentSlotDescriptor): void => {
  model[slot.key] = undefined;
  model[`${slot.key}Refine`] = undefined;
  model[`${slot.key}Grade`] = undefined;

  for (const field of [...slot.cardFields, ...slot.enchantFields]) {
    if (field) model[field] = undefined;
  }
  for (const sub of slot.subItemSlots ?? []) {
    model[sub.key] = undefined;
  }
  for (const index of slot.optionIndexes) {
    model.rawOptionTxts[index] = undefined;
  }

  // The chips that belong to the item rather than to the slot. Ammo is picked from a list
  // the weapon decides, and the converter paints that weapon's element: with the weapon
  // gone neither has anything left to apply to.
  if (slot.ammo) model.ammo = undefined;
  if (slot.converter) model.propertyAtk = undefined;
  if (slot.loyalty) model.petLoyalty = DEFAULT_PET_LOYALTY;
};

/**
 * The build as the new class would carry it: the named slots emptied, and the trait
 * points dropped when the class has none.
 *
 * Traits are the quiet one. `damage-calculator` adds `model.pow` and friends into the
 * totals whatever the class is, and only the *input* is hidden on a class without a trait
 * table — so a 4th-class build carried over to a 3rd class would keep paying POD and CON
 * with no field on screen to explain it.
 *
 * Mutates and returns `model`; callers pass a copy.
 */
export function applyClassSwitch(model: MainModel, losses: ClassSwitchLoss[], nextClass: CharacterBase): MainModel {
  model.rawOptionTxts = [...(model.rawOptionTxts ?? [])];

  const byKey = new Map(EQUIPMENT_SLOTS.map((slot) => [slot.key, slot]));
  for (const loss of losses) {
    const slot = byKey.get(loss.key);
    if (slot) clearSlot(model, slot);
  }

  if (!nextClass.isAllowTraitStat()) {
    model.pow = 0;
    model.sta = 0;
    model.wis = 0;
    model.spl = 0;
    model.con = 0;
    model.crt = 0;
  }

  return model;
}

/**
 * Whether the build holds anything a switch could carry over.
 *
 * A blank sheet has nothing to ask about, so the dialog stays out of the way until the
 * user has actually put something in it. Only the two things the dialog offers to keep
 * count: worn items and hand-assigned stat points.
 */
export function hasBuildToKeep(model: MainModel): boolean {
  if (EQUIPMENT_SLOTS.some((slot) => model[slot.key])) return true;
  if ([model.str, model.agi, model.vit, model.int, model.dex, model.luk].some((stat) => (stat ?? 1) > 1)) return true;

  return [model.pow, model.sta, model.wis, model.spl, model.con, model.crt].some((trait) => (trait ?? 0) > 0);
}
