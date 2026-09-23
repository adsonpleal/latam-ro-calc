import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { ArchMage } from '../jobs/ArchMage';
import { createMainModel } from '../utils';
import { JobBuffs } from './job-buffs';

// Tracker card 0Iwy8urL7ZOt5CZoVMoK. The party buff's levels and three damage
// categories follow https://browiki.org/wiki/Reencarna%C3%A7%C3%A3o_das_Almas.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
const buff = JobBuffs.find((entry) => entry.name === 'Soul of Heaven and Earth')!;

function magicDamage(skill: string, level: number): number {
  const cls = new ArchMage();
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map(() => 0),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls.getSkillBonusAndName();
  const model = createMainModel();
  model.level = 250;
  model.int = 130;
  model.dex = 130;
  model.spl = 100;
  model.selectedAtkSkill = skill;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  const selected = buff.dropdown.find((option) => option.value === level);
  new CalculatorController().runChain(calc, {
    monster: monsters['21077'], equipAtks, masteryAtks,
    buffEquips: selected?.bonus ? { [buff.name]: selected.bonus } : {},
    buffMasterys: {}, consumeData: [], aspdPotion: undefined, extraOptionScripts: [],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skill, selectedChances: [], usedHpL: false,
  } as any);
  return (calc as any).damageSummary.skillMaxDamage;
}

describe('Reencarnação das Almas', () => {
  it('offers all ten levels with equal melee, ranged and magical bonuses', () => {
    expect(buff).toMatchObject({ label: 'Reencarnação das Almas', inputType: 'dropdown' });
    expect(buff.dropdown.filter((option) => option.isUse).map((option) => [option.value, option.bonus]))
      .toEqual(Array.from({ length: 10 }, (_, index) => {
        const level = index + 1;
        const bonus = 5 + 2 * level;
        return [level, { melee: bonus, range: bonus, m_my_element_all: bonus }];
      }));
    expect(buff.dropdown[0]).toMatchObject({ value: 0, isUse: false });
  });

  it.each(['Crimson Arrow==5', 'Frozen Slash==5'])(
    'raises %s damage when active and scales with level', (skill) => {
      expect(magicDamage(skill, 1)).toBeGreaterThan(magicDamage(skill, 0));
      expect(magicDamage(skill, 10)).toBeGreaterThan(magicDamage(skill, 1));
    },
  );
});
