import { AtkSkillModel, ClassIDEnum } from '../jobs';
import { ItemAutoCastRule } from '../models/item.model';
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
import { ITEM_AUTO_CASTS } from './auto-cast-item-data';

export type AutoCastKind = 'item' | 'passive' | 'configurable';
export type AutoCastSlotKey = 'autoSpell' | 'plagiarism' | 'reproduce';

export interface AutoCastSource {
  key: string;
  kind: AutoCastKind;
  skillId: number;
  skillLevel: number;
  chance: number;
  trigger: ItemAutoCastRule['trigger'];
  sourceItemId?: number;
  enablingSkillId?: number;
  sourceName: string;
  slot?: AutoCastSlotKey;
  skillData?: AtkSkillModel;
  chanceBreakdown?: { label: string; value: string }[];
  extraHitOutcomes?: ExtraHitOutcome[];
}

export interface ExtraHitOutcome {
  totalHits: number;
  chance: number;
}

export interface BlockedAutoCastSource {
  key: string;
  name: string;
  icon: number;
  reason: string;
}

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

export interface ConfigurableAutoCastSlot {
  key: AutoCastSlotKey;
  name: string;
  icon: number;
  level: number;
  options: { label: string; value: number; icon: number }[];
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

/** Verified subset. Pending item clauses deliberately do not enter this table. */
/** @deprecated Use ITEM_AUTO_CASTS. Kept for existing integrations during migration. */
export const VERIFIED_ITEM_AUTO_CASTS = ITEM_AUTO_CASTS;

const SHARED_SKILLS = [
  FROST_NOVA, METEOR_STORM, JUPITEL_THUNDER, STORM_GUST, EARTH_SPIKE, HEAVENS_DRIVE,
  FIRE_BOLT, COLD_BOLT, LIGHTNING_BOLT, CRIMSON_ROCK, FROST_MISTY, JACK_FROST, HELL_INFERNO, KILLING_CLOUD,
  SOUL_EXPANSION, EARTH_STRAIN, CHAIN_LIGHTNING, DIAMOND_DUST, JUDEX,
];
const SHARED_BY_ID = new Map(SHARED_SKILLS.map((skill) => [SKILL_ID_BY_NAME[skill.name], skill]));

const AUTO_SPELL_TIERS: Array<[number, string[]]> = [
  [1, ['Fire Bolt', 'Cold Bolt', 'Lightening Bolt']],
  [4, ['Soul Strike', 'Fire Ball']],
  [7, ['Frost Nova', 'Earth Spike']],
  [10, ['Thunder Storm', "Heaven's Drive"]],
];

const PLAGIARISM_MAGIC = new Set([
  'Fire Bolt', 'Cold Bolt', 'Lightening Bolt', 'Meteor Storm', 'Storm Gust',
  'Jupitel Thunder', 'Frost Nova', 'Earth Spike', "Heaven's Drive",
]);
const REPRODUCE_MAGIC = new Set([
  ...PLAGIARISM_MAGIC,
  'Comet', 'Crimson Rock', 'Jack Frost', 'Soul Expansion', 'Chain Lightning',
  'Earth Strain', 'Frost Misty', 'Hell Inferno', 'Drain Life', 'Psychic Wave',
]);

const clampRate = (value: number): number => Math.min(100, Math.max(0, Number(value) || 0));

/**
 * Expected additional arrows per basic attack. The table lists mutually exclusive
 * totals of 2/3/4/5 arrows; subtract the original arrow so it is never counted twice.
 */
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
  return fearBreezeOutcomes(level)
    .reduce((sum, outcome) => sum + outcome.chance * (outcome.totalHits - 1), 0);
}

export function fearBreezeTotalChance(level: number): number {
  return fearBreezeOutcomes(level).reduce((sum, outcome) => sum + outcome.chance * 100, 0);
}

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

function optionsFor(calc: Calculator, names: Set<string>): ConfigurableAutoCastSlot['options'] {
  const all = [...calc.atkSkills, ...SHARED_SKILLS];
  const seen = new Set<number>();
  return all
    .filter((skill) => skill.isMatk && names.has(skill.name))
    .map((skill) => ({ skill, id: SKILL_ID_BY_NAME[skill.name] }))
    .filter(({ id }) => !!id && !seen.has(id) && !!seen.add(id))
    .map(({ skill, id }) => ({ label: resolveSkillById(id)?.name ?? skill.label, value: id, icon: id }));
}

