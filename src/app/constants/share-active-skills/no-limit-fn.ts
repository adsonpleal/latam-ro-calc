import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

/**
 * Ilimitar. A factory, not a const, because `CharacterBase.activeSkills` sorts `dropdown`
 * **in place** — a shared object would have every class that offers it mutating one array.
 *
 * The ranged bonus follows the skill's own client table ("Nível l Dano físico a distância":
 * x1,5 / x2,0 / x2,5 / x3,0 / x3,5), which is 100 + 50 per level.
 *
 * `levels` narrows the dropdown for a class that can only ever reach part of that table.
 * Ranger learns the skill outright and Shadow Chaser copies it, so both get all five. The
 * bard/dancer fourth jobs learn it from nobody and receive it only from Colar Consagrado:
 * Amizade (491112), whose Conjunto clause — quoted in `latam-items.json`, the pt-BR
 * descriptions — grants nv.3 and no other level. Offering them Nv 5 would price a +350%
 * ranged bonus no build of theirs can hold.
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
      bonus: { range: 100 + level * 50 },
    })),
  ],
});
