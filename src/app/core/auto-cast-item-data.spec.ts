import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMainModel } from '../utils';
import { makeCalculator } from './__tests__/make-calculator';

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;
const rules = (id: number) => ITEMS[id].script.autoCast;
const resolved = (overrides: Record<string, any>, learned = new Map<string, number>()) => {
  const calc = makeCalculator(ITEMS).setLearnedSkills(learned);
  calc.loadItemFromModel({ ...createMainModel(), ...overrides }).prepareAllItemBonus();
  return calc.resolvedItemAutoCasts;
};

describe('Renegado and Mandraque replay-backed item auto-casts', () => {
  it('keeps the independently rolled Competidor Poring bolts separate', () => {
    expect(rules(420820).map((rule) => [rule.skillId, rule.chance])).toEqual([
      [19, ['EQUIP_ID[19192]7']],
      [14, ['EQUIP_ID[19192]7']],
      [20, ['EQUIP_ID[19192]7']],
    ]);
  });

  it('captures every direct-damage item source observed in the selected builds', () => {
    const ids = Object.values(ITEMS).filter((item: any) => item.script?.autoCast).map((item: any) => item.id);
    expect(ids).toEqual(expect.arrayContaining([
      1185, 24527, 24728, 510019, 510040, 510034, 300006, 27305, 420820, 700132,
    ]));
  });

  it('maps every Arco Híbrido arrow combo independently', () => {
    expect(rules(700132).map((rule) => [rule.chance[0], rule.skillId, rule.skillLevel[0]])).toEqual([
      ['EQUIP_ID[1751]10', 2038, '5'],
      ['EQUIP_ID[1752]10', 2211, '3'],
      ['EQUIP_ID[1754]10', 2447, '3'],
      ['EQUIP_ID[1755]10', 2214, '3'],
      ['EQUIP_ID[1756]10', 2216, '3'],
      ['EQUIP_ID[1757]10', 2202, '3'],
      ['EQUIP_ID[1762]10', 2450, '3'],
      ['EQUIP_ID[1773]10', 2449, '3'],
    ]);
  });

  it('keeps chained Ritualística damage out of the direct basic-attack catalog', () => {
    expect(rules(510034)).toEqual([
      expect.objectContaining({ skillId: 2450, chance: ['EQUIP_ID[460017]REFINE[weapon,shield==18]===7'], trigger: 'melee-physical-hit' }),
    ]);
  });

  it('sums Manopla Sombria do Desejo chance tiers at +0, +7 and +9', () => {
    const chanceAt = (refine: number) => resolved({ shadowWeapon: 24527, shadowWeaponRefine: refine })[0].chance;
    expect([chanceAt(0), chanceAt(7), chanceAt(9)]).toEqual([4, 5, 7]);
  });

  it('resolves Automagia combined-refine chance and level with highest-learned support', () => {
    const at18 = resolved({ shadowArmor: 24728, shadowArmorRefine: 10, shadowBoot: 24729, shadowBootRefine: 8 });
    const at20 = resolved({ shadowArmor: 24728, shadowArmorRefine: 10, shadowBoot: 24729, shadowBootRefine: 10 });
    const learned = resolved(
      { shadowArmor: 24728, shadowArmorRefine: 10, shadowBoot: 24729, shadowBootRefine: 8 },
      new Map([['Jack Frost', 5]]),
    );
    expect(at18.find((rule) => rule.skillId === 2204)).toMatchObject({ chance: 4, skillLevel: 2 });
    expect(at20.find((rule) => rule.skillId === 2204)).toMatchObject({ chance: 8, skillLevel: 4 });
    expect(learned.find((rule) => rule.skillId === 2204)).toMatchObject({ chance: 4, skillLevel: 5 });
  });

  it('resolves refine, combo and ammunition conditions through the shared script parser', () => {
    expect(resolved({ weapon: 510019, weaponRefine: 11 }).map((rule) => [rule.skillId, rule.chance])).toEqual([[83, 10], [2449, 7]]);
    expect(resolved({ weapon: 510034, weaponRefine: 9, shield: 460017, shieldRefine: 9 })[0]).toMatchObject({ skillId: 2450, chance: 7 });
    expect(resolved({ headLower: 420820, headUpper: 19192 })).toHaveLength(3);
    expect(resolved({ weapon: 700132, ammo: 1752 })).toEqual([
      expect.objectContaining({ skillId: 2211, skillLevel: 3, chance: 10 }),
    ]);
  });
});
