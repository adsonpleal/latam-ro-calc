import { describe, expect, it } from 'vitest';
import { WeaponSubTypeNameMapById, WeaponTypeNameMapBySubTypeId } from '../constants';
import { TwoHandedWeaponSubTypeIds, itemAllowsShield, subTypeIdAllowsShield } from './weapon';
import { AllowLeftWeaponMapper } from '../constants/allow-left-weapon-mapper';
import { ClassName } from '../jobs/_class-name';
import { ItemModel } from '../models/item.model';

/**
 * Which weapons leave the off hand free, asked of every subtype the client ships.
 *
 * The question used to be asked of the engine's weapon *type*, and the type cannot answer
 * it: `WeaponTypeNameMapBySubTypeId` collapses the five firearms into one `gun`, so a
 * Revólver — one-handed — was denied a shield along with the four that are not. The
 * subtype's *name* cannot answer it either: Katar, Arco and Shuriken take both hands and
 * carry no `twohand` prefix. Both traps are pinned below, because both read as plausible
 * shortcuts the next time somebody touches this.
 *
 * Sources: bROWiki's weapon pages and rAthena's `weapon_db` two-handed flags.
 */

const subTypeName = (id: number) => WeaponSubTypeNameMapById[id as keyof typeof WeaponSubTypeNameMapById];

const ONE_HANDED = [256, 257, 259, 261, 263, 265, 268, 269, 270, 271, 273];
const TWO_HANDED = [258, 260, 262, 264, 266, 267, 272, 274, 275, 276, 277, 278];

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

describe('the two shortcuts that get this wrong', () => {
  it('separates the Revólver from the four firearms the engine files under the same type', () => {
    const firearms = [273, 274, 275, 276, 277];
    expect(firearms.map((id) => WeaponTypeNameMapBySubTypeId[id as keyof typeof WeaponTypeNameMapBySubTypeId]))
      .toEqual(['gun', 'gun', 'gun', 'gun', 'gun']);

    expect(subTypeIdAllowsShield(273)).toBe(true); // Revolver
    expect(firearms.slice(1).map((id) => subTypeIdAllowsShield(id))).toEqual([false, false, false, false]);
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
