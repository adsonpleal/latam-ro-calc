import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Windhawk } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';

/**
 * Bug report (shared build BuRRO0): on a Windhawk running Ilimitar (No Limits 5) +
 * Ventos Sinistros (Calamity Gale), checking the "Instinto" effect — item 4879
 * (Hawkeye), script `chance__dex: 200` — made Tiro Preciso damage DROP by ~60%.
 *
 * The chance itself is innocent: a pure +200 DES on a bow build can only raise ATQ
 * Status and ATQ da Arma. What actually happened is that `prepareAllItemBonus()`
 * runs more than once per solve (ro-calculator.component.ts's
 * calculateToSelectedMonsters() re-runs it per target and once more to restore the
 * main one), and Windhawk.setAdditionalBonus() backed Ilimitar's ranged bonus out
 * of `range` on EVERY pass while `clearSupersededBonusSource` made the source stop
 * contributing after the first — so range went 767 -> 417 (correct) -> 67 (wrong).
 * The "Efeitos" checkbox handler then recalculated off that degraded state.
 */
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const INSTINTO_ID = 4879; // Hawkeye / "Instinto" — chance__dex 200
// The chance is keyed by item name; item.json ships the English name, the pt-BR
// "Instinto" comes from the LATAM overlay the UI applies on top.
const INSTINTO_NAME: string = db[INSTINTO_ID].name;

// Mirrors the shared build's "Habilidades/efeitos ativos" panel: Concentrar 10,
// Caminho do Vento 5, Visão Real 10, Disparo Selvagem 5, Ilimitar 5, Ventos Sinistros 1.
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

/** Solves a Windhawk bow build carrying the Instinto enchant, exactly the way
 *  ro-calculator.component.ts's prepare() does. */
const solve = (selectedChances: string[]) => {
  const items: any = {
    700016: { ...db['700016'] },   // bow
    1773: { ...db['1773'] },       // arrow
    22004: { ...db['22004'] },     // boots carrying the enchant
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
  model.str = 4; model.agi = 100; model.vit = 100; model.int = 120; model.dex = 130; model.luk = 73;
  model.pow = 100; model.crt = 21;
  // job-level stat bonuses — the real model always carries them (calcStatBoost,
  // which the +DES% boots go through, reads jobDex directly)
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

const rangeOf = (calc: Calculator) => (calc as any).totalEquipStatus.range as number;

describe('Instinto (chance__dex +200) on a Windhawk bow build', () => {
  it('is offered as a selectable chance', () => {
    expect(solve([]).chanceList.map((c) => c.name)).toContain(INSTINTO_NAME);
  });

  it('keeps the ranged bonus stable across repeated prepareAllItemBonus() passes', () => {
    const calc = solve([]);
    const solved = rangeOf(calc);

    // calculateToSelectedMonsters() re-prepares the calculator once per selected
    // target plus once to restore the main one. Each pass must land on the same
    // ranged bonus — Ilimitar can only be superseded once.
    calc.prepareAllItemBonus().calcAllAtk();
    expect(rangeOf(calc)).toBe(solved);

    calc.prepareAllItemBonus().calcAllAtk();
    expect(rangeOf(calc)).toBe(solved);
  });

  it('raises Tiro Preciso damage instead of lowering it', () => {
    const calc = solve([INSTINTO_NAME]);
    const dmg = calc.getTotalSummary().dmg;

    expect(calc.selectedChanceList).toEqual([INSTINTO_NAME]);
    expect(dmg.effectedSkillDamageMax).toBeGreaterThan(dmg.skillMaxDamage);
    expect(dmg.effectedSkillDamageMin).toBeGreaterThan(dmg.skillMinDamage);
  });

  it('raises basic-attack damage too', () => {
    const dmg = solve([INSTINTO_NAME]).getTotalSummary().dmg;

    expect(dmg.effectedBasicDamageMax).toBeGreaterThan(dmg.basicMaxDamage);
    expect(dmg.effectedBasicDamageMin).toBeGreaterThan(dmg.basicMinDamage);
  });

  it('raises damage through the "Efeitos" checkbox fast path, after the extra prepare passes', () => {
    // Reproduces the reported flow: the build is solved, calculateToSelectedMonsters()
    // re-prepares it, and only then does the user tick the checkbox — which calls
    // setSelectedChances(...).recalcExtraBonus(skill) on that already-prepared calculator.
    const calc = solve([]);
    const base = calc.getTotalSummary().dmg.skillMinDamage;

    calc.prepareAllItemBonus().calcAllAtk();
    calc.setSelectedChances([INSTINTO_NAME]).recalcExtraBonus('Focused Arrow Strike==5');

    expect(calc.getTotalSummary().dmg.effectedSkillDamageMin).toBeGreaterThan(base);
  });
});
