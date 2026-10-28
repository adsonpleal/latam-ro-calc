/**
 * The catalogs and how they are loaded.
 *
 * The primitive (`Locale`, `translate`) lives in `src/app/core/i18n.ts`; this module
 * is the only place that knows which catalogs exist.
 */
import { Catalog, Locale } from '../core/i18n';
import { ptBR } from './pt-br';

/**
 * Every key the UI can ask for. pt-BR is the source catalog, so a key only a
 * translation has is a type error there rather than a string that silently never
 * resolves.
 */
export type TextKey = keyof typeof ptBR;

/** Bundled, not loaded: it is what every catalog is laid over, and must be synchronous. */
export const DEFAULT_CATALOG: Catalog = ptBR;

/** A translation may be incomplete — `loadCatalog` fills the gaps with pt-BR. */
export type TranslatedCatalog = Partial<Record<TextKey, string>>;

/**
 * Dynamic imports, so a visitor reading Portuguese never downloads the other two.
 * `build-web.mjs` runs esbuild with `splitting: true`, so each becomes its own chunk.
 */
const loaders: Partial<Record<Locale, () => Promise<{ catalog: TranslatedCatalog }>>> = {
  es: () => import('./es'),
  en: () => import('./en'),
};

/**
 * The catalog for `locale`, laid over pt-BR so every key resolves to text.
 *
 * Doing the fallback once here rather than on every lookup is what keeps `translate`
 * a plain map read: a key the translation has not reached yet is already Portuguese
 * by the time anything asks for it.
 */
export async function loadCatalog(locale: Locale): Promise<Catalog> {
  const load = loaders[locale];
  return load ? { ...ptBR, ...(await load()).catalog } : DEFAULT_CATALOG;
}
