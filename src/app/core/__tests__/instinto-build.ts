import { readFileSync } from 'node:fs';
import { Windhawk } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from '../calculator';
import { CalcChainInput, CalculatorController } from '../calculator-controller';

/**
 * The Windhawk build both Instinto specs are written against, in one place.
 *
 * Two separate reports landed on the same gear — a proc that lowered damage
 * (`instinto-dex-chance.spec.ts`) and one that never reached the character sheet
 * (`chance-affects-stat-summary.spec.ts`) — and each spec had grown its own copy of the
 * same ~65-line harness: the item db, the four item ids, the target, the twenty model
 * fields, the chain input. Two copies of one build can drift onto different assumptions
 * while both keep passing, and a change to `CalcChainInput` or to any of those item ids
 * has to be made twice.
 *
 * Only `dex` varies between the two, and it is the variable that matters: the reported
 * cast bug needs a build short of the 530 DES2 INT1 that zeroes the variable cast, while
 * the damage bug was filed on a higher-DES build.
 */
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** Hawkeye — the Bota Temporal enchant whose script is `chance__dex: 200`. */
export const INSTINTO_ID = 4879;
/** item.json ships the English name; the pt-BR "Instinto" comes from the LATAM overlay
 *  the UI applies on top, so a chance is keyed by whichever name the db holds. */
export const INSTINTO_NAME: string = db[INSTINTO_ID].name;

/** Concentrar 10, Caminho do Vento 5, Visão Real 10, Disparo Selvagem 5, Ilimitar 5,
 *  Ventos Sinistros 1 — the "Habilidades/efeitos ativos" panel of the shared build. */
const ACTIVE_SKILL_IDS = [10, 5, 10, 5, 5, 1];

/** Poring with every defence and resistance zeroed, so what a spec asserts comes from the
 *  build. Not `INERT_MONSTER` from ./make-calculator: these specs read hit and flee, which
 *  need the two `*RequireFor*` fields that one leaves out. */
const MONSTER = {
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

/**
 * Solve the shared build, exactly the way ro-calculator.component.ts's prepare() does.
 *
 * The chain input comes back too: a spec that walks an attack rotation re-solves the same
 * loaded build for another skill, which needs it.
 */
export function solveInstintoBuild(params: { dex: number; selectedChances: string[] }): { calc: Calculator; input: CalcChainInput } {
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
    .setMonster(MONSTER);

  const model = createMainModel();
  model.class = 4257;
  model.level = 230;
  model.jobLevel = 47;
  model.str = 4; model.agi = 100; model.vit = 100; model.int = 120; model.dex = params.dex; model.luk = 73;
  model.pow = 100; model.crt = 21;
  // job-level stat bonuses — the real model always carries them (calcStatBoost, which the
  // +DES% boots go through, reads jobDex directly)
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

  const input: CalcChainInput = {
    monster: MONSTER,
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
    selectedChances: params.selectedChances,
    usedHpL: false,
  };

  new CalculatorController().runChain(calc, input);

  return { calc, input };
}
