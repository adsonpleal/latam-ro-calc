import { describe, expect, it } from 'vitest';
import { JobBuffs } from './job-buffs';
import { getClassDropdownList } from '../jobs';
import { SKILL_ID_BY_NAME } from '../skills';
import { CalculatorController } from '../core/calculator-controller';
import { jobBuffBonuses, jobBuffEntry, jobBuffOption } from '../core/__tests__/job-buff-bonus';
import { INERT_MONSTER, makeCalculator } from '../core/__tests__/make-calculator';
import { createMainModel } from '../utils';
import { ArchBishop } from '../jobs/ArchBishop';

/**
 * Glória and Concentrar as buffs any class can receive — tracker cards
 * `BgUaAutCuasqiapU1vdU` and `tufZPFe87pCIBUKiJKzK`, both reported by Haruka.
 *
 * The numbers are the live client's own tables, read out of
 * `data.grf > data/luafiles514/lua files/skillinfoz/skilldescript.lub` and matching
 * `ragassets/resources/raw/skills.json`:
 *
 *   Glória (75, PR_GLORIA, max 5)   "Consome 20 de SP para conceder SOR +30 para todos
 *                                    os membros do grupo na tela" — the level buys
 *                                    duration only (10s…30s), never more SOR.
 *   Concentrar (45, AC_CONCENTRATION, max 10)  "Nível l DES e AGI l Duração" — +3%…+12%.
 *
 * Glória is a LUK buff and nothing else: the CRIT the card is about has to come out of the
 * stat pipeline, which is what the last test measures.
 */

const bonusAt = (name: string, level: number) => jobBuffOption(name, level).bonus as Record<string, number>;

describe('Glória', () => {
  it('is the Priest buff (75), not the offensive Gloria Domini (367)', () => {
    expect(SKILL_ID_BY_NAME['Gloria']).toBe(75);
    expect(jobBuffEntry('Gloria').icon).toBe(75);
    // The trap this card came with: the catalog already held a same-looking name.
    expect(SKILL_ID_BY_NAME['Gloria Domini']).toBe(367);
  });

  it('grants SOR +30 flat, because only the duration scales with the level', () => {
    expect(bonusAt('Gloria', 5)).toEqual({ luk: 30 });
    expect(jobBuffEntry('Gloria').dropdown.filter((o) => o.isUse)).toHaveLength(1);
  });
});

describe('Concentrar', () => {
  it('carries the client table for all ten levels', () => {
    expect(SKILL_ID_BY_NAME['Improve Concentration']).toBe(45);
    expect(jobBuffEntry('Improve Concentration').dropdown.filter((o) => o.isUse).map((o) => o.bonus))
      .toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((boost) => ({ agiBoost: boost, dexBoost: boost })));
  });

  it('grants DES and AGI as a percentage, matching what the class panels used to carry', () => {
    // The two definitions this replaced: Archer offered Nv 10 only (+12%), the
    // Superaprendiz the whole ladder from +3%.
    expect(bonusAt('Improve Concentration', 10)).toEqual({ agiBoost: 12, dexBoost: 12 });
    expect(bonusAt('Improve Concentration', 1)).toEqual({ agiBoost: 3, dexBoost: 3 });
  });
});

/**
 * The duplicate-row trap. A buff declared both in `JobBuffs` and in a class's own active
 * skills renders twice for that class — once under the class section and once under
 * "Buffs" — because the view model builds the two lists independently and filters neither
 * against the other. `collectBuffBonuses` stops the bonus being counted twice, but not the
 * second row.
 *
 * So neither of these two may ever also be a class control. The classes that could plausibly
 * grow one are the three the cards name: Arqueiro casts Concentrar, the Superaprendiz learns
 * it, and the Arcebispo casts Glória.
 */
describe('no class offers a second row for either buff', () => {
  const shared = ['Gloria', 'Improve Concentration'];

  it.each(getClassDropdownList().map((c) => [c.label, c.instant] as const))('%s', (_label, character) => {
    expect(character.activeSkills.filter((skill) => shared.includes(skill.name)).map((s) => s.name)).toEqual([]);
    expect(character.passiveSkills.filter((skill) => shared.includes(skill.name)).map((s) => s.name)).toEqual([]);
  });

  it('keeps one selectable row per buff in the shared list itself', () => {
    for (const name of shared) {
      expect(JobBuffs.filter((entry) => entry.name === name)).toHaveLength(1);
    }
  });
});

/**
 * What the Glória card actually asks for: "principalmente pela chance de CRIT que o buff de
 * sorte dá". Nothing hardcodes CRIT — the +30 SOR goes through `getBaseCriRate`, which
 * counts `totalLuk * 3` tenths, so the panel's Crítico rises by 9 and the LUK by 30.
 */
describe('Glória reaches CRIT through the stat pipeline', () => {
  const sheet = (gloria: boolean) => {
    const cls = new ArchBishop();
    const calc = makeCalculator({}, cls);
    const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls.getSkillBonusAndName();
    const { equipAtk: buffEquips, masteryAtk: buffMasterys } = jobBuffBonuses(gloria ? { Gloria: 5 } : {}, activeSkillNames);

    const model: any = createMainModel();
    model.class = 7;
    model.level = 200;
    model.jobLevel = 60;
    model.str = 90; model.agi = 1; model.vit = 1; model.int = 1; model.dex = 1; model.luk = 100;

    calc.loadItemFromModel(model);
    new CalculatorController().runChain(calc, {
      monster: MONSTER, equipAtks, masteryAtks, buffEquips, buffMasterys,
      consumeData: [], aspdPotion: undefined, extraOptionScripts: [],
      activeSkillNames, learnedSkillMap, selectedAtkSkill: undefined, selectedChances: [], usedHpL: false,
    } as any);

    return calc.getTotalSummary() as any;
  };

  it('adds 30 SOR and the 9 Crítico that follow from it', () => {
    const off = sheet(false);
    const on = sheet(true);

    // The sheet drops a bonus that is zero, so SOR is simply absent with the buff off.
    expect(off.luk).toBeUndefined();
    expect(on.luk).toBe(30);
    // floor((level/10 + 10 + totalLuk*3 + cri*10) / 10): 30 SOR is 90 tenths, so 9 whole,
    // and no `cri` bonus is involved at any point.
    expect(on.calc.totalCri - off.calc.totalCri).toBe(9);
    expect(on.cri).toBeUndefined();
  });
});

/**
 * The inert Poring, with the two fields the damage chain needs on top: `ElementMapper` is
 * keyed by `elementName`, and the hit/flee thresholds decide whether the swing lands.
 */
const MONSTER = {
  ...INERT_MONSTER,
  stats: { ...INERT_MONSTER.stats, elementName: 'Neutral 1', hitRequireFor100: 182, fleeRequireFor95: 182 },
  data: { ...INERT_MONSTER.data, hitRequireFor100: 182, fleeRequireFor95: 182 },
} as any;
