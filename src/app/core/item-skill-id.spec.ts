import { describe, expect, it } from 'vitest';
import { Calculator } from './calculator';

/**
 * The id-based skill condition tokens added to the engine (see calculator.ts):
 * SKILL_ID[id==lv] (gating + per-level scaling), SKILL_ID2[id==lv] and
 * ACTIVE_SKILL_ID[id]. They resolve a skill id to the learned/active state the
 * name-based LEARN_SKILL / ACTIVE_SKILL tokens read, via SKILL_ID_BY_NAME.
 *
 * Real catalog ids used below: Severe Rainstorm = 2418, Dragon Breath = 2008,
 * Increase HP Recovery = 4, Acid Demonstration / Acid Bomb both = 490.
 */

// `itemType` is only read by branches these bare skill scripts never trigger, so
// any value is fine; the private methods are reached through an `any` cast.
const validate = (calc: Calculator, script: string) =>
  (calc as any).validateCondition({ itemType: 'armor', itemRefine: 0, script });

describe('Calculator id-based skill conditions', () => {
  it('resolves a skill id to its learned level', () => {
    const calc = new Calculator().setLearnedSkills(
      new Map([['Severe Rainstorm', 5], ['Dragon Breath', 3]]),
    );
    expect((calc as any).learnedSkillLevelById(2418)).toBe(5);
    expect((calc as any).learnedSkillLevelById(2008)).toBe(3);
    expect((calc as any).learnedSkillLevelById(99999)).toBe(0); // unknown / not learned
  });

  it('keeps the highest level when several names share one id', () => {
    const calc = new Calculator().setLearnedSkills(
      new Map([['Acid Demonstration', 3], ['Acid Bomb', 7]]), // both id 490
    );
    expect((calc as any).learnedSkillLevelById(490)).toBe(7);
  });

  it('gates SKILL_ID[id==lv] on the learned level (mirrors LEARN_SKILL)', () => {
    const ok = new Calculator().setLearnedSkills(new Map([['Severe Rainstorm', 5]]));
    expect(validate(ok, 'SKILL_ID[2418==5]1').isValid).toBe(true);

    const below = new Calculator().setLearnedSkills(new Map([['Severe Rainstorm', 3]]));
    expect(validate(below, 'SKILL_ID[2418==5]1').isValid).toBe(false);

    const none = new Calculator().setLearnedSkills(new Map());
    expect(validate(none, 'SKILL_ID[2418==5]1').isValid).toBe(false);
  });

  it('gates ACTIVE_SKILL_ID[id] on the active skill (mirrors ACTIVE_SKILL)', () => {
    const active = new Calculator().setUsedSkillNames(new Set(['Acid Demonstration'])); // id 490
    expect(validate(active, 'ACTIVE_SKILL_ID[490]50').isValid).toBe(true);

    const inactive = new Calculator().setUsedSkillNames(new Set());
    expect(validate(inactive, 'ACTIVE_SKILL_ID[490]50').isValid).toBe(false);
  });

  it('scales SKILL_ID[id==N]X---Y by floor(learnedLevel / N) * Y', () => {
    const calc = new Calculator().setLearnedSkills(new Map([['Increase HP Recovery', 5]])); // id 4
    expect((calc as any).calcStepBonus(0, 'SKILL_ID[4==2]---1')).toBe(2); // floor(5/2)*1
  });
});
