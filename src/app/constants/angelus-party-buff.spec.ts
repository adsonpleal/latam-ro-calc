import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SKILL_ID_BY_NAME } from '../skills';
import { skillDescHtml } from '../utils/pretty-item-desc';
import { createMainModel } from '../utils';
import { CalculatorController } from '../core/calculator-controller';
import { jobBuffBonuses, jobBuffEntry, jobBuffOption } from '../core/__tests__/job-buff-bonus';
import { INERT_MONSTER, makeCalculator } from '../core/__tests__/make-calculator';

/**
 * Angelus as a buff received from a party caster — tracker card `kayfrTGOxqYeM3C64o2C`,
 * reported by Ametsuky.
 *
 * The numbers are the client's own table for skill 33 (`skill-meta.generated.ts`, matching
 * `ragassets/resources/raw/skills.json`), and https://browiki.org/wiki/Angelus agrees with
 * it column for column:
 *
 *   "Reza para garantir um bônus de HP máx. e DEF proveniente da VIT para todos do grupo
 *    que estão na tela do usuário"  — DEF +5% and HP máx. +50 per level, over ten levels.
 *
 * "DEF proveniente da VIT" is soft DEF, which is why the bonus is `softDefPercent` and not
 * `def`; bROWiki spells the same restriction out as a note on the page. The second test
 * follows both columns through a real solve, because a buff that moved nothing the
 * calculator computes would be a dead dropdown row rather than a feature.
 */

const bonusAt = (level: number) => jobBuffOption('Angelus', level).bonus as Record<string, number>;
// The real table: `makeCalculator`'s stub keys no job, so the HP step would bail out and
// leave max HP at zero for both sides of the comparison.
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** The build's own defences and max HP, with Angelus off or at Nv 10. */
function sheet(angelus: boolean) {
  const calc = makeCalculator({}).setHpSpTable(hpSpTable);
  const { equipAtk: buffEquips, masteryAtk: buffMasterys } = jobBuffBonuses(angelus ? { Angelus: 10 } : {});

  const model: any = createMainModel();
  model.level = 200;
  model.vit = 100;
  model.agi = 50;

  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: MONSTER, equipAtks: {}, masteryAtks: {}, buffEquips, buffMasterys,
    consumeData: [], aspdPotion: undefined, extraOptionScripts: [],
    activeSkillNames: new Set(), learnedSkillMap: new Map(),
    selectedAtkSkill: undefined, selectedChances: [], usedHpL: false,
  } as any);

  return { ...(calc as any).defenses, maxHp: (calc as any).maxHp };
}

describe('Angelus', () => {
  it('is the Acolyte buff (33) and carries the client description', () => {
    expect(SKILL_ID_BY_NAME['Angelus']).toBe(33);
    expect(jobBuffEntry('Angelus').icon).toBe(33);

    const desc = skillDescHtml(33);
    expect(desc).toContain('DEF proveniente da VIT');
    expect(desc).toMatch(/\[Nv 10\]:\s*(<[^>]+>)*\+50%(<[^>]+>)*\s*l\s*(<[^>]+>)*\+500/);
  });

  it('offers the ten levels of the client table', () => {
    expect(jobBuffEntry('Angelus').dropdown.filter((option) => option.isUse).map((option) => option.bonus))
      .toEqual(Array.from({ length: 10 }, (_, i) => ({ softDefPercent: (i + 1) * 5, hp: (i + 1) * 50 })));
    expect(bonusAt(1)).toEqual({ softDefPercent: 5, hp: 50 });
  });

  it('raises the VIT-derived DEF by half and the max HP by 500 at Nv 10', () => {
    const off = sheet(false);
    const on = sheet(true);

    // floor(VIT/2 + AGI/5 + level/2) = floor(100/2 + 50/5 + 200/2) = 160, and +50% of it.
    expect(off.softDef).toBe(160);
    expect(on.softDef).toBe(Math.floor(160 * 1.5));
    expect(on.maxHp - off.maxHp).toBe(500);

    // Only those two: the percentage is on soft DEF, so hard DEF and the magical side
    // of the panel stay where they were.
    expect(on.def).toBe(off.def);
    expect(on.mdef).toBe(off.mdef);
    expect(on.softMdef).toBe(off.softMdef);
  });
});

/** The inert Poring, plus the two fields the damage chain needs to run a swing. */
const MONSTER = {
  ...INERT_MONSTER,
  stats: { ...INERT_MONSTER.stats, elementName: 'Neutral 1', hitRequireFor100: 182, fleeRequireFor95: 182 },
  data: { ...INERT_MONSTER.data, hitRequireFor100: 182, fleeRequireFor95: 182 },
} as any;
