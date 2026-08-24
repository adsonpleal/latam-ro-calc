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
 * The token also carries the active "comparar peça" comparison, under a
 * reserved key. That key is invisible to older clients: `setModelByJSONString`
 * iterates `createMainModel()`'s own keys, so an unrecognised top-level key is
 * never read — an app built before this change loads the build and ignores the
 * comparison instead of breaking.
 *
 * Framework-free (src/app/core): no Angular/RxJS/PrimeNG, no DOM.
 */
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { CompareState, sanitizeCompareState } from './compare-state';

/** Identity fields kept even when they equal a default, so a token is never empty. */
const ALWAYS_KEEP = new Set(['class', 'level', 'jobLevel']);

/** Reserved key holding the comparison. Not a model field, so no build can collide with it. */
const COMPARE_KEY = '__cmp';

const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null || value === 0 || value === '') return true;
  if (Array.isArray(value)) return !value.some((v) => v !== undefined && v !== null && v !== 0);
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
};

/** A build and the comparison it was shared with (`null` when nothing was being compared). */
export interface SharedBuild {
  preset: Record<string, any>;
  compare: CompareState | null;
}

/**
 * Copy of `source` without the fields left at their default value. Used for the
 * preset and, separately, for the comparison's `model2` — which is a second full
 * model whose ~180 mostly-zero fields would otherwise double the token.
 */
export const dropDefaults = (source: Record<string, any> | null | undefined, alwaysKeep?: ReadonlySet<string>): Record<string, any> => {
  const delta: Record<string, any> = {};
  for (const [key, value] of Object.entries(source ?? {})) {
    if (alwaysKeep?.has(key) || !isEmpty(value)) delta[key] = value;
  }
  return delta;
};

/** Build (+ optional comparison) → compressed URL token (only non-default fields are carried).
 *  lz-string's URI-safe output still contains '+', which a query string decodes
 *  to a space; we map '+'<->'.' ('.' is unreserved and never emitted by lz-string)
 *  so the token survives intact inside the '?b=' hash-query value. */
export const encodeBuild = (preset: Record<string, any>, compare?: CompareState | null): string => {
  const delta = dropDefaults(preset, ALWAYS_KEEP);
  // Short keys: the comparison rides in every compared build's URL, so its own
  // field names are worth compressing away.
  if (compare?.itemNames?.length) {
    delta[COMPARE_KEY] = { i: [...compare.itemNames], m: dropDefaults(compare.model2) };
  }
  return compressToEncodedURIComponent(JSON.stringify(delta)).replace(/\+/g, '.');
};

/** URL token → the sparse build delta plus its comparison, or null if absent/invalid.
 *
 *  `maxJsonChars` bounds the decompressed payload before it is parsed. The browser
 *  never passes it — it decodes tokens it minted itself — but the server answers
 *  unauthenticated requests, and lz-string is a compressor: a short token can expand
 *  into megabytes of JSON. Over the limit is treated as invalid, not as an error. */
export const decodeShared = (token: string | null | undefined, maxJsonChars?: number): SharedBuild | null => {
  if (!token) return null;
  try {
    const json = decompressFromEncodedURIComponent(token.replace(/\./g, '+'));
    if (!json) return null;
    if (maxJsonChars != null && json.length > maxJsonChars) return null;
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== 'object') return null;

    const raw = obj[COMPARE_KEY];
    delete obj[COMPARE_KEY];
    const compare = raw && typeof raw === 'object' ? sanitizeCompareState({ itemNames: raw.i, model2: raw.m }) : null;

    return { preset: obj, compare };
  } catch (error) {
    console.error(error);
    return null;
  }
};

/** URL token → sparse build delta, or null if the token is absent/invalid.
 *  The comparison, if any, is dropped — use `decodeShared` to keep it. */
export const decodeBuild = (token: string | null | undefined): Record<string, any> | null => decodeShared(token)?.preset ?? null;
