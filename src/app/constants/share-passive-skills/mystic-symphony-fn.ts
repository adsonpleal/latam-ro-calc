import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const MysticSymphonyFn = (): PassiveSkillModel => ({
  label: 'Mystic Symphony',
  name: 'Mystic Symphony',
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 1, isUse: true, bonus: { p_race_fish: 50, p_race_demihuman: 50, m_race_fish: 50, m_race_demihuman: 50 } },
    { label: 'Não', value: 0, isUse: false },
  ],
});
