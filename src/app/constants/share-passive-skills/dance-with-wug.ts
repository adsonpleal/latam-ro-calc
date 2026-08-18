import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const DanceWithWug: PassiveSkillModel = {
  label: 'Dance With Wug',
  name: 'Dance With Wug',
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    { label: 'Nv 1', value: 1, isUse: true },
    { label: 'Nv 2', value: 2, isUse: true },
    { label: 'Nv 3', value: 3, isUse: true },
    { label: 'Nv 4', value: 4, isUse: true },
    { label: 'Nv 5', value: 5, isUse: true },
  ],
};
