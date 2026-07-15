// Pure (no Angular imports) helpers for the "Resumo de Batalha" HUD component.
// Kept framework-free so they're unit-testable with plain Vitest, mirroring
// src/app/utils/calc-skill-aspd.ts. These functions only reshape numbers the
// engine already produced (calcSkillAspd via totalSummary.calcSkill) into
// display-ready segments — they never re-derive game-truth timing math.

export type CastComponentKey = 'fixa' | 'variavel' | 'pos' | 'recarga';

export interface CastbarSegment {
  seconds: number;
  /** Percent width relative to hitPeriod, 0-100 (may exceed 100 only if hitPeriod is 0). */
  percent: number;
}

export interface CastbarParallelLane {
  posSeconds: number;
  recSeconds: number;
  /** Which of the two parallel lanes determines the block duration. */
  winner: 'pos' | 'recarga' | 'tie';
  blockSeconds: number;
  /** Percent width of the whole parallel block relative to hitPeriod, 0-100. */
  blockPercent: number;
  /** Width, 0-100, of the recharge lane's inner fill relative to the winning (longer) lane. */
  recFillPercent: number;
}

export interface CastbarResult {
  mode: 'sequential' | 'single';
  fixed?: CastbarSegment;
  variable?: CastbarSegment;
  parallel?: CastbarParallelLane;
  single?: CastbarSegment;
  hitPeriod: number;
  totalHitPerSec: number;
}

const EPSILON = 1e-5;

/**
 * Builds the castbar segments from the already-reduced timings on
 * totalSummary.calcSkill. Uses `blockPeriod = hitPeriod - castPeriod` (the
 * identity calcSkillAspd guarantees: hitPeriod = castPeriod + blockPeriod)
 * instead of re-deriving max(reducedAcd, reducedCd) locally, because
 * hitEveryNSec skills force blockPeriod to 0 even when reducedAcd/reducedCd
 * themselves are nonzero — only the derived value reflects that correctly.
 */
export function computeCastbar(input: {
  reducedFct: number;
  reducedVct: number;
  reducedAcd: number;
  reducedCd: number;
  castPeriod: number;
  hitPeriod: number;
  totalHitPerSec: number;
}): CastbarResult {
  const { reducedFct, reducedVct, reducedAcd, reducedCd, castPeriod, hitPeriod, totalHitPerSec } = input;
  const blockPeriod = hitPeriod - castPeriod;

  if (blockPeriod <= EPSILON) {
    return {
      mode: 'single',
      single: { seconds: castPeriod, percent: 100 },
      hitPeriod,
      totalHitPerSec,
    };
  }

  const total = hitPeriod > 0 ? hitPeriod : 1;
  const winner: CastbarParallelLane['winner'] = reducedAcd > reducedCd ? 'pos' : reducedAcd < reducedCd ? 'recarga' : 'tie';
  const blockSeconds = Math.max(reducedAcd, reducedCd);
  const recFillPercent = blockSeconds > 0 ? Math.min(100, (reducedCd / blockSeconds) * 100) : 0;

  return {
    mode: 'sequential',
    fixed: { seconds: reducedFct, percent: (reducedFct / total) * 100 },
    variable: { seconds: reducedVct, percent: (reducedVct / total) * 100 },
    parallel: {
      posSeconds: reducedAcd,
      recSeconds: reducedCd,
      winner,
      blockSeconds,
      // blockPeriod (not blockSeconds) so the three widths always sum to ~100
      // even when rounding makes max(acd, cd) differ from hitPeriod - castPeriod.
      blockPercent: (blockPeriod / total) * 100,
      recFillPercent,
    },
    hitPeriod,
    totalHitPerSec,
  };
}

/**
 * The bottleneck is whichever of the (up to) three time-costing components —
 * fixed cast, variable cast, and the winning side of the parallel block —
 * contributes the most seconds to hitPeriod. The losing side of the parallel
 * block costs zero time (it runs concurrently), so it's never the bottleneck.
 */
export function identifyCastBottleneck(input: { reducedFct: number; reducedVct: number; reducedAcd: number; reducedCd: number }): CastComponentKey {
  const { reducedFct, reducedVct, reducedAcd, reducedCd } = input;
  const blockWinnerKey: CastComponentKey = reducedCd > reducedAcd ? 'recarga' : 'pos';
  const blockSeconds = Math.max(reducedAcd, reducedCd);

  const candidates: Array<[CastComponentKey, number]> = [
    ['fixa', reducedFct],
    ['variavel', reducedVct],
    [blockWinnerKey, blockSeconds],
  ];
  return candidates.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0];
}

