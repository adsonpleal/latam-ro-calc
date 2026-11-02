import { describe, expect, it } from 'vitest';
import { loadDatasetFromDisk } from '../../../mcp/src/data/dataset.node';
import { BuildInput, resolveBuild } from '../../../mcp/src/engine/build-input';
import { solve } from '../../../mcp/src/engine/solve';
import { applySkillMaps } from '../../../mcp/src/engine/derive';
import { encodeBuild } from '../core/share-codec';
import { CalculatorController } from '../core/calculator-controller';
import { hitChance } from '../core/damage-calculator';
import type { PvpMode } from '../core/pvp';
import { buildAutoCastSimulation } from '../core/auto-cast';
import { canUsedByClass } from '../utils/can-used-by-class';
import { createMainModel } from '../utils/create-main-model';
import { ClassIdBySpriteJob, ClassName } from './_class-name';
import { getClassDropdownList } from './_class-list';
import { AssassinCross } from './AssassinCross';
import { GuillotineCross } from './GuillotineCross';
import { ShadowCross } from './ShadowCross';

// Card 6AgjFzIltDGrDC17MuEL. Sources: client skill 136 and delay row;
// https://browiki.org/wiki/Lâminas_Aceleradas (+90%, independent of gear)
// https://browiki.org/wiki/Espírito_do_Mercenário (PvM/PvP +100%, WoE +25%).
const dataset = loadDatasetFromDisk();
const base: BuildInput = {
  class: 4013, level: 99, jobLevel: 70, gear: { weapon: 1250 },
  stats: { str: 80, agi: 80, vit: 20, int: 1, dex: 1, luk: 1 }, atkSkill: 'Sonic Blow==10',
};
const target = { ...dataset.monsters[21077], stats: { ...dataset.monsters[21077].stats, agi: 220 } };
const modified: BuildInput['skills'] = {
  passive: { 'Sonic Acceleration': 1 }, active: { 'Assassin Spirit': 1, 'Sonic Blow Target Below Half HP': 1 },
};

function calculate(overrides: Partial<BuildInput> = {}, mode: PvpMode = 'none') {
  const rb = resolveBuild({ ...base, ...overrides }, dataset);
  const calc = solve(rb, dataset, target);
  if (mode !== 'none') {
    const bonuses = rb.char.setLearnSkills({ activeSkillIds: rb.model.activeSkills, passiveSkillIds: rb.model.passiveSkills }).getSkillBonusAndName();
    new CalculatorController().runChain(calc, {
      monster: target, playerTarget: { name: 'Defensor', level: 99, hp: 100000, def: 0, softDef: 0,
        mdef: 0, softMdef: 0, res: 0, mres: 0, flee: 320, str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1, defenderBonus: {} },
      pvpMode: mode, ...bonuses, buffEquips: {}, buffMasterys: {}, consumeData: [], aspdPotion: 0,
      extraOptionScripts: [], selectedAtkSkill: rb.model.selectedAtkSkill, selectedChances: [], usedHpL: false,
    });
  }
  return { rb, calc, dmg: calc.damageSummary, summary: calc.getTotalSummary() };
}

