import { EquipmentSummaryModel } from 'src/app/models/equipment-summary.model';
import { ELE_PT, PvpDamageChannel, PvpMode, isPlayerRace, woeGlobalMultiplier } from 'src/app/core/pvp';

/**
 * Presentation helper for the "Redução de dano" popover (docs/pvp.md §4). Turns a
 * defender's aggregated reduction bonuses (subrace_/subele_/subsize_/subclass_/
 * dmg_taken_) plus the WoE-castle layer into display-ready categories. Each row
 * carries the engine key(s) behind it so a click can drill into the contributing
 * items via the existing bonus-breakdown modal. WoE rows are the castle aura, not
 * gear — they have no keys and are not clickable.
 */
export interface ReductionRow {
  label: string;
  /** Engine keys for the drill-down; empty = not item-sourced (WoE layer). */
  keys: string[];
  /** Reduction as a percentage (positive = less damage taken; negative = more). */
  percent: number;
}

export interface ReductionCategory {
  label: string;
  rows: ReductionRow[];
}

// Reuses the canonical element names/order from core/pvp.ts (same source the graph uses).
const ELEMENTS: { key: string; label: string }[] = Object.entries(ELE_PT).map(([key, label]) => ({ key, label }));

/**
 * Who the reductions are being read against.
 *
 * `pvp` is the target HUD: the attacker is a player, so only the rows a player can ever
 * match are worth listing — Médio, the two player races, class Normal.
 *
 * `self` is the main-stats popover, which answers "what does this build resist?" with no
 * attacker in mind. Restricting it to the player-shaped rows is what hid the Grande half
 * of the Carta Cavaleiro Branco + Carta Cavaleira Khalitzburg reduction.
 */
export type ReductionScope = 'self' | 'pvp';

const ALL_SIZE_ROWS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todos os tamanhos' },
  { key: 's', label: 'Pequeno' },
  { key: 'm', label: 'Médio' },
  { key: 'l', label: 'Grande' },
];

/** Players are Médio, so those are the only size rows the PVP HUD can ever fill. */
const PVP_SIZE_ROWS = ALL_SIZE_ROWS.filter((row) => row.key === 'all' || row.key === 'm');

const ALL_RACE_ROWS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todas as raças' },
  { key: 'formless', label: 'Amorfo' },
  { key: 'undead', label: 'Morto-vivo' },
  { key: 'brute', label: 'Bruto' },
  { key: 'plant', label: 'Planta' },
  { key: 'insect', label: 'Inseto' },
  { key: 'fish', label: 'Peixe' },
  { key: 'demon', label: 'Demônio' },
  { key: 'demihuman', label: 'Humanoide' },
  { key: 'angel', label: 'Anjo' },
  { key: 'dragon', label: 'Dragão' },
  { key: 'player_human', label: 'Humano' },
  { key: 'player_doram', label: 'Doram' },
];

/**
 * Only player races fire vs a player attacker (docs/pvp.md §2) — and "Todas as raças" is
 * not one of them: the client line behind `subrace_all` is "todas as raças de monstros",
 * so it stays out of the PVP list exactly as it stays out of the damage math (`pvp.ts`,
 * PLAYER_RACES). Showing it here would promise a reduction the hit never gets.
 */
const PVP_RACE_ROWS = ALL_RACE_ROWS.filter((row) => isPlayerRace(row.key));

const ALL_CLASS_ROWS: { key: string; label: string }[] = [
  { key: 'all', label: 'Todas as classes' },
  { key: 'normal', label: 'Normal' },
  { key: 'boss', label: 'Chefe' },
];

/** Players are Normal. */
const PVP_CLASS_ROWS = ALL_CLASS_ROWS.filter((row) => row.key !== 'boss');

const WOE_CHANNELS: { channel: PvpDamageChannel; label: string }[] = [
  { channel: 'phys_melee', label: 'Físico corpo a corpo' },
  { channel: 'phys_ranged', label: 'Físico à distância' },
  { channel: 'skill', label: 'Habilidade' },
];

