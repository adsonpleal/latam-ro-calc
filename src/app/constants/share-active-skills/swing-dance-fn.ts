import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const SwingDanceFn = (): PassiveSkillModel => ({
  label: 'Ritmo Contagiante 5',
  name: 'Swing Dance',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 5, isUse: true, bonus: { skillAspd: 5 * 4, fctPercent: 5 * 6 } },
    { label: 'Não', value: 0, isUse: false },
    // { label: 'Nv 1', value: 1, isUse: true, bonus: { skillAspd: 1 * 4, fctPercent: 1 * 6 } },
    // { label: 'Nv 2', value: 2, isUse: true, bonus: { skillAspd: 2 * 4, fctPercent: 2 * 6 } },
    // { label: 'Nv 3', value: 3, isUse: true, bonus: { skillAspd: 3 * 4, fctPercent: 3 * 6 } },
    // { label: 'Nv 4', value: 4, isUse: true, bonus: { skillAspd: 4 * 4, fctPercent: 4 * 6 } },
    // { label: 'Nv 5', value: 5, isUse: true, bonus: { skillAspd: 5 * 4, fctPercent: 5 * 6 } },
  ],
});