function configurableSlots(calc: Calculator): ConfigurableAutoCastSlot[] {
  const slots: ConfigurableAutoCastSlot[] = [];
  const autoSpellLevel = calc.skillState.learnedLevel('Auto Spell');
  if (autoSpellLevel > 0) {
    const allowed = new Set(AUTO_SPELL_TIERS.filter(([level]) => autoSpellLevel >= level).flatMap(([, names]) => names));
    slots.push({ key: 'autoSpell', name: 'Desejo Arcano', icon: 279, level: autoSpellLevel, options: optionsFor(calc, allowed) });
  }

  const shadowLevel = calc.skillState.activeLevel('Shadow Spell');
  const plagiarismLevel = calc.skillState.learnedLevel('Plagiarism');
  const reproduceLevel = calc.skillState.learnedLevel('Reproduce');
  if (shadowLevel > 0 && plagiarismLevel > 0) {
    slots.push({ key: 'plagiarism', name: 'Plágio', icon: 225, level: plagiarismLevel, options: optionsFor(calc, PLAGIARISM_MAGIC) });
  }
  if (shadowLevel > 0 && reproduceLevel > 0) {
    slots.push({ key: 'reproduce', name: 'Mimetismo', icon: 2285, level: reproduceLevel, options: optionsFor(calc, REPRODUCE_MAGIC) });
  }
  return slots;
}

const SHADOW_CHANCE = [0, 28, 26, 24, 22, 20, 18, 16, 14, 12, 15];
const SHADOW_CAST_LEVEL = [0, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7];

function selectedSources(calc: Calculator, model: MainModel, slots: ConfigurableAutoCastSlot[]): AutoCastSource[] {
  const selections = model.autoCastSelections ?? {};
  return slots.flatMap((slot): AutoCastSource[] => {
    const skillId = Number(selections[slot.key]);
    if (!skillId || !slot.options.some((option) => option.value === skillId)) return [];
    if (slot.key === 'autoSpell') {
      return [{
        key: `config-auto-spell-${skillId}`, kind: 'configurable', skillId,
        skillLevel: Math.ceil(slot.level / 2), chance: slot.level * 2,
        trigger: 'physical-hit', sourceName: slot.name, slot: slot.key,
        enablingSkillId: 279,
        chanceBreakdown: [
          { label: 'Desejo Arcano', value: `Nv. ${slot.level}` },
          { label: 'Chance', value: `2% × ${slot.level} = ${slot.level * 2}%` },
        ],
      }];
    }
    const shadowLevel = calc.skillState.activeLevel('Shadow Spell');
    return [{
      key: `config-${slot.key}-${skillId}`, kind: 'configurable', skillId,
      skillLevel: SHADOW_CAST_LEVEL[shadowLevel] ?? 0,
      chance: SHADOW_CHANCE[shadowLevel] ?? 0,
      trigger: 'physical-hit', sourceName: slot.name, slot: slot.key,
      enablingSkillId: slot.key === 'plagiarism' ? 225 : 2285,
      chanceBreakdown: [
        { label: 'Desejo das Sombras', value: `Nv. ${shadowLevel}` },
        { label: 'Chance nesse nível', value: `${SHADOW_CHANCE[shadowLevel] ?? 0}%` },
      ],
    }];
  });
}

function refineOfItem(model: MainModel, itemId: number): number {
  const fields = model as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(fields)) {
    if (value === itemId) return Number(fields[`${key}Refine`] ?? 0);
  }
  return 0;
}

