import type { AtkSkillModel } from '../jobs/_character-base.abstract';
import type { SkillStateCtx } from './info-for-class.model';
import type { MainModel } from './main.model';

export type AutoCastTrigger = 'physical-attack' | 'physical-hit' | 'melee-physical-attack' | 'melee-physical-hit' | 'ranged-physical-hit' | 'magic-attack';
export type AutoCastKind = 'item' | 'passive' | 'configurable' | 'extra-hit';
export type AutoCastSlotKey = 'autoSpell' | 'plagiarism' | 'reproduce';

/** Reserved `script.autoCast` entry in item.json. */
export interface ItemAutoCastScript {
  skillId: number;
  /** Existing item-script expressions. Applicable entries resolve with max semantics. */
  skillLevel: string[];
  /** Existing item-script expressions. Applicable entries resolve with sum semantics. */
  chance: string[];
  trigger: AutoCastTrigger;
  skillLevelMode?: 'fixed' | 'highest-learned' | 'learned-only';
  /** Name of an item effect that must be selected in Efeitos before this proc can fire. */
  requiredEffect?: string;
}

/** A temporary item state the player can toggle in Efeitos for conditional procs. */
export interface ItemAutoCastEffectScript {
  name: string;
  label: string;
  chance: number;
  durationSeconds: number;
  requiredEquippedItemIds?: number[];
  minimumRefine?: number;
  chancePerRefine?: number;
  durationPerShieldRefineEvery?: number;
  bonusPerRefine?: Record<string, number>;
  trigger?: 'physical' | 'physical-or-magical';
  note?: string;
}

/** A physical client auto-cast that cannot yet be calculated. */
export interface ItemAutoCastPendingScript {
  skillName: string;
  skillId?: number;
  reason: string;
}

export interface ResolvedItemAutoCast {
  key: string;
  itemId: number;
  itemName: string;
  skillId: number;
  skillLevel: number;
  chance: number;
  trigger: AutoCastTrigger;
  requiredEffect?: string;
}

export interface ResolvedItemAutoCastPending {
  key: string;
  itemId: number;
  itemName: string;
  skillName: string;
  skillId?: number;
  reason: string;
}

export interface ExtraHitOutcome {
  totalHits: number;
  chance: number;
}

export function fearBreezeOutcomes(level: number): ExtraHitOutcome[] {
  const outcomes: Array<ExtraHitOutcome & { minLevel: number }> = [
    { minLevel: 1, chance: 0.12, totalHits: 2 },
    { minLevel: 3, chance: 0.09, totalHits: 3 },
    { minLevel: 4, chance: 0.06, totalHits: 4 },
    { minLevel: 5, chance: 0.03, totalHits: 5 },
  ];
  return outcomes.filter((outcome) => level >= outcome.minLevel).map(({ totalHits, chance }) => ({ totalHits, chance }));
}

export function fearBreezeExtraHits(level: number): number {
  return fearBreezeOutcomes(level).reduce((sum, outcome) => sum + outcome.chance * (outcome.totalHits - 1), 0);
}

export function fearBreezeTotalChance(level: number): number {
  return fearBreezeOutcomes(level).reduce((sum, outcome) => sum + outcome.chance * 100, 0);
}

export interface AutoCastSource {
  key: string;
  kind: AutoCastKind;
  skillId: number;
  skillLevel: number;
  chance: number;
  trigger: AutoCastTrigger;
  sourceItemId?: number;
  enablingSkillId?: number;
  sourceName: string;
  slot?: AutoCastSlotKey;
  skillData?: AtkSkillModel;
  chanceBreakdown?: { label: string; value: string }[];
  extraHitOutcomes?: ExtraHitOutcome[];
}

export interface BlockedAutoCastSource {
  key: string;
  name: string;
  icon: number;
  reason: string;
}

export interface ConfigurableAutoCastSlot {
  key: AutoCastSlotKey;
  name: string;
  icon: number;
  level: number;
  options: { label: string; value: number; icon: number }[];
}

export interface ClassAutoCastResolution {
  sources?: AutoCastSource[];
  slots?: ConfigurableAutoCastSlot[];
  blocked?: BlockedAutoCastSource[];
}

/** Everything a class-owned auto-cast rule may inspect without depending on Calculator. */
export interface ClassAutoCastContext {
  model: MainModel;
  summary: any;
  status: any;
  skillState: SkillStateCtx;
  skillById: (id: number) => AtkSkillModel | undefined;
  optionsFor: (ids: readonly number[]) => ConfigurableAutoCastSlot['options'];
}

export interface ClassAutoCastDefinition {
  key: string;
  order?: number;
  resolve: (context: ClassAutoCastContext) => ClassAutoCastResolution;
}
