import { useMemo } from 'react';
import { LOCALES } from '../../app/core/i18n';
import { useServices } from '../services/application';
import { useLocale, useText } from '../state/use-text';
import { Select } from '../ui/select';

/**
 * The interface language, in the top bar.
 *
 * Each language names itself — Português, Español, English — rather than being named
 * in the language currently on screen: someone who opens the simulator in a language
 * they don't read has to be able to find their own in the list.
 */
export function LocaleSelect() {
  const services = useServices();
  const t = useText();
  const locale = useLocale();
  const options = useMemo(() => LOCALES.map(value => ({ value, label: t(`locale.${value}`) })), [t]);
  return <Select inputId="topbar-locale" ariaLabel={t('locale.label')} className="topbar-locale"
    options={options} optionLabel="label" optionValue="value" value={locale}
    onChange={value => { void services.locale.select(value); }} />;
}
