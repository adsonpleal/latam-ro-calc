import { EquipmentSummaryModel } from 'src/app/models/equipment-summary.model';
import { ELE_PT, PvpDamageChannel, PvpMode, woeGlobalMultiplier } from 'src/app/core/pvp';

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

const WOE_CHANNELS: { channel: PvpDamageChannel; label: string }[] = [
  { channel: 'phys_melee', label: 'Físico corpo a corpo' },
  { channel: 'phys_ranged', label: 'Físico à distância' },
  { channel: 'skill', label: 'Habilidade' },
];

/** Build the reduction categories for a defender's bonuses in a given PVP mode. */
export function buildReductionCategories(
  bonus: Partial<EquipmentSummaryModel> | null | undefined,
  mode: PvpMode,
): ReductionCategory[] {
  const b = (bonus || {}) as Record<string, number | undefined>;
  const v = (key: string) => b[key] || 0;
  const cats: ReductionCategory[] = [];

  const push = (label: string, rows: ReductionRow[]) => {
    const nonzero = rows.filter((r) => r.percent !== 0);
    if (nonzero.length) cats.push({ label, rows: nonzero });
  };

  // Raça — only player races fire vs a player attacker (docs/pvp.md §2).
  push('Raça', [
    { label: 'Todas as raças', keys: ['subrace_all'], percent: v('subrace_all') },
    { label: 'Humano', keys: ['subrace_player_human'], percent: v('subrace_player_human') },
    { label: 'Doram', keys: ['subrace_player_doram'], percent: v('subrace_player_doram') },
  ]);

  // Elemento — one row per element the defender resists.
  push('Elemento', [
    { label: 'Todos os elementos', keys: ['subele_all'], percent: v('subele_all') },
    ...ELEMENTS.map((e) => ({ label: e.label, keys: [`subele_${e.key}`], percent: v(`subele_${e.key}`) })),
  ]);

  // Tamanho — players are Médio.
  push('Tamanho', [
    { label: 'Todos os tamanhos', keys: ['subsize_all'], percent: v('subsize_all') },
    { label: 'Médio', keys: ['subsize_m'], percent: v('subsize_m') },
  ]);

  // Classe — players are Normal.
  push('Classe', [
    { label: 'Todas as classes', keys: ['subclass_all'], percent: v('subclass_all') },
    { label: 'Normal', keys: ['subclass_normal'], percent: v('subclass_normal') },
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
