import { describe, expect, it } from 'vitest';
import { JobBuffs } from '../constants/job-buffs';
import { collectBuffBonuses, withoutWeaponlessTalismans } from './calculator-controller';

// Tracker w0kYUgNCvKgHt5dYUsWl; the four skills target party members.
describe('Asceta das Almas party talismans', () => {
  const names = ['Talisman of Protection', 'Talisman of the Warrior', 'Talisman of the Magician', 'Talisman of Five Elements'];
  const buffs = names.map((name) => JobBuffs.find((buff) => buff.name === name)!);

  it('shows all four at levels 1–5', () => {
    expect(buffs.every(Boolean)).toBe(true);
    for (const buff of buffs) expect(buff.dropdown.map((option) => option.value)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('grants P.ATQ, S.ATQM and damage against exactly the five listed elements', () => {
    const bonus = collectBuffBonuses(buffs, [5, 5, 5, 5], new Set()).equipAtk;
    expect(bonus['Talisman of Protection']).toEqual({}); // healing has no damage-stage contribution
    expect(bonus['Talisman of the Warrior']).toEqual({ pAtk: 10 });
    expect(bonus['Talisman of the Magician']).toEqual({ sMatk: 10 });
    const five = bonus['Talisman of Five Elements'];
    for (const element of ['water', 'wind', 'earth', 'fire', 'neutral']) {
      expect(five[`p_element_${element}`]).toBe(20);
      expect(five[`m_element_${element}`]).toBe(20);
    }
    expect(five['p_element_poison']).toBeUndefined();
  });

  it('does not duplicate an active self buff or apply the damage buffs without a weapon', () => {
    const selfActive = new Set(['Talisman of the Warrior']);
    const withWeapon = collectBuffBonuses(buffs, [5, 5, 5, 5], selfActive, true).equipAtk;
    expect(withWeapon['Talisman of the Warrior']).toBeUndefined();
    expect(withWeapon['Talisman of the Magician']).toEqual({ sMatk: 10 });
    const withoutWeapon = collectBuffBonuses(buffs, [5, 5, 5, 5], new Set(), false).equipAtk;
    expect(withoutWeapon['Talisman of the Warrior']).toBeUndefined();
    expect(withoutWeapon['Talisman of the Magician']).toBeUndefined();
    expect(withoutWeapon['Talisman of Five Elements']).toBeUndefined();
    expect(withoutWeaponlessTalismans({ 'Talisman of the Warrior': { pAtk: 10 }, Other: { atk: 5 } }, false))
      .toEqual({ Other: { atk: 5 } });
  });
});
