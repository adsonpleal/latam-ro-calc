import { PassiveSkillModel } from '../../jobs/_character-base.abstract';

export const DebufSonicBrandFn = (): PassiveSkillModel => ({
  label: 'Desarranjo Musical', // "Sonic Brand" — official client name for the mark, per the Sound Blend (5357) description: "Marca o alvo com [Desarranjo Musical]..."
  name: '_Debuf_Sonic_Brand',
  // Calc-internal toggle (no client skill of its own). Pin the Sound Blend icon (5357,
  // "Arranjo Musical") so the hover shows the official pt-BR client description, which
  // documents the mark ("Desarranjo Musical") and the skills it amplifies. localize()
  // leaves _-prefixed names untouched, so this explicit icon survives to buffTooltip().
  icon: 5357,
  isDebuff: true,
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 1, isUse: true, bonus: { p_race_fish: 50, p_race_demihuman: 50, m_race_fish: 50, m_race_demihuman: 50 } },
    { label: 'Não', value: 0, isUse: false },
  ],
});
