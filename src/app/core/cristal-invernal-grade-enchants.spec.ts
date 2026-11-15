import { describe, expect, it } from 'vitest';
import { FACA_3, wornBonus } from './__tests__/worn-bonus';

/**
 * Cristal Invernal (Grau Físico/Mágico 1-5) — the ten weapon enchants 311449-311458.
 *
 * Each states two independently gated clauses: a P.ATQ/S.ATQM line behind "Grau C ou
 * mais" and a POD-or-FEI/CON line behind "Grau B ou mais". Levels 1 and 2 word those as a
 * refine threshold ("Refino +N ou mais"), levels 3 to 5 as a refine step ("A cada N
 * refinos"), and the two shapes are one character apart in the item script (`N===V`
 * against `N---V`) — which is how the Lv5 pair shipped with the step flattened to a
 * constant, reported on the board as "bônus dim glacier errado" (0OboeM3SBvbQ0URoaFs9).
 *
 * The numbers come from each item's pt-BR client description, cross-checked against the
 * es/en text and the upstream Thai line still carried in item.json.
 *
 * The host is an inert dagger rather than the reported katar: every clause here gates on
 * the weapon's grade and refine, never on its type.
 */

/** floor(refino / 3) · 4 behind Grau C, so the steps turn at +3, +6, +9 and +12. */
const LV5_STEPS = [[0, 0], [2, 0], [3, 4], [5, 4], [6, 8], [9, 12], [11, 12], [12, 16]] as const;
/** floor(refino / 2) · 1 behind Grau B. */
const LV5_TRAIT_STEPS = [[0, 0], [1, 0], [2, 1], [3, 1], [4, 2], [11, 5], [12, 6]] as const;

const read = (enchant: number, refine: number, grade: string) =>
  wornBonus({ weapon: FACA_3, weaponRefine: refine, weaponGrade: grade, weaponEnchants: [enchant] });

describe.each([
  [311453, 'pAtk', 'sMatk', 'pow'],
  [311458, 'sMatk', 'pAtk', 'spl'],
] as const)('Cristal Invernal Grau 5 (%i)', (id, stat, otherStat, trait) => {
  it.each(LV5_STEPS)('at +%i grants %i once the weapon is Grau C', (refine, value) => {
    expect(read(id, refine, 'C')).toMatchObject({ [stat]: value, [otherStat]: 0 });
  });

  // The gate is the equipment grade, not the "Grau Físico 5" in the item's own name: below
  // Grau C the clause pays nothing, however high the refine.
  it.each(['', 'D'])('pays nothing at grade "%s", even at +12', grade => {
    expect(read(id, 12, grade)).toMatchObject({ [stat]: 0, [otherStat]: 0 });
  });

  // The trait line sits one tier higher, so Grau C must not pay it.
  it.each(LV5_TRAIT_STEPS)('at +%i grants %i of its trait pair once the weapon is Grau B', (refine, value) => {
    expect(read(id, refine, 'B')).toMatchObject({ [trait]: value, con: value });
    expect(read(id, refine, 'C')).toMatchObject({ [trait]: 0, con: 0 });
  });

  // The reported case: a +12 Grau A weapon, which was paying a flat 4 instead of 16.
  it('pays the full step total on a +12 Grau A weapon', () => {
    expect(read(id, 12, 'A')).toMatchObject({ [stat]: 16, [otherStat]: 0, [trait]: 6, con: 6 });
  });
});

describe('Cristal Invernal Graus 1-4', () => {
  // Levels 1 and 2 word the same clause as a threshold rather than a step; keeping them
  // here is what stops a future edit from "fixing" them into steps as well.
  it.each([
    [311449, 8, 0], [311449, 9, 3], [311449, 12, 3],
    [311450, 6, 0], [311450, 7, 3], [311450, 12, 3],
  ])('%i pays its P.ATQ as a flat threshold: +%i gives %i', (id, refine, pAtk) => {
    expect(read(id, refine, 'C')).toMatchObject({ pAtk });
  });

  // Levels 3 and 4 already stepped correctly; they pin the divisors the Lv5 pair lost.
  it.each([
    [311451, 4, 0], [311451, 5, 3], [311451, 12, 6],
    [311452, 3, 0], [311452, 4, 3], [311452, 7, 3], [311452, 12, 9],
  ])('%i steps its P.ATQ: +%i gives %i', (id, refine, pAtk) => {
    expect(read(id, refine, 'C')).toMatchObject({ pAtk });
  });

  // The physical half of the family grants no S.ATQM and the magical half no P.ATQ; the
  // Lv5 pair is covered by the cross-stat assertions above.
  it('keeps the physical and magical halves apart', () => {
    for (let id = 311449; id <= 311452; id++) expect(read(id, 12, 'A').sMatk).toBe(0);
    for (let id = 311454; id <= 311457; id++) expect(read(id, 12, 'A').pAtk).toBe(0);
  });
});
