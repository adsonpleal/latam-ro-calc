import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from '../core/calculator';
import { CalculatorController } from '../core/calculator-controller';
import { ArchMage } from '../jobs/ArchMage';
import { createMainModel } from '../utils';
import { skillDescHtml } from '../utils/pretty-item-desc';
import { JobBuffs } from './job-buffs';

// Tracker card fDMHWYZrtslUT8IxpyZx, reported by Zant-: the soul toggled on and
// left DEF/DEFM untouched. The numbers are Nv 5 of the client description of 2596.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
const buff = JobBuffs.find((entry) => entry.name === 'Golem Soul')!;

function defenses(active: boolean): { def: number; mdef: number } {
  const cls = new ArchMage();
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map(() => 0),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls.getSkillBonusAndName();
  const model = createMainModel();
  model.level = 250;
  model.vit = 100;
  model.int = 100;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  const selected = buff.dropdown.find((option) => option.isUse === active)!;
  new CalculatorController().runChain(calc, {
    monster: monsters['21077'], equipAtks, masteryAtks,
    buffEquips: selected.bonus ? { [buff.name]: selected.bonus } : {},
    buffMasterys: {}, consumeData: [], aspdPotion: undefined, extraOptionScripts: [],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: '', selectedChances: [], usedHpL: false,
  } as any);
  return (calc as any).defenses;
}

describe('Espírito do Golem', () => {
  it('grants the Nv 5 DEF and DEFM printed in the client description', () => {
    const desc = skillDescHtml(2596);
    expect(desc).toContain('[Nv 5]');
    expect(desc).toMatch(/\[Nv 5\]:\s*(<[^>]+>)*\+300(<[^>]+>)*\s*l\s*(<[^>]+>)*\+40/);
    expect(buff.dropdown.find((option) => option.isUse)?.bonus).toEqual({ def: 300, mdef: 40 });
  });

  it('raises the build hard DEF by 300 and hard DEFM by 40 when active', () => {
    const off = defenses(false);
    const on = defenses(true);
    expect(on.def - off.def).toBe(300);
    expect(on.mdef - off.mdef).toBe(40);
  });
});
