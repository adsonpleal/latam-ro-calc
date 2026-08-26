import { EquipmentSummaryModel } from '../models/equipment-summary.model';

/**
 * PVP damage math — pure functions, no engine state. See docs/pvp.md.
 *
 * Two independent layers reduce vs-player damage on top of the normal
 * attack/DEF/RES pipeline:
 *   1. The DEFENDER's own gear reductions (subrace/subele/subsize/subclass +
 *      flat dmg_taken) — always apply, in every mode.
 *   2. The WoE-castle global reduction — only inside a castle, per damage
 *      channel. Validated by Luís vs bROwiki + hours of in-castle testing.
 * rAthena is only a secondary naming reference here, never the authority.
 */

export type PvpMode = 'none' | 'pvp' | 'woe' | 'woe-te';

/**
 * A player used as a damage TARGET. Carries the defender's already-computed
 * defensive stats (player formulas, not monster formulas — see docs/pvp.md §1)
 * plus the aggregated reduction bonuses from its gear. Produced by the headless
 * target builder from a saved simulation.
 */
export interface PlayerTargetProfile {
  name: string;
  level: number;
  hp: number;
  def: number;
  softDef: number;
  mdef: number;
  softMdef: number;
  res: number;
  mres: number;
  /** The target's total flee (esquiva) before any castle reduction. */
  flee: number;
  str: number;
  agi: number;
  dex: number;
  vit: number;
  int: number;
  luk: number;
  /** The target's aggregated defender-side reductions (its totalEquipStatus). */
  defenderBonus: Partial<EquipmentSummaryModel>;
  /**
   * True when the target is a Doram — its race is `player_doram` rather than
   * `player_human`. Optional: profiles cached in simulations saved before this
   * existed have no flag, and default to Humano.
   */
  isDoram?: boolean;
}

/**
 * The active PVP context threaded into the damage pipeline. `mode: 'none'` means
 * the normal vs-monster path — the reduction stages are skipped entirely.
 */
export interface PvpContext {
  mode: PvpMode;
  /** The ATTACKER's race, for the defender's subrace_* lookup. */
  attackerRace: 'player_human' | 'player_doram';
  defenderBonus: Partial<EquipmentSummaryModel>;
}

export const DEFAULT_PVP_CONTEXT: PvpContext = { mode: 'none', attackerRace: 'player_human', defenderBonus: {} };

/** Key prefixes that make up the defender-reduction namespace (docs/pvp.md §4). */
export const DEFENDER_KEY_PREFIXES = ['subrace_', 'subele_', 'subsize_', 'subclass_', 'dmg_taken_'];

/**
 * The two races a player attacker can have. `subrace_all` does NOT cover them: the
 * client spells that line "Resistência a todas as raças de **monstros**", and the whole
 * point of the pt-BR race vocabulary is that the monster world and the player world are
 * separate (docs/pvp.md §2 — *Humanoide* is a mob, *Humano* is a player). So an item
 * granting `subrace_all` cuts nothing off a player's hit; only `subrace_player_human`
 * and `subrace_player_doram` do.
 */
export const PLAYER_RACES = ['player_human', 'player_doram'] as const;

/** True when the attacker is a player, so the monster-only `_all` race line stays out. */
export const isPlayerRace = (race: string): boolean => (PLAYER_RACES as readonly string[]).includes(race);

/** True when a bonus key belongs to the defender-reduction namespace. */
export function isDefenderKey(key: string): boolean {
  return DEFENDER_KEY_PREFIXES.some((p) => key.startsWith(p));
}

/** Extract only the defender-reduction bonuses from an aggregated bonus map. */
export function pickDefenderBonus(totalBonus: Record<string, number>): Partial<EquipmentSummaryModel> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(totalBonus)) {
    if (value && isDefenderKey(key)) out[key] = value;
  }
  return out as Partial<EquipmentSummaryModel>;
}

