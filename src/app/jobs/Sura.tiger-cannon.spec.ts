import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { ElementType } from '../constants/element-type.const';
import { createMainModel } from '../utils/create-main-model';
import { SuperNovice } from './SuperNovice';
import { Sura } from './Sura';

/**
 * Garra de Tigre, both branches.
 *
 * The reference table is the client's own skill window, which bROWiki repeats:
 * https://browiki.org/wiki/Garra_de_Tigre. Per level it gives the fator (a share of max
 * HP plus a share of max SP) and the dano especial. The cast is deliberately not pinned
 * here: skill-delay.spec.ts already walks every selectable level of every attack skill
 * against the client delay feed, and now that the skill offers all ten, that spec covers
 * them. A second hand-typed copy would only go red when the client retunes the skill.
 *
 *   ATQ           = (fator / 4,0) x (nível de base / 100)   — / 1,5 after Ruína
 *   dano especial = nível x 240 (x 500 after Ruína) + nível de base do alvo x 40
 */
const CLIENT_TABLE = [
  { level: 1, hpPercent: 12, spPercent: 6, special: 240, comboSpecial: 500 },
  { level: 2, hpPercent: 14, spPercent: 7, special: 480, comboSpecial: 1000 },
  { level: 3, hpPercent: 16, spPercent: 8, special: 720, comboSpecial: 1500 },
  { level: 4, hpPercent: 18, spPercent: 9, special: 960, comboSpecial: 2000 },
  { level: 5, hpPercent: 20, spPercent: 10, special: 1200, comboSpecial: 2500 },
  { level: 6, hpPercent: 22, spPercent: 11, special: 1440, comboSpecial: 3000 },
  { level: 7, hpPercent: 24, spPercent: 12, special: 1680, comboSpecial: 3500 },
  { level: 8, hpPercent: 26, spPercent: 13, special: 1920, comboSpecial: 4000 },
  { level: 9, hpPercent: 28, spPercent: 14, special: 2160, comboSpecial: 4500 },
  { level: 10, hpPercent: 30, spPercent: 15, special: 2400, comboSpecial: 5000 },
];

const MAX_HP = 120_000;
const MAX_SP = 6_000;
const BASE_LEVEL = 200;
const TARGET_LEVEL = 150;

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** Looked up through the class rather than imported, so the catalog wiring is pinned too. */
const suraAtkSkills = new Sura().atkSkills;
const skillOf = (value: string) => suraAtkSkills.find((skill) => skill.value === value)!;

/** The ratio branch only, fed the figures the table is written against. */
const ratioAt = (value: string, level: number, overrides: { maxHp?: number; maxSp?: number } = {}) =>
  skillOf(value).formula({
    skillLevel: level,
    maxHp: overrides.maxHp ?? MAX_HP,
    maxSp: overrides.maxSp ?? MAX_SP,
    model: { level: BASE_LEVEL },
    monster: { isElement: () => false, level: TARGET_LEVEL },
  } as any);

/** The dano especial branch only: what `finalDmgFormula` adds to an already reduced hit. */
const specialAt = (value: string, level: number, damage = 0) =>
  skillOf(value).finalDmgFormula!({
    damage,
    skillLevel: level,
    model: { level: BASE_LEVEL, propertyAtk: ElementType.Neutral },
    monster: { isElement: () => false, level: TARGET_LEVEL },
  } as any) - damage;

function simulate(Job: typeof Sura | typeof SuperNovice, skillValue: string) {
  const cls = new Job();
  const model = {
    ...createMainModel(), level: BASE_LEVEL, jobLevel: 50, str: 110, vit: 110, int: 90, dex: 90,
    selectedAtkSkill: skillValue, propertyAtk: ElementType.Neutral,
  };
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  const target = structuredClone(monsters['21077']);
  Object.assign(target.stats, { level: TARGET_LEVEL, flee: 0 });
  target.level = TARGET_LEVEL;
  new CalculatorController().runChain(calc, {
    monster: target, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [],
    aspdPotion: undefined, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
  } as any);

  return calc.getTotalSummary() as any;
}

