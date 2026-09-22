import { MAIN_STAT_KEYS, TRAIT_KEYS } from '../constants/trait-keys';

/**
 * The "comparar slot" state: which equipment slots the calculator is comparing,
 * whether the character's level, stats and traits are compared too, and the
 * alternative build (`model2`) chosen for them. Persisted in two places:
 * the `ro-set` autosave, so a comparison survives a page refresh, and inside each
 * named save, so loading a saved sim restores the comparison it was saved with.
 *
 * Framework-free (lives in src/app/core) and structurally typed so it round-trips
 * through JSON and can be validated in unit tests with a fake store.
 */
export interface CompareState {
  /** Compared slots as ItemTypeEnum values (stored as plain strings). */
  itemNames: string[];
  /** The compared build's model — the same shape the component's `model2` uses. */
  model2: Record<string, unknown>;
  /**
   * Whether `model2` also carries its own level, job level, base stats and traits
   * (`STATS_COMPARE_KEYS`). Absent on every state written before the flag existed,
   * which therefore keeps comparing the gear alone.
   */
  stats?: boolean;
  /** Whether Auto-conjuração itself keeps comparison mode active. */
  autoCast?: boolean;
}

/**
 * The character fields a stats comparison carries in `model2`. The job bonus
 * (`jobStr`…`jobCrt`) is not here: it is derived from `jobLevel` on each pass.
 */
export const STATS_COMPARE_KEYS: readonly string[] = ['level', 'jobLevel', ...MAIN_STAT_KEYS, ...TRAIT_KEYS];

/** Copy the `STATS_COMPARE_KEYS` of `source` onto `target`, in place. */
export function copyStatsFields(source: Record<string, any>, target: Record<string, any>): void {
  for (const key of STATS_COMPARE_KEYS) target[key] = source?.[key] ?? 0;
}

/**
 * Validate a parsed value into a CompareState, or `null` when it is unusable or
 * compares nothing (no slot and no stats). Tolerant of legacy/corrupt payloads.
 */
export function sanitizeCompareState(raw: unknown): CompareState | null {
  if (!raw || typeof raw !== 'object') return null;
  const { itemNames, model2, stats, autoCast } = raw as Partial<CompareState>;
  if (!Array.isArray(itemNames) || !model2 || typeof model2 !== 'object') return null;
  const names = itemNames.filter((n): n is string => typeof n === 'string');
  if (names.length === 0 && stats !== true && autoCast !== true) return null;
  const state: CompareState = { itemNames: names, model2: model2 as Record<string, unknown> };
  if (stats === true) state.stats = true;
  if (autoCast === true) state.autoCast = true;
  return state;
}
