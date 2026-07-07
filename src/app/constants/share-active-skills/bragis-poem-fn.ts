import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const BragisPoemFn = (): ActiveSkillModel => ({
  label: 'Poema de Bragi 10',
  name: "Bragi's Poem",
  icon: 321,
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 10, isUse: true, bonus: { vctBySkill: 20, acd: 30 } },
    { label: 'Não', value: 0, isUse: false },
  ],
});
