/**
 * The "comparar slot" state: which equipment slots the calculator is comparing
 * and the alternative build (`model2`) chosen for them. Persisted in two places:
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
}

/**
 * Validate a parsed value into a CompareState, or `null` when it is unusable or
 * carries no compared slots. Tolerant of legacy/corrupt payloads.
 */
export function sanitizeCompareState(raw: unknown): CompareState | null {
  if (!raw || typeof raw !== 'object') return null;
  const { itemNames, model2 } = raw as Partial<CompareState>;
  if (!Array.isArray(itemNames) || !model2 || typeof model2 !== 'object') return null;
  const names = itemNames.filter((n): n is string => typeof n === 'string');
  if (names.length === 0) return null;
  return { itemNames: names, model2: model2 as Record<string, unknown> };
}
