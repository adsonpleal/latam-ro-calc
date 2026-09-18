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

/**
 * The names a player gives the slot-highlight colours. Local by design: which colour a
 * slot wears is part of the build and is shared with it, what the player calls it is not.
 */
describe('CalcStorage — slot colour labels', () => {
  let errSpy: any;
  beforeEach(() => (errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})));

  it('returns an empty map when nothing is stored', () => {
    expect(new CalcStorage(fakeStorage()).readSlotColorLabels()).toEqual({});
  });

  it('round-trips the names', () => {
    const store = new CalcStorage(fakeStorage());
    store.writeSlotColorLabels({ azul: 'Essencial', rosa: 'Temporário' });
    expect(store.readSlotColorLabels()).toEqual({ azul: 'Essencial', rosa: 'Temporário' });
  });

  it('drops a name for a colour that is not in the palette on the way in', () => {
    const storage = fakeStorage();
    new CalcStorage(storage).writeSlotColorLabels({ azul: 'Essencial', dourado: 'Inventado' });
    expect(storage.getItem('ro-color-labels')).toBe('{"azul":"Essencial"}');
  });

  it('returns an empty map for corrupt JSON, swallowing the error', () => {
    expect(new CalcStorage(fakeStorage({ 'ro-color-labels': 'not json' })).readSlotColorLabels()).toEqual({});
    errSpy.mockRestore();
  });
});

/** The nudge that points at the colour button, retired once the button has been opened. */
describe('CalcStorage — the slot colour hint', () => {
  it('is pending on a browser that has never opened the button', () => {
    expect(new CalcStorage(fakeStorage()).readSlotColorSeen()).toBe(false);
  });

  it('stays retired once marked', () => {
    const storage = fakeStorage();
    const store = new CalcStorage(storage);
    store.markSlotColorSeen();
    expect(store.readSlotColorSeen()).toBe(true);
    expect(new CalcStorage(storage).readSlotColorSeen()).toBe(true);
  });

  it('treats any other stored value as not seen', () => {
    expect(new CalcStorage(fakeStorage({ 'ro-color-seen': 'false' })).readSlotColorSeen()).toBe(false);
  });
});
