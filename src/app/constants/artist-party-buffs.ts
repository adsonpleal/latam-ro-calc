import { ActiveSkillModel, SkillModel } from '../jobs/_character-base.abstract';
import { SKILL_NAME } from './skill-name';

// Party effects from the Bard/Dancer line. Level tables and formulas are from the
// corresponding https://browiki.org/wiki/<Portuguese_skill_name> pages.
const levels = (count: number, bonus: (level: number) => Record<string, number>): SkillModel[] => [
  { label: '-', value: 0, isUse: false },
  ...Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    return { label: `Nv ${level}`, value: level, skillLv: level, isUse: true, bonus: bonus(level) };
  }),
];

const song = (name: SKILL_NAME, label: string, icon: number, count: number,
  bonus: (level: number) => Record<string, number>, exclusiveGroup?: string): ActiveSkillModel => ({
  name, label, icon, inputType: 'dropdown', dropdown: levels(count, bonus), exclusiveGroup,
});

// The level tables for these skills omit the caster's Domínio Musical (and, for
// Balder, Job level). Offer the table value and a clearly named caster profile.
const withMastery = (count: number, bonus: (level: number, mastery: number, job: number) => Record<string, number>,
  jobLevel?: number): SkillModel[] => [
  { label: '-', value: 0, isUse: false },
  ...Array.from({ length: count }, (_, index) => {
    const level = index + 1;
    return [
      { label: `Nv ${level} · Base`, value: level, skillLv: level, isUse: true, bonus: bonus(level, 0, 0) },
      { label: `Nv ${level} · Domínio 10${jobLevel ? ` · Job ${jobLevel}` : ''}`, value: 100 + level, skillLv: level, isUse: true,
        bonus: bonus(level, 10, jobLevel ?? 0) },
    ];
  }).flat(),
];

