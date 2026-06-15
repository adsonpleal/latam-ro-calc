import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const ShieldSpellFn = (): ActiveSkillModel => {
  return {
    name: 'Shield Spell',
    label: 'Aegis Domini 3',
    inputType: 'selectButton',
    isEquipAtk: true,
    dropdown: [
      { label: 'Yes', value: 150, isUse: true, bonus: { atk: 150, matk: 150 } },
      { label: 'No', value: 0, isUse: false },
    ],
  };
};
