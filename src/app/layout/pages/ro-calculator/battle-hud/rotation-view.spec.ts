import { describe, expect, it } from 'vitest';
import { BASIC_ATTACK_VALUE } from '../../../../core/rotation';
import { buildRotationView, RotationSkillMeta, toScheduleStep } from './rotation-view';

/** A solved getTotalSummary() with just the fields the rotation view reads. */
const summaryOf = (over: {
  castPeriod?: number;
  hitPeriod?: number;
  reducedAcd?: number;
  reducedCd?: number;
  dmgType?: string;
  propertySkill?: string;
  perHit?: number;
  hits?: number;
  requireTxt?: string;
  basicDps?: number;
  hitPerSecs?: number;
  hp?: number;
}) => ({
  calcSkill: {
    castPeriod: over.castPeriod ?? 0,
    hitPeriod: over.hitPeriod ?? (over.castPeriod ?? 0) + Math.max(over.reducedAcd ?? 0, over.reducedCd ?? 0),
    reducedAcd: over.reducedAcd ?? 0,
    reducedCd: over.reducedCd ?? 0,
    dmgType: over.dmgType ?? 'Melee',
    propertySkill: over.propertySkill ?? 'Neutral',
  },
  calc: { hitPerSecs: over.hitPerSecs ?? 2.38 },
  monster: { hp: over.hp ?? 1_000_000 },
  propertyAtk: 'Neutral',
  dmg: {
    requireTxt: over.requireTxt ?? '',
    // buildDpsSteps reads these; min === max keeps the per-use damage exact.
    skillDpsInputMin: over.perHit ?? 1000,
    skillDpsInputMax: over.perHit ?? 1000,
    skillDpsInputCriDmg: 0,
    skillDpsInputHitsPerSec: 1,
    skillCriRateToMonster: 0,
    skillAccuracy: 100,
    skillTotalHit: over.hits ?? 1,
    skillPropertyMultiplier: 1,
    basicDps: over.basicDps ?? 4760, // 2000 per use at 2,38 hits/s
  },
});

const atkSkills: RotationSkillMeta[] = [
  { value: 'Solar Kick==7', label: 'Chute Solar Lv7', icon: 2593 },
  { value: 'Sunset Blast==5', label: 'Entardecer Lv5', icon: 5466, levelList: [{ label: 'Entardecer Lv5', value: 'Sunset Blast==5' }] },
];

describe('toScheduleStep', () => {
  it('keys a skill by name, so its levels share one recarga', () => {
    const step = toScheduleStep({ value: 'Solar Kick==7', summary: summaryOf({ reducedAcd: 0.3, reducedCd: 0.5 }), damage: 10 });

    expect(step.key).toBe('Solar Kick');
    expect(step).toMatchObject({ cast: 0, acd: 0.3, cd: 0.5, damage: 10 });
  });

  it('zeroes pós and recarga for a channelled (hitEveryNSec) skill', () => {
    // calc-skill-aspd forces blockPeriod to 0 for those; the channel time is the cast.
    const summary = summaryOf({ castPeriod: 0.6, hitPeriod: 0.6, reducedAcd: 0.5, reducedCd: 1.0 });
    const step = toScheduleStep({ value: 'Gates of Hell==10', summary, damage: 5 });

    expect(step).toMatchObject({ cast: 0.6, acd: 0, cd: 0 });
  });

  it('makes ataque básico a step that blocks nothing', () => {
    const step = toScheduleStep({ value: BASIC_ATTACK_VALUE, summary: summaryOf({}), damage: 7 });

    expect(step).toMatchObject({ key: BASIC_ATTACK_VALUE, cast: 0, acd: 0, cd: 0, damage: 7 });
  });
});