function matchesAutoCastConditions(rule: ItemAutoCastRule, item: any, model: MainModel, summary: any, calc: Calculator): boolean {
  if (rule.trigger === 'melee-physical-hit' && summary?.weapon?.rangeType === 'range') return false;
  if (rule.trigger === 'ranged-physical-hit' && summary?.weapon?.rangeType !== 'range') return false;
  return (rule.conditions ?? []).every((condition) => {
    const selfRefine = condition.match(/^SELF_REFINE>=(\d+)$/);
    if (selfRefine) return refineOfItem(model, item.id) >= Number(selfRefine[1]);
    const equipped = condition.match(/^EQUIP_ID\[(\d+)]$/);
    if (equipped) return calc.equippedItems.some((entry) => entry.id === Number(equipped[1]));
    const totalRefine = condition.match(/^TOTAL_REFINE\[([\d,]+)]>=(\d+)$/);
    if (totalRefine) return totalRefine[1].split(',').reduce((sum, id) => sum + refineOfItem(model, Number(id)), 0) >= Number(totalRefine[2]);
    const ammo = condition.match(/^AMMO_ID\[(\d+)]$/);
    if (ammo) return Number((model as any).ammo) === Number(ammo[1]);
    const weaponType = condition.match(/^WEAPON_TYPE=(.+)$/);
    if (weaponType) return summary?.weapon?.typeName === weaponType[1];
    return false;
  });
}

function itemSources(calc: Calculator, model: MainModel, summary: any): AutoCastSource[] {
  const seen = new Set<number>();
  const sources: AutoCastSource[] = [];
  for (const item of calc.equippedItems) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    for (const rule of item.autoCasts ?? ITEM_AUTO_CASTS[item.id] ?? []) {
      if (rule.status !== 'verified-direct-damage') continue;
      if (!rule.skillId || !rule.skillLevel || !rule.chance) continue;
      if (!matchesAutoCastConditions(rule, item, model, summary, calc)) continue;
      const skillName = Object.entries(SKILL_ID_BY_NAME).find(([, id]) => id === rule.skillId)?.[0];
      const skillLevel = rule.skillLevelMode === 'highest-learned' && skillName
        ? Math.max(rule.skillLevel, calc.skillState.learnedLevel(skillName as any))
        : rule.skillLevel;
      sources.push({
        key: rule.key, kind: 'item', skillId: rule.skillId, skillLevel,
        chance: rule.chance, trigger: rule.trigger, sourceItemId: item.id, sourceName: item.name,
        chanceBreakdown: [{ label: `${rule.chance}% ${item.name}`, value: 'por ataque elegível' }],
      });
    }
  }
  return sources;
}

