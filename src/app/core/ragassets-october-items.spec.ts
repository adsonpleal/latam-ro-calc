import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from '../utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const ids = [480087, 410213, 410215, 410216, 491111, 491112, 491113, 491114, 491115,
  491116, 491117, 491118, 491119, 300379, 24752, 24873, 2124];
const items = Object.fromEntries(ids.map(id => [id, { ...db[id], enName: db[id].name, name: latam[id]?.name ?? db[id].name }]));

function totals(model: Record<string, unknown>, master = items) {
  return equipStatusOf(makeCalculator(master), { ...createMainModel(), ...model });
}

describe('October LATAM item bonuses', () => {
  it.each([
    [410213, 'dex', 'luk', 'con', 'range'],
    [410215, 'str', 'vit', 'pow', 'melee'],
    [410216, 'int', 'agi', 'spl', 'm_race_all'],
  ] as const)('%i uses the sum of base stats and crosses the 250 threshold', (id, a, b, trait, damage) => {
    const read = (sum: number) => totals({ headMiddle: id, [a]: 125, [b]: sum - 125 });
    expect(read(249)).toMatchObject({ [trait]: 16, [damage]: 8 });
    expect(read(250)).toMatchObject({ [trait]: 16, [damage]: 23 });
    expect(read(240)).toMatchObject({ [trait]: 16, [damage]: 8 });
    expect(read(239)).toMatchObject({ [trait]: 15, [damage]: 7 });
  });

  it('Escudo Formoso scales ranged/size resistance and applies HP at +9', () => {
    expect(totals({ garment: 480087, garmentRefine: 8 })).toMatchObject({ hp: 1010, dmg_taken_range: 4, subsize_all: 2, hpPercent: 0 });
    expect(totals({ garment: 480087, garmentRefine: 9 })).toMatchObject({ hp: 1010, dmg_taken_range: 6, subsize_all: 2, hpPercent: 10 });
  });

  it('Rgan card reverses the size penalty at +12 and grants RES only on level 2 shields', () => {
    const read = (refine: number, itemLevel: number) => totals({ shield: 2124, shieldRefine: refine, shieldCard: 300379 }, {
      ...items, 2124: { ...db[2124], itemLevel },
    });
    expect(read(11, 1)).toMatchObject({ subsize_all: -25, res: 0, mres: 0, subrace_brute: 15, subrace_player_human: 0, subrace_player_doram: 0 });
    expect(read(12, 2)).toMatchObject({ subsize_all: 25, res: 50, mres: 50 });
    expect(read(12, 1)).toMatchObject({ subsize_all: 25, res: 0, mres: 0 });
  });
});

// Only strip the weapon's own script: keep the actual ID and weapon structure so
// these checks isolate the necklace's equip/refine/grade conditions.
const sets = [
  [491111, 630013, 5211], [491111, 600018, 5208], [491111, 530014, 5266], [491111, 500027, 5267],
  [491112, 700035, 5334], [491112, 700034, 5330], [491112, 580019, 5355], [491112, 570019, 5355],
  [491112, 570020, 5356], [491112, 580020, 5356],
  [491113, 640022, 5220], [491113, 640021, 5217], [491113, 540024, 5373], [491113, 540025, 5371],
  [491114, 520009, 5295], [491114, 590024, 2490],
  [491115, 610022, 5292], [491115, 610023, 5289], [491115, 510033, 5314], [491115, 700033, 5322],
  [491116, 540026, 5283], [491116, 550029, 5273], [491116, 560021, 5244], [491116, 560020, 5252],
  [491117, 550066, 5435], [491117, 550065, 5445], [491117, 650021, 5483], [491117, 650022, 5485],
  [491118, 820006, 5409], [491118, 840007, 5407], [491118, 830011, 5405], [491118, 800012, 5408], [491118, 810008, 5406],
  [491119, 540046, 5469], [491119, 540045, 5473], [491119, 550064, 5428], [491119, 550064, 5429], [491119, 550063, 5425],
];