export interface ZeroPosWhatIf {
  newDps: number;
  newHitPeriod: number;
  gainPercent: number;
}

/**
 * What-if: DPS if the after-cast delay (pós-conjuração / reducedAcd) were
 * zeroed out, leaving only sequential cast time plus whatever recarga is left
 * running in parallel. Guards against a degenerate (<=0) new hit period.
 */
export function computeZeroPosWhatIf(input: { dps: number; hitPeriod: number; castPeriod: number; reducedCd: number }): ZeroPosWhatIf | null {
  const { dps, hitPeriod, castPeriod, reducedCd } = input;
  const newHitPeriod = castPeriod + Math.max(reducedCd, 0);
  if (newHitPeriod <= 0) return null;

  const ratio = hitPeriod / newHitPeriod;
  return {
    newDps: dps * ratio,
    newHitPeriod,
    gainPercent: (ratio - 1) * 100,
  };
}

export interface CastComponentInfo {
  key: CastComponentKey;
  label: string;
  seconds: number;
  hint: string;
}

export interface OptimizeInfo {
  bottleneck: CastComponentKey;
  components: CastComponentInfo[];
  whatIf: ZeroPosWhatIf | null;
}

/** Assembles the "⚙ otimizar" popover data: bottleneck + per-component hints + the zero-pós what-if. */
export function buildOptimizeInfo(input: {
  reducedFct: number;
  reducedVct: number;
  reducedAcd: number;
  reducedCd: number;
  castPeriod: number;
  hitPeriod: number;
  dps: number;
  sumDex2Int1: number;
}): OptimizeInfo {
  const { reducedFct, reducedVct, reducedAcd, reducedCd, castPeriod, hitPeriod, dps, sumDex2Int1 } = input;
  const bottleneck = identifyCastBottleneck({ reducedFct, reducedVct, reducedAcd, reducedCd });
  const toZero = Math.max(0, 530 - sumDex2Int1);

  const components: CastComponentInfo[] = [
    { key: 'fixa', label: 'Fixa', seconds: reducedFct, hint: 'reduz com −conj. fixa / −FCT% de equipamentos' },
    { key: 'variavel', label: 'Variável', seconds: reducedVct, hint: `DES×2+INT: ${sumDex2Int1} / 530 para zerar (faltam ${toZero}) — ou −VCT%` },
    { key: 'pos', label: 'Pós', seconds: reducedAcd, hint: 'reduz com −ACD% e ASPD' },
    { key: 'recarga', label: 'Recarga', seconds: reducedCd, hint: 'fixa da habilidade — não reduzível' },
  ];

  const whatIf = computeZeroPosWhatIf({ dps, hitPeriod, castPeriod, reducedCd });

  return { bottleneck, components, whatIf };
}

export type DpsSide = 'current' | 'simulated' | 'tie';

/** The larger DPS side renders with the bigger font (46px vs 29px in the component CSS). */
export function pickBiggerDpsSide(currentDps: number, simulatedDps: number): DpsSide {
  if (currentDps > simulatedDps) return 'current';
  if (simulatedDps > currentDps) return 'simulated';
  return 'tie';
}

export interface HeroDamage {
  dps: number;
  min: number;
  max: number;
  effected: boolean;
}

/**
 * Hero DPS/damage-per-use selection: use the "effected" (chance-triggered)
 * figures when present, otherwise the base skill figures — same effected||base
 * fallback the legacy template applies per-field.
 */
export function pickHeroDamage(dmg: {
  skillDps?: number;
  skillMinDamage?: number;
  skillMaxDamage?: number;
  effectedSkillDps?: number;
  effectedSkillDamageMin?: number;
  effectedSkillDamageMax?: number;
} | null | undefined): HeroDamage {
  if (!dmg) return { dps: 0, min: 0, max: 0, effected: false };
  const hasEffected = (dmg.effectedSkillDamageMin ?? 0) > 0;
  return {
    dps: (hasEffected ? dmg.effectedSkillDps : dmg.skillDps) || 0,
    min: (hasEffected ? dmg.effectedSkillDamageMin : dmg.skillMinDamage) || 0,
    max: (hasEffected ? dmg.effectedSkillDamageMax : dmg.skillMaxDamage) || 0,
    effected: hasEffected,
  };
}

/** Percent delta of `simulated` vs `current`; null when `current` is 0 (can't express a ratio). */
export function deltaPercent(current: number, simulated: number): number | null {
  if (!current) return null;
  return ((simulated - current) / current) * 100;
}
