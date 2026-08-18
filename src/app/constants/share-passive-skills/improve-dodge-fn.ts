import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const ImproveDodgeFn = (): PassiveSkillModel => ({
  inputType: 'dropdown',
  label: 'Improve Dodge',
  name: 'Improve Dodge',
  isEquipAtk: true,
  dropdown: [
    { label: '-', value: 0, isUse: false },
    { label: 'Nv 1', value: 1, skillLv: 1, isUse: true, bonus: { flee: 4 } },
    { label: 'Nv 2', value: 2, skillLv: 2, isUse: true, bonus: { flee: 8 } },
    { label: 'Nv 3', value: 3, skillLv: 3, isUse: true, bonus: { flee: 12 } },
    { label: 'Nv 4', value: 4, skillLv: 4, isUse: true, bonus: { flee: 16 } },
    { label: 'Nv 5', value: 5, skillLv: 5, isUse: true, bonus: { flee: 20 } },
    { label: 'Nv 6', value: 6, skillLv: 6, isUse: true, bonus: { flee: 24 } },
    { label: 'Nv 7', value: 7, skillLv: 7, isUse: true, bonus: { flee: 28 } },
    { label: 'Nv 8', value: 8, skillLv: 8, isUse: true, bonus: { flee: 32 } },
    { label: 'Nv 9', value: 9, skillLv: 9, isUse: true, bonus: { flee: 36 } },
    { label: 'Nv 10', value: 10, skillLv: 10, isUse: true, bonus: { flee: 40 } },
  ],
});
