import { ElementType } from '../constants/element-type.const';
import type { WeaponTypeName } from '../constants/weapon-type-mapper';
import type { ActiveSkillModel, AtkSkillModel } from '../jobs/_character-base.abstract';

/**
 * Standalone skill definitions shared by more than one job (Phase 3 of the Skill
 * Catalog work). Formulas are pure — they read other skills' state from the
 * formula input's `skills` context instead of a `this.isSkillActive` call — so the
 * same definition can be imported by every job that has the skill.
 */

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
    { label: 'Temporal de Flechas Lv1', value: 'Severe Rainstorm==1' },
    { label: 'Temporal de Flechas Lv2', value: 'Severe Rainstorm==2' },
    { label: 'Temporal de Flechas Lv3', value: 'Severe Rainstorm==3' },
    { label: 'Temporal de Flechas Lv4', value: 'Severe Rainstorm==4' },
    { label: 'Temporal de Flechas Lv5', value: 'Severe Rainstorm==5' },
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
  vct: 1.5,
  cd: 0,
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
