import { describe, expect, it } from 'vitest';
import { ItemModel } from '../models/item.model';
import { canGradeItem } from './can-grade';

/**
 * Reported by williamcms: the "Armas Decadentes" (Espada Decadente 500018 and family) are
 * level-5 weapons but the grade dropdown was greyed out on them.
 *
 * The rule the LATAM client applies is purely a level check — a weapon of "Nível da arma 5"
 * or an equipment of "Nível do Equip. 2" can receive an Enchant Grade. Nothing else can.
 * item.json carried `canGrade` as a hand-maintained flag, which drifts every import; this
 * derives it instead.
 */

const weapon = (itemLevel: any): ItemModel => ({ itemTypeId: 1, itemLevel } as ItemModel);
const armor = (itemLevel: any): ItemModel => ({ itemTypeId: 2, itemLevel } as ItemModel);

describe('canGradeItem', () => {
  it('allows grading a level-5 weapon', () => {
    expect(canGradeItem(weapon(5))).toBe(true);
  });

  it('refuses every weapon below level 5', () => {
    for (const lv of [1, 2, 3, 4]) expect(canGradeItem(weapon(lv)), `weapon lv${lv}`).toBe(false);
  });

  it('allows grading a level-2 equipment', () => {
    expect(canGradeItem(armor(2))).toBe(true);
  });

  it('refuses a level-1 equipment, and equipment with no printed level', () => {
    // Gear that predates the level system prints no "Nível do Equip." line; it is level 1.
    expect(canGradeItem(armor(1))).toBe(false);
    expect(canGradeItem(armor(null))).toBe(false);
    expect(canGradeItem(armor(undefined))).toBe(false);
  });

  it('does not read a weapon level as an equipment level, or the reverse', () => {
    expect(canGradeItem(weapon(2))).toBe(false);
    expect(canGradeItem(armor(5))).toBe(false);
  });

  it('refuses non-equipment item types whatever their level', () => {
    // 4 = ammo, 6 = card, 10/11 = shadow gear & enchants — none of them take a grade.
    for (const itemTypeId of [3, 4, 5, 6, 9, 10, 11]) {
      expect(canGradeItem({ itemTypeId, itemLevel: 5 } as ItemModel), `typeId ${itemTypeId}`).toBe(false);
      expect(canGradeItem({ itemTypeId, itemLevel: 2 } as ItemModel), `typeId ${itemTypeId}`).toBe(false);
    }
  });

  it('survives a missing item', () => {
    expect(canGradeItem(undefined)).toBe(false);
    expect(canGradeItem({} as ItemModel)).toBe(false);
  });
});
