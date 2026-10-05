import { describe, expect, it } from 'vitest';
import { wornBonus } from './__tests__/worn-bonus';

describe('Issgard crown iRO preview bonuses', () => {
  it.each([
    [400105, 'melee', 'pow', 'pAtk', 'atkPercent', 'p_size_all'],
    [400106, 'm_my_element_all', 'spl', 'sMatk', 'matkPercent', 'm_size_all'],
    [400107, 'range', 'pow', 'pAtk', 'atkPercent', 'p_size_all'],
  ] as const)('applies base, refine and cumulative grade bonuses for %i', (id, damage, trait, advanced, attack, size) => {
    const base = wornBonus({ headUpper: id });
    expect(base[trait]).toBe(7);
    expect(base.con).toBe(7);
    expect(base[damage]).toBe(10);
    const at6 = wornBonus({ headUpper: id, headUpperRefine: 6 });
    expect(at6.acd).toBe(0);
    expect(at6[advanced]).toBe(0);
    const at8 = wornBonus({ headUpper: id, headUpperRefine: 8 });
    expect(at8.acd).toBe(8);
    expect(at8[damage]).toBe(10);
    const at9 = wornBonus({ headUpper: id, headUpperRefine: 9, headUpperGrade: 'A' });
    expect(at9[damage]).toBe(20);
    expect(at9[attack]).toBe(12);
    expect(at9[size]).toBe(12);
    expect(at9[advanced]).toBe(15);
    expect(at9[trait]).toBe(12);
    expect(at9.con).toBe(12);
    expect(at9.def - base.def).toBe(150);
    expect(at9.mdef).toBe(30);
    expect(at9.res).toBe(50);
    expect(at9.mres).toBe(50);
  });

  it.each([
    [400105, 'melee', 'atk', 'atkPercent'],
    [400106, 'm_my_element_all', 'matk', 'matkPercent'],
    [400107, 'range', 'atk', 'atkPercent'],
  ] as const)('scales %i combos off weapon refine, across every regular Glacier weapon', (id, damage, attack, percent) => {
    const weapons = [500049, 500050, 510061, 510062, 520017, 530025, 540049, 550069, 550070, 560032, 570029, 580030, 590038, 590039, 600027, 610037, 620017, 630018, 640033, 650025, 700052, 800014, 810010, 820008, 830013, 840009];
    const crown = wornBonus({ headUpper: id, headUpperRefine: 9 });
    for (const weapon of weapons) {
      const alone = wornBonus({ weapon, weaponRefine: 6 });
      const combo = wornBonus({ headUpper: id, headUpperRefine: 9, weapon, weaponRefine: 6 });
      expect(combo[damage] - alone[damage] - crown[damage], String(weapon)).toBe(10);
      expect(combo[attack] - alone[attack] - crown[attack], String(weapon)).toBe(50);
      expect(combo[percent] - alone[percent] - crown[percent], String(weapon)).toBe(5);
      expect(combo.aspdPercent - alone.aspdPercent - crown.aspdPercent, String(weapon)).toBe(8);
    }
    const at2 = wornBonus({ headUpper: id, weapon: 500049, weaponRefine: 2 });
    const at3 = wornBonus({ headUpper: id, weapon: 500049, weaponRefine: 3 });
    expect(at2.aspdPercent).toBe(0);
    expect(at3.aspdPercent).toBe(4);
    // The description names regular Glacier weapons; Dim is a distinct series.
    const dim = wornBonus({ headUpper: id, weapon: 500054, weaponRefine: 9 });
    expect(dim.aspdPercent).toBe(0);
    expect(dim[damage]).toBe(10);
  });
});
