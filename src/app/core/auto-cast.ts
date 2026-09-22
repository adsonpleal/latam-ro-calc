import { AtkSkillModel } from '../jobs';
import {
  AutoCastSource,
  BlockedAutoCastSource,
  ConfigurableAutoCastSlot,
  ExtraHitOutcome,
} from '../models/auto-cast.model';
import { MainModel } from '../models/main.model';
import { resolveSkillById, SKILL_ID_BY_NAME } from '../skills';
import {
  COLD_BOLT,
  CHAIN_LIGHTNING,
  CRIMSON_ROCK,
  DIAMOND_DUST,
  EARTH_SPIKE,
  EARTH_STRAIN,
  FIRE_BOLT,
  FROST_NOVA,
  FROST_MISTY,
  HELL_INFERNO,
  HEAVENS_DRIVE,
  JACK_FROST,
  JUDEX,
  JUPITEL_THUNDER,
  KILLING_CLOUD,
  LIGHTNING_BOLT,
  METEOR_STORM,
  SOUL_EXPANSION,
  STORM_GUST,
} from '../skills/shared-skills';
import { calcDmgDpsDetailed } from '../utils/calc-dmg-dps';
import { Calculator } from './calculator';

export type {
  AutoCastSource,
  BlockedAutoCastSource,
  ConfigurableAutoCastSlot,
  ExtraHitOutcome,
} from '../models/auto-cast.model';
export { fearBreezeExtraHits, fearBreezeOutcomes, fearBreezeTotalChance } from '../models/auto-cast.model';

export interface AutoCastDamageRange {
  kind: 'nocri' | 'cri' | 'flat';
  label: string;
  min: number;
  max: number;
}

export interface AutoCastResult {
  source: AutoCastSource;
  name: string;
  icon: number;
  activationsPerSecond: number;
  triggerAttacksPerSecond: number;
  expectedDamagePerActivation: number;
  damageRanges: AutoCastDamageRange[];
  dps: number;
  contributionPercent: number;
  summary: any;
  canCrit: boolean;
  criticalRate: number;
}

export interface AutoCastSimulation {
  attacksPerSecond: number;
  basicHitsPerAttack: number;
  basicHitsPerSecond: number;
  fearBreezeLevel: number;
  normalHitRate: number;
  criticalRate: number;
  effectiveHitRate: number;
  eligibleAttacksPerSecond: number;
  basicAttackDps: number;
  autoCastDps: number;
  totalDps: number;
  timeToKillSeconds: number | null;
  sources: AutoCastResult[];
  slots: ConfigurableAutoCastSlot[];
  blockedSources: BlockedAutoCastSource[];
}

const SHARED_SKILLS = [
  FROST_NOVA, METEOR_STORM, JUPITEL_THUNDER, STORM_GUST, EARTH_SPIKE, HEAVENS_DRIVE,
  FIRE_BOLT, COLD_BOLT, LIGHTNING_BOLT, CRIMSON_ROCK, FROST_MISTY, JACK_FROST, HELL_INFERNO, KILLING_CLOUD,
  SOUL_EXPANSION, EARTH_STRAIN, CHAIN_LIGHTNING, DIAMOND_DUST, JUDEX,
];
const SHARED_BY_ID = new Map(SHARED_SKILLS.map((skill) => [SKILL_ID_BY_NAME[skill.name], skill]));
const clampRate = (value: number): number => Math.min(100, Math.max(0, Number(value) || 0));

export function extraHitOutcomeRate(attacksPerSecond: number, outcomes: ExtraHitOutcome[]): number {
  return outcomes.reduce((sum, outcome) => sum + attacksPerSecond * outcome.chance * (outcome.totalHits - 1), 0);
}

export function effectiveBasicHitRate(criticalPercent: number, normalHitPercent: number): number {
  const critical = clampRate(criticalPercent) / 100;
  const normal = clampRate(normalHitPercent) / 100;
  return (critical + (1 - critical) * normal) * 100;
}

