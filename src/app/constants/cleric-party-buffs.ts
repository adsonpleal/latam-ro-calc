import type { ActiveSkillModel } from '../jobs/_character-base.abstract';

// The client descriptions and bROWiki agree on these level tables. Share the
// definitions between self-cast skills and buffs received from another player.
// https://browiki.org/wiki/Argutus_Telum
export const ArgutusTelumBuff: ActiveSkillModel = {
  name: 'Argutus Telum',
  label: 'Argutus Telum',
  icon: 5272,
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...Array.from({ length: 5 }, (_, i) => ({ label: `Nv ${i + 1}`, value: i + 1, isUse: true, bonus: { pene_res: (i + 1) * 5 } })),
  ],
};

// https://browiki.org/wiki/Argutus_Vita
export const ArgutusVitaBuff: ActiveSkillModel = {
  name: 'Argutus Vita',
  label: 'Argutus Vita',
  icon: 5271,
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...Array.from({ length: 5 }, (_, i) => ({ label: `Nv ${i + 1}`, value: i + 1, isUse: true, bonus: { pene_mres: (i + 1) * 5 } })),
  ],
};

// https://browiki.org/wiki/Presens_Acies — T.CRIT is separate from criDmg.
export const PresensAciesBuff: ActiveSkillModel = {
  name: 'Presens Acies',
  label: 'Presens Acies',
  icon: 5275,
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...Array.from({ length: 5 }, (_, i) => ({ label: `Nv ${i + 1}`, value: i + 1, isUse: true, bonus: { cRate: (i + 1) * 2 } })),
  ],
};

// https://browiki.org/wiki/Lauda_Agnus. Keep the saved self-cast skill name.
export const LaudaAgnusBuff: ActiveSkillModel = {
  name: 'Laudaagnus',
  label: 'Lauda Agnus',
  icon: 2047,
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...Array.from({ length: 4 }, (_, i) => ({ label: `Nv ${i + 1}`, value: i + 1, isUse: true, bonus: { hpPercent: 4 + i * 2 } })),
  ],
};

// https://browiki.org/wiki/Lauda_Ramus. Also measured in
// Cardinal.gemini-lumen-autoattack.spec.ts when the buff expires.
export const LaudaRamusBuff: ActiveSkillModel = {
  name: 'Lauda Ramus',
  label: 'Lauda Ramus',
  icon: 2048,
  inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...Array.from({ length: 4 }, (_, i) => ({ label: `Nv ${i + 1}`, value: i + 1, isUse: true, bonus: { criDmg: (i + 1) * 5 } })),
  ],
};