describe('Colares Consagrados', () => {
  it.each(Array.from({ length: 9 }, (_, index) => 491111 + index))('%i grants only its base effects without a partner', id => {
    expect(totals({ accLeft: id })).toMatchObject({ vct: 10, p_element_all: 10, m_element_all: 10, pow: 0, con: 0, spl: 0, pAtk: 0, sMatk: 0 });
  });

  it.each(sets)('%i with %i gates skill %i on weapon refine and grade independently', (necklace, weapon, skill) => {
    const master = { ...items, [weapon]: { ...db[weapon], script: {} } };
    const read = (refine: number, grade: string) => totals({ accLeft: necklace, weapon, weaponRefine: refine, weaponGrade: grade }, master)[skill] || 0;
    expect(read(9, '')).toBe(0);
    expect(read(10, '')).toBe(10);
    expect(read(9, 'C')).toBe(10);
    expect(read(10, 'C')).toBe(20);
    expect(read(10, 'B')).toBe(20);
  });

  it('Pureza only enables its attack procs with Grimório, and gates Tremor on weapon +10', () => {
    const calc = makeCalculator({ ...items, 540024: { ...db[540024], script: {} } });
    const read = (weapon: number, refine: number) => {
      equipStatusOf(calc, { ...createMainModel(), accLeft: 491113, weapon, weaponRefine: refine });
      return calc.resolvedItemAutoCasts;
    };
    expect(read(0, 10)).toEqual([]);
    expect(read(540024, 9)).toEqual([expect.objectContaining({ skillId: 2449, skillLevel: 4, chance: 10, trigger: 'physical-attack' })]);
    expect(read(540024, 10)).toEqual(expect.arrayContaining([
      expect.objectContaining({ skillId: 2449, skillLevel: 4, chance: 10 }),
      expect.objectContaining({ skillId: 5373, skillLevel: 2, chance: 7 }),
    ]));
  });

  it('Destino keeps the client sign for its conditional SP-cost reduction', () => {
    const master = { ...items, 540046: { ...db[540046], script: {} } };
    expect(totals({ accLeft: 491119, weapon: 540046, weaponRefine: 9 }, master).spCostPercent).toBe(0);
    expect(totals({ accLeft: 491119, weapon: 540046, weaponRefine: 10 }, master).spCostPercent).toBe(-10);
  });

  /**
    * The five necklaces whose set block reads "Ao usar [X] ... autoconjura [Y]". Those procs
    * fire on one named skill and never on a basic attack, so an attack trigger on any of
    * them would price them off a rate they have nothing to do with.
    *
    * Destino's clause is the only one a recording settles — see
    * `SoulAscetic.fenix-jabuti-autocast.spec.ts` — and so the only one modelled. The other
    * four stay unmodelled rather than carry a chance nobody measured.
    */
  it('registers skill-use procs on the skill that fires them, never on a basic attack', () => {
    for (const id of [491112, 491115, 491116, 491117, 491119]) {
      for (const rule of db[id].script.autoCast ?? []) {
        expect(rule.trigger, String(id)).toBe('skill-use');
      }
    }
    expect((db[491119].script.autoCast ?? []).map((rule: any) => [rule.triggerSkillId, rule.skillId, rule.skillLevel, rule.chance]))
      .toEqual([[5428, 5429, ['EQUIP_ID[550064]REFINE[weapon==10]4'], ['EQUIP_ID[550064]REFINE[weapon==10]100']]]);
  });
});

describe('Greva Sombria POD with localized Escudo Sombrio POD', () => {
  it('grants P.ATQ +3 from the combo at total refine 18, independently of the boot +10 bonus', () => {
    const gear = { shadowBoot: 24873, shadowShield: 24752 };
    expect(totals({ ...gear, shadowBootRefine: 9, shadowShieldRefine: 9 }).pAtk).toBe(9); // shield 6 + combo 3
    expect(totals({ ...gear, shadowBootRefine: 8, shadowShieldRefine: 9 }).pAtk).toBe(6);
    expect(totals({ ...gear, shadowBootRefine: 10, shadowShieldRefine: 8 }).pAtk).toBe(8); // shield 3 + boot 2 + combo 3
    expect(totals({ shadowBoot: 24873, shadowBootRefine: 10 }).pAtk).toBe(2);
  });
});