/**
 * Luís: "dano físico normal" = basic melee (atq básico, golpe titânico, duplo…);
 * "ataque a distância" = basic BOW attack only; "habilidade" = every skill
 * (physical OR magical). So only basic attacks split melee/ranged — all skills
 * fall in the `skill` bucket regardless of range.
 */
export type PvpDamageChannel = 'phys_melee' | 'phys_ranged' | 'skill';

/**
 * Global castle-reduction layer, as a fraction of the damage dealt (1 = no
 * reduction). See docs/pvp.md §2.
 *
 * The 18/08/2026 patch raised both castles to the same numbers, announced by the
 * staff and reported by Luís: melee basic attack −90%, ranged basic attack −95%,
 * skills −90%. Before it the normal castle was −70% across the board (Luís's
 * "asuro 1kk no PVP → 300k dentro do castelo") and the TE castle was melee full,
 * ranged −20%, skills −40%.
 */
const WOE_LAYER: Record<Exclude<PvpMode, 'none'>, Record<PvpDamageChannel, number>> = {
  // Open PVP: no castle aura — only the target's own gear reductions apply.
  pvp: { phys_melee: 1, phys_ranged: 1, skill: 1 },
  // Both castles: melee −90%, ranged −95%, skills −90%.
  woe: { phys_melee: 0.1, phys_ranged: 0.05, skill: 0.1 },
  'woe-te': { phys_melee: 0.1, phys_ranged: 0.05, skill: 0.1 },
};

/** The WoE-castle global multiplier for a mode + channel (1 = no reduction). */
export function woeGlobalMultiplier(mode: PvpMode, channel: PvpDamageChannel): number {
  if (mode === 'none') return 1;
  return WOE_LAYER[mode][channel];
}

/** Flee reduction applied to the target inside castle modes (−20% esquiva). */
export function woeFleeMultiplier(mode: PvpMode): number {
  return mode === 'woe' || mode === 'woe-te' ? 0.8 : 1;
}

/** Classify an outgoing hit into its PVP channel. */
export function pvpChannelOf(params: { isSkill: boolean; isMelee: boolean }): PvpDamageChannel {
  if (params.isSkill) return 'skill';
  return params.isMelee ? 'phys_melee' : 'phys_ranged';
}

export interface DefenderReductionInput {
  /** The defender's aggregated gear bonuses (target's totalEquipStatus). */
  bonus: Partial<EquipmentSummaryModel>;
  dmgType: 'physical' | 'magical';
  /** The ATTACKER's race for subrace lookup (player_human / player_doram). */
  attackerRace: string;
  /** The property element of the incoming attack (neutral, fire, …). */
  attackerElement: string;
  /** Players are Medium. */
  attackerSize: 's' | 'm' | 'l';
  /** Players are Normal class. */
  attackerType: 'normal' | 'boss';
  /** True when the incoming attack is long-ranged (basic bow or a ranged skill).
   *  Gates the physical-ranged reduction (Gazeti-card family). */
  isRanged?: boolean;
}

/**
 * Combined defender-gear reduction, as a fraction of damage dealt (1 = none).
 *
 * Within a category the matching values sum (e.g. `subele_all + subele_neutral`, and the
 * size category also picks up the `_physical`/`_magical` pair for the incoming damage type);
 * across categories they combine multiplicatively — matching how Luís lists them
 * as separate reductions on the player (raça / elemento / tamanho / …). Each
 * category is clamped to ≤100% so a single category can't flip damage negative.
 * The cross-category model is a V1 assumption to revisit with Luís (docs/pvp.md §6).
 */
export function defenderReductionMultiplier(input: DefenderReductionInput): number {
  // Single source of the reduction math: the per-category steps (zero categories
  // are omitted, and their factor is 1, so the product is unchanged).
  return defenderReductionSteps(input).reduce((mult, s) => mult * s.factor, 1);
}

/** A single defender-reduction category applied as its own step (for the formula
 *  graph): its pt-BR label, the engine keys behind it, and its multiplier. */
export interface DefenderReductionStep {
  label: string;
  keys: string[];
  /** Multiplier as a fraction of damage dealt (1 = no reduction). */
  factor: number;
}

