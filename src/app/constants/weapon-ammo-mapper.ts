import { ClassName } from '../jobs/_class-name';
import { ItemSubTypeId } from './item-sub-type.enum';
import { WeaponTypeName } from './weapon-type-mapper';

export const WeaponAmmoMapper: Partial<Record<WeaponTypeName, ItemSubTypeId>> = {
  bow: ItemSubTypeId.Arrow,
  whip: ItemSubTypeId.Arrow,
  instrument: ItemSubTypeId.Arrow,
  gun: ItemSubTypeId.Bullet,
  shuriken: ItemSubTypeId.Kunai,
};

/**
 * Classes that keep ammo equipped whatever the weapon is, because a skill throws it rather
 * than the weapon firing it — the Kagerou line with kunai, the Mechanic line with
 * cannonballs, and the Sicário line with the Faca Envenenada, which Faca Envenenada
 * (AS_VENOMKNIFE) consumes from the ammo slot while the character wields a katar or dagger.
 */
export const ClassAmmoMapper: Partial<Record<ClassName, ItemSubTypeId>> = {
  Oboro: ItemSubTypeId.Kunai,
  Shinkiro: ItemSubTypeId.Kunai,
  Kagerou: ItemSubTypeId.Kunai,
  Shiranui: ItemSubTypeId.Kunai,
  Mechanic: ItemSubTypeId.Cannonball,
  Meister: ItemSubTypeId.Cannonball,
  Genetic: ItemSubTypeId.Cannonball,
  Biolo: ItemSubTypeId.Cannonball,
  Assassin: ItemSubTypeId.ThrowingDagger,
  AssassinCross: ItemSubTypeId.ThrowingDagger,
  GuillotineCross: ItemSubTypeId.ThrowingDagger,
  ShadowCross: ItemSubTypeId.ThrowingDagger,
};
