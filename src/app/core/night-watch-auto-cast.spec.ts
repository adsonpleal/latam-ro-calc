import { describe, expect, it } from 'vitest';
import { NightWatch } from '../jobs';
import { createMainModel } from '../utils';
import { buildAutoCastSimulation } from './auto-cast';
import { Calculator } from './calculator';

function prepare(activeLevel: number, learned: Record<string, number>): NightWatch {
  const cls = new NightWatch();
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((skill) => skill.name === 'Auto Firing Launcher' ? activeLevel : 0),
    passiveSkillIds: cls.passiveSkills.map((skill) => learned[skill.name] ?? 0),
  }).getSkillBonusAndName();
  return cls;
}

function simulate(cls: NightWatch) {
  const calc = {
    atkSkills: cls.atkSkills,
    autoCastDefinitions: cls.autoCastDefinitions,
    resolvedItemAutoCasts: [],
    skillState: cls.skillState,
    status: {},
    solveAutoCast: () => ({
      skillTotalHit: 1, skillDpsInputMin: 100, skillDpsInputMax: 100,
      skillDpsInputCriDmg: 100, skillCriRateToMonster: 0, skillAccuracy: 100,
      skillCanCri: false, skillMinDamage: 100, skillMaxDamage: 100, requireTxt: '',
    }),
  } as unknown as Calculator;
  return buildAutoCastSimulation({
    calc, model: createMainModel(), hasSelectedEffects: false,
    summary: {
      calc: { hitPerSecs: 4, hitRate: 50 },
      dmg: { accuracy: 50, criRateToMonster: 0, basicDps: 400 },
      weapon: { rangeType: 'range' }, monster: { hp: 10000 },
    },
  });
}

describe('Night Watch Disparo Automático', () => {
  it('offers five buff levels and separate learned grenade levels in Habilidades', () => {
    const cls = new NightWatch();
    expect(cls.activeSkills.find((s) => s.name === 'Auto Firing Launcher')?.dropdown.map((o) => o.value))
      .toEqual([0, 5, 4, 3, 2, 1]);
    for (const name of ['Basic Grenade', 'Hasty Fire in the Hole', 'Grenade Dropping']) {
      expect(cls.passiveSkills.find((s) => s.name === name)?.dropdown.map((o) => o.value))
        .toEqual([0, 5, 4, 3, 2, 1]);
    }
  });

  it.each([
    [1, [6]], [2, [7]], [3, [8, 3]], [4, [9, 5]], [5, [10, 7]],
  ])('uses independent level %i rolls', (level, chances) => {
    const result = simulate(prepare(level, { 'Basic Grenade': 2, 'Hasty Fire in the Hole': 4, 'Grenade Dropping': 5 }));
    expect(result.sources.map((s) => s.source.chance)).toEqual(chances);
    expect(result.sources.map((s) => s.source.skillLevel)).toEqual(chances.length === 1 ? [2] : [2, 4]);
    expect(result.sources[0].triggerAttacksPerSecond).toBe(4);
    if (level === 5) expect(result.blockedSources).toContainEqual(expect.objectContaining({ icon: 5412 }));
  });

  it('requires each grenade skill to be learned before its roll is available', () => {
    expect(simulate(prepare(5, {})).sources).toEqual([]);
    expect(simulate(prepare(0, { 'Basic Grenade': 5 })).sources).toEqual([]);
  });
});
