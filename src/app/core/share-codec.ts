/**
 * Self-contained share-link codec: encodes a full build into the shortest
 * practical URL-safe token and back. No backend — the token carries the build.
 *
 * Strategy: drop every field left at its default (0 / undefined / null / '' /
 * empty array / empty object), JSON-stringify the small remainder, then
 * lz-string-compress to a URI component. Decoding returns the sparse delta;
 * the caller feeds it to `loadItemSet`, whose `setModelByJSONString` merges it
 * over `createMainModel()` defaults (`savedValue ?? initialValue`) so the
 * dropped fields are restored to their defaults.
 *
 * Framework-free (src/app/core): no Angular/RxJS/PrimeNG, no DOM.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

/** Identity fields kept even when they equal a default, so a token is never empty. */
const ALWAYS_KEEP = new Set(['class', 'level', 'jobLevel']);

const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null || value === 0 || value === '') return true;
  if (Array.isArray(value)) return !value.some((v) => v !== undefined && v !== null && v !== 0);
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

/** Build → compressed URL token (only non-default fields are carried).
 *  lz-string's URI-safe output still contains '+', which a query string decodes
 *  to a space; we map '+'<->'.' ('.' is unreserved and never emitted by lz-string)
 *  so the token survives intact inside the '?b=' hash-query value. */
export const encodeBuild = (preset: Record<string, any>): string => {
  const delta: Record<string, any> = {};
  for (const [key, value] of Object.entries(preset ?? {})) {
    if (ALWAYS_KEEP.has(key) || !isEmpty(value)) delta[key] = value;
  }
  return compressToEncodedURIComponent(JSON.stringify(delta)).replace(/\+/g, '.');
};

/** URL token → sparse build delta, or null if the token is absent/invalid. */
export const decodeBuild = (token: string | null | undefined): Record<string, any> | null => {
  if (!token) return null;
  try {
    const json = decompressFromEncodedURIComponent(token.replace(/\./g, '+'));
    if (!json) return null;
    const obj = JSON.parse(json);
    return obj && typeof obj === 'object' ? obj : null;
  } catch (error) {
    console.error(error);
    return null;
  }
};
