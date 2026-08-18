// The crit rate a build actually rolls against the current target, and the arithmetic
// behind it. Pure (no engine state) so damage-calculator and the "Tx. Crítico" popover
// can share one definition — the same trick calcDmgDpsDetailed plays for the DPS steps.
//
// The engine used to spell this out inline in two places (the basic attack's
// `criRateToMonster` and the skill's `actualCri`), and the UI could only offer the
// equipment `cri` sources — the one term of five the reader could already guess. Every
// term is now named, in the order the engine applies it.

import { floor } from '../utils/floor';

/** What one row of the breakdown does to the running total. */
export type CritRateStepKind = 'add' | 'multiply' | 'subtract' | 'subtotal' | 'total' | 'note';

export interface CritRateStep {
  key: string;
  /** pt-BR, shown as-is. */
  label: string;
  /** Crit points for add/subtract/subtotal/total; the factor itself for multiply. */
  value: number;
  kind: CritRateStepKind;
  /** The arithmetic behind the number, when it is not simply the number. */
  detail?: string;
  /** `totalBonus` keys behind this row, so it can open the equipment-sources dialog. */
  keys?: string[];
}

export interface CritRateBreakdown {
  steps: CritRateStep[];
  /** The engine's own figure — what `criRateToMonster` / `actualCri` hold. */
  total: number;
  /**
   * What the damage math rolls with. calc-dmg-dps clamps the rate at 100, so a build past
   * the cap crits every use and the surplus buys nothing — worth saying rather than
   * printing "112%" and letting the reader budget around it.
   */
  effective: number;
  /** True when `total` was clamped, i.e. the build is over the cap. */
  isCapped: boolean;
}

/** The character's own crit, before anything about the skill or the target. Shared by both
 *  branches below. */
export interface CharacterCritInput {
  totalLuk: number;
  /** `totalBonus.cri` — every equipment, card and enchant source. */
  equipCri: number;
  isKatar: boolean;
}

export interface SkillCritRateInput extends CharacterCritInput {
  canCri: boolean;
  /** The skill always crits, whatever the rate works out to. */
  forceCri: boolean;
  /** `skillData.baseCri` — the skill's own flat crit, e.g. Tiro Preciso's +50. */
  skillCri: number;
  /** `skillData.baseCriPercentage` — the share of the character's crit the skill applies
   *  (1 = "the same as the user's", 0,5 = "half of it"). */
  skillCriPercentage: number;
  /** `floor(target LUK / 5)`. */
  criShield: number;
  targetLuk: number;
}

export interface BasicCritRateInput extends CharacterCritInput {
  /** `criRange`, which only the ranged BASIC attack receives. */
  rangedCri: number;
  /** `cri_race_*` + `cri_element_*` + `cri_size_*` against this target. */
  extraCri: number;
  criShield: number;
  targetLuk: number;
}

/** The engine's cap: past this every use crits and more rate buys nothing (calc-dmg-dps). */
export const CRIT_RATE_CAP = 100;

/** The "no rate at all" reading, for the zeroed skill summary the engine hands back when
 *  there is no skill selected. */
export const EMPTY_CRIT_RATE: CritRateBreakdown = { steps: [], total: 0, effective: 0, isCapped: false };

const fmtLuk = (luk: number) => `SOR ${luk}`;

/**
 * LUK and equipment, doubled for a katar.
 *
 * The 0,3 factor is the rate used *against a target*. The character sheet shows
 * `floor(totalLuk / 3)` instead — a hair different, and deliberately so; the recording
 * evidence for both is on getBaseCriRate in damage-calculator.ts.
 */
function characterCritSteps(input: CharacterCritInput): { value: number; steps: CritRateStep[] } {
  const { totalLuk, equipCri, isKatar } = input;
  const criFromLuk = floor(totalLuk * 0.3);
  const base = equipCri + criFromLuk;
  const value = isKatar ? base * 2 : base;

  const steps: CritRateStep[] = [
    { key: 'luk', label: 'CRIT por SOR', value: criFromLuk, kind: 'add', detail: `piso(${fmtLuk(totalLuk)} × 0,3)` },
    { key: 'equip', label: 'CRIT de equipamentos', value: equipCri, kind: 'add', keys: ['cri'] },
  ];
  if (isKatar) {
    steps.push({ key: 'katar', label: 'Katar', value: 2, kind: 'multiply', detail: 'katares dobram o CRIT do personagem' });
  }
  steps.push({ key: 'character', label: 'CRIT do personagem', value, kind: 'subtotal' });

  return { value, steps };
}

