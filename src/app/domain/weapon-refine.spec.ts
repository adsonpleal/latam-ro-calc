import { describe, expect, it } from 'vitest';
import { ItemModel } from '../models/item.model';
import { Weapon } from './weapon';

/**
 * The weapon refine table, level by level.
 *
 * Ground truth for the graded rows is the table williamcms sent (ATQ & ATQM **per refino**,
 * level-5 weapon):
 *
 *   Sem Grau   8      Grau C  10,4
 *   Grau D     8,8    Grau B  12
 *                     Grau A  16
 *
 * which is the ungraded 8/refine plus +10% (D), +30% (C), +50% (B), +100% (A). Only level-5
 * weapons take a grade at all (see canGradeItem), so those percentages of 8 are exactly the
 * flat per-refine constants the engine stores.
 *
 * The ungraded rows follow the classic renewal table: +2/+3/+5/+7/+8 ATK per refine for
 * weapon levels 1..5. Levels 1-4 add an over-refine bonus past their safe limit and a "high
 * refine" bonus from +16; level 5 has neither, and grants P.ATQ/S.ATQM instead.
 */

const ATK_PER_REFINE: Record<number, number> = { 1: 2, 2: 3, 3: 5, 4: 7, 5: 8 };

/** Where the over-refine bonus starts, and how much each step past it is worth. */
const OVER_REFINE: Record<number, { from: number; step: number }> = {
  1: { from: 8, step: 2 },
  2: { from: 7, step: 5 },
  3: { from: 6, step: 8 },
  4: { from: 5, step: 14 },
};

/** The "high refine" bonus is a flat multiple of the refine level, from +16 up. */
const HIGH_REFINE_FACTOR: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 3 };

const REFINES = Array.from({ length: 20 }, (_, i) => i + 1);
const LEVELS = [1, 2, 3, 4, 5];

const weaponAt = (itemLevel: number, refineLevel: number, grade = '') =>
  new Weapon().set({
    itemData: { itemLevel, attack: 100, weight: 100, itemSubTypeId: 257, script: {} } as unknown as ItemModel,
    refineLevel,
    grade,
  }).data;

describe('weapon refine bonus', () => {
  describe.each(LEVELS)('level-%i weapon', (level) => {
    it.each(REFINES)('gives the flat per-refine ATK at +%i', (refine) => {
      expect(weaponAt(level, refine).refineBonus).toBe(ATK_PER_REFINE[level] * refine);
    });

    it('grants no refine bonus at +0', () => {
      const w = weaponAt(level, 0);
      expect(w.refineBonus).toBe(0);
      expect(w.overUpgradeBonus).toBe(0);
      expect(w.highUpgradeBonus).toBe(0);
      expect(w.pAtkOrSMatk).toBe(0);
    });
  });

  describe.each([1, 2, 3, 4])('level-%i over-refine', (level) => {
    const { from, step } = OVER_REFINE[level];

    it(`stays at 0 up to +${from - 1}`, () => {
      for (const refine of REFINES.filter((r) => r < from)) {
        expect(weaponAt(level, refine).overUpgradeBonus, `+${refine}`).toBe(0);
      }
    });

    it(`adds ${step} for every refine from +${from} up`, () => {
      for (const refine of REFINES.filter((r) => r >= from)) {
        expect(weaponAt(level, refine).overUpgradeBonus, `+${refine}`).toBe((refine - from + 1) * step);
      }
    });
  });

  describe.each([1, 2, 3, 4])('level-%i high refine', (level) => {
    it('starts at +16 and scales with the refine level', () => {
      for (const refine of REFINES) {
        const expected = refine >= 16 ? refine * HIGH_REFINE_FACTOR[level] : 0;
        expect(weaponAt(level, refine).highUpgradeBonus, `+${refine}`).toBe(expected);
      }
    });
  });

  describe('level-5 weapon', () => {
    it('has no over-refine and no high-refine bonus at any refine', () => {
      for (const refine of REFINES) {
        expect(weaponAt(5, refine).overUpgradeBonus, `+${refine}`).toBe(0);
        expect(weaponAt(5, refine).highUpgradeBonus, `+${refine}`).toBe(0);
      }
    });

    it('grants 2 P.ATQ / S.ATQM per refine instead', () => {
      for (const refine of REFINES) {
        expect(weaponAt(5, refine).pAtkOrSMatk, `+${refine}`).toBe(refine * 2);
      }
    });

    it('gives no P.ATQ / S.ATQM on lower-level weapons', () => {
      for (const level of [1, 2, 3, 4]) expect(weaponAt(level, 10).pAtkOrSMatk, `lv${level}`).toBe(0);
    });
  });

  describe('grade bonus (the reported table)', () => {
    /** ATQ & ATQM per refine, level-5 weapon — the four rows of the table, verbatim. */
    const PER_REFINE: [string, number][] = [
      ['', 8],
      ['D', 8.8],
      ['C', 10.4],
      ['B', 12],
      ['A', 16],
    ];

    it.each(PER_REFINE)('grade "%s" is worth %s per refine on a +10 weapon', (grade, perRefine) => {
      // At +10 every row lands on a whole number, so the table can be read off directly.
      expect(weaponAt(5, 10, grade).refineBonus).toBe(perRefine * 10);
    });

    it.each(PER_REFINE)('grade "%s" holds at +5 too', (grade, perRefine) => {
      expect(weaponAt(5, 5, grade).refineBonus).toBe(perRefine * 5);
    });

    it('floors the fractional part rather than rounding it', () => {
      // +7 Grade D: 56 + 10% of 56 = 61,6 -> 61, not 62.
      expect(weaponAt(5, 7, 'D').refineBonus).toBe(61);
      // +7 Grade C: 56 + 30% = 72,8 -> 72.
      expect(weaponAt(5, 7, 'C').refineBonus).toBe(72);
    });

    it('accepts the grade in lower case, as the model stores it', () => {
      expect(weaponAt(5, 10, 'a').refineBonus).toBe(weaponAt(5, 10, 'A').refineBonus);
      expect(weaponAt(5, 10, 'd').refineBonus).toBe(weaponAt(5, 10, 'D').refineBonus);
    });

    it('ignores an unknown or absent grade', () => {
      const ungraded = weaponAt(5, 10).refineBonus;
      expect(weaponAt(5, 10, 'S').refineBonus).toBe(ungraded);
      expect(weaponAt(5, 10, undefined as any).refineBonus).toBe(ungraded);
    });

    it('leaves the over-refine and P.ATQ rows untouched', () => {
      // The grade scales the refine ATK only — it is not a second source of P.ATQ.
      expect(weaponAt(5, 10, 'A').pAtkOrSMatk).toBe(20);
      expect(weaponAt(4, 10, 'A').overUpgradeBonus).toBe(84);
    });
  });

  it('grants nothing to a weapon with no level, however refined', () => {
    // itemLevel is what indexes the table; an item.json entry missing it silently loses
    // every point of refine ATK. The data invariant spec guards against that.
    const w = weaponAt(undefined as any, 10, 'A');
    expect(w.refineBonus).toBe(0);
    expect(w.overUpgradeBonus).toBe(0);
    expect(w.pAtkOrSMatk).toBe(0);
  });
});
