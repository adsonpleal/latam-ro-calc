import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ItemTypeId } from 'src/app/constants';
import { Windhawk } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';
import { PlayerTargetProfile, PvpMode } from './pvp';

/**
 * Phase 2 (PVP) end-to-end: drives the REAL damage pipeline against a player
 * target and checks that the WoE-castle reduction + defender gear reductions
 * land as the última linha. Anchored to Luís's validated table (docs/pvp.md §2).
 *
 * Reuses the Windhawk bow build from instinto-dex-chance.spec (a known
 * damage-producing setup) — Focused Arrow Strike is a ranged SKILL, so it falls
 * in the "habilidade" channel (skill), not the basic-ranged channel.
 */
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const monster = {
  id: 1002, name: 'Poring', spawn: 'x',
  stats: {
    level: 1, health: 50, attack: { min: 7, max: 8 }, range: 1, defense: 0, magicDefense: 0,
    str: 1, int: 0, vit: 1, dex: 6, agi: 1, luk: 30, element: 1, elementName: 'Neutral 1',
    elementShortName: 'W1', race: 4, raceName: 'Plant', scale: 0, scaleName: 'Small', class: 0,
    criShield: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0,
    hitRequireFor100: 182, fleeRequireFor95: 182,
  },
  data: { def: 0, mdef: 0, hitRequireFor100: 182, fleeRequireFor95: 182, criShield: 0, softDef: 0, res: 0, mres: 0 },
} as any;

/** A featureless player target: zero defenses so the WoE/gear layers are isolated. */
const bareTarget = (defenderBonus: PlayerTargetProfile['defenderBonus'] = {}): PlayerTargetProfile => ({
  name: 'Alvo', level: 200, hp: 500_000,
  def: 0, softDef: 0, mdef: 0, softMdef: 0, res: 0, mres: 0, flee: 0,
  str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1,
  defenderBonus,
});

const skillMax = (mode: PvpMode, defenderBonus: PlayerTargetProfile['defenderBonus'] = {}) => {
  const cls = new Windhawk();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [10, 5, 10, 5, 5, 1], passiveSkillIds: [] })
    .getSkillBonusAndName();

  const calc = new Calculator();
  calc
    .setMasterItems({ 700016: { ...db['700016'] }, 1773: { ...db['1773'] } })
    .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(100000), baseSp: Array(251).fill(10000) }] as any)
    .setClass(cls);

  const model = createMainModel();
  model.class = 4257; model.level = 230; model.jobLevel = 47;
  model.str = 4; model.agi = 100; model.vit = 100; model.int = 120; model.dex = 130; model.luk = 73;
  model.pow = 100; model.crt = 21;
  // job-level stat bonuses — the real model always carries them; trait stats
  // (jobCon) feed the hit formula, so omitting them yields NaN accuracy.
  model.jobStr = 2; model.jobAgi = 12; model.jobVit = 7; model.jobInt = 8; model.jobDex = 7; model.jobLuk = 4;
  model.jobPow = 7; model.jobSta = 4; model.jobWis = 5; model.jobSpl = 4; model.jobCon = 8; model.jobCrt = 4;
  model.weapon = 700016; model.weaponRefine = 11; model.ammo = 1773;
  model.selectedAtkSkill = 'Focused Arrow Strike==5';
  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster, playerTarget: bareTarget(defenderBonus), pvpMode: mode,
    equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: 0,
    extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL: false,
  });

  return (calc as any).damageSummary.skillMaxDamage as number;
};

const basicMax = (mode: PvpMode) => {
  const cls = new Windhawk();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [10, 5, 10, 5, 5, 1], passiveSkillIds: [] })
    .getSkillBonusAndName();
  const calc = new Calculator();
  calc
    .setMasterItems({ 700016: { ...db['700016'] }, 1773: { ...db['1773'] } })
    .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(100000), baseSp: Array(251).fill(10000) }] as any)
    .setClass(cls);
  const model = createMainModel();
  model.class = 4257; model.level = 230; model.jobLevel = 47;
  model.str = 4; model.agi = 100; model.vit = 100; model.int = 120; model.dex = 130; model.luk = 73; model.pow = 100; model.crt = 21;
  model.jobStr = 2; model.jobAgi = 12; model.jobVit = 7; model.jobInt = 8; model.jobDex = 7; model.jobLuk = 4;
  model.jobPow = 7; model.jobSta = 4; model.jobWis = 5; model.jobSpl = 4; model.jobCon = 8; model.jobCrt = 4;
  model.weapon = 700016; model.weaponRefine = 11; model.ammo = 1773;
  model.selectedAtkSkill = 'Focused Arrow Strike==5';
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster, playerTarget: bareTarget(), pvpMode: mode,
    equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: 0,
    extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL: false,
  });
  return (calc as any).damageSummary.basicMaxDamage as number;
};

