import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { buildAutoCastSimulation } from '../core/auto-cast';
import { createMainModel } from '../utils/create-main-model';
import { Sorcerer } from './Sorcerer';

// Punho Arcano: https://browiki.org/wiki/Punho_Arcano — tracker GfZHIU4zvFliyhIw1bdM.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

function simulate(choice: number) {
  const cls = new Sorcerer();
  const model: any = { ...createMainModel(), level: 150, jobLevel: 50, int: 100, dex: 90, selectedAtkSkill: 'Fire Bolt==10' };
  const activeSkillIds = cls.activeSkills.map((skill) => skill.name === 'Fist Spell' ? choice : 0);
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
  const damage: any = (calc as any).damageSummary;
  const autoCast = buildAutoCastSimulation({ calc, model, summary: calc.getTotalSummary(), hasSelectedEffects: false });
  return { damage, autoCast };
}

describe('Punho Arcano on ordinary attacks', () => {
  it.each([
    [1, ElementType.Fire],
    [2, ElementType.Water],
    [3, ElementType.Wind],
  ])('uses interrupted bolt choice %i as magical basic damage', (choice, element) => {
    const { damage, autoCast } = simulate(choice);
    expect(damage.propertyAtk).toBe(element);
    expect(damage.basicMinDamage).toBeGreaterThan(0);
    expect(damage.accuracy).toBe(100);
    expect(damage.criRateToMonster).toBe(0);
    expect(autoCast.basicAttackDps).toBe(damage.basicDps);
    expect(autoCast.criticalRate).toBe(0);
  });

  it('leaves ordinary physical attacks intact when inactive', () => {
    const inactive = simulate(0);
    expect(inactive.damage.propertyAtk).toBe(ElementType.Neutral);
    expect(inactive.damage.basicMaxDamage).not.toBe(simulate(1).damage.basicMaxDamage);
  });
});
