import { StorageLike } from '../../app/core/calc-storage';
import { Catalog, DEFAULT_LOCALE, Locale, isLocale } from '../../app/core/i18n';
import { DEFAULT_CATALOG, loadCatalog } from '../../app/i18n';
import { LatestRequest, Store } from '../state/store';

const STORAGE_KEY = 'ro-locale';

export interface LocaleState {
  locale: Locale;
  /** The catalog for `locale`. Never the one for a locale that was since replaced. */
  catalog: Catalog;
}

/**
 * What the chosen language needs from outside the app: the `<html lang>` to keep in
 * step with it. Behind an interface so the store can be unit-tested without a DOM.
 */
export interface LocaleEnvironment {
  setDocumentLanguage(locale: Locale): void;
}

export function browserLocaleEnvironment(): LocaleEnvironment {
  return {
    setDocumentLanguage(locale) {
      if (typeof document !== 'undefined') document.documentElement.lang = locale;
    },
  };
}

/**
 * The chosen interface language. A browser preference like `PreviewPreferences`, not
 * part of a saved or shared build: two people opening the same share link each read
 * it in their own language.
 */
export class LocalePreferences extends Store<LocaleState> {
  /** Resolved once the initial catalog is in. `mountApplication` awaits it. */
  readonly ready: Promise<void>;
  private readonly request = new LatestRequest();

  constructor(
    private readonly storage?: StorageLike,
    private readonly environment: LocaleEnvironment = browserLocaleEnvironment(),
  ) {
    // pt-BR is bundled, so the first snapshot is always complete: a stored `es`
    // renders Portuguese for the moment before its catalog lands, never raw keys.
    super({ locale: DEFAULT_LOCALE, catalog: DEFAULT_CATALOG });
    // An explicit choice, or Portuguese. See DEFAULT_LOCALE for why the browser's
    // own language is not consulted yet.
    const stored = storage?.getItem(STORAGE_KEY);
    this.ready = this.apply(isLocale(stored) ? stored : DEFAULT_LOCALE);
  }

  get locale(): Locale { return this.getSnapshot().locale; }

  /** Chooses `locale` and remembers it for the next visit. */
  select(locale: Locale): Promise<void> {
    if (!isLocale(locale) || locale === this.locale) return Promise.resolve();
    this.storage?.setItem(STORAGE_KEY, locale);
    return this.apply(locale);
  }

  dispose(): void { this.request.dispose(); }

  /**
   * Publishes locale and catalog together, so no render ever sees one without the
   * other. `LatestRequest` drops a catalog whose selection was already superseded.
   */
  private apply(locale: Locale): Promise<void> {
    return this.request.run(() => loadCatalog(locale), catalog => {
      this.set({ locale, catalog });
      this.environment.setDocumentLanguage(locale);
    });
  }
}
