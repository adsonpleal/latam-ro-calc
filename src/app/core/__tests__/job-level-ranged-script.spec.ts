import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { ArchMage } from 'src/app/jobs/ArchMage';
import { createMainModel } from 'src/app/utils/create-main-model';

/**
 * `jobLevel:N(min-max)---Y` — the ranged step form on the job level, added on 12/09/2026
 * for Colar de Ampulheta (490087): "Todos os talentos +6. A cada 5 níveis de classe até o
 * 30: todos os talentos -1." The plain `jobLevel:5----1` kept subtracting past job 30 and
 * left a job-50 character at −4; the cap is what the item text promises, and the recording
 * `mg-meteoro-escarlate-gear-states.rrf` (job 13, +4 on every trait in ZC_COUPLESTATUS) is
 * the low end of it (ArchMage.meteoro-escarlate-gear-states.spec.ts).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const COLAR_DE_AMPULHETA = 490087;

function totalPow(jobLevel: number, withItem: boolean): number {
  const cls: any = new ArchMage();
  const m: any = { ...createMainModel(), level: 201, jobLevel, class: 4255, selectedAtkSkill: 'Crimson Rock==5', ...(withItem ? { accLeft: COLAR_DE_AMPULHETA } : {}) };
  const b = cls.getJobBonusStatus(jobLevel);
  Object.assign(m, { jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt });
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) })
    .getSkillBonusAndName();
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters['21077'], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [], activeSkillNames, learnedSkillMap, selectedAtkSkill: 'Crimson Rock==5', selectedChances: [], usedHpL: false,
  } as any);
  return (calc as any).dmgCalculator.status.totalPow as number;
}

describe('jobLevel:N(min-max)---Y — Colar de Ampulheta', () => {
  it('carries the item text as a script', () => {
    expect(items[COLAR_DE_AMPULHETA].script).toEqual({ allTrait: ['6', 'jobLevel:5(1-30)----1'] });
  });

  it.each([
    { jobLevel: 13, gives: 4 },
    { jobLevel: 30, gives: 0 },
    { jobLevel: 50, gives: 0 }, // capped at job 30 — never negative
  ])('gives POD +$gives at job $jobLevel', ({ jobLevel, gives }) => {
    expect(totalPow(jobLevel, true) - totalPow(jobLevel, false)).toBe(gives);
  });
});
