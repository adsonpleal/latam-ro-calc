import type { TextKey } from '../i18n';

/**
 * The per-use counter a rotation row lets the player pick.
 *
 * Two different game ideas share it, because they ask the screen for the same thing — one
 * number, chosen next to the level, that the skill's `formula`/`totalHit`/`damageRepeat`
 * reads back as `stack`:
 *
 *   - an accumulation the character builds up (Talho Eterno, Arma Serva);
 *   - how many of a ground skill's randomly placed hits actually land on the target
 *     (Florescer, Pilares de Pedra — the client picks a random cell per tick, so the
 *     whole garden only lands on something that never moves).
 *
 * The bound can depend on the skill level — Florescer scatters 4 flowers at Nv1 and 20 at
 * Nv5 — so it is declared the way `acd`/`fct`/`vct`/`cd` already are: a number, or a
 * function of the level.
 */
export type StackCount = number | ((skillLevel: number) => number);

/**
 * How a skill declares that counter. The one declaration both `AtkSkillModel` (what the
 * catalog writes) and `RotationSkillMeta` (what the row reads) extend, so the next field
 * the counter grows is added in one place.
 */
export interface StackLimits {
  minStack?: StackCount;
  /** The ceiling, and the count a row defaults to when `defaultStack` is absent. */
  maxStack?: StackCount;
  defaultStack?: StackCount;
  /** What the rotation row calls this counter, as a catalog key. Defaults to "Acúm.",
   *  which is right for an accumulation; a ground skill that scatters its hits at random
   *  asks for "Acertos" instead. See {@link StackCount}. */
  stackLabelKey?: TextKey;
}

const resolveStackCount = (value: StackCount | undefined, skillLevel: number): number =>
  typeof value === 'function' ? value(skillLevel) : value ?? 0;

/**
 * What this skill offers at this level, and which count a saved choice lands on.
 *
 * `max` of 0 means the skill has no counter at all, and `count` is then 0 — the rotation
 * row draws no selector and the engine passes `stack: 0`, which is what every skill
 * without a counter has always been given.
 */
export function stackRange(limits: StackLimits | undefined, skillLevel: number, chosen?: number): { min: number; max: number; count: number } {
  const max = Math.floor(resolveStackCount(limits?.maxStack, skillLevel));
  if (max <= 0) return { min: 0, max: 0, count: 0 };

  const min = Math.floor(resolveStackCount(limits?.minStack, skillLevel));
  const wanted = Number.isFinite(chosen) ? chosen!
    : limits?.defaultStack === undefined ? max : Math.floor(resolveStackCount(limits.defaultStack, skillLevel));

  return { min, max, count: Math.max(min, Math.min(max, wanted)) };
}
