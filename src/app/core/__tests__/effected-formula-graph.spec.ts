import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ImperialGuard } from 'src/app/jobs';
import { createMainModel } from 'src/app/utils';
import { Calculator } from '../calculator';
import { CalculatorController } from '../calculator-controller';
import { ITEM_DB } from './worn-bonus';

/**
 * The "Como o dano é calculado" panel has to explain the figure it hangs off.
 *
 * Reported against the two Botas Desconhecidas in a compare slot: the FOR boot's proc and
 * the SOR boot's proc printed the same "ATQ Base 1.314" and the same "ATQ Status 927",
 * even though the damage above them differed. The damage was right — the panel was reading
 * the base pass. `calculateAllDamages` solves with `setExtraBonus([])` and `recalcExtraBonus`
 * re-solves with the ticked procs, but it used to copy back only the `effected*` damage
 * figures, leaving `skillFormulaGraph` describing a build the proc never touched.
 *
 * A stat proc moves every row of that derivation: +STR/+LUK feeds ATQ Status, and the
 * primary stat also feeds ATQ da Arma's `ATQ base × FOR ÷ 200` term.
 */
describe('The formula graph of the triggered pass', () => {
  const CLAYMORE_OSAD = 600028;
  const BOOT_FOR = 470071;
  const BOOT_SOR = 470077;
  const DUMMY_ID = 21067;

  const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
  const dummy = {
    id: DUMMY_ID,
    name: monsters[DUMMY_ID].name,
    spawn: 'x',
    stats: { ...monsters[DUMMY_ID].stats },
    data: monsters[DUMMY_ID].data,
  } as any;

  const solve = (bootId: number, procOn: boolean) => {
    const items: any = { [CLAYMORE_OSAD]: { ...ITEM_DB[CLAYMORE_OSAD] }, [bootId]: { ...ITEM_DB[bootId] } };
    const cls = new ImperialGuard();
    const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
      .setLearnSkills({ activeSkillIds: [], passiveSkillIds: [] })
      .getSkillBonusAndName();

    const calc = new Calculator()
      .setMasterItems(items)
      .setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(40000), baseSp: Array(251).fill(2500) }] as any)
      .setClass(cls)
      .setMonster(dummy);

    const model: any = createMainModel();
    Object.assign(model, {
      class: 4258, level: 230, jobLevel: 47,
      str: 130, jobStr: 9, agi: 1, jobAgi: 3, vit: 1, jobVit: 9,
      int: 1, jobInt: 10, dex: 130, jobDex: 9, luk: 1, jobLuk: 3,
      pow: 100, jobPow: 5, jobSta: 6, jobWis: 5, jobSpl: 7, jobCon: 2, jobCrt: 3,
      weapon: CLAYMORE_OSAD, boot: bootId, bootRefine: 11,
      selectedAtkSkill: 'Over Brand==5',
    });

    calc.loadItemFromModel(model);
    new CalculatorController().runChain(calc, {
      monster: dummy, equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
      consumeData: [], aspdPotion: 0, extraOptionScripts: [], activeSkillNames, learnedSkillMap,
      selectedAtkSkill: 'Over Brand==5',
      selectedChances: procOn ? [ITEM_DB[bootId].name] : [],
      usedHpL: false,
    } as any);

    return calc.getTotalSummary().dmg as any;
  };

  /** One node of the max-damage graph, by the id damage-calculator.ts gives it. */
  const node = (graph: any, id: string) => graph.max.nodes.find((n: any) => n.id === id)?.value;

  it('is carried back alongside the effected damage', () => {
    const dmg = solve(BOOT_FOR, true);
    expect(dmg.effectedSkillFormulaGraph).toBeDefined();
    expect(node(dmg.effectedSkillFormulaGraph, 'statusAtk'))
      .not.toBe(node(dmg.skillFormulaGraph, 'statusAtk'));
  });

  it('falls back to the base graph when no Efeito is ticked', () => {
    const dmg = solve(BOOT_FOR, false);
    expect(dmg.effectedSkillFormulaGraph).toBe(dmg.skillFormulaGraph);
  });

  it('tells the two boots apart — the reported symptom was that it did not', () => {
    const str = solve(BOOT_FOR, true).effectedSkillFormulaGraph;
    const luk = solve(BOOT_SOR, true).effectedSkillFormulaGraph;

    // ATQ Status counts twice in the skill formula, and these boots carry no Grau, so the
    // primary stat's +175 lands as 2 × 175 against SOR's 2 × floor(175 / 3).
    expect(node(str, 'statusAtk') - node(luk, 'statusAtk')).toBe(2 * (175 - Math.floor(175 / 3)));

    // And only FOR reaches ATQ da Arma, through `ATQ base × FOR ÷ 200`.
    expect(node(str, 'weaponAtk')).toBeGreaterThan(node(luk, 'weaponAtk'));
    expect(node(luk, 'weaponAtk')).toBe(node(solve(BOOT_SOR, false).skillFormulaGraph, 'weaponAtk'));
  });

  it('leaves the base graph alone, so "Sem efeitos" still explains the base roll', () => {
    const on = solve(BOOT_FOR, true);
    const off = solve(BOOT_FOR, false);
    expect(node(on.skillFormulaGraph, 'statusAtk')).toBe(node(off.skillFormulaGraph, 'statusAtk'));
  });
});
