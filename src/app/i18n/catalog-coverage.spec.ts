import { describe, expect, it } from 'vitest';
import { LOCALES } from '../core/i18n';
import { TranslatedCatalog, loadCatalog } from '.';
import { ptBR } from './pt-br';

/**
 * `TranslatedCatalog` is `Partial` so a key added mid-PR falls back to Portuguese
 * instead of breaking the page. This spec is the other half of that deal: a key is
 * allowed to be missing at runtime, not allowed to ship missing. Add a key to
 * `pt-br.ts` and these fail until `es.ts` and `en.ts` carry it too.
 *
 * It deliberately does not assert that a translation *differs* from the source:
 * Resultados, Equipar, Carta de Arma and Pet are each the right word in more than
 * one of these languages, so that check is a list of exceptions, not a defect test.
 */
const sourceKeys = Object.keys(ptBR);
const translated = LOCALES.filter(locale => locale !== 'pt-BR');

describe('translated catalogs', () => {
  it('ships a catalog for every locale but the source one', () => {
    expect(translated).toEqual(['es', 'en']);
  });

  it.each(translated)('%s covers every key pt-BR defines', async locale => {
    const catalog = await loadCatalog(locale) as TranslatedCatalog;
    expect(sourceKeys.filter(key => catalog[key] == null)).toEqual([]);
  });

  it.each(translated)('%s defines nothing pt-BR does not', async locale => {
    const catalog = await loadCatalog(locale);
    expect(Object.keys(catalog).filter(key => !(key in ptBR))).toEqual([]);
  });
});
