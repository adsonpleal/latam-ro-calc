import { describe, expect, it } from 'vitest';
import { calcSkillAspd } from '../utils/calc-skill-aspd';
import { distributePercents, RotationScheduleStep, simulateRotation } from './rotation-schedule';

const step = (over: Partial<RotationScheduleStep> = {}): RotationScheduleStep => ({
  key: 'A',
  cast: 0,
  acd: 0,
  cd: 0,
  damage: 1000,
  ...over,
});

/** No ASPD floor, so the timing rules are observed on their own. */
const NO_FLOOR = 0;

describe('simulateRotation — a single skill reproduces the engine', () => {
  // The engine's own single-skill period. If these two ever disagree, the panel is
  // telling the user something the damage numbers do not believe.
  const hitPeriodOf = (fct: number, vct: number, acd: number, cd: number) =>
    calcSkillAspd({
      skillData: { name: 'Rotation Test Skill', fct, vct, acd, cd } as any,
      // No reductions of any kind, so the raw client timings come straight through:
      // these four keys are read unguarded, and DES/INT drive the variable-cast cut.
      totalEquipStatus: { acd: 0, vct: 0, fct: 0, fctPercent: 0 } as any,
      status: { totalDex: 0, totalInt: 0 } as any,
      skillLevel: 1,
    }).hitPeriod;

  const cases: [number, number, number, number][] = [
    [0, 0, 0.5, 0.7],
    [0.12, 0.4, 0.5, 1.0],
    [0, 0, 0.3, 0],
    [0.5, 1.0, 0, 5.0],
    [0.2, 0.2, 1.2, 0.4],
  ];

  it.each(cases)('cast %s/%s, acd %s, cd %s matches calcSkillAspd.hitPeriod', (fct, vct, acd, cd) => {
    const expected = hitPeriodOf(fct, vct, acd, cd);
    const cycle = simulateRotation({
      steps: [step({ cast: fct + vct, acd, cd })],
      aspdPeriod: NO_FLOOR,
    });

    expect(cycle.cycleDuration).toBeCloseTo(expected, 5);
  });

  it('a single skill cycles on max(pós, recarga), not their sum', () => {
    // Screenshot 06: pós 0,50 and recarga 0,70 run together and the longer closes the cycle.
    const cycle = simulateRotation({ steps: [step({ acd: 0.5, cd: 0.7 })], aspdPeriod: NO_FLOOR });

    expect(cycle.cycleDuration).toBeCloseTo(0.7, 5);
  });

  it('is capped by the VelAtq floor when the skill is faster than the character', () => {
    const cycle = simulateRotation({ steps: [step({ acd: 0.2, cd: 0.2 })], aspdPeriod: 0.42 });

    expect(cycle.cycleDuration).toBeCloseTo(0.42, 5);
    expect(cycle.isAspdLimited).toBe(true);
  });
});