const RACE_PT: Record<string, string> = {
  player_human: 'Humano', player_doram: 'Doram', formless: 'Amorfo', undead: 'Morto-vivo',
  brute: 'Bruto', plant: 'Planta', insect: 'Inseto', fish: 'Peixe', demon: 'Demônio',
  demihuman: 'Humanoide', angel: 'Anjo', dragon: 'Dragão',
};
/** pt-BR element names in canonical order (also the source for the reduction popover). */
export const ELE_PT: Record<string, string> = {
  neutral: 'Neutro', water: 'Água', earth: 'Terra', fire: 'Fogo', wind: 'Vento',
  poison: 'Veneno', holy: 'Sagrado', dark: 'Sombrio', ghost: 'Fantasma', undead: 'Maldito',
};
const SIZE_PT: Record<string, string> = { s: 'Pequeno', m: 'Médio', l: 'Grande' };
const CLASS_PT: Record<string, string> = { normal: 'Normal', boss: 'Chefe' };

/**
 * The same reduction as `defenderReductionMultiplier`, but split into ONE step per
 * category that actually applies — so the damage graph can name each ("Redução
 * Humano", "Redução Neutro", …) and drill into the items behind it. Empty steps
 * (0% for that category) are omitted. Their factors multiply back to the combined
 * value, so the running damage is unchanged.
 */
export function defenderReductionSteps(input: DefenderReductionInput): DefenderReductionStep[] {
  const b = input.bonus as Record<string, number | undefined>;
  const v = (key: string) => b[key] || 0;
  const factor = (pct: number) => 1 - Math.min(pct, 100) / 100;
  const flatKey = input.dmgType === 'physical' ? 'dmg_taken_physical' : 'dmg_taken_magical';
  // "Resistência física/mágica a oponentes de tamanho X" — same size category, but only
  // against its own damage type, so it needs its own pair of keys next to the untyped ones.
  const sizeType = input.dmgType === 'physical' ? '_physical' : '_magical';
  const sizeKeys = ['subsize_all', `subsize_${input.attackerSize}`, `subsize_all${sizeType}`, `subsize_${input.attackerSize}${sizeType}`];
  // `subrace_all` is "todas as raças de monstros" — it never covers a player attacker,
  // so vs a player only the matching player-race key counts. See PLAYER_RACES.
  const raceKeys = isPlayerRace(input.attackerRace)
    ? [`subrace_${input.attackerRace}`]
    : ['subrace_all', `subrace_${input.attackerRace}`];

  const cats: { pct: number; label: string; keys: string[] }[] = [
    { pct: raceKeys.reduce((total, key) => total + v(key), 0), label: `Redução ${RACE_PT[input.attackerRace] ?? input.attackerRace}`, keys: raceKeys },
    { pct: v('subele_all') + v(`subele_${input.attackerElement}`), label: `Redução ${ELE_PT[input.attackerElement] ?? input.attackerElement}`, keys: ['subele_all', `subele_${input.attackerElement}`] },
    { pct: sizeKeys.reduce((total, key) => total + v(key), 0), label: `Redução ${SIZE_PT[input.attackerSize] ?? input.attackerSize}`, keys: sizeKeys },
    { pct: v('subclass_all') + v(`subclass_${input.attackerType}`), label: `Redução ${CLASS_PT[input.attackerType] ?? input.attackerType}`, keys: ['subclass_all', `subclass_${input.attackerType}`] },
    // Long-ranged physical reduction (Gazeti-card family) — only vs a ranged physical hit.
    { pct: input.dmgType === 'physical' && input.isRanged ? v('dmg_taken_range') : 0, label: 'Redução à distância', keys: ['dmg_taken_range'] },
    { pct: v('dmg_taken_all') + v(flatKey), label: 'Redução plana', keys: ['dmg_taken_all', flatKey] },
  ];

  return cats.filter((c) => c.pct !== 0).map((c) => ({ label: c.label, keys: c.keys, factor: factor(c.pct) }));
}
