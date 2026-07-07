import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const DistortedCrescent: ActiveSkillModel = {
  label: 'Distorted Cres 5',
  name: 'Distorted Crescent',
  inputType: 'selectButton',
  isEquipAtk: true,
  dropdown: [
    { label: 'Sim', value: 5, skillLv: 5, isUse: true },
    { label: 'Não', value: 0, isUse: false },
  ],
};
