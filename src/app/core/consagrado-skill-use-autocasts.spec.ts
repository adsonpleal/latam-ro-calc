import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AbyssChaser, Inquisitor, Shinkiro, SoulAscetic, Windhawk } from 'src/app/jobs';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { createMainModel } from 'src/app/utils';
import { buildAutoCastSimulation, rotationAutoCasts } from './auto-cast';
import { makeCalculator } from './__tests__/make-calculator';

/**
 * The Colar Consagrado line's "Ao usar [X] autoconjura [Y]" clauses, end to end: the rule
 * resolves off the right Conjunto weapon at +10, and the proc it names actually prices on
 * the class that owns the trigger skill.
 *
 * A rule that resolves but finds no formula is worse than no rule at all — it shows up in
 * the panel as "a fórmula dessa habilidade ainda não é suportada" on a build the player
 * cannot fix. `ragassets-october-items.spec.ts` pins the stored numbers against the client
 * text; this one pins that the engine can do something with them.
 */

const ITEMS = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;
const MONSTERS = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8')) as Record<string, any>;
const HP_SP_TABLE = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
/** "Dummy - Médio": a target that resists nothing, so a priced proc is a priced proc. */
const DUMMY = '21065';

interface Clause {
  item: number;
  weapon: number;
  /** The skill whose use fires it, and the one it casts. */
  trigger: number;
  skill: number;
  level: number;
  chance: number;
  make: () => any;
}

const CLAUSES: Clause[] = [
  { item: 491112, weapon: 700035, trigger: 5334, skill: 382, level: 5, chance: 50, make: () => new Windhawk() },
  { item: 491115, weapon: 700033, trigger: 5322, skill: 2288, level: 8, chance: 50, make: () => new AbyssChaser() },
  { item: 491116, weapon: 560020, trigger: 5248, skill: 5252, level: 4, chance: 100, make: () => new Inquisitor() },
  { item: 491117, weapon: 650021, trigger: 3009, skill: 5483, level: 8, chance: 50, make: () => new Shinkiro() },
  { item: 491117, weapon: 650022, trigger: 5477, skill: 5486, level: 4, chance: 50, make: () => new Shinkiro() },
  { item: 491119, weapon: 550064, trigger: 5428, skill: 5429, level: 4, chance: 100, make: () => new SoulAscetic() },
];

/**
 * A summary with the shape `buildAutoCastSimulation` reads. `totalHitPerSec` is the cast
 * rate of the selected skill and `hitPerSecs` the ASPD ceiling; a skill-use proc is priced
 * off the first, capped by the second.
 */
const SUMMARY = {
  calc: { hitPerSecs: 4 },
  calcSkill: { dmgType: 'Physical', totalHitPerSec: 1 },
  dmg: { accuracy: 100, criRateToMonster: 0, basicDps: 0 },
  weapon: { rangeType: 'melee' },
  monster: { hp: 10_000_000, race: 'formless', type: 'boss' },
};

/** The `"Name==Level"` the picker would hold for `skillId` on this class. */
function selectedValueFor(cls: any, skillId: number): string {
  const skill = cls.atkSkills.find((entry: any) => SKILL_ID_BY_NAME[entry.name] === skillId);
  expect(skill, `trigger ${skillId} is not an offensive skill of ${cls.constructor.name}`).toBeTruthy();
  return skill.value;
}

function solve(clause: Clause, refine = 10, withNecklace = true) {
  const cls = clause.make();
  cls.setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] }).getSkillBonusAndName();
  const model: any = {
    ...createMainModel(),
    level: 260,
    jobLevel: 50,
    weapon: clause.weapon,
    weaponRefine: refine,
    accLeft: withNecklace ? clause.item : 0,
    selectedAtkSkill: selectedValueFor(cls, clause.trigger),
  };
  const calc = makeCalculator(ITEMS, cls).setHpSpTable(HP_SP_TABLE).setMonster(MONSTERS[DUMMY]);
  calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
  return { calc, model };
}

describe.each(CLAUSES)('Colar Consagrado $item with weapon $weapon', (clause) => {
  it(`resolves [${clause.trigger}] -> [${clause.skill}] Nv${clause.level} at ${clause.chance}%, only from +10 and only with the necklace`, () => {
    expect(solve(clause).calc.resolvedItemAutoCasts).toContainEqual(expect.objectContaining({
      itemId: clause.item, skillId: clause.skill, skillLevel: clause.level, chance: clause.chance,
      trigger: 'skill-use', triggerSkillId: clause.trigger,
    }));
    expect(solve(clause, 9).calc.resolvedItemAutoCasts).toEqual([]);
    expect(solve(clause, 10, false).calc.resolvedItemAutoCasts).toEqual([]);
  });

  it('prices the proc instead of reporting an unsupported formula', () => {
    const { calc, model } = solve(clause);
    calc.calcAllAtk();
    const simulation = buildAutoCastSimulation({ calc, model, hasSelectedEffects: false, summary: SUMMARY as any });

    expect(simulation.blockedSources.map((blocked) => blocked.reason))
      .not.toContain('A fórmula dessa habilidade ainda não é suportada.');
    const priced = simulation.sources.find((source) => source.source.skillId === clause.skill);
    expect(priced, `no priced source for ${clause.skill}`).toBeTruthy();
    expect(priced!.activationsPerSecond).toBeCloseTo(clause.chance / 100, 6);
    expect(priced!.expectedDamagePerActivation).toBeGreaterThan(0);
  });

  // What the Rotação panel asks for, tile by tile. It is keyed on the trigger because the
  // proc is drawn glued under that tile: handing it to any other row would claim a line of
  // damage the build never gets.
  it('hands the rotation this proc for the trigger tile and for no other', () => {
    const { calc } = solve(clause);
    calc.calcAllAtk();
    const forTrigger = rotationAutoCasts({ calc, summary: SUMMARY as any, triggerSkillId: clause.trigger });

    expect(forTrigger.find((cast) => cast.skillId === clause.skill)).toMatchObject({
      skillLevel: clause.level, chance: clause.chance, sourceItemId: clause.item,
    });
    expect(forTrigger.find((cast) => cast.skillId === clause.skill).expectedDamagePerActivation).toBeGreaterThan(0);
    // 1 is Cura, which no consagrado clause waits on; 0 is the "no skill selected" tile.
    expect(rotationAutoCasts({ calc, summary: SUMMARY as any, triggerSkillId: 1 })).toEqual([]);
    expect(rotationAutoCasts({ calc, summary: SUMMARY as any, triggerSkillId: 0 })).toEqual([]);
  });
});
