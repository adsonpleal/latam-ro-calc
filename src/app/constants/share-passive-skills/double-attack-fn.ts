import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

// Client table: Precisão +1% per level. No engine stage reads hitPercent, so the value
// documents the skill without changing a number.
export const DoubleAttackFn = (): PassiveSkillModel => ({
  label: 'Double Attack',
  name: 'Double Attack',
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    { label: 'Nv 1', value: 1, skillLv: 1, isUse: true, bonus: { hitPercent: 1 } },
    { label: 'Nv 2', value: 2, skillLv: 2, isUse: true, bonus: { hitPercent: 2 } },
    { label: 'Nv 3', value: 3, skillLv: 3, isUse: true, bonus: { hitPercent: 3 } },
    { label: 'Nv 4', value: 4, skillLv: 4, isUse: true, bonus: { hitPercent: 4 } },
    { label: 'Nv 5', value: 5, skillLv: 5, isUse: true, bonus: { hitPercent: 5 } },
    { label: 'Nv 6', value: 6, skillLv: 6, isUse: true, bonus: { hitPercent: 6 } },
    { label: 'Nv 7', value: 7, skillLv: 7, isUse: true, bonus: { hitPercent: 7 } },
    { label: 'Nv 8', value: 8, skillLv: 8, isUse: true, bonus: { hitPercent: 8 } },
    { label: 'Nv 9', value: 9, skillLv: 9, isUse: true, bonus: { hitPercent: 9 } },
    { label: 'Nv 10', value: 10, skillLv: 10, isUse: true, bonus: { hitPercent: 10 } },
  ],
});
