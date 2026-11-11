import { describe, expect, it } from 'vitest';
import { WeaponSubTypeNameMapById, WeaponTypeNameMapBySubTypeId } from '../constants';
import { TwoHandedWeaponSubTypeIds, itemAllowsShield, subTypeIdAllowsShield } from './weapon';
import { AllowLeftWeaponMapper } from '../constants/allow-left-weapon-mapper';
import { ClassName } from '../jobs/_class-name';
import { ItemModel } from '../models/item.model';

/**
 * Which weapons leave the off hand free, asked of every subtype the client ships.
 *
 * Asking the subtype's *name* cannot answer it: Katar, Arco and Shuriken take both hands
 * and carry none of the `twohand` prefix that the other five two-handers announce
 * themselves with, so `startsWith('twohand')` hands all three a shield. That trap is
 * pinned below, because it reads as a plausible shortcut the next time somebody touches
 * this.
 *
 * Source: the `Locations` of all 2806 weapon entries in rAthena's
 * `db/re/item_db_equip.yml` — `Both_Hand` for every subtype in `TWO_HANDED`, `Right_Hand`
 * for every subtype in `ONE_HANDED`.
 */

const subTypeName = (id: number) => WeaponSubTypeNameMapById[id as keyof typeof WeaponSubTypeNameMapById];

const ONE_HANDED = [256, 257, 259, 261, 263, 265, 268, 269, 270, 271];
const TWO_HANDED = [258, 260, 262, 264, 266, 267, 272, 273, 274, 275, 276, 277, 278];

describe('subTypeIdAllowsShield', () => {
  it.each(ONE_HANDED.map((id) => [id, subTypeName(id)]))('leaves the off hand free for %i (%s)', (id: number) => {
    expect(subTypeIdAllowsShield(id)).toBe(true);
  });

  it.each(TWO_HANDED.map((id) => [id, subTypeName(id)]))('takes the off hand for %i (%s)', (id: number) => {
    expect(subTypeIdAllowsShield(id)).toBe(false);
  });

  it('covers every subtype the client ships, so a new one cannot default to one-handed by omission', () => {
    const known = [...ONE_HANDED, ...TWO_HANDED].sort((a, b) => a - b);
    expect(known).toEqual(Object.keys(WeaponSubTypeNameMapById).map(Number).sort((a, b) => a - b));
    expect([...TwoHandedWeaponSubTypeIds].sort((a, b) => a - b)).toEqual(TWO_HANDED);
  });

  it('frees the off hand when there is no weapon at all — an empty main hand is where a shield fits', () => {
    expect(subTypeIdAllowsShield(undefined)).toBe(true);
    expect(subTypeIdAllowsShield(0)).toBe(true);
    expect(itemAllowsShield(undefined)).toBe(true);
    expect(itemAllowsShield({} as ItemModel)).toBe(true);
  });
});

describe('the shortcut that gets this wrong', () => {
  /**
   * The board's screenshot was a Revólver with the shield slot open. All five firearms take
   * both hands, so the engine's `gun` type is right about them by accident — the subtype is
   * where the client states the rule, and is what this answers from.
   */
  it('takes the off hand for every firearm, the Revólver included', () => {
    const firearms = [273, 274, 275, 276, 277];
    expect(firearms.map((id) => WeaponTypeNameMapBySubTypeId[id as keyof typeof WeaponTypeNameMapBySubTypeId]))
      .toEqual(['gun', 'gun', 'gun', 'gun', 'gun']);
    expect(firearms.map((id) => subTypeIdAllowsShield(id))).toEqual([false, false, false, false, false]);
  });

  it('catches the three two-handers whose name carries no "twohand" prefix', () => {
    for (const id of [267, 272, 278]) {
      expect(WeaponTypeNameMapBySubTypeId[id as keyof typeof WeaponTypeNameMapBySubTypeId]).not.toMatch(/^twohand/);
      expect(subTypeIdAllowsShield(id)).toBe(false);
    }
    expect([267, 272, 278].map(subTypeName)).toEqual(['Bow', 'Katar', 'Shuriken']);
  });
});

describe('the class rule and the weapon rule are separate questions', () => {
  /**
   * A class that may put a weapon in the off hand still cannot put a shield there while a
   * two-hander holds both — and the Katar, which the Assassin line carries, is one.
   */
  it('denies a shield to a dual-wielding class holding a two-handed weapon', () => {
    expect(AllowLeftWeaponMapper[ClassName.ShadowCross]).toBe(true);
    expect(subTypeIdAllowsShield(272)).toBe(false); // Katar
    expect(subTypeIdAllowsShield(256)).toBe(true); // the same class with a dagger
  });
});
