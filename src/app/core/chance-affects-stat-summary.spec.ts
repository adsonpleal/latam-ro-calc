import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Windhawk } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';
import { CalculatorController, collectChanceSources } from './calculator-controller';

/**
 * Bug report (tracker k74xfIkeTP75HuunmKY9, glenhari): ticking "Instinto" did not reduce
 * the variable cast. It went further than the cast window — the proc reached the damage
 * and nothing else, so the whole character sheet ignored it: DES stayed at the gear's
 * own bonus and DES2 INT1 never moved, on a proc worth +200 DES.
 *
 * The panel was half-effected, which is what made it hard to read. `atkSummaryForUI` is a
 * lazy getter over the damage calculator, and `recalcExtraBonus` leaves that calculator
 * holding the proc's bonuses — so ATQ Status DID move while everything the Calculator
 * cached during the base pass (stats, casting, hit/flee, defences, HP/SP) did not.
 *
 * The rule these tests hold: with an effect ticked, every figure describing the character
 * is the effected one. The damage figures are the exception, and deliberately so — the
 * damage panel prints base and effected as a pair ("Sem efeitos"), so `dmg` keeps both.
 */
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const INSTINTO_ID = 4879; // Hawkeye / "Instinto" — chance__dex 200
const INSTINTO_NAME: string = db[INSTINTO_ID].name;

// Concentrar 10, Caminho do Vento 5, Visão Real 10, Disparo Selvagem 5, Ilimitar 5,
// Ventos Sinistros 1 — the build the original Instinto report was filed against.
const ACTIVE_SKILL_IDS = [10, 5, 10, 5, 5, 1];

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

/** The reported build: a Windhawk on Bota Temporal (22004) carrying the Instinto enchant,
 *  with DES low enough that DES×2 + INT is well short of the 530 that zeroes the cast. */
const solve = (selectedChances: string[]) => {
  const items: any = {
    700016: { ...db['700016'] },   // bow
    1773: { ...db['1773'] },       // arrow
    22004: { ...db['22004'] },     // Bota Temporal, carrying the enchant
    [INSTINTO_ID]: { ...db[INSTINTO_ID] },
  };

  const cls = new Windhawk();
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: ACTIVE_SKILL_IDS, passiveSkillIds: [] })
    .getSkillBonusAndName();

  const calc = new Calculator();
  calc
    .setMasterItems(items)
    .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(100000), baseSp: Array(251).fill(10000) }] as any)
    .setClass(cls)
    .setMonster(monster);

  const model = createMainModel();
  model.class = 4257;
  model.level = 230;
  model.jobLevel = 47;
  model.str = 4; model.agi = 100; model.vit = 100; model.int = 120; model.dex = 79; model.luk = 73;
  model.pow = 100; model.crt = 21;
  model.jobStr = 2; model.jobAgi = 12; model.jobVit = 7; model.jobInt = 8; model.jobDex = 7; model.jobLuk = 4;
  model.jobPow = 7; model.jobSta = 4; model.jobWis = 5; model.jobSpl = 4; model.jobCon = 8; model.jobCrt = 4;
  model.weapon = 700016;
  model.weaponRefine = 11;
  model.ammo = 1773;
  model.boot = 22004;
  model.bootRefine = 9;
  model.bootEnchant2 = INSTINTO_ID;
  model.selectedAtkSkill = 'Focused Arrow Strike==5';

  calc.loadItemFromModel(model);

  new CalculatorController().runChain(calc, {
    monster,
    equipAtks,
    masteryAtks,
    buffEquips: {},
    buffMasterys: {},
    consumeData: [],
    aspdPotion: 0,
    extraOptionScripts: [],
    activeSkillNames,
    learnedSkillMap,
    selectedAtkSkill: model.selectedAtkSkill,
    selectedChances,
    usedHpL: false,
  });

  return calc;
};

describe('a ticked chance reaches the character sheet', () => {
  const off = solve([]).getTotalSummary();
  const on = solve([INSTINTO_NAME]).getTotalSummary();

  it('adds the proc to the stat the panel shows', () => {
    expect(off.dex).toBe(24);
    expect(on.dex).toBe(224);
  });

  it('moves DES2 INT1 by twice the DES the proc grants', () => {
    expect(on.calc.dex2int1).toBe(off.calc.dex2int1 + 400);
    expect(on.calc.to530).toBe(off.calc.to530 - 400);
  });

  it('zeroes the variable cast once DES2 INT1 passes 530', () => {
    // Short of 530 the build pays part of the variable window; past it, the cast is the
    // fixed half alone. That is the report: "a marcação de instinto não reduz a conj.
    // variável na interface".
    expect(off.calc.dex2int1).toBeLessThan(530);
    expect(on.calc.dex2int1).toBeGreaterThan(530);

    expect(off.calcSkill.castPeriod).toBeGreaterThan(off.calcSkill.fct);
    expect(on.calcSkill.castPeriod).toBe(on.calcSkill.fct);
  });

  it('carries the proc into the other DES-driven figures', () => {
    expect(on.calc.totalAspd).toBeGreaterThan(off.calc.totalAspd);
    expect(on.calc.hitPerSecs).toBeGreaterThan(off.calc.hitPerSecs);
    expect(on.calc.totalHit).toBeGreaterThan(off.calc.totalHit);
  });

  it('agrees with the ATQ rows, which always did reflect the proc', () => {
    // The half that already worked, pinned so the two halves can't drift apart again.
    expect(on.calc.totalStatusAtk).toBeGreaterThan(off.calc.totalStatusAtk);
  });

  it('leaves the base damage figures alone, so "Sem efeitos" still means it', () => {
    expect(on.dmg.skillMinDamage).toBe(off.dmg.skillMinDamage);
    expect(on.dmg.skillMaxDamage).toBe(off.dmg.skillMaxDamage);
    expect(on.dmg.effectedSkillDamageMin).toBeGreaterThan(on.dmg.skillMinDamage);
  });

  it('restores the base sheet when the effect is unticked', () => {
    const calc = solve([INSTINTO_NAME]);
    expect(calc.getTotalSummary().dex).toBe(224);

    calc.setSelectedChances([]).recalcExtraBonus('Focused Arrow Strike==5');

    expect(calc.getTotalSummary().dex).toBe(24);
    expect(calc.getTotalSummary().calc.dex2int1).toBe(off.calc.dex2int1);
  });
});

describe('collectChanceSources', () => {
  it('keys the ticked chances by the item that grants them', () => {
    const chanceList = solve([]).chanceList;

    expect(collectChanceSources(chanceList, [INSTINTO_NAME])).toEqual({
      [`chance_${INSTINTO_ID}`]: { dex: 200 },
    });
  });

  it('ignores the ones nobody ticked', () => {
    expect(collectChanceSources(solve([]).chanceList, [])).toEqual({});
  });
});
