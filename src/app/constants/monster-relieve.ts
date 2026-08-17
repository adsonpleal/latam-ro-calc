/**
 * Aliviar (NPC_RELIEVE_ON, 771) — a monster skill that reduces ALL physical and magic
 * damage the monster takes. Source: https://browiki.org/wiki/Aliviar
 *
 * It is a per-monster mechanic rather than a global one, so it is opt-in twice over: the
 * monster has to be in {@link RELIEVE_MONSTER_IDS} for the calculator to offer the level
 * picker at all, and the user has to pick a level. Level 0 means "not active", which is
 * how every other target starts and stays.
 *
 * Kept as an id list rather than a per-record flag for the same reason RED_AURA_MVP_IDS
 * is (see mvp.ts): monster.json is generated from the ragassets feed and the feed has no
 * column for which skills a mob casts, so a flag written there would be erased by the
 * next `sync-monster-db` run.
 */

/** Reduction of damage taken, per Aliviar level. Index = level, so [0] is "no Aliviar". */
const RELIEVE_REDUCTION_PERCENT = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99] as const;

/** The highest level of Aliviar the picker offers (the skill's own max level). */
export const MAX_RELIEVE_LEVEL = RELIEVE_REDUCTION_PERCENT.length - 1;

/**
 * Monsters known to cast Aliviar, and therefore the only ones the level picker appears
 * for. Both are the Jardim Secreto bosses (https://browiki.org/wiki/Jardim_Secreto):
 *
 * - 20620 `MD_REDPEPPER` — Pimentinha Kappa, the normal-mode MVP;
 * - 20621 `MD_REDPEPPER_H` — Pimentão Lambda, the hard-mode MVP.
 *
 * There, Aliviar is not a free choice: below 90% HP the boss has a 40% chance of turning
 * it on, and its level is the level of the Escudo de Energia, which the party lowers by
 * killing the four Peças de Guardião in the corners —
 *
 *     Nv. = 10 - ((4 - peças vivas) x 2)
 *
 * so 4 pieces still standing is Nv. 10 (99% of the damage gone) and all four down is
 * Nv. 2. The picker still offers every level 1-10 rather than only that even subset: the
 * numbers above describe one instance's script, while the reduction table is the skill's,
 * and the next monster added to this list will have its own way of choosing a level.
 */
export const RELIEVE_MONSTER_IDS: ReadonlySet<number> = new Set([20620, 20621]);

/** Whether the Aliviar picker should be offered for this monster id. */
export const hasRelieve = (monsterId: number): boolean => RELIEVE_MONSTER_IDS.has(monsterId);

/**
 * Damage multiplier for an Aliviar level: 1 when it is off or the level is out of range,
 * 0.01 at level 10. Out-of-range input is clamped to "off" rather than throwing, because
 * the level arrives from localStorage and from saved simulations.
 */
export function relieveMultiplier(level: number): number {
  const reduction = RELIEVE_REDUCTION_PERCENT[Math.trunc(level)] ?? 0;

  return (100 - reduction) / 100;
}

/** The reduction a level applies, as a whole percentage — for labels and tooltips. */
export function relieveReductionPercent(level: number): number {
  return RELIEVE_REDUCTION_PERCENT[Math.trunc(level)] ?? 0;
}