describe('simulateRotation — the mock rotation', () => {
  // Measured off screenshots/01-4a-painel.png against its own axis (285 px/s):
  // Eclipse Lunar -> Chute Solar -> Entardecer -> Chute Solar -> Explosão Crepuscular -> básico.
  const steps: RotationScheduleStep[] = [
    step({ key: 'Lunar Eclipse', cast: 0.52, acd: 0.5, cd: 1.0, damage: 18940 }),
    step({ key: 'Solar Kick', cast: 0, acd: 0.3, cd: 0.5, damage: 6220 }),
    step({ key: 'Sunset Blast', cast: 0, acd: 0.5, cd: 0.7, damage: 24310 }),
    step({ key: 'Solar Kick', cast: 0, acd: 0.3, cd: 0.5, damage: 6220 }),
    step({ key: 'Twilight Burst', cast: 0, acd: 0.5, cd: 0.3, damage: 11480 }),
    step({ key: '__basic', cast: 0, acd: 0, cd: 0, damage: 1902 }),
  ];
  const ASPD_PERIOD = 0.42;

  const cycle = simulateRotation({ steps, aspdPeriod: ASPD_PERIOD });

  it('settles into one repeating cycle', () => {
    expect(cycle.period).toBe(1);
    expect(cycle.isEstimate).toBe(false);
    // 2,86s (last step) + the 0,42s VelAtq floor it occupies. The mock prints "3,26s",
    // but its numbers are plausible placeholders, not engine output (see the handoff
    // README) — the geometry it draws adds up to 3,28s.
    expect(cycle.cycleDuration).toBeCloseTo(3.28, 2);
  });

  it('lays the steps out where the mock draws them', () => {
    expect(cycle.lanes.map((l) => +l.start.toFixed(2))).toEqual([0, 1.02, 1.44, 1.94, 2.36, 2.86]);
  });

  it('has no recarga stall, so the first cycle matches the sustained one', () => {
    // Every recarga here closes inside the cycle, so there is nothing for the first pass
    // to save. The mock's "1º ciclo 3,10s vs 3,26s" pair is likewise a placeholder — it
    // is not derivable from the lanes it draws. The property itself is covered below.
    expect(cycle.cdWaitTotal).toBeCloseTo(0, 5);
    expect(cycle.firstCycleDuration).toBeCloseTo(cycle.cycleDuration, 5);
  });

  it('is VelAtq limited, and charges the wait to the step it held back', () => {
    expect(cycle.isAspdLimited).toBe(true);
    // Chute Solar's pós (0,30) is shorter than the 0,42 floor, so the step *after* each
    // Chute Solar is the one that waits — Entardecer and Explosão Crepuscular.
    expect(cycle.lanes[2].aspdWait).toBeCloseTo(0.12, 5);
    expect(cycle.lanes[4].aspdWait).toBeCloseTo(0.12, 5);
    // The Chute Solar rows themselves were not delayed.
    expect(cycle.lanes[1].aspdWait).toBeCloseTo(0, 5);
    expect(cycle.lanes[3].aspdWait).toBeCloseTo(0, 5);
  });

  it('charges the wait to the delayed skill, not the one that caused it', () => {
    // The shape Adson reported: Tempestade de Flechas has no pós and a 3,2s recarga, so
    // the VelAtq floor after it is what holds Tiro Preciso back — the hatch belongs on
    // Tiro Preciso's row.
    const reported = simulateRotation({
      steps: [
        step({ key: 'Arrow Storm', cast: 0, acd: 0, cd: 3.2 }),
        step({ key: 'Focused Arrow Strike', cast: 0, acd: 0.22, cd: 0 }),
      ],
      aspdPeriod: 0.24,
    });

    expect(reported.lanes[1].aspdWait).toBeCloseTo(0.24, 5);
    expect(reported.lanes[1].start).toBeCloseTo(0.24, 5);
    expect(reported.cycleDuration).toBeCloseTo(3.2, 5);
  });

  it('sums the damage and splits the contributions to exactly 100%', () => {
    expect(cycle.damagePerCycle).toBe(69072);
    expect(cycle.lanes.reduce((sum, l) => sum + l.contributionPercent, 0)).toBeCloseTo(100, 5);
  });
});

describe('simulateRotation — recarga across the cycle boundary', () => {
  it('delays a repeated skill until its own recarga has elapsed', () => {
    // Two uses of one skill whose recarga is longer than the gap between them.
    const cycle = simulateRotation({
      steps: [step({ key: 'A', acd: 0.3, cd: 1.5 }), step({ key: 'B', acd: 0.3, cd: 0 })],
      aspdPeriod: NO_FLOOR,
    });

    // A's recarga (1,5s) outlasts the 0,6s of pós, so the cycle stretches to fit it.
    expect(cycle.cycleDuration).toBeCloseTo(1.5, 5);
    expect(cycle.cdWaitTotal).toBeGreaterThan(0);
  });

  it('spreads duplicates of one skill instead of stacking them', () => {
    const cycle = simulateRotation({
      steps: [step({ key: 'A', acd: 0.3, cd: 1.0 }), step({ key: 'A', acd: 0.3, cd: 1.0 })],
      aspdPeriod: NO_FLOOR,
    });

    // The second use cannot start before the first one's recarga is done.
    expect(cycle.lanes[1].start - cycle.lanes[0].start).toBeCloseTo(1.0, 5);
    expect(cycle.lanes[1].cdWait).toBeGreaterThan(0);
  });

  it('closes the first cycle faster than the sustained one, and rates it higher', () => {
    // A's recarga (2,0s) far outlasts the 0,6s of pós the rotation spends, so from the
    // second pass on the rotation waits on it. The first pass starts with it clear.
    const cycle = simulateRotation({
      steps: [step({ key: 'A', acd: 0.3, cd: 2.0 }), step({ key: 'B', acd: 0.3, cd: 0 })],
      aspdPeriod: NO_FLOOR,
    });

    expect(cycle.firstCycleDuration).toBeCloseTo(0.6, 5);
    expect(cycle.cycleDuration).toBeCloseTo(2.0, 5);
    expect(cycle.firstCycleDps).toBeGreaterThan(cycle.sustainedDps);
  });
});