describe('Garra de Tigre', () => {
  it.each(['Tiger Cannon==10', 'Tiger Cannon Combo==10'])('%s is selectable at all ten levels', (value) => {
    const skill = skillOf(value);
    const base = value.replace('==10', '');

    expect(skill.levelList?.map((entry) => entry.value)).toEqual(CLIENT_TABLE.map((row) => `${base}==${row.level}`));
    expect(skill.isMelee).toBe(true);
  });

  it.each(CLIENT_TABLE)('Nv $level takes $hpPercent% of max HP and $spPercent% of max SP', (row) => {
    const factor = MAX_HP * (row.hpPercent / 100) + MAX_SP * (row.spPercent / 100);

    expect(ratioAt('Tiger Cannon==10', row.level)).toBe(Math.floor((factor / 4) * (BASE_LEVEL / 100)));
    // After Ruína the same fator is divided by 1,5 instead of 4,0.
    expect(ratioAt('Tiger Cannon Combo==10', row.level)).toBe(Math.floor((factor / 1.5) * (BASE_LEVEL / 100)));
  });

  it('grows with max HP and max SP, not only with the level', () => {
    const base = ratioAt('Tiger Cannon==10', 10);

    expect(ratioAt('Tiger Cannon==10', 10, { maxHp: MAX_HP * 2 })).toBeGreaterThan(base);
    expect(ratioAt('Tiger Cannon==10', 10, { maxSp: MAX_SP * 2 })).toBeGreaterThan(base);
    expect(ratioAt('Tiger Cannon==10', 1)).toBeLessThan(base);
  });

  it.each(CLIENT_TABLE)('Nv $level adds its dano especial after every reduction', (row) => {
    const target = TARGET_LEVEL * 40;

    expect(specialAt('Tiger Cannon==10', row.level)).toBe(row.special + target);
    expect(specialAt('Tiger Cannon Combo==10', row.level)).toBe(row.comboSpecial + target);
    // Irreducible and unscaled: the same figure lands on top of any damage underneath.
    expect(specialAt('Tiger Cannon==10', row.level, 1_000_000)).toBe(row.special + target);
  });

  it('breaks the dano especial down with each branch own multiplier', () => {
    const shared = { skillLevel: 7, monster: { level: TARGET_LEVEL }, damageBefore: 1000, damageAfter: 9000 } as any;
    const labels = (value: string) => skillOf(value).finalDmgCalc!(shared).rows.map((cell) => cell.label);

    expect(labels('Tiger Cannon==10')).toContain('Nível 7 × 240');
    expect(labels('Tiger Cannon Combo==10')).toContain('Nível 7 × 500');
  });

  it('is blocked by a Fantasma target on both branches', () => {
    const ghost = { model: { level: BASE_LEVEL }, monster: { isElement: () => true, level: TARGET_LEVEL }, maxHp: MAX_HP, maxSp: MAX_SP, skillLevel: 10 } as any;

    for (const value of ['Tiger Cannon==10', 'Tiger Cannon Combo==10']) {
      expect(skillOf(value).formula(ghost)).toBe(0);
      expect(skillOf(value).finalDmgFormula!({ ...ghost, damage: 50_000 })).toBe(0);
    }
  });

  it.each([Sura, SuperNovice])('reads the selected level end to end on %o', (Job) => {
    const low = simulate(Job, 'Tiger Cannon==1').dmg;
    const high = simulate(Job, 'Tiger Cannon==10').dmg;

    expect(low.skillMaxDamage).toBeGreaterThan(0);
    expect(low.skillMaxDamage).toBeLessThan(high.skillMaxDamage);
  });

  it('deals more after Ruína than on its own', () => {
    const alone = simulate(Sura, 'Tiger Cannon==10').dmg;
    const combo = simulate(Sura, 'Tiger Cannon Combo==10').dmg;

    expect(combo.skillMaxDamage).toBeGreaterThan(alone.skillMaxDamage);
  });
});
