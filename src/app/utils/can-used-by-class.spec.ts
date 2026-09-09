import { describe, expect, it } from 'vitest';
import { CharacterBase } from '../jobs/_character-base.abstract';
import { canUsedByClass } from './can-used-by-class';

// canUsedByClass only reads `_class.classNameSet`, so a minimal stub is enough.
const charWith = (...names: string[]) => ({ classNameSet: new Set(names) } as unknown as CharacterBase);

describe('canUsedByClass', () => {
  const runeKnight = canUsedByClass(charWith('RuneKnight', 'AllClass'));

  it('allows an item with no class restriction', () => {
    expect(runeKnight({})).toBe(true);
  });

  it('respects usableClass allow-lists', () => {
    expect(runeKnight({ usableClass: ['RuneKnight'] })).toBe(true);
    expect(runeKnight({ usableClass: ['Mage'] })).toBe(false);
  });

  it('respects unusableClass block-lists', () => {
    expect(runeKnight({ unusableClass: ['RuneKnight'] })).toBe(false);
    expect(runeKnight({ unusableClass: ['Mage'] })).toBe(true);
  });

  it('treats unusableClass as a veto and usableClass as an allow-list, in that order', () => {
    // Listed as usable AND unusable -> blocked, the veto wins.
    expect(runeKnight({ usableClass: ['RuneKnight'], unusableClass: ['RuneKnight'] })).toBe(false);
    // Not blocked for ours, but the allow-list still has to name us. This is the case the
    // old `can = !unusableClass.some(...)` tail got backwards: it read "not blocked" as
    // "allowed" and handed 'Hi-Class' gear (2554, 2703) to every Expanded class.
    expect(runeKnight({ usableClass: ['Mage'], unusableClass: ['Mage'] })).toBe(false);
    expect(runeKnight({ usableClass: ['Hi-Class'], unusableClass: ['Novice'] })).toBe(false);
    expect(runeKnight({ usableClass: ['RuneKnight'], unusableClass: ['Novice'] })).toBe(true);
  });
});
