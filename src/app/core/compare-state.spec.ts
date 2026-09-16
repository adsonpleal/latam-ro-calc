import { describe, expect, it } from 'vitest';
import { STATS_COMPARE_KEYS, copyStatsFields, sanitizeCompareState } from './compare-state';

describe('sanitizeCompareState', () => {
  it('accepts a well-formed state', () => {
    const state = { itemNames: ['weapon', 'armor'], model2: { weapon: 123, rawOptionTxts: [] } };
    expect(sanitizeCompareState(state)).toEqual(state);
  });

  it('drops non-string slot names', () => {
    const out = sanitizeCompareState({ itemNames: ['weapon', 5, null, 'armor'], model2: {} });
    expect(out).toEqual({ itemNames: ['weapon', 'armor'], model2: {} });
  });

  it('returns null when there are no compared slots', () => {
    expect(sanitizeCompareState({ itemNames: [], model2: { weapon: 1 } })).toBeNull();
    expect(sanitizeCompareState({ itemNames: [1, 2], model2: {} })).toBeNull();
  });

  it('returns null for missing/invalid shapes', () => {
    expect(sanitizeCompareState(null)).toBeNull();
    expect(sanitizeCompareState(undefined)).toBeNull();
    expect(sanitizeCompareState('nope')).toBeNull();
    expect(sanitizeCompareState({ itemNames: ['weapon'] })).toBeNull(); // no model2
    expect(sanitizeCompareState({ model2: {} })).toBeNull(); // no itemNames
    expect(sanitizeCompareState({ itemNames: ['weapon'], model2: 'x' })).toBeNull();
  });

  it('keeps a stats comparison that compares no slot', () => {
    const state = { itemNames: [], model2: { level: 250, str: 99 }, stats: true };
    expect(sanitizeCompareState(state)).toEqual(state);
  });

  it('only ever records the stats flag as true', () => {
    expect(sanitizeCompareState({ itemNames: ['weapon'], model2: {}, stats: false })).toEqual({ itemNames: ['weapon'], model2: {} });
    expect(sanitizeCompareState({ itemNames: [], model2: {}, stats: 'yes' })).toBeNull();
  });
});

describe('copyStatsFields', () => {
  it('copies level, job level, the six stats and the six traits, defaulting to 0', () => {
    const target: Record<string, any> = { weapon: 5 };
    copyStatsFields({ level: 250, jobLevel: 55, str: 130, crt: 40, weapon: 9 }, target);
    expect(STATS_COMPARE_KEYS).toHaveLength(14);
    expect(target).toMatchObject({ weapon: 5, level: 250, jobLevel: 55, str: 130, agi: 0, crt: 40, pow: 0 });
  });
});
