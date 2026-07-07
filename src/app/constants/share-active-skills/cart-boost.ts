import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const CartBoost: ActiveSkillModel = {
  label: 'Cart Boost Lv5',
  name: 'Cart Boost',
  inputType: 'selectButton',
  isMasteryAtk: true,
  dropdown: [
    { label: 'Sim', value: 5, skillLv: 5, isUse: true, bonus: { atk: 50 } },
    { label: 'Não', value: 0, isUse: false },
  ],
};
