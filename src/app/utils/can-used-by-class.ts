import { CharacterBase } from '../jobs/_character-base.abstract';

/** The two fields an item — or a picker row built from one — carries about who may wear it. */
export interface ClassUsage {
  usableClass?: string[];
  unusableClass?: string[];
}

/**
 * The class test every equipment picker filters by: `unusableClass` is a veto, and past it
 * `usableClass` is an allow-list the class has to be on. An item naming neither goes on
 * anyone.
 *
 * The two are not symmetric, and the order matters. This used to end with
 * `can = !unusableClass.some(...)`, which let a block-list the class is *not* on overwrite
 * an allow-list it had already failed: "Pedaço de Pele do Guardião" and "Anel do
 * Especialista" are `Hi-Class` only and blocked for `Novice`, and under that reading the
 * twelve Expanded classes — Star Emperor, Soul Reaper, the Kagerou branch, Rebellion,
 * Doram and their 4th jobs — are on neither list and were handed both items.
 *
 * A factory rather than a two-argument function because `classNameSet` is a getter that
 * mints a fresh Set on every read, and these predicates run over lists thousands of items
 * long — the set has to be read once per class, not once per item.
 */
export const canUsedByClass = <T extends ClassUsage>(_class: CharacterBase) => {
  const classNameSet = _class.classNameSet;

  return ({ unusableClass, usableClass }: T): boolean => {
    if (Array.isArray(unusableClass) && unusableClass.length > 0 && unusableClass.some((name) => classNameSet.has(name))) {
      return false;
    }
    if (Array.isArray(usableClass)) {
      return usableClass.some((name) => classNameSet.has(name));
    }

    return true;
  };
};
