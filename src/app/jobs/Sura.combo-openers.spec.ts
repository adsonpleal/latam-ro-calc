import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { ElementType } from '../constants/element-type.const';
import { clientRatioTable } from '../skills/client-ratio-table';
import { createMainModel } from '../utils/create-main-model';
import { Sura } from './Sura';

/**
 * Punho do Dragão and Ruína, the two openers of the Sura combo — card F4MPEs41zKPoAYrXjiih,
 * which reported both stuck at Nv10 in the attack picker.
 *
 * The reference is the client's own skill window, mirrored in `skill-meta.generated.ts`
 * (ids 2326 and 2329). Both print a `Nível l ATQ` column, so the hand-typed tables below
 * are checked against the shipped description as well as against the engine: a client
 * retune then shows up as a diff here instead of silently passing.
 *
 *   Punho do Dragão: ATQ = (100 + nível x 80) x (nível de base / 100)
 *   Ruína:           ATQ = (100 + nível x 300) x (nível de base / 100) + FOR x 100
 *
 * Combo Rápido casts both at the level learned under Aprenda rather than at the one the
 * picker shows; `Sura.flash-combo.spec.ts` owns that and pins it.
 */
const DRAGON_COMBO = [
  { level: 1, atq: 180 }, { level: 2, atq: 260 }, { level: 3, atq: 340 }, { level: 4, atq: 420 },
  { level: 5, atq: 500 }, { level: 6, atq: 580 }, { level: 7, atq: 660 }, { level: 8, atq: 740 },
  { level: 9, atq: 820 }, { level: 10, atq: 900 },
];
const FALLEN_EMPIRE = [
  { level: 1, atq: 400 }, { level: 2, atq: 700 }, { level: 3, atq: 1000 }, { level: 4, atq: 1300 },
  { level: 5, atq: 1600 }, { level: 6, atq: 1900 }, { level: 7, atq: 2200 }, { level: 8, atq: 2500 },
  { level: 9, atq: 2800 }, { level: 10, atq: 3100 },
];
const SKILLS = [
  ['Dragon Combo', DRAGON_COMBO],
  ['Fallen Empire', FALLEN_EMPIRE],
] as const;

const BASE_LEVEL = 200;
const TARGET_LEVEL = 150;

const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** Looked up through the class rather than imported, so the catalog wiring is pinned too. */
const suraAtkSkills = new Sura().atkSkills;
const skillOf = (name: string) => suraAtkSkills.find((skill) => skill.name === name)!;

/** The ratio branch only, fed the figures the client's table is written against. */
const ratioAt = (name: string, level: number, overrides: { baseLevel?: number; totalStr?: number } = {}) =>
  skillOf(name).formula({
    skillLevel: level,
    model: { level: overrides.baseLevel ?? 100 },
    status: { totalStr: overrides.totalStr ?? 0 },
  } as any);

function simulate(skillValue: string) {
  const cls = new Sura();
  const model = {
    ...createMainModel(), level: BASE_LEVEL, jobLevel: 60, str: 110, dex: 90,
    selectedAtkSkill: skillValue, propertyAtk: ElementType.Neutral,
  };
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();
  // Nothing is equipped, so an empty item db spares the spec a 10 MB parse per run.
  const calc = new Calculator().setMasterItems({} as any).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model as any);
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

describe('Punho do Dragão and Ruína', () => {
  it.each(SKILLS)('%s is selectable at all ten levels', (name, table) => {
    const skill = skillOf(name);

    expect(skill.value).toBe(`${name}==10`);
    expect(skill.levelList?.map((entry) => entry.value)).toEqual(table.map((row) => `${name}==${row.level}`));
    // The label keeps the English name as its prefix; setClassSkill swaps it for the pt-BR one.
    expect(skill.levelList?.map((entry) => entry.label)).toEqual(table.map((row) => `${name} Nv${row.level}`));
  });

  it.each(SKILLS)('%s keeps the table this spec is written against in the client description', (name, table) => {
    expect([...clientRatioTable(name)!.entries()]).toEqual(table.map((row) => [row.level, row.atq]));
  });

  it.each(SKILLS)('%s hits for the client ATQ at every level, scaled by base level', (name, table) => {
    for (const row of table) {
      expect(ratioAt(name, row.level), `Nv${row.level}`).toBe(row.atq);
      expect(ratioAt(name, row.level, { baseLevel: BASE_LEVEL }), `Nv${row.level} at base 200`).toBe(row.atq * 2);
    }
  });

  it('adds Ruína own FOR term on top of the ratio', () => {
    for (const row of FALLEN_EMPIRE) {
      expect(ratioAt('Fallen Empire', row.level, { totalStr: 110 }), `Nv${row.level}`).toBe(row.atq + 110 * 100);
    }
  });

  it.each(SKILLS)('%s damage changes with the level the player picks', (name, table) => {
    const damages = table.map((row) => simulate(`${name}==${row.level}`).dmg.skillMaxDamage);

    expect(damages[0]).toBeGreaterThan(0);
    // Every level its own figure, in order: a picker that offered ten levels and computed
    // the same number at each would look fixed and lie about it.
    expect(new Set(damages).size).toBe(table.length);
    expect([...damages].sort((a, b) => a - b)).toEqual(damages);
  });
});
