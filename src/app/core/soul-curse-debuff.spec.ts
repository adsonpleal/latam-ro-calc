import { describe, expect, it } from 'vitest';
import { JobBuffs } from '../constants/job-buffs';
import { ElementType } from '../constants/element-type.const';
import { Monster } from '../domain';
import { DamageCalculator } from './damage-calculator';
import { buildElementTable } from './summary-tables';

// Tracker card jk2Y3iZN7PLdZ5CsAbBm: Necromancia inflicts Assombração.
const debuff = JobBuffs.find((buff) => buff.name === 'Evil Soul Curse')!;
const active = debuff.dropdown.find((option) => option.isUse)!;

function reduction(boss: boolean, enabled: boolean, element = ElementType.Dark): number {
  const calc = new DamageCalculator();
  const monster = new Monster();
  (monster as any)._monsterData.type = boss ? 'boss' : 'normal';
  (calc as any).monster = monster;
  (calc as any).totalBonus = enabled ? active.bonus : {};
  return (calc as any).getElementResistReduction(element);
}

describe('Assombração debuff', () => {
  it('appears in the target debuffs with the client skill tooltip', () => {
    expect(debuff).toMatchObject({ label: 'Assombração', icon: 2601, isDebuff: true });
    expect(active.bonus).toEqual({ soulCurse: 100 });
  });

  it('reduces Dark resistance by 100 on normal monsters and 20 on bosses', () => {
    expect(reduction(false, true)).toBe(100);
    expect(reduction(true, true)).toBe(20);
    expect(reduction(false, false)).toBe(0);
    expect(reduction(true, false)).toBe(0);
    expect(reduction(false, true, ElementType.Holy)).toBe(0);
  });

  it('shows the normal reduction in the Dark elemental summary', () => {
    const table = buildElementTable({ soulCurse: 100 });
    expect(table.find((row) => row.name === 'Dark')?.elementResistReduction).toBe(100);
    expect(table.find((row) => row.name === 'Holy')?.elementResistReduction).toBe(0);
    const bossTable = buildElementTable({ soulCurse: 100 }, undefined, true);
    expect(bossTable.find((row) => row.name === 'Dark')?.elementResistReduction).toBe(20);
  });
});
