import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { JobBuffs } from '../constants/job-buffs';
import { ArchBishop } from '../jobs/ArchBishop';
import { Cardinal } from '../jobs/Cardinal';
import { Warlock } from '../jobs/Warlock';
import { BUFF_EFST } from '../replay/replay-buffs';
import { SKILL_EFST } from '../replay/skill-status.map';
import { createMainModel } from '../utils';
import { calcSkillAspd } from '../utils/calc-skill-aspd';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { collectBuffBonuses } from './calculator-controller';

// Sacramentum (2515): "reduz o tempo de conjuração fixa do alvo", -10% per level, client
// skilldescript.lub and https://browiki.org/wiki/Sacramentum. bROWiki adds that it does
// not stack with other % fixed-cast reductions and applies after the flat-second ones.
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const def = JobBuffs.find((buff) => buff.name === 'Sacramentum')!;
const buffLevel = (level: number) => JobBuffs.map((buff) => (buff === def ? level : 0));

function fixedCast(fct: number, fctPercent: number) {
  return calcSkillAspd({
    skillData: { name: 'Test', acd: 0, cd: 0, fct: 2, vct: 0 } as any,
    totalEquipStatus: { acd: 0, vct: 0, fct, fctPercent } as any,
    status: { totalDex: 0, totalInt: 0 } as any,
    skillLevel: 1,
  }).reducedFct;
}

describe('Sacramentum', () => {
  it('offers the client/bROWiki level table as a received buff', () => {
    expect(def.inputType).toBe('dropdown');
    expect(def.dropdown.find((option) => !option.isUse)?.value).toBe(0);
    for (const level of [1, 2, 3, 4, 5]) {
      expect(def.dropdown.find((option) => option.value === level)?.bonus).toEqual({ fctPercent: level * 10 });
    }
  });

  it('is an Arcebispo skill, inherited by Cardeal, and not offered twice to the caster', () => {
    for (const cls of [new ArchBishop(), new Cardinal()]) {
      const skills = cls.setLearnSkills({
        activeSkillIds: cls.activeSkills.map((skill) => (skill.name === 'Sacramentum' ? 3 : 0)),
        passiveSkillIds: cls.passiveSkills.map(() => 0),
      }).getSkillBonusAndName();
      expect(skills.equipAtks.Sacramentum).toEqual({ fctPercent: 30 });
      expect(collectBuffBonuses(JobBuffs, buffLevel(5), skills.activeSkillNames).equipAtk.Sacramentum).toBeUndefined();
    }
  });

  it('reaches another class through the Buffs column', () => {
    const party = collectBuffBonuses(JobBuffs, buffLevel(5), new Set()).equipAtk;
    const calc = makeCalculator({}, new Warlock()).setBuffBonus({ masteryAtk: {}, equipAtk: party });
    expect(equipStatusOf(calc, createMainModel()).fctPercent).toBe(50);
  });

  it('does not stack with gear: the highest % fixed-cast reduction wins', () => {
    const fenrir = { ...db[4556], itemTypeId: 6, itemSubTypeId: 0 }; // Conj. Fixa -70%
    const party = collectBuffBonuses(JobBuffs, buffLevel(5), new Set()).equipAtk;
    const calc = makeCalculator({ 1601: db[1601], 4556: fenrir }).setBuffBonus({ masteryAtk: {}, equipAtk: party });
    expect(equipStatusOf(calc, { ...createMainModel(), weapon: 1601, weaponCard1: 4556 }).fctPercent).toBe(70);
  });

  it('applies after the flat-second reductions', () => {
    expect(fixedCast(0, 50)).toBe(1);
    expect(fixedCast(0.5, 50)).toBe(0.75);
  });

  it('imports from a replay via its LATAM status id', () => {
    expect(SKILL_EFST.Sacramentum).toBe(472);
    expect(BUFF_EFST[472]).toEqual({ name: 'Sacramentum', value: 5 });
  });
});
