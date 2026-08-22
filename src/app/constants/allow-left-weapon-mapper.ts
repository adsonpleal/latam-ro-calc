import { ClassName } from '../jobs/_class-name';

/**
 * The classes that can put a weapon in the off hand instead of a shield.
 *
 * bROWiki, "Perícia com Mão Esquerda": *"Apenas Mercenários, Kagerou, Oboro e evoluções
 * podem equipar armas nas duas mãos"* — that is the Assassin line (Mercenário → Algoz →
 * Sicário → Executor) and the Kagerou/Oboro branch with its 4th jobs. The ancestors of
 * each line are NOT included: Gatuno and Ninja have no off hand, only their promotions
 * do. Katars are two-handed and never count as dual wielding.
 *
 * Assassin and AssassinCross are here for completeness — the calculator only offers 3rd
 * and 4th jobs today (see _class-list.ts), so nothing reads them yet.
 */
export const AllowLeftWeaponMapper = {
  [ClassName.Assassin]: true,
  [ClassName.AssassinCross]: true,
  [ClassName.GuillotineCross]: true,
  [ClassName.ShadowCross]: true,

  [ClassName.Kagerou]: true,
  [ClassName.Shinkiro]: true,
  [ClassName.Oboro]: true,
  [ClassName.Shiranui]: true,
} as const;