describe('PVP damage pipeline (Windhawk / Focused Arrow Strike, skill channel)', () => {
  it('open PVP applies no castle reduction (baseline)', () => {
    expect(skillMax('pvp')).toBeGreaterThan(0);
  });

  it("normal castle reduces skill damage to ~10% (the '1kk → 100k' anchor)", () => {
    expect(skillMax('woe') / skillMax('pvp')).toBeCloseTo(0.1, 2);
  });

  it('TE castle reduces skill damage to ~10% as well', () => {
    expect(skillMax('woe-te') / skillMax('pvp')).toBeCloseTo(0.1, 2);
  });

  it("a defender's dmg_taken_all 50% halves incoming damage on top of the mode", () => {
    expect(skillMax('pvp', { dmg_taken_all: 50 }) / skillMax('pvp')).toBeCloseTo(0.5, 2);
  });

  // Basic bow attack = the "ataque a distância" (phys_ranged) channel.
  it('basic ranged attack: −95% in both castles', () => {
    expect(basicMax('woe') / basicMax('pvp')).toBeCloseTo(0.05, 2);
    expect(basicMax('woe-te') / basicMax('pvp')).toBeCloseTo(0.05, 2);
  });
});

/**
 * Phase 3: derive a PlayerTargetProfile from a solved build (getAsPlayerTarget)
 * — the bridge that turns a saved simulation into an enemy player. Uses the
 * Windhawk build wearing a reduction headgear so the extracted profile carries
 * both real defenses and the defender-reduction bonus.
 */
const solveDefenderProfile = (headScript: Record<string, string[]>): PlayerTargetProfile => {
  const cls = new Windhawk();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: [10, 5, 10, 5, 5, 1], passiveSkillIds: [] })
    .getSkillBonusAndName();

  const calc = new Calculator();
  calc
    .setMasterItems({
      700016: { ...db['700016'] },
      1773: { ...db['1773'] },
      999001: { id: 999001, name: 'Reduc Head', itemTypeId: ItemTypeId.ARMOR, defense: 5, script: headScript },
    } as any)
    .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(100000), baseSp: Array(251).fill(10000) }] as any)
    .setClass(cls);

  const model = createMainModel();
  model.class = 4257; model.level = 200; model.jobLevel = 50;
  model.str = 4; model.agi = 90; model.vit = 100; model.int = 60; model.dex = 100; model.luk = 40;
  model.jobStr = 2; model.jobAgi = 12; model.jobVit = 7; model.jobInt = 8; model.jobDex = 7; model.jobLuk = 4;
  model.jobPow = 7; model.jobSta = 4; model.jobWis = 5; model.jobSpl = 4; model.jobCon = 8; model.jobCrt = 4;
  model.weapon = 700016; model.weaponRefine = 4; model.ammo = 1773; model.headUpper = 999001;
  model.selectedAtkSkill = 'Focused Arrow Strike==5';
  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: 0,
    extraOptionScripts: [], activeSkillNames, learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill, selectedChances: [], usedHpL: false,
  });

  return calc.getAsPlayerTarget('Defensor');
};

describe('getAsPlayerTarget — build a PVP target from a solved simulation', () => {
  it('extracts real defenses, hp and flee', () => {
    const profile = solveDefenderProfile({ dmg_taken_all: ['20'] });
    expect(profile.hp).toBeGreaterThan(0);
    expect(profile.flee).toBeGreaterThan(0);
    expect(profile.softDef).toBeGreaterThan(0); // player softDef from VIT/AGI/level
    expect(profile.name).toBe('Defensor');
  });

  it('carries only the defender-reduction bonuses from its gear', () => {
    const profile = solveDefenderProfile({ dmg_taken_all: ['20'], atk: ['50'] });
    expect(profile.defenderBonus.dmg_taken_all).toBe(20);
    // attacker-side bonuses (atk) must NOT leak into the defender bonus
    expect((profile.defenderBonus as Record<string, number>).atk).toBeUndefined();
  });

  it('round-trips: the extracted profile reduces incoming damage as a target', () => {
    const withReduc = solveDefenderProfile({ dmg_taken_all: ['20'] });
    const bare = solveDefenderProfile({});
    // same build, so the only delta is the 20% reduction the profile carries
    expect(skillMax('pvp', withReduc.defenderBonus) / skillMax('pvp', bare.defenderBonus)).toBeCloseTo(0.8, 2);
  });
});
