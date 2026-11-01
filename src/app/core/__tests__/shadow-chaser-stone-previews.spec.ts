import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ShadowChaser } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The six Shadow Chaser costume-enchant stones (Topo/Meio/Baixo, I and II), listed as
 * `preRelease` previews — tracker card zzjOcURfgk5TIIlzwxC6.
 *
 * None of them is on LATAM yet. 311362-311364 were already in item.json with the Thai
 * description; 314185-314187 had no record at all. The effects come from divine-pride:
 * the iRO English text for 3113xx, the dpRO one for 3141xx (no iRO release yet), and the
 * parsed server script as the tie-breaker. That is why 314185's Triangle Shot clause is
 * 20% — the script says 20, the dpRO prose says 15.
 *
 * The garment partners are the LATAM Renegado (Capa) stones: 25493/29480 (I) and
 * 25805/29618 (II). The Abyss Chaser Stone (Garment) sets are left out; those garments are
 * not in item.json.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const UPPER = ['costumeEnchantUpper', 71] as const;
const MIDDLE = ['costumeEnchantMiddle', 72] as const;
const LOWER = ['costumeEnchantLower', 73] as const;
/** Model field and itemSubTypeId of each stone's slot. */
const SLOT: Record<number, readonly [string, number]> = {
  311362: UPPER, 311363: MIDDLE, 311364: LOWER,
  314185: UPPER, 314186: MIDDLE, 314187: LOWER,
};
const GARMENT_I = 25493;
const GARMENT_II = 25805;

/** Equip `stone` (and optionally a garment stone) on a Shadow Chaser and read the bonus back. */
function statusOf(stone: number | null, opts: { skills?: Record<string, number>; garment?: number } = {}) {
  const cls = new ShadowChaser();
  const items: Record<number, any> = {};
  const model: any = createMainModel();
  model.level = 200;
  if (stone) {
    items[stone] = db[stone];
    model[SLOT[stone][0]] = stone;
  }
  if (opts.garment) {
    items[opts.garment] = db[opts.garment];
    model.costumeEnchantGarment = opts.garment;
  }
  const calc = makeCalculator(items, cls);
  const passiveSkillIds = cls.passiveSkills.map((skill) => opts.skills?.[skill.name] ?? 0);
  const { learnedSkillMap } = cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds }).getSkillBonusAndName();
  calc.setLearnedSkills(learnedSkillMap);

  return equipStatusOf(calc, model);
}

const garmentAlone = {
  [GARMENT_I]: statusOf(null, { garment: GARMENT_I }),
  [GARMENT_II]: statusOf(null, { garment: GARMENT_II }),
};

/** What the stone adds on top of the garment stone alone. */
function setBonus(stone: number, garment: number, key: string): number {
  return (statusOf(stone, { garment })[key] ?? 0) - (garmentAlone[garment][key] ?? 0);
}

describe('Shadow Chaser costume-enchant stone previews', () => {
  it.each(Object.keys(SLOT).map(Number))('%i is a preview in its costume-enchant slot', (id) => {
    expect(db[id]).toMatchObject({ id, preRelease: true, itemTypeId: 6, itemSubTypeId: SLOT[id][1] });
  });

  it('scales with the learned skill level', () => {
    expect(statusOf(311362, { skills: { 'Urgent Escape': 5 } }).aspdPercent).toBe(10);
    expect(statusOf(311363, { skills: { 'Shadow Formation': 5 } }).acd).toBe(5);
    expect(statusOf(311364, { skills: { Reproduce: 10 } })).toMatchObject({ melee: 10, range: 10 });
    expect(statusOf(314185, { skills: { 'Urgent Escape': 5 } })).toMatchObject({ melee: 5, range: 5 });
    expect(statusOf(314186, { skills: { 'Shadow Formation': 5 } }).acd).toBe(5);
    expect(statusOf(314187, { skills: { Reproduce: 10 } }).aspdPercent).toBe(10);
  });

  it('pairs with Shadow Chaser Stone (Garment)', () => {
    expect(setBonus(311362, GARMENT_I, '2304')).toBe(15); // Feint Bomb
    expect(setBonus(311363, GARMENT_I, '2288')).toBe(15); // Triangle Shot
    expect(setBonus(311364, GARMENT_I, 'p_element_all')).toBe(15);
    expect(setBonus(314185, GARMENT_I, '2288')).toBe(20); // server script, not the prose's 15
    expect(setBonus(314186, GARMENT_I, '2304')).toBe(15);
    expect(setBonus(314187, GARMENT_I, '2288')).toBe(15);
  });

  it('pairs with Shadow Chaser Stone II (Garment)', () => {
    expect(setBonus(311362, GARMENT_II, 'spDrain')).toBe(1);
    expect(setBonus(311363, GARMENT_II, '2284')).toBe(15); // Fatal Menace
    expect(setBonus(311364, GARMENT_II, 'p_size_all')).toBe(15);
    expect(setBonus(314185, GARMENT_II, 'spDrain')).toBe(1);
    expect(setBonus(314186, GARMENT_II, '2284')).toBe(15);
    expect(setBonus(314187, GARMENT_II, '2284')).toBe(15);
  });
});
