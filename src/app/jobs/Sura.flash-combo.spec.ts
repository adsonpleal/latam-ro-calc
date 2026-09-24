import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { createMainModel } from '../utils/create-main-model';
import { Sura } from './Sura';

// Combo Rápido: https://browiki.org/wiki/Combo_R%C3%A1pido — tracker PciDnRUoYW6FMh3lNXp4.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

function simulate(flashLevel: number, learned: [number, number, number]) {
  const cls = new Sura();
  const model: any = { ...createMainModel(), level: 175, jobLevel: 60, str: 110, dex: 90, selectedAtkSkill: `Flash Combo==${flashLevel}` };
  const levels: Record<string, number> = { 'Dragon Combo': learned[0], 'Fallen Empire': learned[1], 'Tiger Cannon': learned[2] };
  const passiveSkillIds = cls.passiveSkills.map((skill) => levels[skill.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds })
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

describe('Combo Rápido sums the learned attacks', () => {
  it('is offered in Batalha and exposes the three contributing levels in Aprenda', () => {
    const sura = new Sura();
    expect(sura.atkSkills.find((skill) => skill.name === 'Flash Combo')?.levelList).toHaveLength(5);
    expect(sura.activeSkills.some((skill) => skill.name === 'Flash Combo')).toBe(false);
    for (const name of ['Dragon Combo', 'Fallen Empire', 'Tiger Cannon']) {
      expect(sura.passiveSkills.find((skill) => skill.name === name)?.dropdown).toHaveLength(11);
    }
  });

  it('sums all three hits, and omits unlearned hits', () => {
    const all = simulate(5, [10, 10, 10]);
    const first = simulate(5, [10, 0, 0]);
    const none = simulate(5, [0, 0, 0]);
    expect(all.skillMinDamage).toBeGreaterThan(first.skillMinDamage);
    expect(first.skillMinDamage).toBeGreaterThan(0);
    expect(none.skillMinDamage).toBe(0);
    expect(all.skillFormulaGraph.min.nodes.at(-1).value).toBe(all.skillMinDamage);
    expect(all.skillDps).toBeGreaterThan(0);
  });

  it('increases the ATQ during the sequence with Combo Rápido level', () => {
    expect(simulate(5, [10, 10, 10]).skillMinDamage).toBeGreaterThan(simulate(1, [10, 10, 10]).skillMinDamage);
  });
});