export const ArtistPartyBuffs: ActiveSkillModel[] = [
  // Bard/Dancer songs and duets.
  song('Whistle', 'Assovio', 319, 10, (lv) => ({ flee: lv === 10 ? 40 : 18 + 2 * lv, perfectDodge: Math.ceil(lv / 2) }), 'bard_song'),
  song('Assassin Cross of Sunset', 'Crepúsculo Sangrento', 320, 10,
    (lv) => ({ aspdPercent: lv === 10 ? 20 : 2 * lv - 1 }), 'bard_song'),
  song('Apple of Idun', 'Maçãs de Idun', 322, 10,
    (lv) => ({ hpPercent: lv === 10 ? 20 : 9 + lv, healReceived: 2 * lv }), 'bard_song'),
  song('Humming', 'Sibilo', 327, 10, (lv) => ({ hit: 4 * lv }), 'dancer_dance'),
  song("Fortune's Kiss", 'Beijo da Sorte', 329, 10, (lv) => ({ cri: lv, criDmg: 2 * lv }), 'dancer_dance'),
  song('Service for You', 'Dança Cigana', 330, 10,
    (lv) => ({ spPercent: lv === 10 ? 20 : 9 + lv, spCostPercent: -(5 + lv) }), 'dancer_dance'),
  song('Drum on the Battlefield', 'Rufar dos Tambores', 309, 5,
    (lv) => ({ atk: 15 + 5 * lv, def: 15 * lv }), 'artist_duet'),
  {
    // Exactly one of these eleven outcomes is rolled for each party member.
    name: 'Ring of Nibelungen', label: 'Anel dos Nibelungos', icon: 310, inputType: 'dropdown', exclusiveGroup: 'artist_duet',
    dropdown: [
      { label: '-', value: 0, isUse: false },
      { label: 'Esquiva +50', value: 1, isUse: true, bonus: { flee: 50 } },
      { label: 'Precisão +50', value: 2, isUse: true, bonus: { hit: 50 } },
      { label: 'HP máx. +30%', value: 3, isUse: true, bonus: { hpPercent: 30 } },
      { label: 'SP máx. +30%', value: 4, isUse: true, bonus: { spPercent: 30 } },
      { label: 'Atributos +15', value: 5, isUse: true, bonus: { allStatus: 15 } },
      { label: 'Dano mágico +20%', value: 6, isUse: true, bonus: { matkPercent: 20 } },
      { label: 'Dano físico +20%', value: 7, isUse: true, bonus: { p_race_all: 20 } },
      { label: 'Vel.Atq +20%', value: 8, isUse: true, bonus: { aspdPercent: 20 } },
      { label: 'Regen. HP +100%', value: 9, isUse: true, bonus: { hpRecovRate: 100 } },
      { label: 'Regen. SP +100%', value: 10, isUse: true, bonus: { spRecovRate: 100 } },
      { label: 'Custo SP -30%', value: 11, isUse: true, bonus: { spCostPercent: -30 } },
    ],
  },
  song('Invulnerable Siegfried', 'Ode a Siegfried', 313, 5, (lv) => ({
    subele_fire: 3 * lv, subele_water: 3 * lv, subele_wind: 3 * lv, subele_earth: 3 * lv,
    statusResist: 5 * lv,
  }), 'artist_duet'),

  // Third classes.
  {
    name: 'Rush To Windmill', label: 'Sinfonia dos Ventos', icon: 2381, inputType: 'dropdown', exclusiveGroup: 'minstrel_song',
    dropdown: withMastery(5, (lv, mastery) => ({
      atk: [0, 7, 10, 13, 15, 20][lv] + mastery * (lv === 5 ? 2 : 1), movementSpeed: 25,
    })),
  },
  {
    name: 'Echo Song', label: 'Canção de Balder', icon: 2382, inputType: 'dropdown', exclusiveGroup: 'minstrel_song',
    dropdown: withMastery(5, (lv, mastery, job) => ({ defPercent: 6 * lv + mastery + Math.floor(job / 4) }), 70),
  },
  song('Symphony of Lover', 'Balada Sinfônica', 2351, 5,
    (lv) => ({ mdefPercent: 2 * lv, softMdefPercent: 2 * lv, subele_ghost: 3 * lv, subele_holy: 3 * lv }), 'wanderer_dance'),
  song("Frigg's Song", 'Canção de Frigga', 5007, 5,
    (lv) => ({ hpPercent: 5 * lv, hpRegenPerSecond: 80 + 20 * lv })),
  {
    name: "Lerad's Dew", label: 'Orvalho de Idun', icon: 2431, inputType: 'dropdown', exclusiveGroup: 'artist_chorus',
    dropdown: withMastery(5, (lv, mastery) => ({ hpPercent: 2 + 3 * lv + Math.floor(mastery / 3) })),
  },
  song('Dance With Wug', 'Dança com Lobos', 2428, 5, (lv) => ({
    range: lv, wugSkillRatio: 50 * lv, fctPercent: 20 + 10 * lv, aspdPercent: 5 * lv,
  }), 'artist_chorus'),
  {
    name: 'Infinite Humming', label: 'Murmúrio Perene', icon: 2434, inputType: 'dropdown', exclusiveGroup: 'artist_chorus',
    dropdown: withMastery(5, (lv, mastery) => ({ m_my_element_all: 4 * lv + Math.floor(mastery / 2) })),
  },

  // Fourth class: solo and Participação Especial values are distinct states.
  {
    name: 'Musical Interlude', label: 'Interlúdio', icon: 5361, inputType: 'dropdown',
    dropdown: [
      { label: '-', value: 0, isUse: false },
      ...[10, 15, 20, 25, 30].map((res, index) => ({ label: `Solo Nv ${index + 1}`, value: index + 1, skillLv: index + 1, isUse: true, bonus: { res } })),
      ...[15, 22, 30, 37, 45].map((res, index) => ({ label: `Dueto Nv ${index + 1}`, value: index + 6, skillLv: index + 1, isUse: true, bonus: { res } })),
    ],
  },
];
