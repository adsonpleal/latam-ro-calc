import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const ShieldSpellFn = (): ActiveSkillModel => {
  return {
    name: 'Shield Spell',
    label: 'Aegis Domini 3',
    inputType: 'selectButton',
    isEquipAtk: true,
    dropdown: [
      { label: 'Sim', value: 150, isUse: true, bonus: { atk: 150, matk: 150 } },
      { label: 'Não', value: 0, isUse: false },
    ],
  };
};
