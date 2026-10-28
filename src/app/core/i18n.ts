/**
 * The i18n primitive: a locale, a catalog, and a lookup that falls back to pt-BR.
 *
 * Framework-free like the rest of `core` — the catalogs and the React layer both read
 * it, and `check-source.mjs` forbids a framework import here. Hand-written rather than
 * a dependency because the app needs three things: key lookup, `{name}` interpolation
 * and a fallback. A library would add a loader, ICU plurals and a locale detector that
 * nothing here would call.
 */

/** Every locale the UI ships. pt-BR is first because it is the source. */
export const LOCALES = ['pt-BR', 'es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * The source locale, and what the app opens in until someone picks otherwise.
 *
 * Its catalog is the one every key is written in first, it is bundled with the app
 * rather than loaded, and every lookup falls back to it — so a key a translation has
 * not reached yet shows up in Portuguese instead of as a key.
 *
 * The app deliberately does NOT read `navigator.language` yet. While most of the
 * interface is still only in Portuguese, opening in English for an English browser
 * reads as a broken translation rather than an absent one. Detection belongs in the
 * PR that finishes the interface, not before it.
 */
export const DEFAULT_LOCALE: Locale = 'pt-BR';

/**
 * A key→text map. Values are optional because a translated catalog is allowed to be
 * incomplete; `translate` is what turns a gap back into the pt-BR text.
 */
export type Catalog = Readonly<Record<string, string | undefined>>;

/** Interpolation values for the `{name}` placeholders in a catalog entry. */
export type TextParams = Readonly<Record<string, string | number>>;

/** Translates a key into the active language. See `useText` for the React side. */
export type Translate = (key: string, params?: TextParams) => string;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fills `{name}` placeholders. An unknown name is left as written rather than
 * replaced with `undefined`: a caller that forgot a parameter should show a visible
 * `{level}` in the UI, not silently print the word "undefined" to a user.
 */
function fill(template: string, params: TextParams): string {
  return template.replace(PLACEHOLDER, (placeholder, name) => {
    const value = params[name];
    return value == null ? placeholder : String(value);
  });
}

/**
 * Looks `key` up in `catalog`, then in `fallback`, and interpolates `params`.
 *
 * Returns the key itself when neither catalog has it. That is deliberately ugly and
 * deliberately not a throw: a missing key is a text bug, and taking the page down
 * over one would be worse than showing it. The typed `TextKey` in `src/app/i18n`
 * keeps it from happening in the first place.
 */
export function translate(catalog: Catalog, fallback: Catalog, key: string, params?: TextParams): string {
  const template = catalog[key] ?? fallback[key];
  if (template == null) return key;
  return params ? fill(template, params) : template;
}