const shieldStep = (criShield: number, targetLuk: number): CritRateStep => ({
  key: 'shield',
  label: 'Escudo de crítico do alvo',
  value: -criShield,
  kind: 'subtract',
  detail: `piso(${fmtLuk(targetLuk)} do alvo ÷ 5)`,
});

const finish = (total: number, steps: CritRateStep[]): CritRateBreakdown => ({
  steps: [...steps, { key: 'total', label: 'Tx. Crítico', value: total, kind: 'total' }],
  total,
  effective: Math.min(total, CRIT_RATE_CAP),
  isCapped: total > CRIT_RATE_CAP,
});

/**
 * A skill's crit rate against the current target.
 *
 * Mirrors damage-calculator.ts exactly, katar branch included — and that branch is not a
 * rearrangement of the other one: it subtracts the target's shield *before* the skill's
 * percentage and floors there, so on a katar a half-crit skill halves the shield too. The
 * steps come out in the order the engine applies them, so the popover reads straight down.
 */
export function computeSkillCritRate(input: SkillCritRateInput): CritRateBreakdown {
  const { canCri, forceCri, skillCri, skillCriPercentage, criShield, targetLuk, isKatar } = input;

  if (forceCri) {
    return finish(CRIT_RATE_CAP, [{ key: 'force', label: 'A habilidade sempre acerta crítico', value: CRIT_RATE_CAP, kind: 'note' }]);
  }
  if (!canCri) {
    return finish(0, [{ key: 'cannot', label: 'Esta habilidade não acerta crítico', value: 0, kind: 'note' }]);
  }

  const character = characterCritSteps(input);
  const steps = [...character.steps];

  if (skillCri !== 0) {
    steps.push({ key: 'skillCri', label: 'CRIT fixo da habilidade', value: skillCri, kind: 'add' });
  }

  const pctStep: CritRateStep = {
    key: 'skillPct',
    label: 'Parcela aplicada pela habilidade',
    value: skillCriPercentage,
    kind: 'multiply',
    detail: `esta habilidade usa ${skillCriPercentage * 100}% do CRIT`,
  };

  let total: number;
  if (isKatar) {
    steps.push(shieldStep(criShield, targetLuk));
    if (skillCriPercentage !== 1) steps.push(pctStep);
    total = Math.max(0, floor(character.value + skillCri - criShield) * skillCriPercentage);
  } else {
    if (skillCriPercentage !== 1) steps.push(pctStep);
    steps.push(shieldStep(criShield, targetLuk));
    total = Math.max(0, floor((character.value + skillCri) * skillCriPercentage) - criShield);
  }

  return finish(floor(total), steps);
}

/**
 * The basic attack's crit rate against the current target.
 *
 * Two terms here that no skill receives: `criRange` ("CRIT à distância") and the
 * per-race/element/size crit. Their absence from the skill branch is the engine's own
 * behaviour, not an oversight of this module.
 */
export function computeBasicCritRate(input: BasicCritRateInput): CritRateBreakdown {
  const { rangedCri, extraCri, criShield, targetLuk } = input;
  const character = characterCritSteps(input);
  const steps = [...character.steps];

  if (rangedCri !== 0) {
    steps.push({
      key: 'criRange',
      label: 'CRIT à distância',
      value: rangedCri,
      kind: 'add',
      detail: 'só o ataque básico com arma de longo alcance recebe',
      keys: ['criRange'],
    });
  }
  if (extraCri !== 0) {
    steps.push({ key: 'extra', label: 'CRIT contra este alvo (raça/elemento/tamanho)', value: extraCri, kind: 'add' });
  }
  steps.push(shieldStep(criShield, targetLuk));

  return finish(Math.max(0, character.value + rangedCri + extraCri - criShield), steps);
}