function skillForId(calc: Calculator, id: number): AtkSkillModel | undefined {
  return calc.atkSkills.find((skill) => SKILL_ID_BY_NAME[skill.name] === id) ?? SHARED_BY_ID.get(id);
}

function optionsFor(calc: Calculator, ids: readonly number[]): ConfigurableAutoCastSlot['options'] {
  const allowed = new Set(ids);
  const all = [...calc.atkSkills, ...SHARED_SKILLS];
  const seen = new Set<number>();
  return all
    .map((skill) => ({ skill, id: SKILL_ID_BY_NAME[skill.name] }))
    .filter(({ skill, id }) => !!id && allowed.has(id) && skill.isMatk && !seen.has(id) && !!seen.add(id))
    .map(({ skill, id }) => ({ label: resolveSkillById(id)?.name ?? skill.label, value: id, icon: id }));
}

function classSources(calc: Calculator, model: MainModel, summary: any): {
  sources: AutoCastSource[];
  slots: ConfigurableAutoCastSlot[];
  blocked: BlockedAutoCastSource[];
} {
  const sources: AutoCastSource[] = [];
  const slots: ConfigurableAutoCastSlot[] = [];
  const blocked: BlockedAutoCastSource[] = [];
  const context = {
    model,
    summary,
    status: calc.status,
    skillState: calc.skillState,
    skillById: (id: number) => skillForId(calc, id),
    optionsFor: (ids: readonly number[]) => optionsFor(calc, ids),
  };
  for (const definition of [...calc.autoCastDefinitions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
    const resolved = definition.resolve(context);
    sources.push(...(resolved.sources ?? []));
    slots.push(...(resolved.slots ?? []));
    blocked.push(...(resolved.blocked ?? []));
  }
  return { sources, slots, blocked };
}

function itemSources(calc: Calculator): AutoCastSource[] {
  return calc.resolvedItemAutoCasts.map((rule) => ({
    key: rule.key,
    kind: 'item',
    skillId: rule.skillId,
    skillLevel: rule.skillLevel,
    chance: rule.chance,
    trigger: rule.trigger,
    sourceItemId: rule.itemId,
    sourceName: rule.itemName,
    chanceBreakdown: [{ label: `${rule.chance}% ${rule.itemName}`, value: 'por ataque elegível' }],
  }));
}

function itemBlockedSources(calc: Calculator): BlockedAutoCastSource[] {
  return (calc.resolvedItemAutoCastPending ?? []).map((source) => ({
    key: source.key,
    name: source.skillName,
    icon: source.skillId ?? 0,
    reason: `${source.itemName}: ${source.reason}`,
  }));
}

function triggerMatches(source: AutoCastSource, summary: any): boolean {
  const ranged = summary?.weapon?.rangeType === 'range';
  if (source.trigger === 'melee-physical-hit') return !ranged;
  if (source.trigger === 'ranged-physical-hit') return ranged;
  return true;
}

function rangesOf(dmg: any): AutoCastDamageRange[] {
  const hits = Math.max(1, dmg.skillTotalHit || 1);
  if (dmg.skillCanCri && dmg.skillCriRateToMonster > 0 && dmg.skillCriRateToMonster < 100) {
    return [
      { kind: 'nocri', label: 'sem crít.', min: dmg.skillMinDamageNoCri * hits, max: dmg.skillMaxDamageNoCri * hits },
      { kind: 'cri', label: 'crít.', min: dmg.skillMinDamage * hits, max: dmg.skillMaxDamage * hits },
    ];
  }
  if (dmg.skillCanCri && dmg.skillCriRateToMonster >= 100) {
    return [{ kind: 'cri', label: 'crít.', min: dmg.skillMinDamage * hits, max: dmg.skillMaxDamage * hits }];
  }
  return [{ kind: 'flat', label: 'dano', min: dmg.skillMinDamage * hits, max: dmg.skillMaxDamage * hits }];
}

export function basicAttackDamageRanges(dmg: any, criticalRate: number, multiplier = 1): AutoCastDamageRange[] {
  if (criticalRate >= 100) {
    return [{
      kind: 'cri', label: 'crít.',
      min: (dmg.criMinDamage || dmg.criMaxDamage || 0) * multiplier,
      max: (dmg.criMaxDamage || 0) * multiplier,
    }];
  }

  const ranges: AutoCastDamageRange[] = [{
    kind: criticalRate > 0 ? 'nocri' : 'flat',
    label: criticalRate > 0 ? 'sem crít.' : 'dano',
    min: (dmg.basicMinDamage || 0) * multiplier,
    max: (dmg.basicMaxDamage || 0) * multiplier,
  }];
  if (criticalRate > 0) {
    ranges.push({
      kind: 'cri', label: 'crít.',
      min: (dmg.criMinDamage || dmg.criMaxDamage || 0) * multiplier,
      max: (dmg.criMaxDamage || 0) * multiplier,
    });
  }
  return ranges;
}

export interface BasicDpsBreakdown {
  min: number;
  max: number;
  avgBasicDamage: number;
  criDmg: number;
  criRate: number;
  accuracy: number;
  criPart: number;
  noCriPart: number;
  totalDamage: number;
  hitsPerSec: number;
}

export function basicDpsBreakdown(input: {
  min: number; max: number; criDmg: number; criRate: number; accuracy: number; hitsPerSec: number;
}): BasicDpsBreakdown {
  const detailed = calcDmgDpsDetailed({
    min: input.min,
    max: input.max,
    cri: input.criRate,
    criDmg: input.criDmg,
    hitsPerSec: input.hitsPerSec,
    accRate: input.accuracy,
  });
  return {
    min: input.min, max: input.max, criDmg: input.criDmg,
    avgBasicDamage: detailed.avgBasicDamage, criRate: detailed.limitedCriRate,
    accuracy: detailed.limitedAccuracy, criPart: detailed.criHit / 100,
    noCriPart: detailed.nonCriHit / 100, totalDamage: detailed.totalDamage,
    hitsPerSec: input.hitsPerSec,
  };
}

export interface AutoCastActivationBreakdown extends BasicDpsBreakdown {
  totalHit: number;
  expectedDamagePerActivation: number;
}

export function autoCastActivationBreakdown(input: {
  min: number; max: number; criDmg: number; criRate: number; accuracy: number; totalHit: number;
}): AutoCastActivationBreakdown {
  const perHit = basicDpsBreakdown({ ...input, hitsPerSec: 1 });
  const totalHit = Math.max(1, input.totalHit || 1);
  return { ...perHit, totalHit, expectedDamagePerActivation: perHit.totalDamage * totalHit };
}

export function buildAutoCastSimulation(input: {
  calc: Calculator;
  model: MainModel;
  summary: any;
  hasSelectedEffects: boolean;
}): AutoCastSimulation {
  const { calc, model, summary, hasSelectedEffects } = input;
  const dmg = summary?.dmg ?? {};
  const attacksPerSecond = Number(summary?.calc?.hitPerSecs ?? 0);
  const normalHitRate = clampRate(dmg.accuracy ?? summary?.calc?.hitRate ?? 0);
  const criticalRate = Math.max(0, Number(dmg.criRateToMonster ?? 0));
  const effectiveHitRate = effectiveBasicHitRate(criticalRate, normalHitRate);
  const eligibleAttacksPerSecond = attacksPerSecond * effectiveHitRate / 100;
  const basicAttackDps = Number((hasSelectedEffects && dmg.effectedBasicDps) || dmg.basicDps || 0);
  const classResult = classSources(calc, model, summary);
  const sourceDefs = [...classResult.sources, ...itemSources(calc)].filter((source) => triggerMatches(source, summary));
  const sources: AutoCastResult[] = [];

  for (const source of sourceDefs) {
    const triggerRate = source.trigger === 'physical-attack' ? attacksPerSecond : eligibleAttacksPerSecond;
    const activationsPerSecond = triggerRate * source.chance / 100;

    if (source.kind === 'extra-hit' && source.extraHitOutcomes?.length) {
      const extraHits = source.extraHitOutcomes.reduce((sum, outcome) => sum + outcome.chance * (outcome.totalHits - 1), 0);
      const dps = basicAttackDps * extraHits;
      const expectedDamagePerActivation = activationsPerSecond > 0 ? dps / activationsPerSecond : 0;
      const conditionalExtraHits = source.chance > 0 ? extraHits / (source.chance / 100) : 0;
      sources.unshift({
        source,
        name: resolveSkillById(source.skillId)?.name ?? source.sourceName,
        icon: source.skillId,
        activationsPerSecond,
        triggerAttacksPerSecond: triggerRate,
        expectedDamagePerActivation,
        damageRanges: basicAttackDamageRanges(dmg, criticalRate, conditionalExtraHits),
        dps,
        contributionPercent: 0,
        summary: dmg,
        canCrit: criticalRate > 0,
        criticalRate,
      });
      continue;
    }

    const skill = source.skillData ?? skillForId(calc, source.skillId);
    if (!skill) {
      classResult.blocked.push({
        key: source.key,
        name: resolveSkillById(source.skillId)?.name ?? source.sourceName,
        icon: source.skillId,
        reason: 'A fórmula dessa habilidade ainda não é suportada.',
      });
      continue;
    }
    const solved = calc.solveAutoCast(`${skill.name}==${source.skillLevel}`, skill);
    if (!solved.skillTotalHit || solved.requireTxt) continue;
    const perHit = calcDmgDpsDetailed({
      min: solved.skillDpsInputMin,
      max: solved.skillDpsInputMax,
      cri: solved.skillCriRateToMonster,
      criDmg: solved.skillDpsInputCriDmg,
      hitsPerSec: 1,
      accRate: solved.skillAccuracy,
    }).oneHitDps;
    const expectedDamagePerActivation = perHit * solved.skillTotalHit;
    const dps = activationsPerSecond * expectedDamagePerActivation;
    sources.push({
      source,
      name: resolveSkillById(source.skillId)?.name ?? skill.label,
      icon: source.skillId,
      activationsPerSecond,
      triggerAttacksPerSecond: triggerRate,
      expectedDamagePerActivation,
      damageRanges: rangesOf(solved),
      dps,
      contributionPercent: 0,
      summary: solved,
      canCrit: !!solved.skillCanCri,
      criticalRate: Number(solved.skillCriRateToMonster ?? 0),
    });
  }

  const autoCastDps = sources.reduce((sum, source) => sum + source.dps, 0);
  const totalDps = basicAttackDps + autoCastDps;
  for (const source of sources) source.contributionPercent = totalDps > 0 ? source.dps / totalDps * 100 : 0;
  const hp = Number(summary?.monster?.hp ?? 0);
  const extraHitSource = sourceDefs.find((source) => source.kind === 'extra-hit');
  return {
    attacksPerSecond,
    basicHitsPerAttack: 1,
    basicHitsPerSecond: attacksPerSecond,
    fearBreezeLevel: extraHitSource?.skillLevel ?? 0,
    normalHitRate,
    criticalRate,
    effectiveHitRate,
    eligibleAttacksPerSecond,
    basicAttackDps,
    autoCastDps,
    totalDps,
    timeToKillSeconds: totalDps > 0 && hp > 0 ? hp / totalDps : null,
    sources,
    slots: classResult.slots,
    blockedSources: [...classResult.blocked, ...itemBlockedSources(calc)],
  };
}