describe('selectable Algoz', () => {
  it('registers the LATAM class before Sicário in the UI and MCP', () => {
    const list = getClassDropdownList();
    const index = list.findIndex(c => c.value === 4013);
    expect(list[index]).toMatchObject({ label: 'Algoz', icon: 4013 });
    expect(list[index + 1].value).toBe(5);
    expect(ClassIdBySpriteJob[4013]).toBe(4013);
    expect(dataset.classes.get(4013)).toMatchObject({ minLevel: 1, maxLevel: 99, maxJobLevel: 70, traitStats: false });
  });

  it('normalizes imported levels, allocated stats and traits without losing job 66–70', () => {
    for (let jobLevel = 66; jobLevel <= 70; jobLevel++) {
      const { rb } = calculate({ level: 200, jobLevel, stats: { str: 130, agi: 125, pow: 50 } });
      expect(rb.model).toMatchObject({ level: 99, jobLevel, str: 99, agi: 99, pow: 0 });
    }
    expect(new AssassinCross().excludedJobLevels).toEqual([]);
    expect(new GuillotineCross().minMaxLevelCap.minMaxLevel).toEqual([99, 200]);
    expect(new ShadowCross().minMaxLevelCap.minMaxLevel[1]).toBeGreaterThan(200);
  });

  it('matches every job-bonus threshold in the supplied iRO Wiki table', () => {
    // https://irowiki.org/wiki/Assassin_Cross#Job_Bonuses
    const thresholds = {
      str: [2, 7, 12, 21, 29, 38, 50, 54, 66], agi: [3, 4, 5, 15, 20, 24, 25, 31, 32, 33, 42, 46, 51, 56, 62],
      vit: [9, 47, 69], int: [], dex: [10, 23, 37, 39, 43, 53, 57, 61, 64, 70], luk: [3, 8, 16, 18, 26, 34, 48, 65],
    };
    for (let job = 1; job <= 70; job++) {
      const actual = new AssassinCross().getJobBonusStatus(job);
      for (const [stat, levels] of Object.entries(thresholds)) expect(actual[stat], `${stat} at job ${job}`).toBe(levels.filter(lv => lv <= job).length);
    }
  });

  it('uses the existing transcendental HP/SP curves and class-specific ASPD cap', () => {
    const { summary } = calculate();
    expect(summary.calc.maxHp).toBe(9191);
    expect(summary.calc.maxSp).toBe(512);
    const high = calculate({ gear: { weapon: 1250 }, options: { '0': 'aspd:100' } });
    expect(high.summary.calc.totalAspd).toBe(190);
    expect(new GuillotineCross().maxAspd).toBe(193);
    expect(new ShadowCross().maxBaseStat).toBe(130);
  });

  it('respects equipment ancestry and excludes third-job buffs', () => {
    const char = new AssassinCross();
    const allowed = canUsedByClass(char);
    expect(allowed({ usableClass: ['Assassin'] })).toBe(true);
    expect(allowed({ usableClass: ['Hi-Class'] })).toBe(true);
    expect(allowed({ usableClass: ['Only 3rd Cls'] })).toBe(false);
    expect(char.activeSkills.some(s => s.name === 'Venom Impression')).toBe(false);
    expect(new GuillotineCross().activeSkills.some(s => s.name === 'Venom Impression')).toBe(true);
    expect(char.classNameSet.has(ClassName.AssassinCross)).toBe(true);
  });

  it('uses Algoz weapon, shield and off-hand ASPD penalties', () => {
    const weapon = (subTypeName: string, allowsShield = true) => ({ data: { subTypeName, rangeType: 'melee' }, isAllowShield: () => allowsShield }) as any;
    const char = new AssassinCross();
    const input = { potionAspds: [], potionAspdPercent: 0, skillAspd: 0, skillAspdPercent: 0,
      totalAgi: 0, totalDex: 0, aspd: 0, aspdPercent: 0, decreaseSkillAspdPercent: 0, weapon2: undefined };
    expect(char.calcAspd({ ...input, weapon: weapon('Katar', false) })).toBe(154);
    expect(char.calcAspd({ ...input, weapon: weapon('Dagger'), isEquipShield: true })).toBe(148);
    expect(char.calcAspd({ ...input, weapon: weapon('Sword') })).toBe(146);
    expect(char.calcAspd({ ...input, weapon: weapon('Axe') })).toBe(145);
    for (const [offHand, expected] of [['Dagger', 144], ['Sword', 142], ['Axe', 142]] as const) {
      expect(char.calcAspd({ ...input, weapon: weapon('Dagger'), weapon2: weapon(offHand) })).toBe(expected);
    }
  });

  it.each([GuillotineCross, ShadowCross])('restores legacy positional skills and defaults new controls off (%s)', Ctor => {
    const char = new Ctor();
    const model = createMainModel();
    model.activeSkills = char.activeSkills.slice(0, -2).map(s => s.dropdown.find(o => o.isUse)?.value ?? 0);
    model.passiveSkills = char.passiveSkills.slice(0, -1).map(s => s.dropdown.find(o => o.isUse)?.value ?? 0);
    const active = [...model.activeSkills], passive = [...model.passiveSkills];
    applySkillMaps(model, char);
    expect(model.activeSkills).toEqual([...active, 0, 0]);
    expect(model.passiveSkills).toEqual([...passive, 0]);
  });

  it('round trips the Algoz class and named controls through share links', () => {
    const { rb } = calculate({ skills: modified });
    const restored = resolveBuild({ share: encodeBuild(rb.model) }, dataset);
    expect(restored.model.class).toBe(4013);
    expect(restored.model.level).toBe(99);
    expect(restored.model.activeSkills).toEqual(rb.model.activeSkills);
    expect(restored.model.passiveSkills).toEqual(rb.model.passiveSkills);
  });
});

