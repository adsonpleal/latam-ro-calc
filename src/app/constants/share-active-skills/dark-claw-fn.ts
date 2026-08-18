import { ActiveSkillModel } from '../../jobs/_character-base.abstract';

export const DarkClawFn = (): ActiveSkillModel => ({
  name: 'Dark Claw',
  label: 'Garra Sombria 5',
  isDebuff: true,
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', isUse: true, value: 5, bonus: { darkClaw: 150 } },
    { label: 'Não', isUse: false, value: 0 },
    // { label: 'Nv 4', isUse: true, value: 4, bonus: { darkClaw: 120 } },
    // { label: 'Nv 3', isUse: true, value: 3, bonus: { darkClaw: 90 } },
    // { label: 'Nv 2', isUse: true, value: 2, bonus: { darkClaw: 60 } },
    // { label: 'Nv 1', isUse: true, value: 1, bonus: { darkClaw: 30 } },
  ],
});
