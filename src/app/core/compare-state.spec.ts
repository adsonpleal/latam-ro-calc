import { describe, expect, it } from 'vitest';
import { sanitizeCompareState } from './compare-state';

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
});
