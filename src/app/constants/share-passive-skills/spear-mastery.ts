import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const SpearMastery: PassiveSkillModel = {
  label: 'Spear Mastery',
  name: 'Spear Mastery',
  inputType: 'dropdown',
  isMasteryAtk: true,
  dropdown: [
    { label: '-', value: 0, isUse: false },
    { label: 'Nv 1', value: 1, isUse: true },
    { label: 'Nv 2', value: 2, isUse: true },
    { label: 'Nv 3', value: 3, isUse: true },
    { label: 'Nv 4', value: 4, isUse: true },
    { label: 'Nv 5', value: 5, isUse: true },
    { label: 'Nv 6', value: 6, isUse: true },
    { label: 'Nv 7', value: 7, isUse: true },
    { label: 'Nv 8', value: 8, isUse: true },
    { label: 'Nv 9', value: 9, isUse: true },
    { label: 'Nv 10', value: 10, isUse: true },
  ],
};
