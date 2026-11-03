import { describe, expect, it } from 'vitest';
import { Worn, wornBonus } from './__tests__/worn-bonus';

/**
 * 15195 Robe Puente Ilusional and its `Conjunto [Maça Longa Ilusional]` (16063).
 *
 * The record carried only half of what the client promises: the set's ATQM +100 and the
 * two Efetividade de cura lines were there, but the robe's own Conjuração fixa, the
 * ATQM +50 that needs both pieces at +7 and the Pós-conjuração -15% at a summed refine of
 * 22 were missing, so wearing the pair fell short of the description.
 *
 * Source: the robe's pt-BR client description (latam-items.json, 15195), confirmed by the
 * dpRO entry for the same id:
 *
 *   Conjuração fixa -3%. / Efetividade de cura +5%.
 *   A cada refino: Conjuração fixa -3%. / Efetividade de cura +1%.
 *   Conjunto [Maça Longa Ilusional]: ATQM +100. / Efetividade de cura +20%.
 *   Arma e Armadura refinados no +7: ATQM +50 adicional.
 *   Soma dos refinos 18 ou mais: Efetividade de cura +15% adicional.
 *   Soma dos refinos 22 ou mais: Pós-conjuração -15%.
 *
 * The mace carries no set clause of its own, so everything is registered on the robe —
 * `docs/item-json.md` §6.
 */

const ROBE = 15195;
const MACA = 16063;
/** Plain Maça Longa: same weapon family, not the set partner. */
const MACA_COMUM = 1525;

const worn = (p: Worn) => wornBonus({ armor: ROBE, ...p });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('Robe Puente Ilusional — its own lines', () => {
  it('cuts fixed casting by 3%, and 3% more per refine', () => {
    expect(stat(worn({}), 'fctPercent')).toBe(3);
    expect(stat(worn({ armorRefine: 1 }), 'fctPercent')).toBe(6);
    expect(stat(worn({ armorRefine: 11 }), 'fctPercent')).toBe(36);
  });

  it('raises healing effectiveness by 5%, and 1% more per refine', () => {
    expect(stat(worn({}), 'healPower')).toBe(5);
    expect(stat(worn({ armorRefine: 11 }), 'healPower')).toBe(16);
  });
});

describe('Conjunto [Maça Longa Ilusional]', () => {
  it('gives ATQM +100 and Efetividade de cura +20% with the mace on', () => {
    const alone = worn({ armorRefine: 5 });
    const set = worn({ weapon: MACA, weaponRefine: 5, armorRefine: 5 });

    expect(stat(set, 'matk') - stat(alone, 'matk')).toBe(100);
    expect(stat(set, 'healPower') - stat(alone, 'healPower')).toBe(20);
  });

  it('ignores a plain Maça Longa', () => {
    const comum = worn({ weapon: MACA_COMUM, weaponRefine: 11, armorRefine: 11 });

    expect(stat(comum, 'matk')).toBe(0);
    expect(stat(comum, 'acd')).toBe(0);
  });

  it('adds the extra ATQM +50 only when both pieces reach +7', () => {
    expect(stat(worn({ weapon: MACA, weaponRefine: 6, armorRefine: 7 }), 'matk')).toBe(100);
    expect(stat(worn({ weapon: MACA, weaponRefine: 7, armorRefine: 6 }), 'matk')).toBe(100);
    expect(stat(worn({ weapon: MACA, weaponRefine: 7, armorRefine: 7 }), 'matk')).toBe(150);
  });

  it('adds the extra Efetividade de cura +15% once the refines sum to 18', () => {
    // The robe's own +1 per refine rides along, so the tier is read as the step it adds.
    const at17 = worn({ weapon: MACA, weaponRefine: 8, armorRefine: 9 });
    const at18 = worn({ weapon: MACA, weaponRefine: 9, armorRefine: 9 });

    expect(stat(at18, 'healPower') - stat(at17, 'healPower')).toBe(15);
  });

  it('cuts Pós-conjuração by 15% once the refines sum to 22', () => {
    expect(stat(worn({ weapon: MACA, weaponRefine: 10, armorRefine: 11 }), 'acd')).toBe(0);
    expect(stat(worn({ weapon: MACA, weaponRefine: 11, armorRefine: 11 }), 'acd')).toBe(15);
  });

  it('leaves the pós-conjuração alone when only the robe is worn at a high refine', () => {
    expect(stat(worn({ armorRefine: 11 }), 'acd')).toBe(0);
  });
});
