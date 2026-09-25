import { describe, expect, it } from 'vitest';
import { JobBuffs } from '../constants/job-buffs';
import { ElementType } from '../constants/element-type.const';
import { Monster } from '../domain';
import { DamageCalculator } from './damage-calculator';
import { buildElementTable } from './summary-tables';

// Tracker zwQZYOxeQn84yXM4g9IF: GC_VENOMIMPRESS lowers Poison resistance.
describe('Potencializar Veneno', () => {
  const debuff = JobBuffs.find((buff) => buff.name === 'Venom Impression')!;

  it('offers levels 1–5 in target debuffs with a 10–50% reduction', () => {
    expect(debuff).toMatchObject({ label: 'Potencializar Veneno', icon: 2021, isDebuff: true });
    expect(debuff.dropdown.map((option) => option.bonus?.['venomImpression'] ?? 0)).toEqual([0, 10, 20, 30, 40, 50]);
  });

  it('affects only Poison attacks, stacks with other Poison debuffs, and works on bosses', () => {
    const calc = new DamageCalculator();
    const monster = new Monster();
    (calc as any).monster = monster;
    (calc as any).totalBonus = { venomImpression: 50, infection: 25, intoxication: 25 };
    expect((calc as any).getElementResistReduction(ElementType.Poison)).toBe(100);
    expect((calc as any).getElementResistReduction(ElementType.Fire)).toBe(0);
    (monster as any)._monsterData.type = 'boss';
    expect((calc as any).getElementResistReduction(ElementType.Poison)).toBe(100);
    expect(buildElementTable({ venomImpression: 50 }).find((row) => row.name === 'Poison')?.elementResistReduction).toBe(50);
  });
});

