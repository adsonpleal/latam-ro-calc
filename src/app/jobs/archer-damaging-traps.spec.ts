import { describe, expect, it } from 'vitest';
import { Ranger } from './Ranger';
import { Windhawk } from './Windhawk';

// vWInKsbTKi1dmXlmTuYP: bROWiki's per-pulse ratios, before normal physical mitigation.
describe('damaging traps in the Archer tree', () => {
  it('applies Perícia com Armadilha to Bomba Relógio', () => {
    const ranger = new Ranger();
    const skill = ranger.atkSkills.find((entry) => entry.name === 'Bomb Cluster')!;
    const passiveSkillIds = ranger.passiveSkills.map((entry) => entry.name === 'Trap Research' ? 10 : 0);
    const input = { model: { level: 200 }, skillLevel: 5, status: { totalDex: 100, totalInt: 100 } } as any;

    ranger.setLearnSkills({ activeSkillIds: ranger.activeSkills.map(() => 0), passiveSkillIds });
    ranger.getSkillBonusAndName();
    expect(skill.formula(input)).toBe(9700);
    ranger.setLearnSkills({ activeSkillIds: ranger.activeSkills.map(() => 0), passiveSkillIds: passiveSkillIds.map(() => 0) });
    ranger.getSkillBonusAndName();
    expect(skill.formula(input)).toBe(700);
  });

  it('applies Armadilha Avançada to each elemental Windhawk pulse', () => {
    const hawk = new Windhawk();
    const names = ['Solid Trap', 'Flame Trap', 'Deep Blind Trap', 'Swift Trap'];
    const passiveSkillIds = hawk.passiveSkills.map((entry) => entry.name === 'Advanced Trap' ? 5 : 0);
    const input = { model: { level: 200 }, skillLevel: 5, status: { totalCon: 100 } } as any;

    hawk.setLearnSkills({ activeSkillIds: hawk.activeSkills.map(() => 0), passiveSkillIds });
    hawk.getSkillBonusAndName();
    for (const name of names) {
      const skill = hawk.atkSkills.find((entry) => entry.name === name)!;
      expect(skill.formula(input)).toBe(6200);
      expect(skill.isMelee).toBe(true);
    }
    hawk.setLearnSkills({ activeSkillIds: hawk.activeSkills.map(() => 0), passiveSkillIds: passiveSkillIds.map(() => 0) });
    hawk.getSkillBonusAndName();
    expect(hawk.atkSkills.find((entry) => entry.name === 'Solid Trap')!.formula(input)).toBe(3100);
  });
});
