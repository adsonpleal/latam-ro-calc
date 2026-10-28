import { ReactNode, createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { Locale, TextParams, translate } from '../../app/core/i18n';
import { TextKey } from '../../app/i18n';
import { LocalePreferences } from '../services/locale';

/** Translates a key into the language the reader chose. Keys are typed by `pt-br.ts`. */
export type Text = (key: TextKey, params?: TextParams) => string;

interface LocaleContextValue {
  locale: Locale;
  t: Text;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Subscribes to the chosen language once, here, and hands the whole tree one `t`.
 *
 * Deliberately not read off `useServices`, even though `services.locale` is reachable
 * there: a hook that subscribed per component would register a listener and build a
 * closure for every `Select`, `Table` and `Dialog` on screen, and give each a `t` of
 * its own identity — so no two consumers could share a memo keyed on it.
 */
export function LocaleProvider({ locale, children }: { locale: LocalePreferences; children: ReactNode }) {
  const state = useSyncExternalStore(locale.subscribe, locale.getSnapshot);
  const value = useMemo<LocaleContextValue>(() => ({
    locale: state.locale,
    t: (key, params) => translate(state.catalog, key, params),
  }), [state]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

function useLocaleContext(): LocaleContextValue {
  const value = useContext(LocaleContext);
  // Loud on purpose, like `useServices`. A subtree mounted outside the provider would
  // otherwise render Portuguese to a Spanish reader and look like a missing
  // translation rather than the wiring bug it is.
  if (!value) throw new Error('Views that read text require a LocaleProvider');
  return value;
}

/** The chosen language, for the selector and for locale-aware formatting. */
export function useLocale(): Locale {
  return useLocaleContext().locale;
}

export function useText(): Text {
  return useLocaleContext().t;
}
