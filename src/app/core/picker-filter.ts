/**
 * Filtering for the equipment chip picker.
 *
 * The flat side reproduces what `p-dropdown [filter]` did: a case-insensitive substring
 * match over the keys the old `filterBy` named, so typing an item id still finds the item
 * and a card's "Dir./Esq." prefix still matches.
 */

/** Matches PrimeNG's "contains" filter over several fields at once. */
export function filterOptions<T extends Record<string, any>>(options: readonly T[], term: string, keys: readonly string[]): T[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [...options];

  return options.filter((option) => keys.some((key) => String(option?.[key] ?? '').toLowerCase().includes(needle)));
}

export interface OptionSearchResult {
  matches: { label: string; value: string }[];
  /** True when the scan stopped at `limit` and there are more matches than shown. */
  capped: boolean;
}

/**
 * Flat search across the Bônus Aleatório tree.
 *
 * The tree has roughly six thousand leaves, so browsing it by breadcrumb is the only sane
 * way in — until someone knows what they want, at which point drilling four levels to
 * "Pen. Física Demônio 12 %" is worse than typing "demônio". `ExtraOptionMap` is already
 * the flattened leaf-value → label index, so the search is a scan over it.
 *
 * The scan stops at `limit` rather than the render: a one-character term matches
 * thousands, and the caller only ever shows a windowful.
 */
export function searchOptionLeaves(index: ReadonlyMap<string, string>, term: string, limit = 1000): OptionSearchResult {
  const needle = term.trim().toLowerCase();
  const matches: { label: string; value: string }[] = [];
  if (!needle) return { matches, capped: false };

  for (const [value, label] of index) {
    if (!label.toLowerCase().includes(needle) && !value.toLowerCase().includes(needle)) continue;
    if (matches.length >= limit) return { matches, capped: true };
    matches.push({ label, value });
  }

  return { matches, capped: false };
}
