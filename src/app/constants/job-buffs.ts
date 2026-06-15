import { ActiveSkillModel } from '../jobs/_character-base.abstract';
import { BragisPoemFn, DarkClawFn, ShieldSpellFn, SwingDanceFn } from './share-active-skills';

const JobBuffsList: ActiveSkillModel[] = [
  {
    name: 'Cantocandidus',
    label: 'Aumentar Agilidade',
    icon: 29,
    inputType: 'dropdown',
    dropdown: [
      { label: '-', value: 0, isUse: false },
      { label: 'Lv 3', value: 3, isUse: true, bonus: { agi: 5, aspdPercent: 3 } },
      { label: 'Lv 10', value: 10, isUse: true, bonus: { agi: 12, aspdPercent: 10 } },
      { label: 'Job 20', value: 12, isUse: true, bonus: { agi: 14, aspdPercent: 12 } },
      { label: 'Job 30', value: 13, isUse: true, bonus: { agi: 15, aspdPercent: 13 } },
      { label: 'Job 40', value: 14, isUse: true, bonus: { agi: 16, aspdPercent: 14 } },
      { label: 'Job 50', value: 15, isUse: true, bonus: { agi: 17, aspdPercent: 15 } },
      { label: 'Job 60', value: 16, isUse: true, bonus: { agi: 18, aspdPercent: 16 } },
      { label: 'Job 70', value: 17, isUse: true, bonus: { agi: 19, aspdPercent: 17 } },
    ],
  },
  {
    name: 'Clementia',
    label: 'Bênção',
    icon: 34,
    inputType: 'dropdown',
    dropdown: [
      { label: '-', value: 0, isUse: false },
      { label: 'Lv 10', value: 10, isUse: true, bonus: { str: 10, int: 10, dex: 10, hit: 20 } },
      { label: 'Job 20', value: 12, isUse: true, bonus: { str: 12, int: 12, dex: 12, hit: 22 } },
      { label: 'Job 30', value: 13, isUse: true, bonus: { str: 13, int: 13, dex: 13, hit: 23 } },
      { label: 'Job 40', value: 14, isUse: true, bonus: { str: 14, int: 14, dex: 14, hit: 24 } },
      { label: 'Job 50', value: 15, isUse: true, bonus: { str: 15, int: 15, dex: 15, hit: 25 } },
      { label: 'Job 60', value: 16, isUse: true, bonus: { str: 16, int: 16, dex: 16, hit: 26 } },
      { label: 'Job 70', value: 17, isUse: true, bonus: { str: 17, int: 17, dex: 17, hit: 27 } },
    ],
  },
  {
    name: 'Impositio Manus',
    label: 'Impositio 5',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { atk: 25, matk: 25 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Expiatio',
    label: 'Expiatio 5',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { p_pene_race_all: 25, m_pene_race_all: 25 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Competentia',
    label: 'Competentia',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { pAtk: 50, sMatk: 50 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Religio',
    label: 'Religio',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { spl: 10, wis: 10, sta: 10 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Benedictum',
    label: 'Benedictum',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { pow: 10, crt: 10, con: 10 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Argutus Vita',
    label: 'Argutus Vita',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { pene_mres: 25 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Argutus Telum',
    label: 'Argutus Telum',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { pene_res: 25 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Presens Acies',
    label: 'Presens Acies 5',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { cRate: 10 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Crazy Uproar',
    label: 'Grito de Guerra',
    inputType: 'selectButton',
    isMasteryAtk: true,
    dropdown: [
      { label: 'Yes', value: 1, skillLv: 1, isUse: true, bonus: { str: 4, atk: 30 } },
      { label: 'No', value: 0, isUse: false },
    ],
  },
  {
    name: 'Adrenaline Rush',
    label: 'Adrenalina 5',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', value: 5, skillLv: 5, isUse: true, bonus: { hit: 20, skillAspd: 5 } },
      { label: 'No', value: 0, isUse: false },
    ],
  },
  {
    name: 'Power Thrust',
    label: 'Força Violenta 5',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', value: 5, skillLv: 5, isUse: true, bonus: { flatDmg: 15 } },
      { label: 'No', value: 0, isUse: false },
    ],
  },
  {
    label: 'Manejo Perfeito 5',
    inputType: 'selectButton',
    name: 'Weapon Perfection',
    dropdown: [
      { label: 'Yes', value: 5, skillLv: 5, isUse: true, bonus: { ignore_size_penalty: 1 } },
      { label: 'No', value: 0, isUse: false },
    ],
  },
  {
    name: 'Fairy Soul',
    label: 'Espírito da Fada',
    icon: 2599,
    exclusiveGroup: 'soul',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { matk: 50, vct: 10 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Shadow Soul',
    label: 'Espírito das Sombras',
    icon: 2597,
    exclusiveGroup: 'soul',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { cri: 20, aspd: 3 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Falcon Soul',
    label: 'Espírito do Falcão',
    icon: 2598,
    exclusiveGroup: 'soul',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { atk: 50, hit: 15 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    // Defensive soul (DEF/MDEF, unbreakable equipment) — no offensive effect to model.
    name: 'Golem Soul',
    label: 'Espírito do Golem',
    icon: 2596,
    exclusiveGroup: 'soul',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: {} },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: "Odin's Power",
    label: 'Poder de Odin',
    icon: 2537,
    inputType: 'dropdown',
    dropdown: [
      { label: '-', isUse: false, value: 0 },
      { label: 'Lv 1', isUse: true, value: 1, bonus: { atk: 70, matk: 70, def: -20, mdef: -20 } },
      { label: 'Lv 2', isUse: true, value: 2, bonus: { atk: 100, matk: 100, def: -40, mdef: -40 } },
    ],
  },
  {
    name: 'Comet Amp',
    label: 'Cometa',
    icon: 2213,
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { comet: 50 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    label: 'Impacto Explosivo',
    name: 'Magnum Break',
    inputType: 'dropdown',
    dropdown: [
      { label: '-', value: 0, isUse: false },
      { label: 'Ativo', value: 1, isUse: true, bonus: { magnumBreakPsedoBonus: 1 } },
      { label: 'Limpar EDP', value: 2, isUse: true, bonus: { magnumBreakClearEDP: 1 } },
    ],
  },
  {
    label: 'Chuva de Mariscos',
    name: 'Bunch of Shrimp',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { atkPercent: 10, matkPercent: 10 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Moonlight Serenade',
    label: 'Serenata ao Luar',
    inputType: 'dropdown',
    dropdown: [
      { label: '-', isUse: false, value: 0 },
      { label: 'Job 30', value: 13, isUse: true, bonus: { matk: 46 } },
      { label: 'Job 40', value: 14, isUse: true, bonus: { matk: 48 } },
      { label: 'Job 50', value: 15, isUse: true, bonus: { matk: 50 } },
      { label: 'Job 60', value: 16, isUse: true, bonus: { matk: 52 } },
      { label: 'Job 70', value: 17, isUse: true, bonus: { matk: 54 } },
    ],
  },
  {
    name: 'Striking',
    label: 'Encanto de Órion',
    inputType: 'selectButton',
    isEquipAtk: true,
    dropdown: [
      { label: 'Yes', isUse: true, value: 20, bonus: { atk: 100, perfectHit: 70 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Raid',
    label: 'Ataque Surpresa',
    icon: 214, // RG_RAID
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { raid: 1 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  DarkClawFn(),
  {
    name: 'Debuff_Spore Explosion',
    label: 'Esporo Explosivo',
    icon: 2481,
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { sporeExplosion: 10 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  ShieldSpellFn(),
  BragisPoemFn(),
  SwingDanceFn(),
  {
    name: 'Mystical Amplification',
    label: 'Ampl. Mística 10',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 1, bonus: { mysticAmp: 50 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Spell Enchanting',
    label: 'Enfeitiçar 5',
    inputType: 'selectButton',
    dropdown: [
      { label: 'Yes', isUse: true, value: 5, bonus: { sMatk: 5 * 4 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'March of Prontera',
    label: 'Marcha de Prontera',
    icon: 5364,
    inputType: 'dropdown',
    dropdown: [
      { label: '-', isUse: false, value: 0 },
      { label: '+ 15', isUse: true, value: 5, bonus: { pAtk: 15 } },
      { label: '+ 22', isUse: true, value: 6, bonus: { pAtk: 22 } },
    ],
  },
  {
    name: 'Serenade of Jawaii',
    label: 'Serenata de Jawaii',
    icon: 5362,
    inputType: 'dropdown',
    dropdown: [
      { label: '-', isUse: false, value: 0 },
      { label: '+ 15', isUse: true, value: 5, bonus: { sMatk: 15 } },
      { label: '+ 22', isUse: true, value: 6, bonus: { sMatk: 22 } },
    ],
  },

  {
    name: 'Rhapsody of Mineworker',
    label: 'Rapsódia do Minerador',
    icon: 5360,
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      { label: 'Yes', isUse: true, value: 10, bonus: { monster_res: -100 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: 'Geffenia Nocturne',
    label: 'Recital de Geffenia',
    icon: 5358,
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      { label: 'Yes', isUse: true, value: 10, bonus: { monster_mres: -100 } },
      { label: 'No', isUse: false, value: 0 },
    ],
  },
  {
    name: '_Meister_Quake',
    label: 'Avanço Sísmico',
    icon: 5296,
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      { label: 'Yes', value: 10, isUse: true, bonus: { quake: 50 } },
      { label: 'No', value: 0, isUse: false },
    ],
  },
  {
    name: 'Oleum Sanctum',
    label: 'Oleum Sanctum 5',
    inputType: 'selectButton',
    isDebuff: true,
    dropdown: [
      // { label: 'Lv 1', value: 1, isUse: true, bonus: { oleumSanctum: 1 * 3 } },
      // { label: 'Lv 2', value: 2, isUse: true, bonus: { oleumSanctum: 2 * 3 } },
      // { label: 'Lv 3', value: 3, isUse: true, bonus: { oleumSanctum: 3 * 3 } },
      // { label: 'Lv 4', value: 4, isUse: true, bonus: { oleumSanctum: 4 * 3 } },
      { label: 'Yes', value: 5, isUse: true, bonus: { oleumSanctum: 5 * 3 } },
      { label: 'No', value: 0, isUse: false },
    ],
  },
  // {
  //   name: 'Climax',
  //   label: 'Climax',
  //   inputType: 'dropdown',
  //   dropdown: [
  //     { label: '-', value: 0, isUse: false },
  //     { label: 'Lv 1', value: 1, isUse: true, bonus:{def: 300, mdef: 100, m_my_element_water: 30} },
  //     { label: 'Lv 2', value: 2, isUse: true },
  //     { label: 'Lv 3', value: 3, isUse: true },
  //     { label: 'Lv 4', value: 4, isUse: true },
  //     { label: 'Lv 5', value: 5, isUse: true },
  //   ],
  // },
];

// Buffs first, monster debuffs last (stable within each group).
export const JobBuffs: ActiveSkillModel[] = [
  ...JobBuffsList.filter((b) => !b.isDebuff),
  ...JobBuffsList.filter((b) => b.isDebuff),
];
