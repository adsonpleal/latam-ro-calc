import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JobBuffs } from './job-buffs';
import { Calculator } from '../core/calculator';
import { CalculatorController, collectBuffBonuses } from '../core/calculator-controller';
import { buildElementTable } from '../core/summary-tables';
import { equipStatusOf, makeCalculator } from '../core/__tests__/make-calculator';
import { ArchMage } from '../jobs/ArchMage';
import { Warlock } from '../jobs/Warlock';
import { createMainModel } from '../utils';

/**
 * Geleira, the party state Cacos de Gelo grants under Potencializar Magia Nv1 — see the
 * comment on `_Geleira` in job-buffs.ts for where each of its four values comes from.
 *
 * Card QLqIH8BwdSOW7gqsswvy, reported by Ryussian: a water build had no way to say it was
 * standing in one.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const NEUTRAL_LV1 = '21077';
const WATER_SKILL = 'Frozen Slash==5';
const FIRE_SKILL = 'Crimson Arrow==5';

const def = JobBuffs.find((buff) => buff.name === '_Geleira')!;
/** The positional buff array the engine takes, with Geleira on and everything else off. */
const geleiraOn = (on: boolean) => JobBuffs.map((buff) => (buff === def && on ? 1 : 0));

/** A bare level-250 Arch Mage through the real chain, with Geleira and Climax as asked. */
function simulate(opts: { skill: string; geleira?: boolean; climax?: number }) {
  const cls: any = new ArchMage();
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((skill: any) => (skill.name === 'Climax' ? opts.climax ?? 0 : 0)),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls.getSkillBonusAndName();

  const model: any = createMainModel();
  model.class = cls.classId;
  model.level = 250;
  model.jobLevel = 1;
  model.int = 130;
  model.dex = 130;
  model.spl = 100;
  model.selectedAtkSkill = opts.skill;

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters[NEUTRAL_LV1], equipAtks, masteryAtks, buffMasterys: {}, consumeData: [],
    buffEquips: collectBuffBonuses(JobBuffs, geleiraOn(!!opts.geleira), activeSkillNames).equipAtk,
    aspdPotion: undefined, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: opts.skill, selectedChances: [], usedHpL: false,
  } as any);

  return {
    max: (calc as any).damageSummary.skillMaxDamage as number,
    totalBonus: (calc as any).totalEquipStatus as Record<string, number>,
  };
}

describe('Geleira', () => {
  it('is offered as a received buff, under the Cacos de Gelo description', () => {
    expect(def).toMatchObject({ label: 'Geleira', icon: 5225, inputType: 'selectButton' });
    expect(def.isDebuff).toBeFalsy();
    expect(def.preview).toBeFalsy();
  });

  it('carries the four values of the client description', () => {
    expect(def.dropdown.find((option) => option.isUse)!.bonus).toEqual({
      def: 300, mdef: 100, m_my_element_water: 30, subele_water: 30,
    });
  });

  it('raises Water magic by the documented 30%, and leaves another property alone', () => {
    expect(simulate({ skill: WATER_SKILL, geleira: true }).max / simulate({ skill: WATER_SKILL }).max)
      .toBeCloseTo(1.3, 2);
    expect(simulate({ skill: FIRE_SKILL, geleira: true }).max).toBe(simulate({ skill: FIRE_SKILL }).max);
  });

  it('puts DEF, DEFM and the Water resistance in the totals', () => {
    const bare = simulate({ skill: WATER_SKILL }).totalBonus;
    const under = simulate({ skill: WATER_SKILL, geleira: true }).totalBonus;

    expect((under.def || 0) - (bare.def || 0)).toBe(300);
    expect((under.mdef || 0) - (bare.mdef || 0)).toBe(100);
    expect((under.subele_water || 0) - (bare.subele_water || 0)).toBe(30);
  });

  it('shows the own-element bonus in the element table, where a water build reads it', () => {
    const row = buildElementTable(collectBuffBonuses(JobBuffs, geleiraOn(true), new Set()).equipAtk._Geleira)
      .find((entry) => entry.name === 'Water')!;

    expect(row.myElement).toBe(30);
  });

  it('reaches a class that has nothing to do with the Arch Mage', () => {
    const party = collectBuffBonuses(JobBuffs, geleiraOn(true), new Set()).equipAtk;
    const calc = makeCalculator({}, new Warlock()).setBuffBonus({ masteryAtk: {}, equipAtk: party });

    expect(equipStatusOf(calc, createMainModel()).m_my_element_water).toBe(30);
  });

  // Geleira lasts 15 minutes and does not follow the Potencializar Magia level chosen
  // afterwards, so the buff row is its only source: Climax Nv1 suppresses the Cacos de Gelo
  // damage (see ArchMage.crystal-impact-climax.spec.ts) and grants nothing on its own. An
  // Arch Mage who cast it himself ticks the same row every other class ticks, and the +30%
  // lands once.
  describe('is counted once for the Arch Mage who casts it himself', () => {
    it('Climax Nv1 on its own grants no Water-magic bonus', () => {
      expect(simulate({ skill: WATER_SKILL, climax: 1 }).totalBonus.m_my_element_water || 0).toBe(0);
    });

    it('Climax Nv1 plus the buff is +30%, not +60%', () => {
      expect(simulate({ skill: WATER_SKILL, geleira: true, climax: 1 }).totalBonus.m_my_element_water).toBe(30);
    });
  });
});
