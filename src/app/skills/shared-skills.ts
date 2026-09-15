import { ElementType } from '../constants/element-type.const';
import type { WeaponTypeName } from '../constants/weapon-type-mapper';
import type { ActiveSkillModel, AtkSkillModel } from '../jobs/_character-base.abstract';

/**
 * Standalone skill definitions shared by more than one job (Phase 3 of the Skill
 * Catalog work). Formulas are pure — they read other skills' state from the
 * formula input's `skills` context instead of a `this.isSkillActive` call — so the
 * same definition can be imported by every job that has the skill.
 */

/**
 * "Chuva de Meteoros" — shared by HighWizard (so the Bruxo and, through inheritance, the
 * Arcano) and SuperNovice. 125% of ATQM per meteor, and the client's "Golpes" column is
 * how many land on one target: 1,1,2,2,3,3,4,4,5,5 = ceil(nível / 2). The cast and delay
 * numbers are the client's own row (skills.json id 83): 1,5 s fixed, 6,3 s variable, 1 s
 * pós-conjuração, recarga 2,5 s + 0,5 s per level — skill-delay.spec.ts holds them.
 *
 * One definition rather than two: until 13/09/2026 HighWizard carried an `isDevMode`
 * placeholder — hidden from the Bruxo's list, 125 flat with no hit count and the
 * [V2]-era 6,72 / 5 / 7 s timings — while the Superaprendiz copy was already this
 * (tracker simulador-chuva-de-meteoros-do-bruxo-e-um-placeholder-escondido).
 */
export const METEOR_STORM: AtkSkillModel = {
  name: 'Meteor Storm',
  label: 'Meteor Storm Lv10',
  value: 'Meteor Storm==10',
  levelList: Array.from({ length: 10 }, (_, i) => ({ label: `Meteor Storm Nv${i + 1}`, value: `Meteor Storm==${i + 1}` })),
  acd: 1,
  fct: 1.5,
  vct: 6.3,
  cd: (lv) => 2 + lv * 0.5,
  isMatk: true,
  totalHit: ({ skillLevel }) => Math.ceil(skillLevel / 2),
  element: ElementType.Fire,
  formula: () => 125,
};

/** `levelList` entries for every level of a skill, in the picker's "Nv" form. */
const allLevels = (name: string, maxLevel: number) =>
  Array.from({ length: maxLevel }, (_, i) => ({ label: `${name} Nv${i + 1}`, value: `${name}==${i + 1}` }));

// --- The Bruxo column ---
//
// Shared by HighWizard (the Bruxo, and through inheritance the Arcano and the Magus) and
// SuperNovice: bROWiki's Superaprendizes tree lists the whole Bruxo column under
// "Expansão". Coluna de Pedra and Fúria da Terra are also Sábio skills — their client
// text carries a "Pré requisitos (Sábios)" line — so Scholar imports those two as well.
// Cast and delay numbers are the client's own rows (skills.json); skill-delay.spec.ts
// holds every class's copy to them. Tracker card
// simulador-superaprendiz-faltam-sete-habilidades-da-linha-dos-bruxos.

/**
 * "Trovão de Júpiter" — "causando 100% de dano mágico da propriedade Vento" per shock, and
 * the client's "Choques" column is 3 at Nv1 rising by one per level.
 */
export const JUPITEL_THUNDER: AtkSkillModel = {
  name: 'Jupitel Thunder',
  label: 'Jupitel Thunder Lv10',
  value: 'Jupitel Thunder==10',
  levelList: allLevels('Jupitel Thunder', 10),
  acd: 0,
  fct: 0.5,
  vct: (lv) => 1.8 + lv * 0.2,
  cd: 0,
  isMatk: true,
  totalHit: ({ skillLevel }) => skillLevel + 2,
  element: ElementType.Wind,
  formula: () => 100,
};

/**
 * "Ira de Thor" — 500% at Nv1 rising by 100 per level (client table). Each trovão "atinge
 * 10 vezes um mesmo alvo", which the damage window shows as 20 readings.
 */
export const LORD_OF_VERMILION: AtkSkillModel = {
  name: 'Lord of Vermilion',
  label: 'Lord of Vermilion Lv10',
  value: 'Lord of Vermilion==10',
  levelList: allLevels('Lord of Vermilion', 10),
  acd: 1,
  fct: 1.5,
  vct: (lv) => 6.5 - lv * 0.2,
  cd: 5,
  isMatk: true,
  hit: 20,
  element: ElementType.Wind,
  formula: ({ skillLevel }) => 400 + skillLevel * 100,
};

/**
 * "Nevasca" — 120% "por neve" at Nv1 rising by 50 per level (client table). The client
 * does not say how many fall; bROWiki's Nevasca page carries the cap — "O ATQM causado é
 * contado por cada bola de neve, num máximo de 10".
 */
