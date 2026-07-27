/**
 * Text helpers for agent-facing output and pt-BR search.
 */

/** Unicode combining diacritical marks, as left behind by NFD decomposition. */
const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * Lowercase and strip diacritics, so `pocao magica` matches `Poção Mágica`.
 * `String.prototype.normalize` is unconditional in Node — no ICU build flag needed.
 */
export const foldAccents = (s: string): string => (s ?? '').normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();

/** Split a folded string into searchable tokens (letters and digits only). */
export const tokenize = (s: string): string[] => foldAccents(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/**
 * Client item descriptions carry `^RRGGBB` colour codes. The app's `prettyItemDesc`
 * turns them into (unclosed) `<font>` tags for its hover popover, which is worse than
 * useless in a tool result — so strip them instead.
 */
export const plainItemDesc = (desc?: string): string =>
  (desc ?? '')
    .replace(/\^[0-9a-fA-F]{6}/g, '')
    .replace(/\r\n/g, '\n')
    .trim();
