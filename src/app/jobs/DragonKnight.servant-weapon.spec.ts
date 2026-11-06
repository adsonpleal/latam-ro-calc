import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildAutoCastSimulation } from '../core/auto-cast';
import { Calculator } from '../core/calculator';
import { simulateRotation } from '../core/rotation-schedule';
import { createMainModel } from '../utils';
import { DragonKnight } from './DragonKnight';
import { RuneKnight } from './RuneKnight';

// Tracker Tf12qziJIvTh7EsEUE8s. Chance and sword regeneration table:
// https://browiki.org/wiki/Espada_Alada
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monster = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'))[21067];
const model = { ...createMainModel(), level: 200, str: 90, pow: 100, luk: 100, weapon: 1201 };

function simulate(level: number, attacksPerSecond = 4, ranged = false, accuracy = 100) {
  const cls = new DragonKnight();
  const calc = new Calculator().setMasterItems(items).setClass(cls).setMonster(monster);
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map(skill => skill.name === 'Servant Weapon' ? level : 0),
    passiveSkillIds: [],
  }).getSkillBonusAndName();
  calc.setHpSpTable([{ jobs: { [cls.className]: true }, baseHp: Array(251).fill(1000), baseSp: Array(251).fill(100) }] as any);
  calc.setModel(model).loadItemFromModel(model).prepareAllItemBonus();
  calc.calcAllAtk();
  return buildAutoCastSimulation({ calc, model, hasSelectedEffects: false, summary: {
    calc: { hitPerSecs: attacksPerSecond },
    dmg: { accuracy, criRateToMonster: 0, basicDps: 400 },
    weapon: { rangeType: ranged ? 'range' : 'melee' }, monster: { hp: 10000 },
  } });
}

describe('Espada Alada autocast', () => {
  it('appends a level control without moving saved Dragon Knight toggles', () => {
    const cls = new DragonKnight();
    expect(cls.activeSkills.slice(-3).map(skill => skill.name))
      .toEqual(['Vigor', 'Dragonic Aura', 'Servant Weapon']);
    expect(cls.activeSkills.at(-1)!.dropdown.map(option => option.value)).toEqual([0, 5, 4, 3, 2, 1]);
    expect(new RuneKnight().autoCastDefinitions.some(rule => rule.key === 'servant-weapon')).toBe(false);
  });

  it.each([[1, 3], [2, 6], [3, 9], [4, 12], [5, 15]])('uses level %i chance %i with real skill damage', (level, chance) => {
    const result = simulate(level);
    const source = result.sources.find(entry => entry.icon === 5201)!;
    expect(source.source.skillLevel).toBe(level);
    expect(source.source.chance).toBe(chance);
    expect(source.activationsPerSecond).toBeCloseTo(4 * chance / 100);
    // The client's table is 900% to 2.500% in steps of 400 (`500 + 400 * Nv`); the
    // pre-rebalance build read `200 + 50 * Nv`. See skill-ratio-client-table.spec.ts.
    expect(source.summary.baseSkillDamage).toBe((500 + 400 * level + 5 * model.pow) * 2);
    expect(source.summary.dmgType).toBe('Melee');
    expect(source.canCrit).toBe(true);
    expect(source.criticalRate).toBeGreaterThan(0);
    expect(source.damageRanges.map(range => range.kind)).toEqual(['nocri', 'cri']);
    expect(source.dps).toBeGreaterThan(0);
    expect(source.dps).toBeCloseTo(source.activationsPerSecond * source.expectedDamagePerActivation);
    expect(result.totalDps).toBeCloseTo(result.basicAttackDps + source.dps);
  });

  it('requires the buff and does not trigger on ranged basic attacks', () => {
    expect(simulate(0).sources.some(source => source.icon === 5201)).toBe(false);
    expect(simulate(0).blockedSources).toContainEqual(expect.objectContaining({ icon: 5201 }));
    expect(simulate(5, 4, true).sources.some(source => source.icon === 5201)).toBe(false);
  });

  it('rolls on melee attack attempts, including misses, and stays idle without attacks', () => {
    const source = simulate(5, 4, false, 0).sources.find(entry => entry.icon === 5201)!;
    expect(source.triggerAttacksPerSecond).toBe(4);
    expect(source.activationsPerSecond).toBeCloseTo(0.6);
    expect(simulate(5, 0).sources.find(entry => entry.icon === 5201)!.dps).toBe(0);
  });

  /**
   * Tracker 3h6mqVwB592eZ1V0R9wl: a rotation with Espada Alada read "Recarga não fecha —
   * faltam 149,31s". The 150s the client prints at Nv5 is how long the servants stay out
   * and how long until they can be summoned again — never a wait between damage packets,
   * which land off basic melee attacks. So no level may carry it into the schedule.
   */
  it.each([1, 2, 3, 4, 5])('never holds a rotation on the Nv%i summon cooldown', (level) => {
    const skill = new DragonKnight().getAtkSkills('current').find(entry => entry.name === 'Servant Weapon')!;
    const cd = typeof skill.cd === 'function' ? skill.cd(level) : skill.cd;

    expect(cd).toBe(0);
    // Two entries, because a lone skill waiting on its own recarga is the normal case the
    // view suppresses; the pair is what the report had.
    const cycle = simulateRotation({
      aspdPeriod: 0.25,
      steps: [
        { key: 'Servant Weapon', cast: 0, acd: 0, cd, damage: 1000 },
        { key: 'Hack and Slasher', cast: 0, acd: 0.25, cd: 0.7, damage: 1000 },
      ],
    });

    // Only Espada Alada's own lane: Hack and Slasher idling 0,20s on its real 0,7s
    // recarga is the schedule working, not the bug.
    expect(cycle.lanes[0].cdWait).toBe(0);
  });

  it.each([[1, 1 / 3], [2, 1 / 2.5], [3, 1 / 2], [4, 1 / 1.5], [5, 1]])(
    'caps sustained level %i procs at sword replenishment (%s/s)', (level, rate) => {
      const source = simulate(level, 20).sources.find(entry => entry.icon === 5201)!;
      expect(source.activationsPerSecond).toBeCloseTo(rate);
      expect(source.source.chance).toBe(level * 3);
      expect(source.dps).toBeCloseTo(rate * source.expectedDamagePerActivation);
    },
  );
});
