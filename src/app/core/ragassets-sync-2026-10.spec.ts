import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { createRawTotalBonus } from 'src/app/utils/create-raw-total-bonus';
import { ITEM_BONUS_LABELS } from './bonus-key-label';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const engine = items[480956];

describe('Motor Desbravador 480956', () => {
  const worn = (level: number, garmentRefine: number) =>
    equipStatusOf(makeCalculator({ 480956: engine }), {
      ...createMainModel(), level, garment: 480956, garmentRefine,
    });

  it('scales ATQ, ATQM, HP and SP every two base levels', () => {
    const at1 = worn(1, 0);
    const at2 = worn(2, 0);
    const at200 = worn(200, 0);
    for (const key of ['atk', 'matk', 'hp', 'sp']) expect(at1[key] || 0, key).toBe(0);
    expect([at2.atk, at2.matk, at2.hp, at2.sp]).toEqual([1, 1, 20, 2]);
    expect([at200.atk, at200.matk, at200.hp, at200.sp]).toEqual([100, 100, 2000, 200]);
  });

  it('gates EXP and neutral resistance at +7 and +9', () => {
    expect(createRawTotalBonus().expGainPercent).toBe(0);
    expect(ITEM_BONUS_LABELS.expGainPercent).toBe('EXP ao derrotar monstros');
    expect(worn(100, 6).expGainPercent).toBe(0);
    expect(worn(100, 7).expGainPercent).toBe(10);
    expect(worn(100, 8).subele_neutral).toBe(0);
    expect(worn(100, 9).subele_neutral).toBe(20);
  });

  it('keeps EXP outside damage stats', () => {
    const withExp = worn(100, 7);
    const withoutExp = equipStatusOf(makeCalculator({
      480956: { ...engine, script: { ...engine.script, expGainPercent: [] } },
    }), { ...createMainModel(), level: 100, garment: 480956, garmentRefine: 7 });
    for (const key of ['atk', 'matk', 'atkPercent', 'matkPercent', 'melee', 'range', 'criDmg', 'flatDmg']) {
      expect(withExp[key] || 0, key).toBe(withoutExp[key] || 0);
    }
  });
});
