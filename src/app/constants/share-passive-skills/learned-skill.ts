import type { PassiveSkillModel } from '../../jobs/_character-base.abstract';
import type { SKILL_NAME } from '../skill-name';

/** A learned level used by equipment or another skill, with no bonus of its own. */
export const learnedSkill = (name: SKILL_NAME, maxLevel: number): PassiveSkillModel => ({
  name, label: name, inputType: 'dropdown',
  dropdown: [
    { label: '-', value: 0, isUse: false },
    ...Array.from({ length: maxLevel }, (_, index) => ({
      label: `Nv ${index + 1}`, value: index + 1, isUse: true,
    })),
  ],
});
