import { describe, expect, it } from 'vitest';
import { LOCALES, LOCALE_NAMES, fill, isLocale, translate } from './i18n';

describe('isLocale', () => {
  it('rejects anything that is not a shipped locale, including junk from storage', () => {
    expect(isLocale('pt-BR')).toBe(true);
    expect(isLocale('es')).toBe(true);
    expect(isLocale('pt')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(isLocale(7)).toBe(false);
  });
});

describe('LOCALE_NAMES', () => {
  it('names every shipped locale, so the selector can never show a blank row', () => {
    expect(LOCALES.filter(locale => !LOCALE_NAMES[locale])).toEqual([]);
  });
});

describe('fill', () => {
  it('replaces named placeholders', () => {
    expect(fill('{n} de {total}', { n: 3, total: 9 })).toBe('3 de 9');
  });

  it('leaves a placeholder written out when its value is missing', () => {
    expect(fill('{n} itens', { other: 1 })).toBe('{n} itens');
  });

  it('fills the same placeholder everywhere it appears', () => {
    expect(fill('{n} de {n}', { n: 2 })).toBe('2 de 2');
  });
});

describe('translate', () => {
  const catalog = { greeting: 'Olá', count: '{n} itens' };

  it('looks a key up', () => {
    expect(translate(catalog, 'greeting')).toBe('Olá');
  });

  it('interpolates named placeholders', () => {
    expect(translate(catalog, 'count', { n: 3 })).toBe('3 itens');
  });

  it('answers the key itself when the catalog has not got it, rather than throwing', () => {
    expect(translate(catalog, 'absent.key')).toBe('absent.key');
  });
});