describe('buildRotationView', () => {
  const base = summaryOf({ reducedAcd: 0.3, reducedCd: 0.5, perHit: 1000, hits: 3 });
  const summaryByValue = new Map<string, any>([
    ['Solar Kick==7', summaryOf({ reducedAcd: 0.3, reducedCd: 0.5, perHit: 1000, hits: 3 })],
    ['Sunset Blast==5', summaryOf({ reducedAcd: 0.5, reducedCd: 0.7, perHit: 4000, hits: 2, dmgType: 'Range' })],
  ]);

  const view = buildRotationView({
    rotation: ['Solar Kick==7', 'Sunset Blast==5', 'Solar Kick==7', BASIC_ATTACK_VALUE],
    summaryByValue,
    baseSummary: base,
    hasSelectedChances: false,
    atkSkills,
  });

  it('sums every hit into one per-use damage figure', () => {
    // 3 hits x 1000, not a per-hit number: the design dropped the old "N x min-max".
    expect(view.entries[0].damage).toBeCloseTo(3000, 5);
    expect(view.entries[1].damage).toBeCloseTo(8000, 5);
  });

  it('uses the effected damage once an Efeito is ticked', () => {
    // Ticking an Efeito only moves effected*; reading the base inputs left every row
    // (and so the cycle DPS) frozen while the hero figure moved.
    const withProc = summaryOf({ reducedAcd: 0.3, reducedCd: 0.5, perHit: 1000, hits: 3 });
    withProc.dmg = {
      ...withProc.dmg,
      effectedSkillDpsInputMin: 1500,
      effectedSkillDpsInputMax: 1500,
      effectedSkillDpsInputCriDmg: 0,
      effectedSkillDpsInputHitsPerSec: 1,
      effectedSkillCriRateToMonster: 0,
      effectedSkillAccuracy: 100,
      effectedSkillTotalHit: 3,
    };
    const args = { rotation: ['Solar Kick==7'], summaryByValue: new Map([['Solar Kick==7', withProc]]), baseSummary: withProc, atkSkills };

    expect(buildRotationView({ ...args, hasSelectedChances: false }).entries[0].damage).toBeCloseTo(3000, 5);
    expect(buildRotationView({ ...args, hasSelectedChances: true }).entries[0].damage).toBeCloseTo(4500, 5);
  });

  it('keeps the base damage when the effected pass produced nothing', () => {
    // A build with a chance ticked that this skill's own pass never fired.
    const view2 = buildRotationView({
      rotation: ['Solar Kick==7'],
      summaryByValue: new Map([['Solar Kick==7', base]]),
      baseSummary: base,
      hasSelectedChances: true,
      atkSkills,
    });

    expect(view2.entries[0].damage).toBeCloseTo(3000, 5);
  });

  it('recovers ataque básico damage from the engine\'s own DPS', () => {
    expect(view.entries[3].damage).toBeCloseTo(2000, 5); // 4760 / 2,38
    expect(view.entries[3].isBasic).toBe(true);
    expect(view.entries[3].name).toBe('Ataque básico');
  });

  it('labels a row from the catalog, without the level suffix', () => {
    expect(view.entries[0].name).toBe('Chute Solar');
    expect(view.entries[0].levelLabel).toBe('Nv7');
    expect(view.entries[0].icon).toBe(2593);
    expect(view.entries[1].dmgTypeLabel).toBe('À distância');
  });

  it('offers a level picker only where the catalog declares one', () => {
    expect(view.entries[0].levelList).toEqual([]);
    expect(view.entries[1].levelList).toHaveLength(1);
  });

  it('numbers repeats so the second use can say "2ª vez"', () => {
    expect(view.entries[0].occurrence).toBe(0);
    expect(view.entries[2].occurrence).toBe(1);
    // ...and a repeat reuses the same solve, since damage does not depend on position.
    expect(view.entries[2].damage).toBeCloseTo(view.entries[0].damage, 5);
  });

  it('states the crit reading on every entry', () => {
    // The design requires it explicitly: silence would read as missing data.
    expect(view.entries.every((e) => typeof e.canCrit === 'boolean')).toBe(true);
  });

  it('flags a crit that depends on the character state', () => {
    // A catalog entry whose `canCri` is a *function* is state-dependent by definition —
    // the only honest signal available, since no skill declares which state it needs.
    const atkSkillsWithConditional = [
      { value: 'Sunset Blast==5', label: 'Entardecer Lv5', canCri: () => true },
      { value: 'Solar Kick==7', label: 'Chute Solar Lv7', canCri: true },
    ];
    const crit = buildRotationView({
      rotation: ['Sunset Blast==5', 'Solar Kick==7'],
      summaryByValue: new Map([
        ['Sunset Blast==5', { ...summaryOf({}), dmg: { ...summaryOf({}).dmg, skillCanCri: true, skillCriRateToMonster: 42.5 } }],
        ['Solar Kick==7', { ...summaryOf({}), dmg: { ...summaryOf({}).dmg, skillCanCri: false, skillCriRateToMonster: 0 } }],
      ]),
      baseSummary: base,
      hasSelectedChances: false,
      atkSkills: atkSkillsWithConditional,
    });

    expect(crit.entries[0]).toMatchObject({ canCrit: true, critRate: 42.5, critConditional: true });
    expect(crit.entries[1]).toMatchObject({ canCrit: false, critConditional: false });
  });

  it('splits contributions to exactly 100%', () => {
    expect(view.entries.reduce((sum, e) => sum + e.contributionPercent, 0)).toBeCloseTo(100, 5);
  });

  it('derives the cycle and a time to kill', () => {
    expect(view.cycle.cycleDuration).toBeGreaterThan(0);
    expect(view.aspdPeriod).toBeCloseTo(1 / 2.38, 5);
    expect(view.ttk?.seconds).toBeGreaterThan(0);
    expect(view.cyclesToKill).toBeGreaterThan(0);
  });

  it('zeroes a skill the build cannot cast and lists it as blocked', () => {
    const blockedView = buildRotationView({
      rotation: ['Solar Kick==7'],
      summaryByValue: new Map([['Solar Kick==7', summaryOf({ requireTxt: 'twohandSword', perHit: 9999 })]]),
      baseSummary: base,
      hasSelectedChances: false,
      atkSkills,
    });

    expect(blockedView.entries[0].damage).toBe(0);
    expect(blockedView.blocked).toEqual([{ name: 'Chute Solar', requireTxt: 'twohandSword' }]);
  });

  it('reports no time to kill against an immune target', () => {
    const immune = buildRotationView({
      rotation: ['Solar Kick==7'],
      summaryByValue: new Map([['Solar Kick==7', summaryOf({ perHit: 0, hits: 0 })]]),
      baseSummary: summaryOf({ perHit: 0, hits: 0, basicDps: 0 }),
      hasSelectedChances: false,
      atkSkills,
    });

    expect(immune.cycle.sustainedDps).toBe(0);
    expect(immune.ttk).toBeNull();
    expect(immune.cyclesToKill).toBe(0);
  });

  it('handles an empty rotation', () => {
    const empty = buildRotationView({
      rotation: [],
      summaryByValue,
      baseSummary: base,
      hasSelectedChances: false,
      atkSkills,
    });

    expect(empty.entries).toEqual([]);
    expect(empty.cycle.sustainedDps).toBe(0);
    expect(empty.ttk).toBeNull();
  });
});
