import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalcStorage, StorageLike } from './calc-storage';

// In-memory StorageLike backing for the tests.
function fakeStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
  };
}

describe('CalcStorage — monster ids', () => {
  it('returns [] when nothing is stored', () => {
    expect(new CalcStorage(fakeStorage()).readMonsterIds()).toEqual([]);
  });

  it('reads a stored integer array', () => {
    const store = new CalcStorage(fakeStorage({ monsterIds: '[1002, 1004, 1007]' }));
    expect(store.readMonsterIds()).toEqual([1002, 1004, 1007]);
  });

  it('drops non-integer entries', () => {
    const store = new CalcStorage(fakeStorage({ monsterIds: '[1, "x", 2.5, 3]' }));
    expect(store.readMonsterIds()).toEqual([1, 3]);
  });

  it('returns [] for a non-array or invalid JSON, swallowing the error', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(new CalcStorage(fakeStorage({ monsterIds: '{}' })).readMonsterIds()).toEqual([]);
    expect(new CalcStorage(fakeStorage({ monsterIds: 'not json' })).readMonsterIds()).toEqual([]);
    errSpy.mockRestore();
  });

  it('round-trips through write/read', () => {
    const storage = fakeStorage();
    const store = new CalcStorage(storage);
    store.writeMonsterIds([1, 2, 3]);
    expect(storage.getItem('monsterIds')).toBe('[1,2,3]');
    expect(store.readMonsterIds()).toEqual([1, 2, 3]);
  });
});

describe('CalcStorage — battle columns', () => {
  let errSpy: any;
  beforeEach(() => (errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})));

  it('reads only string column names', () => {
    const store = new CalcStorage(fakeStorage({ battle_cols: '["dps", 5, "min", null]' }));
    expect(store.readBattleColNames()).toEqual(['dps', 'min']);
  });

  it('returns [] for invalid storage', () => {
    expect(new CalcStorage(fakeStorage({ battle_cols: 'oops' })).readBattleColNames()).toEqual([]);
    errSpy.mockRestore();
  });

  it('round-trips through write/read', () => {
    const storage = fakeStorage();
    const store = new CalcStorage(storage);
    store.writeBattleColNames(['dps', 'avg']);
    expect(storage.getItem('battle_cols')).toBe('["dps","avg"]');
    expect(store.readBattleColNames()).toEqual(['dps', 'avg']);
  });
});

describe('CalcStorage — compare state', () => {
  let errSpy: any;
  beforeEach(() => (errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})));

  it('returns null when nothing is stored', () => {
    expect(new CalcStorage(fakeStorage()).readCompareState()).toBeNull();
  });

  it('round-trips a valid comparison', () => {
    const storage = fakeStorage();
    const store = new CalcStorage(storage);
    const state = { itemNames: ['weapon'], model2: { weapon: 1201, rawOptionTxts: [] } };
    store.writeCompareState(state);
    expect(store.readCompareState()).toEqual(state);
  });

  it('writes null (clears) for an empty or null state', () => {
    const storage = fakeStorage();
    const store = new CalcStorage(storage);
    store.writeCompareState({ itemNames: [], model2: {} });
    expect(storage.getItem('ro-set-compare')).toBe('null');
    store.writeCompareState(null);
    expect(store.readCompareState()).toBeNull();
  });

  it('returns null for corrupt JSON, swallowing the error', () => {
    expect(new CalcStorage(fakeStorage({ 'ro-set-compare': 'not json' })).readCompareState()).toBeNull();
    errSpy.mockRestore();
  });
});
