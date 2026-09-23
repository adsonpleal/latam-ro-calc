import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { ITEM_DB } from './__tests__/worn-bonus';

const worn = (pieces: Record<string, number>, refines: Record<string, number> = {}) => {
  const model: any = createMainModel();
  model.level = 200;
  const items: Record<number, any> = {};
  for (const [slot, id] of Object.entries(pieces)) {
    items[id] = ITEM_DB[id];
    model[slot] = id;
    model[`${slot}Refine`] = refines[slot] ?? 0;
  }
  return equipStatusOf(makeCalculator(items), model);
};

describe('Master Shadow preview sets', () => {
  it('adds each Sword armor set tier only with its complete set and summed refine', () => {
    const armor = { shadowArmor: 1270005 };
    const pair = { ...armor, shadowBoot: 1270006 };
    const trio = { ...pair, shadowShield: 24793 };
    const pair14 = worn(pair, { shadowArmor: 7, shadowBoot: 7 });
    const pair15 = worn(pair, { shadowArmor: 8, shadowBoot: 7 });
    const pair18 = worn(pair, { shadowArmor: 9, shadowBoot: 9 });
    const trio26 = worn(trio, { shadowArmor: 9, shadowBoot: 9, shadowShield: 8 });
    const trio27 = worn(trio, { shadowArmor: 9, shadowBoot: 9, shadowShield: 9 });
    const shieldOnly = worn({ ...armor, shadowShield: 24793 }, { shadowArmor: 9, shadowShield: 9 });

    expect(pair14.pAtk).toBe(2);
    expect(pair14.hpPercent).toBe(0);
    expect(pair15.hpPercent).toBe(3);
    expect(pair15.p_element_all).toBe(5);
    expect(pair18.p_pene_race_all).toBe(50);
    expect(shieldOnly.p_size_all).toBe(0);
    expect(trio26.p_size_all).toBe(5);
    expect(trio26.pene_res).toBe(0);
    expect(trio27.pene_res).toBe(10);
  });

  it('requires every piece for the Elemental Master six-piece resistance bonus', () => {
    const armorSide = { shadowArmor: 24844, shadowBoot: 24845, shadowShield: 24793 };
    const full = {
      ...armorSide, shadowEarring: 24846, shadowPendant: 24847, shadowWeapon: 24792,
    };
    const at26 = worn(armorSide, { shadowArmor: 9, shadowBoot: 9, shadowShield: 8 });
    const at27 = worn(armorSide, { shadowArmor: 9, shadowBoot: 9, shadowShield: 9 });
    const missingPendant = worn({ ...full, shadowPendant: 0 });
    const complete = worn(full);

    expect(at26.p_pene_race_all).toBe(0);
    expect(at27.p_pene_race_all).toBe(50);
    expect(missingPendant.pene_res).toBe(0);
    expect(complete.pene_res).toBe(20);
    expect(complete.pene_mres).toBe(20);
  });
});
