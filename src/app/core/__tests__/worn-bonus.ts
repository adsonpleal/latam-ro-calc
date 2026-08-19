import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Equip a handful of pieces by id and read the summed equipment bonus back.
 *
 * Complements make-calculator.ts: that one builds the Calculator, this one fills the doll.
 * A spec that only cares about one boot should not have to spell out the model, the item
 * type/subtype each slot expects, and the refine fields — it says `wornBonus({ boot, refine })`
 * and asserts on the keys.
 *
 * Only the slots the item specs actually use are here. Adding one is a two-line change; a
 * spec needing something stranger (two weapons, a real class, base stats) should build its
 * own, the way cinzas-helm-sets and cachecol-schmidt-sets do.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** A db record carrying the type/subtype its model slot expects. */
const withSlot = (id: number, itemTypeId: number, itemSubTypeId: number) => ({
  ...db[id],
  itemTypeId,
  itemSubTypeId,
});

export interface Worn {
  weapon?: number;
  weaponRefine?: number;
  weaponGrade?: string;
  weaponCard?: number;
  headUpper?: number;
  headUpperRefine?: number;
  /** Enchant slots 1-3 of the upper head gear, by enchant item id. */
  headUpperEnchants?: number[];
  headMiddle?: number;
  headLower?: number;
  boot?: number;
  bootRefine?: number;
  bootGrade?: string;
  /** Enchant slots 1-3 of the shoes, by enchant item id. */
  bootEnchants?: number[];
  bootCard?: number;
  accRight?: number;
  accLeft?: number;
  garment?: number;
  garmentRefine?: number;
  shield?: number;
}

/** Build the calculation with just these pieces and hand back the summed equipment bonus. */
export function wornBonus(worn: Worn): Record<string, number> {
  const items: Record<number, any> = {};
  const model: any = createMainModel();
  model.level = 200;

  if (worn.weapon) {
    items[worn.weapon] = db[worn.weapon];
    model.weapon = worn.weapon;
    model.weaponRefine = worn.weaponRefine ?? 0;
    if (worn.weaponGrade) model.weaponGrade = worn.weaponGrade;
  }
  if (worn.weaponCard) {
    items[worn.weaponCard] = withSlot(worn.weaponCard, 6, 0);
    model.weaponCard1 = worn.weaponCard;
  }
  if (worn.headUpper) {
    items[worn.headUpper] = withSlot(worn.headUpper, 2, 512);
    model.headUpper = worn.headUpper;
    model.headUpperRefine = worn.headUpperRefine ?? 0;
    // Enchants ride the same slot, one model field per position (1-based, like the UI).
    (worn.headUpperEnchants ?? []).forEach((enchant, i) => {
      items[enchant] = db[enchant];
      model[`headUpperEnchant${i + 1}`] = enchant;
    });
  }
  if (worn.headMiddle) {
    items[worn.headMiddle] = withSlot(worn.headMiddle, 2, 512);
    model.headMiddle = worn.headMiddle;
  }
  if (worn.headLower) {
    items[worn.headLower] = withSlot(worn.headLower, 2, 512);
    model.headLower = worn.headLower;
  }
  if (worn.boot) {
    items[worn.boot] = withSlot(worn.boot, 2, 516);
    model.boot = worn.boot;
    model.bootRefine = worn.bootRefine ?? 0;
    if (worn.bootGrade) model.bootGrade = worn.bootGrade;
    // Enchants ride the same slot, one model field per position (1-based, like the UI).
    (worn.bootEnchants ?? []).forEach((enchant, i) => {
      items[enchant] = db[enchant];
      model[`bootEnchant${i + 1}`] = enchant;
    });
  }
  if (worn.bootCard) {
    items[worn.bootCard] = withSlot(worn.bootCard, 6, 0);
    model.bootCard = worn.bootCard;
  }
  if (worn.accRight) {
    items[worn.accRight] = withSlot(worn.accRight, 2, 510);
    model.accRight = worn.accRight;
  }
  if (worn.accLeft) {
    items[worn.accLeft] = withSlot(worn.accLeft, 2, 511);
    model.accLeft = worn.accLeft;
  }
  if (worn.garment) {
    items[worn.garment] = withSlot(worn.garment, 2, 515);
    model.garment = worn.garment;
    model.garmentRefine = worn.garmentRefine ?? 0;
  }
  if (worn.shield) {
    items[worn.shield] = withSlot(worn.shield, 2, 514);
    model.shield = worn.shield;
  }

  return equipStatusOf(makeCalculator(items), model);
}

/** The raw item.json, for specs that assert on a record rather than on a bonus. */
export const ITEM_DB = db;

// Weapons used only as card carriers / weapon-class conditions.
export const ESPADA_2H = 1160; // Espada Larga — twohandSword
export const MACHADO_2H = 1371; // Machado do Apocalipse — twohandAxe
export const ESPADA_1H = 1123; // Haedonggum — sword
export const LIVRO = 1551; // Bíblia — book

/** `totalEquipStatus` already starts at DEFAULT_PERFECT_HIT; an item adds on top. */
export const BASE_PERFECT_HIT = 5;
