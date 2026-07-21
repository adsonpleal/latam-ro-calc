import { describe, expect, it } from 'vitest';
import { SavedSimulationStore } from './saved-simulations';
import { PlayerTargetProfile } from './pvp';

/** In-memory StorageLike for the store under test. */
const fakeStorage = () => {
  let value: string | null = null;
  return { getItem: () => value, setItem: (_k: string, v: string) => { value = v; } };
};

const preset = (over: Record<string, any> = {}) => ({ class: 4257, level: 99, jobLevel: 50, ...over }) as any;

const profile: PlayerTargetProfile = {
  name: 'X', level: 99, hp: 5000, def: 10, softDef: 20, mdef: 5, softMdef: 8,
  res: 3, mres: 2, flee: 200, str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1, defenderBonus: {},
};

describe('SavedSimulationStore.setTargetProfile', () => {
  it('attaches the profile without changing savedAt or list order', () => {
    const store = new SavedSimulationStore(fakeStorage());
    const a = store.upsert('A', preset());
    store.upsert('B', preset());

    const before = store.list();
    const beforeOrder = before.map((s) => s.id);
    const aSavedAt = before.find((s) => s.id === a.id)!.savedAt;

    store.setTargetProfile(a.id, profile);

    const after = store.list();
    expect(after.map((s) => s.id)).toEqual(beforeOrder); // order preserved
    const aAfter = after.find((s) => s.id === a.id)!;
    expect(aAfter.savedAt).toBe(aSavedAt); // NOT re-timestamped
    expect(aAfter.targetProfile).toEqual(profile);
    expect(after.find((s) => s.name === 'B')!.targetProfile).toBeUndefined(); // sibling untouched
  });

  it('is a no-op for an unknown id (does not throw or create an entry)', () => {
    const store = new SavedSimulationStore(fakeStorage());
    store.upsert('A', preset());
    expect(() => store.setTargetProfile('does-not-exist', profile)).not.toThrow();
    expect(store.list()).toHaveLength(1);
    expect(store.list()[0].targetProfile).toBeUndefined();
  });
});