function passiveSources(calc: Calculator, model: MainModel, summary: any): { sources: AutoCastSource[]; blocked: BlockedAutoCastSource[] } {
  const sources: AutoCastSource[] = [];
  const blocked: BlockedAutoCastSource[] = [];
  const learned = (name: any) => calc.skillState.learnedLevel(name);
  const active = (name: any) => calc.skillState.isActive(name);
  const activeLevel = (name: any) => calc.skillState.activeLevel(name);
  const skill = (name: string) => calc.atkSkills.find((entry) => entry.name === name);
  const rangedBasic = summary?.weapon?.rangeType === 'range';

  const addBlocked = (key: string, name: string, icon: number, reasons: string[]) => {
    blocked.push({ key, name, icon, reason: reasons.join(' · ') });
  };

  const supportsShadowSpell = model.class === ClassIDEnum.ShadowChaser || model.class === ClassIDEnum.AbyssChaser;
  if (supportsShadowSpell && activeLevel('Shadow Spell') <= 0) {
    addBlocked('config-shadow-spell', 'Desejo das Sombras', 2286, ['Selecione o nível em Habilidades']);
  }

  const blitz = skill('Blitz Beat');
  if (blitz) {
    const level = learned('Blitz Beat');
    const reasons = [
      ...(!level ? ['Aprenda Ataque Aéreo'] : []),
      ...(!active('Falconry Mastery') ? ['Ative Adestrar Ave'] : []),
      ...(!rangedBasic ? ['Requer ataque básico à distância'] : []),
    ];
    if (reasons.length) addBlocked('passive-blitz-beat', 'Ataque Aéreo', 129, reasons);
    else {
      const automaticFlights = Math.min(5, Math.max(1, Math.ceil((model.jobLevel || 1) / 10)));
      sources.push({
        key: 'passive-blitz-beat', kind: 'passive', skillId: 129, skillLevel: level,
        chance: Math.floor(calc.status.totalLuk / 3), trigger: 'ranged-physical-hit',
        sourceName: 'Passiva de classe', skillData: { ...blitz, totalHit: automaticFlights },
        chanceBreakdown: [
          { label: 'SOR total', value: String(calc.status.totalLuk) },
          { label: 'Fórmula', value: `⌊SOR ÷ 3⌋ = ${Math.floor(calc.status.totalLuk / 3)}%` },
        ],
      });
    }
  }

  const wug = skill('Wug Strike');
  if (wug) {
    const level = learned('Wug Strike');
    const reasons = [
      ...(!level ? ['Aprenda Investida de Worg'] : []),
      ...(!active('Wug Mastery') ? ['Ative Adestrar Worg'] : []),
    ];
    if (reasons.length) addBlocked('passive-wug-strike', 'Investida de Worg', 2243, reasons);
    else sources.push({
      key: 'passive-wug-strike', kind: 'passive', skillId: 2243, skillLevel: level,
      chance: Math.floor(calc.status.totalLuk / 3), trigger: 'physical-attack',
      sourceName: 'Passiva de classe', skillData: wug,
      chanceBreakdown: [
        { label: 'SOR total', value: String(calc.status.totalLuk) },
        { label: 'Fórmula', value: `⌊SOR ÷ 3⌋ = ${Math.floor(calc.status.totalLuk / 3)}%` },
        { label: 'Regra', value: 'Pode ativar mesmo se o ataque errar' },
      ],
    });
  }

  const hawk = skill('Hawk Rush');
  if (hawk) {
    const level = learned('Hawk Rush');
    const reasons = [
      ...(!level ? ['Aprenda Mergulho Aéreo'] : []),
      ...(!active('Falconry Mastery') ? ['Ative Adestrar Ave'] : []),
      ...(summary?.weapon?.typeName !== 'bow' ? ['Requer Arco'] : []),
    ];
    if (reasons.length) addBlocked('passive-hawk-rush', 'Mergulho Aéreo', 5326, reasons);
    else {
      const con = calc.status.totalCon;
      const natureFriendly = learned('Nature Friendly');
      sources.push({
        key: 'passive-hawk-rush', kind: 'passive', skillId: 5326, skillLevel: level,
        chance: Math.floor(con / 3 + (con / 5) * (natureFriendly / 5)), trigger: 'ranged-physical-hit',
        sourceName: 'Passiva de classe', skillData: hawk,
        chanceBreakdown: [
          { label: 'CON total', value: String(con) },
          { label: 'Chance de Mergulho Aéreo', value: `CON ÷ 3 = ${(con / 3).toFixed(2).replace('.', ',')}%` },
          { label: `Amigo da Natureza Nv. ${natureFriendly}`, value: `CON ÷ 5 × ${natureFriendly}/5 = ${((con / 5) * (natureFriendly / 5)).toFixed(2).replace('.', ',')}%` },
          { label: 'Chance final', value: `${Math.floor(con / 3 + (con / 5) * (natureFriendly / 5))}%` },
        ],
      });
    }
  }

  // Disparo Selvagem is a selectable active level rather than a learned passive, but it
  // belongs in the same source list: when unset, its dashed row tells the player exactly
  // why no extra-arrow DPS is being counted.
  const supportsFearBreeze = calc.atkSkills.some((skill) => skill.name === 'Aimed Bolt');
  if (supportsFearBreeze) {
    const fearBreezeLevel = activeLevel('Fear Breeze');
    const reasons = [
      ...(fearBreezeLevel <= 0 ? ['Selecione o nível de Disparo Selvagem'] : []),
      ...(summary?.weapon?.typeName !== 'bow' ? ['Requer Arco'] : []),
    ];
    if (reasons.length) addBlocked('passive-fear-breeze', 'Disparo Selvagem', 2234, reasons);
  }

  return { sources, blocked };
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

/** The exact crit/accuracy-weighted basic-attack mean that feeds its DPS. */
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

/** The same weighted mean, expanded from one hit to the source skill's full activation. */
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
  // Keep the uncapped reading for the UI, exactly as Batalha does. Probability math
  // clamps it inside effectiveBasicHitRate, but the row must still explain surplus CRIT.
  const criticalRate = Math.max(0, Number(dmg.criRateToMonster ?? 0));
  const effectiveHitRate = effectiveBasicHitRate(criticalRate, normalHitRate);
  const eligibleAttacksPerSecond = attacksPerSecond * effectiveHitRate / 100;
  const baseBasicAttackDps = Number((hasSelectedEffects && dmg.effectedBasicDps) || dmg.basicDps || 0);
  const selectedFearBreezeLevel = calc.skillState.activeLevel('Fear Breeze');
  const fearBreezeLevel = summary?.weapon?.typeName === 'bow' ? selectedFearBreezeLevel : 0;
  const basicHitsPerAttack = 1;
  const basicHitsPerSecond = attacksPerSecond;
  const basicAttackDps = baseBasicAttackDps;
  const slots = configurableSlots(calc);
  const passive = passiveSources(calc, model, summary);
  const sourceDefs = [...selectedSources(calc, model, slots), ...passive.sources, ...itemSources(calc, model, summary)];
  const sources: AutoCastResult[] = [];

  for (const source of sourceDefs) {
    const skill = source.skillData ?? skillForId(calc, source.skillId);
    if (!skill) continue;
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
    const triggerRate = source.trigger === 'physical-attack' ? attacksPerSecond : eligibleAttacksPerSecond;
    const activationsPerSecond = triggerRate * source.chance / 100;
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


  const fearBreezeChance = fearBreezeTotalChance(fearBreezeLevel);
  const fearBreezeExtras = fearBreezeExtraHits(fearBreezeLevel);
  if (fearBreezeChance > 0 && fearBreezeExtras > 0) {
    const activationsPerSecond = eligibleAttacksPerSecond * fearBreezeChance / 100;
    const dps = baseBasicAttackDps * fearBreezeExtras;
    const expectedDamagePerActivation = activationsPerSecond > 0 ? dps / activationsPerSecond : 0;
    const conditionalExtraHits = fearBreezeExtras / (fearBreezeChance / 100);
    const damageRanges = basicAttackDamageRanges(dmg, criticalRate, conditionalExtraHits);
    sources.unshift({
      source: {
        key: 'passive-fear-breeze', kind: 'passive', skillId: 2234,
        skillLevel: fearBreezeLevel, chance: fearBreezeChance,
        trigger: 'ranged-physical-hit', sourceName: 'Passiva de classe',
        chanceBreakdown: [
          { label: '2 disparos', value: '12%' },
          ...(fearBreezeLevel >= 3 ? [{ label: '3 disparos', value: '9%' }] : []),
          ...(fearBreezeLevel >= 4 ? [{ label: '4 disparos', value: '6%' }] : []),
          ...(fearBreezeLevel >= 5 ? [{ label: '5 disparos', value: '3%' }] : []),
          { label: 'Chance total', value: `${fearBreezeChance}%` },
        ],
        extraHitOutcomes: fearBreezeOutcomes(fearBreezeLevel),
      },
      name: 'Disparo Selvagem', icon: 2234,
      activationsPerSecond,
      triggerAttacksPerSecond: eligibleAttacksPerSecond,
      expectedDamagePerActivation,
      damageRanges,
      dps,
      contributionPercent: 0,
      summary: dmg,
      canCrit: criticalRate > 0,
      criticalRate,
    });
  }

  const autoCastDps = sources.reduce((sum, source) => sum + source.dps, 0);
  const totalDps = basicAttackDps + autoCastDps;
  for (const source of sources) source.contributionPercent = totalDps > 0 ? source.dps / totalDps * 100 : 0;
  const hp = Number(summary?.monster?.hp ?? 0);
  return {
    attacksPerSecond, basicHitsPerAttack, basicHitsPerSecond, fearBreezeLevel,
    normalHitRate, criticalRate, effectiveHitRate, eligibleAttacksPerSecond,
    basicAttackDps, autoCastDps, totalDps,
    timeToKillSeconds: totalDps > 0 && hp > 0 ? hp / totalDps : null,
    sources, slots, blockedSources: passive.blocked,
  };
}