export const STORM_GUST: AtkSkillModel = {
  name: 'Storm Gust',
  label: 'Storm Gust Lv10',
  value: 'Storm Gust==10',
  levelList: allLevels('Storm Gust', 10),
  acd: 1,
  fct: 1.5,
  vct: (lv) => 4.3 + lv * 0.2,
  cd: 6,
  isMatk: true,
  totalHit: 10,
  element: ElementType.Water,
  formula: ({ skillLevel }) => 70 + skillLevel * 50,
};

/**
 * "Coluna de Pedra" — "200% de dano mágico de propriedade Terra para cada espeto", one
 * espeto per level.
 */
export const EARTH_SPIKE: AtkSkillModel = {
  name: 'Earth Spike',
  label: 'Earth Spike Lv5',
  value: 'Earth Spike==5',
  levelList: allLevels('Earth Spike', 5),
  acd: 1.4,
  fct: (lv) => 0.2 + lv * 0.2,
  vct: (lv) => 0.2 + lv * 0.6,
  cd: 0,
  isMatk: true,
  totalHit: ({ skillLevel }) => skillLevel,
  element: ElementType.Earth,
  formula: () => 200,
};

/**
 * "Fúria da Terra" — the client's ATQM column is the total, 125% × nível. bROWiki's page
 * splits it: "Cada espeto causa 125% do ATQM", one espeto per level.
 */
export const HEAVENS_DRIVE: AtkSkillModel = {
  name: "Heaven's Drive",
  label: "Heaven's Drive Lv5",
  value: "Heaven's Drive==5",
  levelList: allLevels("Heaven's Drive", 5),
  acd: 0.5,
  fct: 0.8,
  vct: (lv) => 0.9 + lv * 0.2,
  cd: 1,
  isMatk: true,
  totalHit: ({ skillLevel }) => skillLevel,
  element: ElementType.Earth,
  formula: () => 125,
};

/**
 * "Congelar" — the client prints the freeze chance and duration but no ratio; bROWiki's
 * Congelar page gives 110% at Nv1 rising by 10 per level, to 200% at Nv10.
 */
export const FROST_NOVA: AtkSkillModel = {
  name: 'Frost Nova',
  label: 'Frost Nova Lv10',
  value: 'Frost Nova==10',
  levelList: allLevels('Frost Nova', 10),
  acd: 0.2,
  // The client shortens the cast every second level: 0,16 s fixed at Nv1-2, 0,144 at Nv3-4…
  fct: (lv) => 0.16 - Math.floor((lv - 1) / 2) * 0.016,
  vct: (lv) => 0.64 - Math.floor((lv - 1) / 2) * 0.064,
  cd: 0,
  isMatk: true,
  element: ElementType.Water,
  formula: ({ skillLevel }) => 100 + skillLevel * 10,
};

/**
 * "Coluna de Fogo" — the client lists the "Chamas" (3 at Nv1, one more per level) but no
 * ratio. bROWiki's Coluna de Fogo page: "ATQM (por chama) = 50 + (ATQM ÷ 5)", and each
 * chama "ignora a DEFM". So 20% of MATK per chama, both halves of MDEF skipped, and the
 * flat 50 added to every chama.
 */
export const FIRE_PILLAR: AtkSkillModel = {
  name: 'Fire Pillar',
  label: 'Fire Pillar Lv10',
  value: 'Fire Pillar==10',
  levelList: allLevels('Fire Pillar', 10),
  acd: 1,
  fct: (lv) => 0.528 - lv * 0.048,
  vct: (lv) => 2.112 - lv * 0.192,
  cd: 0,
  isMatk: true,
  isIgnoreDef: true,
  isIgnoreSDef: true,
  totalHit: ({ skillLevel }) => skillLevel + 2,
  element: ElementType.Fire,
  formula: () => 20,
  finalDmgFormula: ({ damage }) => damage + 50,
};

/**
 * "Supernova" — 120% at Nv1 rising by 20 per level (client table). In game it only fires
 * with Chama Reveladora active; it is offered here as if it were.
 */
export const SIGHTRASHER: AtkSkillModel = {
  name: 'Sightrasher',
  label: 'Sightrasher Lv10',
  value: 'Sightrasher==10',
  levelList: allLevels('Sightrasher', 10),
  acd: 2,
  fct: 0.08,
  vct: 0.32,
  cd: 0,
  isMatk: true,
  element: ElementType.Fire,
  formula: ({ skillLevel }) => 100 + skillLevel * 20,
};

/**
 * "Esfera d'Água" — 130% per esfera at Nv1 rising by 30 per level (client table). How many
 * esferas fly depends on the water around the caster; bROWiki's page gives the full count
 * per level — 1 on 1x1 at Nv1, 9 on 3x3 at Nv2-3, 25 on 5x5 at Nv4-5 — and that full
 * count is what is offered here, as if the caster stood on enough water.
 */
export const WATER_BALL: AtkSkillModel = {
  name: 'Water Ball',
  label: 'Water Ball Lv5',
  value: 'Water Ball==5',
  levelList: allLevels('Water Ball', 5),
  acd: 0,
  fct: (lv) => lv * 0.16,
  vct: (lv) => lv * 0.64,
  cd: 0,
  isMatk: true,
  totalHit: ({ skillLevel }) => [1, 9, 9, 25, 25][skillLevel - 1],
  element: ElementType.Water,
  formula: ({ skillLevel }) => 100 + skillLevel * 30,
};

