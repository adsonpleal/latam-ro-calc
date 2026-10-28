import { describe, expect, it } from 'vitest';
import { isLocale, translate } from './i18n';

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

describe('translate', () => {
  const fallback = { greeting: 'Olá', only: 'Somente pt-BR', count: '{n} itens' };

  it('prefers the active catalog', () => {
    expect(translate({ greeting: 'Hola' }, fallback, 'greeting')).toBe('Hola');
  });

  it('falls back per key, so an incomplete translation shows Portuguese and not a key', () => {
    expect(translate({ greeting: 'Hola' }, fallback, 'only')).toBe('Somente pt-BR');
  });

  it('interpolates named placeholders', () => {
    expect(translate({ count: '{n} objetos' }, fallback, 'count', { n: 3 })).toBe('3 objetos');
    expect(translate({}, fallback, 'count', { n: 0 })).toBe('0 itens');
  });

  it('leaves a placeholder written out when its value is missing', () => {
    expect(translate({}, fallback, 'count', { other: 1 })).toBe('{n} itens');
  });

  it('answers the key itself when neither catalog has it, rather than throwing', () => {
    expect(translate({}, fallback, 'absent.key')).toBe('absent.key');
  });
});