/** Build the reduction categories for a defender's bonuses in a given PVP mode. */
export function buildReductionCategories(
  bonus: Partial<EquipmentSummaryModel> | null | undefined,
  mode: PvpMode,
  scope: ReductionScope = 'pvp',
): ReductionCategory[] {
  const b = (bonus || {}) as Record<string, number | undefined>;
  const v = (key: string) => b[key] || 0;
  const cats: ReductionCategory[] = [];
  const isSelf = scope === 'self';
  const raceRows = isSelf ? ALL_RACE_ROWS : PVP_RACE_ROWS;
  const sizeRows = isSelf ? ALL_SIZE_ROWS : PVP_SIZE_ROWS;
  const classRows = isSelf ? ALL_CLASS_ROWS : PVP_CLASS_ROWS;

  const push = (label: string, rows: ReductionRow[]) => {
    const nonzero = rows.filter((r) => r.percent !== 0);
    if (nonzero.length) cats.push({ label, rows: nonzero });
  };

  // Raça — one row per race the defender resists.
  push('Raça', raceRows.map((r) => ({
    label: r.label,
    keys: [`subrace_${r.key}`],
    percent: v(`subrace_${r.key}`),
  })));

  // Elemento — one row per element the defender resists.
  push('Elemento', [
    { label: 'Todos os elementos', keys: ['subele_all'], percent: v('subele_all') },
    ...ELEMENTS.map((e) => ({ label: e.label, keys: [`subele_${e.key}`], percent: v(`subele_${e.key}`) })),
  ]);

  // Size — the `_physical`/`_magical` rows apply only against their own damage type, so
  // they show separately instead of folded into the row above.
  push('Tamanho', [
    ...sizeRows.flatMap(({ key, label }) => [
      { label, keys: [`subsize_${key}`], percent: v(`subsize_${key}`) },
      { label: `${label} (físico)`, keys: [`subsize_${key}_physical`], percent: v(`subsize_${key}_physical`) },
      { label: `${label} (mágico)`, keys: [`subsize_${key}_magical`], percent: v(`subsize_${key}_magical`) },
    ]),
  ]);

  // Classe — Normal/Chefe.
  push('Classe', classRows.map((c) => ({
    label: c.label,
    keys: [`subclass_${c.key}`],
    percent: v(`subclass_${c.key}`),
  })));

  // Distance — only against ranged physical attacks (the Carta Gazeti family).
  push('Distância', [
    { label: 'Físico à distância', keys: ['dmg_taken_range'], percent: v('dmg_taken_range') },
  ]);

  // Redução plana — flat cut regardless of race/element.
  push('Redução plana', [
    { label: 'Todo o dano', keys: ['dmg_taken_all'], percent: v('dmg_taken_all') },
    { label: 'Dano físico', keys: ['dmg_taken_physical'], percent: v('dmg_taken_physical') },
    { label: 'Dano mágico', keys: ['dmg_taken_magical'], percent: v('dmg_taken_magical') },
  ]);

  // Camada de guerra (WoE castle) — a mode+channel aura, not gear.
  push('Guerra (WoE)', WOE_CHANNELS.map((c) => ({
    label: c.label,
    keys: [],
    percent: Math.round((1 - woeGlobalMultiplier(mode, c.channel)) * 100),
  })));

  return cats;
}

/** True when at least one source in `sources` contributes a nonzero value for any of `keys`. */
export function sourcesContributeAnyKey(sources: Record<string, any> | null | undefined, keys: string[]): boolean {
  return Object.values(sources || {}).some((m: any) => keys.some((k) => typeof m?.[k] === 'number' && m[k] !== 0));
}

/** A reduction row is drillable when it carries keys AND some gear source grants one
 *  of them (WoE rows have no keys and are never clickable). Shared by the main-stats
 *  popover and the PVP HUD so their clickability logic can't drift. */
export function reductionRowClickable(row: ReductionRow, sources: Record<string, any> | null | undefined): boolean {
  return row.keys.length > 0 && sourcesContributeAnyKey(sources, row.keys);
}