describe('simulateRotation — super-cycles', () => {
  it('flags a rotation whose cycle length alternates', () => {
    // A recarga at a non-integer multiple of the natural cycle: successive cycles
    // cannot all be the same length, so "o ciclo" is a mean, not a fact.
    const cycle = simulateRotation({
      steps: [step({ key: 'A', acd: 0.4, cd: 1.0 }), step({ key: 'B', acd: 0.4, cd: 1.7 })],
      aspdPeriod: NO_FLOOR,
    });

    expect(cycle.period).toBeGreaterThan(0);
    if (cycle.period > 1) expect(cycle.isEstimate).toBe(true);
  });

  it('always settles within the budget for randomised rotations', () => {
    for (let i = 0; i < 400; i++) {
      const n = 1 + (i % 6);
      const steps = Array.from({ length: n }, (_, k) =>
        step({
          key: `K${k % 3}`,
          cast: ((i * 7 + k * 13) % 90) / 100,
          acd: ((i * 11 + k * 5) % 80) / 100,
          cd: ((i * 3 + k * 17) % 300) / 100,
        }),
      );
      // Keep the floor positive: an all-zero rotation with no floor is a degenerate
      // zero-length cycle, not a scheduling case.
      const cycle = simulateRotation({ steps, aspdPeriod: ((i % 60) + 1) / 100 });

      expect(cycle.period).toBeGreaterThan(0);
      expect(Number.isFinite(cycle.cycleDuration)).toBe(true);
      expect(cycle.cycleDuration).toBeGreaterThan(0);
      // The unconstrained cycle is a true lower bound on the real one.
      expect(cycle.cycleDuration).toBeGreaterThanOrEqual(cycle.unconstrainedDuration - 1e-9);
    }
  });
});

describe('simulateRotation — edges', () => {
  it('handles an empty rotation without dividing by zero', () => {
    const cycle = simulateRotation({ steps: [], aspdPeriod: 0.42 });

    expect(cycle.lanes).toEqual([]);
    expect(cycle.sustainedDps).toBe(0);
  });

  it('reports zero DPS against an immune target rather than NaN', () => {
    // Element multiplier x0: every step deals nothing, so there is no "Morre em".
    const cycle = simulateRotation({
      steps: [step({ damage: 0, acd: 0.5 }), step({ key: 'B', damage: 0, acd: 0.5 })],
      aspdPeriod: 0.42,
    });

    expect(cycle.damagePerCycle).toBe(0);
    expect(cycle.sustainedDps).toBe(0);
    expect(cycle.lanes.every((l) => l.contributionPercent === 0)).toBe(true);
  });

  it('an all-basic rotation runs at the VelAtq floor', () => {
    const cycle = simulateRotation({
      steps: [step({ key: '__basic' }), step({ key: '__basic' }), step({ key: '__basic' })],
      aspdPeriod: 0.42,
    });

    expect(cycle.cycleDuration).toBeCloseTo(1.26, 5);
  });

  it('the unconstrained cycle ignores recargas and is permutation-invariant', () => {
    const steps = [
      step({ key: 'A', cast: 0.5, acd: 0.5, cd: 3 }),
      step({ key: 'B', cast: 0, acd: 0.3, cd: 1 }),
      step({ key: 'C', cast: 0.2, acd: 0.6, cd: 0 }),
    ];
    const base = simulateRotation({ steps, aspdPeriod: 0.42 }).unconstrainedDuration;
    const shuffled = simulateRotation({ steps: [steps[2], steps[0], steps[1]], aspdPeriod: 0.42 });

    expect(shuffled.unconstrainedDuration).toBeCloseTo(base, 5);
    // ...and it is a genuine lower bound on the real cycle.
    expect(shuffled.cycleDuration).toBeGreaterThanOrEqual(base - 1e-9);
  });
});

describe('distributePercents', () => {
  it('adds up to exactly 100,0 even when the shares do not divide evenly', () => {
    const pct = distributePercents([1, 1, 1]);

    expect(pct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('splits the mock rotation to one decimal', () => {
    // 69.072 total; the two short remainders (Entardecer .95, básico .54) take the
    // two tenths that the floors leave over.
    const pct = distributePercents([18940, 6220, 24310, 6220, 11480, 1902]);

    expect(pct).toEqual([27.4, 9, 35.2, 9, 16.6, 2.8]);
    expect(pct.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
  });

  it('gives a zero-damage step 0,0%', () => {
    const pct = distributePercents([100, 0]);

    expect(pct[1]).toBe(0);
    expect(pct[0]).toBe(100);
  });

  it('returns all zeroes when nothing deals damage', () => {
    expect(distributePercents([0, 0, 0])).toEqual([0, 0, 0]);
    expect(distributePercents([])).toEqual([]);
  });
});