/** Arrow Storm — shared by Ranger and ShadowChaser (the latter via Reproduce). */
export const ARROW_STORM: AtkSkillModel = {
  name: 'Arrow Storm',
  label: 'Arrow Storm Lv10',
  value: 'Arrow Storm==10',
  acd: 0,
  fct: 0.3,
  vct: 2,
  cd: 3.2,
  hit: 3,
  formula: ({ model, skillLevel, skills }) => {
    const fearBreezeBonus = skills.isActive('Fear Breeze') ? 70 : 0;
    return (200 + (180 + fearBreezeBonus) * skillLevel) * (model.level / 100);
  },
};

// --- Maestro / Wanderer (Minstrel + Wanderer share these identically) ---

export const ARROW_VULCAN: AtkSkillModel = {
  name: 'Arrow Vulcan',
  label: 'Arrow Vulcan Lv10',
  value: 'Arrow Vulcan==10',
  acd: 0.5,
  fct: 0.5,
  vct: 1.5,
  cd: 1.5,
  hit: 9,
  formula: ({ skillLevel, model }) => (500 + skillLevel * 100) * (model.level / 100),
};

export const METALIC_SOUND: AtkSkillModel = {
  name: 'Metalic Sound',
  label: 'Metalic Sound Lv10',
  value: 'Metalic Sound==10',
  acd: 0.5,
  fct: 0,
  vct: 4,
  cd: 2.5,
  hit: 2,
  isMatk: true,
  element: ElementType.Neutral,
  formula: ({ skillLevel, model, skills }) => {
    const lessonLv = skills.learnedLevel('Lesson');
    return (skillLevel * 120 + lessonLv * 60) * (model.level / 100);
  },
  finalDmgFormula: (input) => input.damage * 2,
};

export const SEVERE_RAINSTORM: AtkSkillModel = {
  name: 'Severe Rainstorm',
  label: 'Severe Rainstorm',
  value: 'Severe Rainstorm==5',
  values: [
    '[Improved] Severe Rainstorm==1',
    '[Improved] Severe Rainstorm==2',
    '[Improved] Severe Rainstorm==3',
    '[Improved] Severe Rainstorm==4',
    '[Improved] Severe Rainstorm==5',
  ],
  acd: 1,
  fct: 0.5,
  vct: (lv) => 1 + lv * 0.5,
  cd: (lv) => 4.5 + lv * 0.5,
  totalHit: 12,
  levelList: [
    { label: 'Temporal de Flechas Nv1', value: 'Severe Rainstorm==1' },
    { label: 'Temporal de Flechas Nv2', value: 'Severe Rainstorm==2' },
    { label: 'Temporal de Flechas Nv3', value: 'Severe Rainstorm==3' },
    { label: 'Temporal de Flechas Nv4', value: 'Severe Rainstorm==4' },
    { label: 'Temporal de Flechas Nv5', value: 'Severe Rainstorm==5' },
  ],
  formula: ({ weapon, status, skillLevel, model }) => {
    const { totalDex, totalAgi } = status;
    const weaType = weapon.data.typeName;
    const weaMultiMap: Partial<Record<WeaponTypeName, number>> = { bow: 100, instrument: 120, whip: 120 };
    const extra = weaMultiMap[weaType] || 0;
    return ((totalDex + totalAgi) / 2 + skillLevel * extra) * (model.level / 100);
  },
};

export const REVERBERATION: AtkSkillModel = {
  name: 'Reverberation',
  label: 'Reverberation Lv5',
  value: 'Reverberation==5',
  values: ['[Improved] Reverberation==5'],
  acd: 0.5,
  fct: 0.5,
  vct: 1,
  cd: 0.15,
  isMatk: true,
  formula: ({ skillLevel, model }) => (700 + skillLevel * 300) * (model.level / 100),
};

// --- Oboro / Kagerou (Ninja) — Cross Slash + the Cross Wound debuff toggle it reads ---

export const CROSS_WOUND: ActiveSkillModel = {
  label: 'Ferida Cruzada',
  name: 'Cross Wound',
  icon: 3004, // KO_JYUMONJIKIRI (Impacto Cruzado) — the skill that inflicts the debuff
  isDebuff: true,
  inputType: 'selectButton',
  dropdown: [
    { label: 'Sim', value: 1, isUse: true },
    { label: 'Não', value: 0, isUse: false },
  ],
};

export const CROSS_SLASH: AtkSkillModel = {
  label: 'Cross Slash Lv10',
  name: 'Cross Slash',
  value: 'Cross Slash==10',
  acd: 0,
  fct: 0,
  vct: 0,
  cd: 3.1,
  hit: 2,
  formula: ({ model, skillLevel, skills }) => {
    const bonus = skills.isActive('Cross Wound') ? model.level * skillLevel : 0;
    return skillLevel * 200 * (model.level / 100) + bonus;
  },
};
