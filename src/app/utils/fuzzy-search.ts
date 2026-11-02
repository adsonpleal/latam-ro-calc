/**
 * Lowercase and strip accents, so a term typed without them still matches. Nobody types
 * "\u00c0 dist\u00e2ncia" or "Dem\u00f4nio" with the accents in a search box.
 */
export const foldForSearch = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');

/** Literal words rank before fuzzy character subsequences; unmatched names rank last. */
export function createFuzzyRanker(query: string): (text: string) => number {
  const tokens = foldForSearch(query).trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return () => 0;
  return (text: string) => {
    const normalized = foldForSearch(text);
    let rank = 0;
    for (const token of tokens) {
      if (normalized.includes(token)) continue;
      rank = 1;
      let cursor = 0;
      for (const char of token) {
        const index = normalized.indexOf(char, cursor);
        if (index < 0) return Infinity;
        cursor = index + char.length;
      }
    }
    return rank;
  };
}

export function createFuzzyMatcher(query: string): (text: string) => boolean {
  const rank = createFuzzyRanker(query);
  return text => Number.isFinite(rank(text));
}
