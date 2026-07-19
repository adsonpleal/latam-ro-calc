import { StatusSummary } from './status-summary.model';
import { MainModel } from './main.model';
import { EquipmentSummaryModel } from './equipment-summary.model';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { ElementType } from '../constants/element-type.const';
import { Monster, Weapon } from '../domain';
import { SKILL_NAME } from '../constants/skill-name';

/** A skill referenced from a formula: either its name, or a skill definition/const
 *  that carries a `name` (lets formulas read other skills' state without `this`). */
export type SkillRef = SKILL_NAME | { name: SKILL_NAME };

/** Cross-skill state for damage formulas, replacing the `this.isSkillActive` /
 *  `this.activeSkillLv` / `this.learnLv` helpers as skills move out of the job
 *  classes into standalone definitions. */
export interface SkillStateCtx {
  isActive(skill: SkillRef): boolean;
  activeLevel(skill: SkillRef): number;
  learnedLevel(skill: SkillRef): number;
}

export interface InfoForClass {
  weapon: Weapon;
  ammoElement: ElementType;
  monster: Monster;
  model: Partial<MainModel>;
  status: StatusSummary;
  totalBonus: EquipmentSummaryModel;
  equipmentBonus: Partial<Record<ItemTypeEnum, EquipmentSummaryModel>>;
  skillName: SKILL_NAME;
  cometMultiplier: number;
  skills: SkillStateCtx;
}

export interface AdditionalBonusInput {
  weapon: Weapon;
  ammoElement: ElementType;
  monster: Monster;
  model: Partial<MainModel>;
  totalBonus: EquipmentSummaryModel;
  skillName: SKILL_NAME;
  /** Per-skill bonus map backing the bonus-breakdown modal, keyed by skill name.
   *  Only touch it via CharacterBase.clearSupersededBonusSource. */
  bonusSources?: Record<string, Record<string, any>>;
}
