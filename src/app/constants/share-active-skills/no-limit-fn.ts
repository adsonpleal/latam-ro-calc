import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

/**
 * Ranged physical damage per level, from the skill's own client table ("Nível l Dano
 * físico a distância": x1,5 / x2,0 / x2,5 / x3,0 / x3,5).
 */
const RANGE_BY_LEVEL: Record<number, number> = { 1: 150, 2: 200, 3: 250, 4: 300, 5: 350 };

/**
 * Ilimitar. A factory, not a const, because `CharacterBase.activeSkills` sorts `dropdown`
 * **in place** — a shared object would have every class that offers it mutating one array.
 *
 * `levels` narrows the dropdown for a class that can only ever reach part of the table.
 * Ranger learns the skill outright and Shadow Chaser copies it, so both get all five; the
 * bard/dancer fourth jobs learn it from nobody and receive it only from Colar Consagrado:
 * Amizade (491112), whose clause grants nv.3 and no other level. Offering them Nv 5 there
 * would price a +350% ranged bonus no build of theirs can hold.
 */
export const NoLimitFn = (levels: number[] = [1, 2, 3, 4, 5]): ActiveSkillModel => ({
  isEquipAtk: true,
  inputType: 'dropdown',
  label: 'No Limits',
  name: 'No Limits',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...levels.map(level => ({
      label: `Nv ${level}`,
      value: level,
      skillLv: level,
      isUse: true,
      bonus: { range: RANGE_BY_LEVEL[level] },
    })),
  ],
});