describe('Lâminas Destruidoras', () => {
  it.each([[1, 300], [10, 1200]])('uses the LATAM ratio at level %i', (level, ratio) => {
    const { dmg, summary } = calculate({ atkSkill: `Sonic Blow==${level}` });
    expect(dmg.baseSkillDamage).toBe(ratio);
    expect(dmg.skillCanCri).toBe(false);
    expect(dmg.skillHit).toBe(8);
    expect(dmg.skillTotalHit).toBe(1);
    expect(summary.calcSkill).toMatchObject({ cd: 1, reducedCd: 1, acd: 0, fct: 0, vct: 0 });
  });

  it('applies acceleration and target HP independently of gear and Spirit', () => {
    const plain = calculate();
    const accel = calculate({ skills: { passive: { 'Sonic Acceleration': 1 } } });
    const low = calculate({ skills: { active: { 'Sonic Blow Target Below Half HP': 1 } } });
    const both = calculate({ skills: modified });
    expect(accel.dmg.baseSkillDamage).toBe(2280);
    expect(low.dmg.baseSkillDamage).toBe(1800);
    expect(both.dmg.baseSkillDamage).toBe(3420);
    // This target is out of reach (rate below 0), and rAthena scales the uncapped rate, so
    // the +90% leaves it on the 5% floor rather than turning the floor into 9,5%.
    expect(plain.summary.calc.rawHitRate).toBeLessThan(0);
    expect(accel.dmg.skillAccuracy).toBe(plain.dmg.skillAccuracy);
    expect(accel.dmg.accuracy).toBe(plain.dmg.accuracy);
    expect(accel.dmg.basicMinDamage).toBe(plain.dmg.basicMinDamage);
    expect(both.summary.calcSkill.reducedCd).toBe(1);
    expect(accel.dmg.skillFormulaGraph.max.nodes.some(n => n.calc?.rows.some(r => r.label === 'Lâminas Aceleradas'))).toBe(true);
    expect(accel.dmg.skillDps).toBeGreaterThan(plain.dmg.skillDps);
    expect(calculate({ options: { '0': 'hit:1000' }, skills: modified }).dmg.skillAccuracy).toBe(100);
  });

  it('scales the hit rate before the cap and rolls perfect hit on top (rAthena is_attack_hitting)', () => {
    // A HIT bonus that puts the plain rate at exactly 50%: +90% makes it 95%.
    const extraHit = 50 - calculate().summary.calc.rawHitRate;
    const plain = calculate({ options: { '0': `hit:${extraHit}` } });
    const accel = calculate({ options: { '0': `hit:${extraHit}` }, skills: { passive: { 'Sonic Acceleration': 1 } } });
    const perfect = plain.summary.calc.totalPerfectHit;

    expect(plain.summary.calc.rawHitRate).toBe(50);
    expect(plain.dmg.skillAccuracy).toBe(hitChance(50, perfect));
    expect(accel.dmg.skillAccuracy).toBe(hitChance(95, perfect));
    // Perfect hit is its own roll: 5% perfect over a 50% rate lands 52,5%, not 50%.
    expect(hitChance(50, 5)).toBe(52.5);
    expect(hitChance(-44, 15)).toBe(19.25);
  });

  it.each(['none', 'pvp', 'woe', 'woe-te'] as const)('applies Spirit before player reductions in %s', mode => {
    const plain = calculate({}, mode);
    const linked = calculate({ skills: { active: { 'Assassin Spirit': 1 } } }, mode);
    const factor = mode.startsWith('woe') ? 1.25 : 2;
    // Final damage is split/floored to eight visual hits after the Spirit stage.
    expect(Math.abs(linked.dmg.skillMaxDamage - plain.dmg.skillMaxDamage * factor)).toBeLessThanOrEqual(8);
    const graph = linked.dmg.skillFormulaGraph.max.nodes;
    const spiritIndex = graph.findIndex(n => n.id === 'skillFinal');
    expect(spiritIndex).toBeGreaterThan(0);
    if (mode.startsWith('woe')) expect(graph.findIndex(n => n.id === 'pvpWoeReduction')).toBeGreaterThan(spiritIndex);
  });

  it('stacks with skill equipment bonuses and EDP, without changing other skills', () => {
    const bonus = calculate({ options: { '0': '136:100' }, skills: modified });
    const normal = calculate({ skills: modified });
    expect(bonus.dmg.skillBonusFromEquipment).toBe(100);
    expect(Math.abs(bonus.dmg.skillMaxDamage - 2 * normal.dmg.skillMaxDamage)).toBeLessThanOrEqual(8);
    expect(calculate({ skills: { active: { 'Enchant Deadly Poison': 1 } } }).dmg.skillMaxDamage).toBeGreaterThan(calculate().dmg.skillMaxDamage);
    const meteor = calculate({ atkSkill: 'Meteor Assault==10' });
    const buffedMeteor = calculate({ atkSkill: 'Meteor Assault==10', skills: modified });
    expect(buffedMeteor.dmg.skillMaxDamage).toBe(meteor.dmg.skillMaxDamage);
    expect(buffedMeteor.dmg.skillAccuracy).toBe(meteor.dmg.skillAccuracy);
  });

  it('applies Katar Mastery when Algoz is the selected job', () => {
    expect(calculate({ skills: { passive: { 'Katar Mastery': 10 } } }).dmg.skillMaxDamage).toBeGreaterThan(calculate().dmg.skillMaxDamage);
  });

  it('inherits the attack and controls through Sicário and Executor', () => {
    for (const id of [5, 4254]) {
      const { rb, dmg } = calculate({ class: id, level: id === 5 ? 200 : 250, skills: modified });
      expect(rb.model.selectedAtkSkill).toBe('Sonic Blow==10');
      expect(dmg.baseSkillDamage).toBe(3420);
    }
  });

  it('requires katar when learned but allows item autocasts with a dagger', () => {
    // The warning is localized at the calculator boundary, so this reads as the player
    // sees it; see constants/require-text-i18n.spec.ts.
    expect(calculate({ gear: { weapon: 1201 } }).calc.getTotalSummary().dmg.requireTxt).toBe('Katar');
    const { calc, rb, summary } = calculate({ gear: { weapon: 1201, weaponCard1: 4268 } });
    const simulation = buildAutoCastSimulation({ calc, model: rb.model, summary, hasSelectedEffects: false });
    expect(simulation.sources).toContainEqual(expect.objectContaining({ source: expect.objectContaining({ skillId: 136 }), expectedDamagePerActivation: expect.any(Number) }));
    expect(simulation.autoCastDps).toBeGreaterThan(0);
  });
});
