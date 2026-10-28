import { ReactNode, createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { DEFAULT_LOCALE, Locale, TextParams, translate } from '../../app/core/i18n';
import { DEFAULT_CATALOG, TextKey } from '../../app/i18n';
import { LocalePreferences, LocaleState } from '../services/locale';

/** Translates a key into the language the reader chose. Keys are typed by `pt-br.ts`. */
export type Text = (key: TextKey, params?: TextParams) => string;

const LocaleContext = createContext<LocalePreferences | null>(null);

// Without a provider the text is Portuguese. That keeps a `src/react/ui` primitive
// renderable on its own — the control specs mount them outside the application tree —
// instead of throwing the way `useServices` does.
const UNPROVIDED: LocaleState = { locale: DEFAULT_LOCALE, catalog: DEFAULT_CATALOG };
const noSubscribe = () => () => {};
const noSnapshot = () => UNPROVIDED;

export function LocaleProvider({ locale, children }: { locale: LocalePreferences; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocaleState(): LocaleState {
  const store = useContext(LocaleContext);
  return useSyncExternalStore(store?.subscribe ?? noSubscribe, store?.getSnapshot ?? noSnapshot);
}

/** The chosen language, for the selector and for locale-aware formatting. */
export function useLocale(): Locale {
  return useLocaleState().locale;
}

export function useText(): Text {
  const { catalog } = useLocaleState();
  return useMemo<Text>(() => (key, params) => translate(catalog, DEFAULT_CATALOG, key, params), [catalog]);
}
