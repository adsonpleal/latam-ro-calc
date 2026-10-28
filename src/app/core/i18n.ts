/**
 * The i18n primitive: a locale, a catalog, and a lookup.
 *
 * Framework-free like the rest of `core` — the catalogs and the React layer both read
 * it, and `check-source.mjs` forbids a framework import here. Hand-written rather than
 * a dependency because the app needs two things: key lookup and `{name}` interpolation.
 * A library would add a loader, ICU plurals and a locale detector that nothing here
 * would call.
 */

/** Every locale the UI ships. pt-BR is first because it is the source. */
export const LOCALES = ['pt-BR', 'es', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * What each language calls itself, never translated.
 *
 * Deliberately not catalog keys: someone who opens the simulator in a language they
 * don't read has to find their own in the list, so the name must not follow the
 * language currently on screen. Keeping them here also means the three catalogs
 * cannot drift into "fixing" `Español` into `Spanish`.
 */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  'pt-BR': 'Português', es: 'Español', en: 'English',
};

/**
 * The source locale, and what the app opens in until someone picks otherwise.
 *
 * Its catalog is the one every key is written in first, it is bundled with the app
 * rather than loaded, and `loadCatalog` lays every translation over it — so a key a
 * translation has not reached yet shows up in Portuguese instead of as a key.
 *
 * The app deliberately does NOT read `navigator.language` yet. While most of the
 * interface is still only in Portuguese, opening in English for an English browser
 * reads as a broken translation rather than an absent one. Detection belongs in the
 * PR that finishes the interface, not before it.
 */
export const DEFAULT_LOCALE: Locale = 'pt-BR';

/**
 * A key→text map. Values are optional because a translated catalog is allowed to be
 * incomplete; `loadCatalog` is what turns a gap back into the pt-BR text.
 */
export type Catalog = Readonly<Record<string, string | undefined>>;

/** Interpolation values for the `{name}` placeholders in a catalog entry. */
export type TextParams = Readonly<Record<string, string | number>>;

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Fills `{name}` placeholders. An unknown name is left as written rather than
 * replaced with `undefined`: a caller that forgot a parameter should show a visible
 * `{level}` in the UI, not silently print the word "undefined" to a user.
 *
 * Exported because a few components take a template as a prop instead of a key
 * (`Table`'s `currentPageReportTemplate`), and those have to fill it the same way.
 */
export function fill(template: string, params: TextParams): string {
  return template.replace(PLACEHOLDER, (placeholder, name) => {
    const value = params[name];
    return value == null ? placeholder : String(value);
  });
}

/**
 * Looks `key` up in `catalog` and interpolates `params`.
 *
 * Returns the key itself when the catalog has not got it. That is deliberately ugly
 * and deliberately not a throw: a missing key is a text bug, and taking the page down
 * over one would be worse than showing it. The typed `TextKey` in `src/app/i18n`
 * keeps it from happening in the first place, and `loadCatalog` guarantees every
 * catalog carries the full pt-BR key set underneath.
 */
export function translate(catalog: Catalog, key: string, params?: TextParams): string {
  const template = catalog[key];
  if (template == null) return key;
  return params ? fill(template, params) : template;
}
