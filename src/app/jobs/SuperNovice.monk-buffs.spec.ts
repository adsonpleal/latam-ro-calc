import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { createMainModel } from '../utils/create-main-model';
import { SuperNovice } from './SuperNovice';

// Tracker UvnPAYPMVrKUtyWD4C6A: Monk buffs on a Superaprendiz critical build.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

function simulate(spheres: number, fury: number) {
  const cls = new SuperNovice();
  const model: any = { ...createMainModel(), level: 175, jobLevel: 50, str: 90, luk: 100, selectedAtkSkill: 'Tiger Cannon==10' };
  const activeSkillIds = cls.activeSkills.map((skill) => skill.name === 'Vigor condensation' ? spheres : skill.name === 'Vigor Explosion' ? fury : 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds, passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters['21077'], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined, extraOptionScripts: [], activeSkillNames,
    learnedSkillMap, selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);
  return (calc as any).damageSummary as any;
}

describe('Superaprendiz Monk buffs', () => {
  it('adds ATQ for each sphere and CRIT by Fúria Interior level', () => {
    const base = simulate(0, 0);
    const one = simulate(1, 1);
    const five = simulate(5, 5);
    expect(one.basicMaxDamage).toBeGreaterThan(base.basicMaxDamage);
    expect(five.basicMaxDamage).toBeGreaterThan(one.basicMaxDamage);
    expect(one.basicCriRate - base.basicCriRate).toBe(10);
    expect(five.basicCriRate - base.basicCriRate).toBe(20);
  });
});
