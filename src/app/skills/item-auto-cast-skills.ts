import { ElementType } from '../constants/element-type.const';
import type { AtkSkillModel } from '../jobs/_character-base.abstract';

// Item skills must be usable even when the wearer's class has no entry in atkSkills.
const levels = (name: string, max: number) => Array.from({ length: max }, (_, i) => ({
  label: `${name} Nv${i + 1}`, value: `${name}==${i + 1}`,
}));
const skill = (
  name: AtkSkillModel['name'], max: number, element: ElementType,
  formula: AtkSkillModel['formula'], extra: Partial<AtkSkillModel> = {},
): AtkSkillModel => ({
  name, label: `${name} Lv${max}`, value: `${name}==${max}`,
  levelList: levels(name, max), acd: 0, fct: 0, vct: 0, cd: 0,
  element, formula, ...extra,
});

/** Client (LATAM) ratios take precedence over server and translated descriptions. */
export const ITEM_AUTO_CAST_SKILLS: AtkSkillModel[] = [
  skill('Tracking', 10, ElementType.Neutral, ({ skillLevel }) => 200 + 100 * skillLevel),
  skill('Lightning Jolt', 5, ElementType.Wind, ({ skillLevel }) => 160 + 40 * skillLevel, { isMatk: true }),
  skill('Bash', 10, ElementType.Neutral, ({ skillLevel }) => 100 + 30 * skillLevel, { isMelee: true }),
  skill('Magnum Break', 10, ElementType.Fire, ({ skillLevel }) => 100 + 20 * skillLevel, { isMelee: true }),
  skill('Napalm Beat', 10, ElementType.Ghost, ({ skillLevel }) => 70 + 10 * skillLevel, { isMatk: true }),
  skill('Fire Ball', 10, ElementType.Fire, ({ skillLevel }) => 140 + 20 * skillLevel, { isMatk: true }),
  skill('Thunderstorm', 10, ElementType.Wind, () => 100, {
    isMatk: true, totalHit: ({ skillLevel }) => skillLevel,
  }),
  skill('Double Strafe', 10, ElementType.Neutral, ({ skillLevel }) => 90 + 10 * skillLevel, {
    totalHit: 2,
  }),
  skill('Envenom', 10, ElementType.Poison, () => 100, {
    isMelee: true, finalDmgFormula: ({ damage, skillLevel }) => damage + 15 * skillLevel,
  }),
  skill('Pierce', 10, ElementType.Neutral, ({ skillLevel }) => 100 + 10 * skillLevel, {
    isMelee: true, totalHit: ({ monster }) => ({ s: 1, m: 2, l: 3 })[monster.data.size] ?? 1,
  }),
  skill('Turn Undead', 10, ElementType.Holy, () => 30, { isMatk: true }),
  skill('Sonic Blow', 10, ElementType.Neutral, ({ skillLevel }) => 200 + 100 * skillLevel, { isMelee: true }),
  skill('Intimidate', 5, ElementType.Neutral, ({ skillLevel }) => 100 + 30 * skillLevel, { isMelee: true }),
  // Grand Cross is hybrid: each half uses the client ATK/ATQM ratio. Its ground field hits three times.
  skill('Grand Cross', 10, ElementType.Holy, ({ skillLevel }) => (100 + 40 * skillLevel) / 2, {
    isMelee: true, totalHit: 3,
    part2: { label: 'ATQM', element: ElementType.Holy, isIncludeMain: true, hit: 1,
      isMatk: true, isMelee: false, formula: ({ skillLevel }) => (100 + 40 * skillLevel) / 2 },
  }),
  skill('Spread Shot', 10, ElementType.Neutral, ({ skillLevel }) => 200 + 30 * skillLevel),
  skill('Storm Blast', 1, ElementType.Neutral, ({ model, status, skills }) =>
    (skills.learnedLevel('Rune Mastery') + Math.floor(status.totalStr / 6)) * 100 * (model.level / 100)),
  skill('Dark Claw', 5, ElementType.Neutral, ({ skillLevel }) => 100 * skillLevel, { isMelee: true }),
  // The initial impact is weapon damage; the 5-second fixed-damage field is included by the autocast simulator.
  skill('Lava Flow', 5, ElementType.Neutral, ({ skillLevel }) => 450 + 50 * skillLevel, { isMelee: true }),
  skill('Flash Kick', 7, ElementType.Neutral, () => 100, { isMelee: true }),
  // rAthena NPC ratios; the LATAM item descriptions supply the proc levels and chances.
  skill('Pulse Strike', 5, ElementType.Neutral, ({ skillLevel }) => 100 * skillLevel, { isMelee: true }),
  skill('Vital Strike', 10, ElementType.Neutral, ({ skillLevel }) => 50 + 10 * skillLevel),
  skill("Hell's Judgement", 10, ElementType.Neutral, ({ skillLevel }) => 100 * skillLevel, { isMelee: true }),
  skill('Asura Strike', 5, ElementType.Neutral, ({ currentSp, maxSp }) => 800 + 10 * (currentSp ?? maxSp), {
    isMelee: true, isIgnoreDef: true, isHit100: true,
  }),
  skill('Occult Impaction', 5, ElementType.Neutral, ({ skillLevel }) => 100 * skillLevel, {
    isMelee: true, isIgnoreDef: true, isHit100: true,
  }),
  skill('Frost Diver', 10, ElementType.Water, ({ skillLevel }) => 100 + 10 * skillLevel, { isMatk: true }),
  // rAthena Earthquake uses weapon ATK despite being a magic-type skill. Level 1 is
  // 300% per wave, with three waves; treat the selected target as the only target.
  skill('Earthquake', 10, ElementType.Neutral,
    ({ skillLevel }) => 200 + 100 * skillLevel + 100 * Math.floor(skillLevel / 2) + (skillLevel > 4 ? 100 : 0),
    { totalHit: 3, isIgnoreDef: true, isIgnoreSDef: true }),
];
