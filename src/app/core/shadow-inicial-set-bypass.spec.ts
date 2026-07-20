import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * Conjunto Sombrio Inicial (6 pieces, declared on 24387 Malha Sombria Inicial).
 *
 * Reported anonymously: only the flat 20% bypass was computed. The description also grants
 *   "A cada refino de cada peça do conjunto (até o +30): Ignora 1% da DEF e DEFM adicional."
 *   "Nv. base 125 ou mais: Ignora 3% ... adicional."
 *   "Nv. base 130 ou mais: Ignora 3% ... adicional."
 * so a fully-refined level-130 set is 20 + 30 + 3 + 3 = **56%**, the figure in the report.
 *
 * The per-refine tier needs the summed refine capped at 30 — shadow gear refines to +10 and
 * there are six pieces, so the raw sum reaches 60. That cap is the `(30)` in
 * `REFINE[...==1(30)]---1`; see calcStepBonus.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ARMOR = 24387;
const SHIELD = 24388;
const SHOES = 24389;
const WEAPON = 24390;
const EARRING = 24391;
const PENDANT = 24392;
const FULL_SET = [ARMOR, SHIELD, SHOES, WEAPON, EARRING, PENDANT];

const SLOT_OF: Record<number, string> = {
  [ARMOR]: 'shadowArmor',
  [SHIELD]: 'shadowShield',
  [SHOES]: 'shadowBoot',
  [WEAPON]: 'shadowWeapon',
  [EARRING]: 'shadowEarring',
  [PENDANT]: 'shadowPendant',
};

/** Equip the listed pieces, each at `refine`, at base level `level`. */
function statsOf(pieces: number[], refine: number, level = 100): Record<string, number> {
  const items: any = {};
  for (const id of pieces) items[id] = { ...db[id] };

  const model = createMainModel();
  model.level = level;
  for (const id of pieces) {
    model[SLOT_OF[id]] = id;
    model[`${SLOT_OF[id]}Refine`] = refine;
  }

  return equipStatusOf(makeCalculator(items), model);
}

/** The two bypass keys, which every case below asserts together. */
function bypass(pieces: number[], refine: number, level = 100): { phy: number; mag: number } {
  const bonus = statsOf(pieces, refine, level);

  return { phy: bonus['p_pene_race_all'], mag: bonus['m_pene_race_all'] };
}

describe('Conjunto Sombrio Inicial — bypass', () => {
  it('reproduces the reported total: full set, refines summing past 30, level 130 → 56%', () => {
    // +10 on each of six pieces = 60 raw, capped at 30. 20 + 30 + 3 + 3.
    expect(bypass(FULL_SET, 10, 130)).toEqual({ phy: 56, mag: 56 });
  });

  it('grants only the flat 20% at refine 0 and below level 125', () => {
    expect(bypass(FULL_SET, 0, 124)).toEqual({ phy: 20, mag: 20 });
  });

  it('adds 1% per point of summed set refine', () => {
    // +2 on each of six pieces = 12 summed, under the cap.
    expect(bypass(FULL_SET, 2, 100)).toEqual({ phy: 32, mag: 32 });
  });

  it('caps the per-refine tier at 30, however high the pieces go', () => {
    // +5 each = exactly 30 (the cap); +10 each = 60 raw but still 30.
    expect(bypass(FULL_SET, 5, 100).phy).toBe(50);
    expect(bypass(FULL_SET, 10, 100).phy).toBe(50);
  });

  it('adds the level tiers at 125 and again at 130, not before', () => {
    expect(bypass(FULL_SET, 0, 124).phy).toBe(20);
    expect(bypass(FULL_SET, 0, 125).phy).toBe(23);
    expect(bypass(FULL_SET, 0, 129).phy).toBe(23);
    expect(bypass(FULL_SET, 0, 130).phy).toBe(26);
    expect(bypass(FULL_SET, 0, 200).phy).toBe(26);
  });

  it('grants nothing at all while a piece is missing', () => {
    for (const missing of FULL_SET) {
      if (missing === ARMOR) continue; // the armor carries the set; without it nothing applies
      const worn = FULL_SET.filter((id) => id !== missing);
      expect(bypass(worn, 10, 130), `without ${missing}`).toEqual({ phy: 0, mag: 0 });
    }
  });

  it('does not fire from the armor alone', () => {
    expect(bypass([ARMOR], 10, 130)).toEqual({ phy: 0, mag: 0 });
  });

  it('keeps the armor\'s own stat lines', () => {
    const bonus = statsOf([ARMOR], 7, 130);

    expect(bonus['int']).toBe(2);
    expect(bonus['hp']).toBe(70); // "HP máx. +10 por refino" at +7
  });
});
