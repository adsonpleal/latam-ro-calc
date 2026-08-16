import { describe, expect, it } from 'vitest';
import { countArrangements, describeMoves, optimizeRotation } from './rotation-optimize';
import { RotationScheduleStep, simulateRotation } from './rotation-schedule';

const mkStep = (key: string, over: Partial<RotationScheduleStep> = {}): RotationScheduleStep => ({
  key,
  cast: 0,
  acd: 0.3,
  cd: 0,
  damage: 1000,
  ...over,
});

/** Builds the value->step map the optimizer takes, keyed by the rotation string. */
const mapOf = (entries: Record<string, RotationScheduleStep>) => new Map(Object.entries(entries));

const cycleOf = (order: string[], stepByValue: Map<string, RotationScheduleStep>, aspdPeriod: number) =>
  simulateRotation({
    steps: order.map((v) => stepByValue.get(v)!),
    aspdPeriod,
    maxCycles: 16,
  }).cycleDuration;

describe('countArrangements', () => {
  it('counts distinct arrangements of a multiset', () => {
    expect(countArrangements([1, 1, 1], 1000)).toBe(6); // 3!
    expect(countArrangements([2, 1], 1000)).toBe(3); // 3!/2!
    expect(countArrangements([3, 3, 2, 2], 1e9)).toBe(25200); // 10!/(3!3!2!2!)
    expect(countArrangements([1, 1, 1, 1, 1, 1, 1, 1], 1e9)).toBe(40320); // 8!
  });

  it('bails out instead of overflowing on a long rotation', () => {
    expect(countArrangements(Array(20).fill(1), 50_000)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('describeMoves', () => {
  it('reports only the entries that moved', () => {
    expect(describeMoves(['A', 'B', 'C'], ['C', 'A', 'B'])).toEqual([
      { value: 'A', from: 0, to: 1 },
      { value: 'B', from: 1, to: 2 },
      { value: 'C', from: 2, to: 0 },
    ]);
  });

  it('matches duplicates in order, so the diff stays minimal', () => {
    expect(describeMoves(['A', 'B', 'A'], ['A', 'A', 'B'])).toEqual([
      { value: 'B', from: 1, to: 2 },
      { value: 'A', from: 2, to: 1 },
    ]);
  });

  it('is empty when nothing changed', () => {
    expect(describeMoves(['A', 'B'], ['A', 'B'])).toEqual([]);
  });
});

describe('optimizeRotation — when there is nothing to do', () => {
  it('leaves a rotation with no recargas alone', () => {
    const stepByValue = mapOf({ A: mkStep('A'), B: mkStep('B') });
    const result = optimizeRotation({ rotation: ['A', 'B'], stepByValue, aspdPeriod: 0.4 });

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('no-cooldowns');
    expect(result.order).toEqual(['A', 'B']);
  });

  it('leaves a single-entry rotation alone', () => {
    const stepByValue = mapOf({ A: mkStep('A', { cd: 3 }) });
    expect(optimizeRotation({ rotation: ['A'], stepByValue, aspdPeriod: 0.4 }).changed).toBe(false);
  });

  it('stops immediately when the cycle is already at the permutation-invariant floor', () => {
    // Every recarga closes inside the cycle, so no order can shorten it.
    const stepByValue = mapOf({
      A: mkStep('A', { acd: 0.5, cd: 0.4 }),
      B: mkStep('B', { acd: 0.5, cd: 0.4 }),
      C: mkStep('C', { acd: 0.5, cd: 0.4 }),
    });
    const result = optimizeRotation({ rotation: ['A', 'B', 'C'], stepByValue, aspdPeriod: 0.2 });

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('already-optimal');
  });
});

describe('optimizeRotation — exhaustive path', () => {
  it('interleaves two repeated skills instead of grouping them', () => {
    // A skill used k times per cycle can never beat k x cd whatever the order, so a
    // single repeated skill is not enough to make order matter. Two repeated skills
    // are: grouped (A A B B) each pair stalls on its own recarga, interleaved
    // (A B A B) both run dry inside the cycle.
    const stepByValue = mapOf({
      A: mkStep('A', { acd: 0.3, cd: 1.0 }),
      B: mkStep('B', { acd: 0.3, cd: 1.0 }),
    });
    const rotation = ['A', 'A', 'B', 'B'];
    const result = optimizeRotation({ rotation, stepByValue, aspdPeriod: 0.1 });

    expect(result.changed).toBe(true);
    expect(result.exhaustive).toBe(true);
    expect(result.cycleBefore).toBeCloseTo(2.6, 5);
    expect(result.cycleAfter).toBeCloseTo(2.0, 5); // the 2 x cd floor for both skills
    expect(result.dpsAfter).toBeGreaterThan(result.dpsBefore);

    // Both pairs end up split across the cycle.
    expect(result.order.lastIndexOf('A') - result.order.indexOf('A')).toBe(2);
    expect(result.order.lastIndexOf('B') - result.order.indexOf('B')).toBe(2);
  });

  it('spaces a repeated skill out among the fillers (the mock shape)', () => {
    // One skill twice plus four single-use fillers — the shape of the handoff's own
    // example rotation. Grouping the two uses stalls on the recarga; splitting the
    // fillers around them lets the cycle close at the 2 x recarga floor.
    const stepByValue = mapOf({
      A: mkStep('A', { acd: 0.3, cd: 1.0 }),
      B: mkStep('B', { acd: 0.3 }),
      C: mkStep('C', { acd: 0.3 }),
      D: mkStep('D', { acd: 0.3 }),
      E: mkStep('E', { acd: 0.3 }),
    });
    const result = optimizeRotation({ rotation: ['A', 'A', 'B', 'C', 'D', 'E'], stepByValue, aspdPeriod: 0.1 });

    expect(result.changed).toBe(true);
    expect(result.cycleBefore).toBeCloseTo(2.5, 5);
    expect(result.cycleAfter).toBeCloseTo(2.0, 5);
    // Three fillers' worth of pós (0,9s) now sits between the two uses, covering the 1,0s
    // recarga together with A's own pós.
    expect(result.order.lastIndexOf('A') - result.order.indexOf('A')).toBeGreaterThanOrEqual(3);
  });

  it('finds the true optimum, matching an independent brute force', () => {
    const stepByValue = mapOf({
      A: mkStep('A', { cast: 0.4, acd: 0.4, cd: 2.0 }),
      B: mkStep('B', { acd: 0.2, cd: 1.4 }),
      C: mkStep('C', { acd: 0.5, cd: 0.3 }),
      D: mkStep('D', { acd: 0.3, cd: 0.9 }),
    });
    const rotation = ['A', 'B', 'C', 'D', 'B'];
    const aspdPeriod = 0.25;

    const result = optimizeRotation({ rotation, stepByValue, aspdPeriod });

    // Independent exhaustive search over every arrangement.
    const permute = (items: string[]): string[][] =>
      items.length <= 1 ? [items] : items.flatMap((item, i) => permute([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]));
    const trueBest = Math.min(...permute(rotation).map((order) => cycleOf(order, stepByValue, aspdPeriod)));

    expect(result.cycleAfter).toBeCloseTo(trueBest, 6);
  });

  it('never returns a worse cycle than it was given', () => {
    for (let seed = 0; seed < 60; seed++) {
      const stepByValue = mapOf({
        A: mkStep('A', { acd: ((seed * 7) % 50) / 100, cd: ((seed * 13) % 250) / 100 }),
        B: mkStep('B', { acd: ((seed * 11) % 40) / 100, cd: ((seed * 5) % 180) / 100 }),
        C: mkStep('C', { acd: ((seed * 3) % 60) / 100, cd: ((seed * 17) % 120) / 100 }),
      });
      const rotation = ['A', 'B', 'C', 'A'];
      const result = optimizeRotation({ rotation, stepByValue, aspdPeriod: (seed % 40) / 100 });

      expect(result.cycleAfter).toBeLessThanOrEqual(result.cycleBefore + 1e-9);
      expect(result.order).toHaveLength(rotation.length);
      // The multiset is preserved — optimising must never add or drop a skill.
      expect(result.order.slice().sort()).toEqual(rotation.slice().sort());
    }
  });

  it('is idempotent: optimising an optimised rotation changes nothing', () => {
    const stepByValue = mapOf({
      A: mkStep('A', { acd: 0.3, cd: 1.2 }),
      B: mkStep('B', { acd: 0.3, cd: 0 }),
      C: mkStep('C', { acd: 0.3, cd: 0 }),
    });
    const once = optimizeRotation({ rotation: ['A', 'A', 'B', 'C'], stepByValue, aspdPeriod: 0.1 });
    const twice = optimizeRotation({ rotation: once.order, stepByValue, aspdPeriod: 0.1 });

    expect(twice.changed).toBe(false);
    expect(twice.order).toEqual(once.order);
  });

  it('is deterministic', () => {
    const stepByValue = mapOf({
      A: mkStep('A', { acd: 0.4, cd: 1.7 }),
      B: mkStep('B', { acd: 0.2, cd: 0.9 }),
      C: mkStep('C', { acd: 0.3, cd: 0.5 }),
    });
    const runs = Array.from({ length: 10 }, () =>
      optimizeRotation({ rotation: ['A', 'B', 'A', 'C', 'B'], stepByValue, aspdPeriod: 0.3 }).order.join('|'),
    );

    expect(new Set(runs).size).toBe(1);
  });
});

describe('optimizeRotation — heuristic path', () => {
  // Four skills twice each: 8!/(2!^4) = 2520 arrangements, and the two long recargas
  // make the order genuinely matter. Small enough for the exhaustive path by default,
  // big enough to force the heuristic under a tight budget — so the two can be compared
  // on exactly the same input.
  const stepByValue = mapOf({
    A: mkStep('A', { acd: 0.3, cd: 1.5 }),
    B: mkStep('B', { acd: 0.3, cd: 1.5 }),
    C: mkStep('C', { acd: 0.3, cd: 0.5 }),
    D: mkStep('D', { acd: 0.3, cd: 0.5 }),
  });
  const rotation = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D'];

  it('falls back to the heuristic when the search space is too big', () => {
    const result = optimizeRotation({ rotation, stepByValue, aspdPeriod: 0.1, budget: 1_000 });

    expect(result.exhaustive).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.cycleAfter).toBeLessThanOrEqual(result.cycleBefore + 1e-9);
    expect(result.order.slice().sort()).toEqual(rotation.slice().sort());
  });

  it('agrees with the exhaustive search on a size where both can run', () => {
    const exhaustive = optimizeRotation({ rotation, stepByValue, aspdPeriod: 0.1 });
    const heuristic = optimizeRotation({ rotation, stepByValue, aspdPeriod: 0.1, budget: 1 });

    expect(exhaustive.exhaustive).toBe(true);
    expect(heuristic.exhaustive).toBe(false);
    expect(heuristic.cycleAfter).toBeCloseTo(exhaustive.cycleAfter, 6);
  });
});
