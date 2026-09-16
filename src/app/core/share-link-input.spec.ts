import { describe, expect, it } from 'vitest';
import { isShortLink, parseShareInput } from './share-link-input';

const SHORT = 'https://short.latam-tools.com.br';
const TOKEN = 'N4IgzgxgTg9gJgLgAoEMA2BXAtgI0.';

describe('parseShareInput', () => {
  it('reads the canonical /s/<token>/ form, trailing dot included', () => {
    expect(parseShareInput(`https://simulador.latam-tools.com.br/s/${TOKEN}/`, SHORT)).toEqual({ kind: 'token', token: TOKEN, slug: null });
  });

  it('reads the legacy #/?b= form', () => {
    expect(parseShareInput(`https://simulador.latam-tools.com.br/#/?b=${TOKEN}`, SHORT)).toEqual({ kind: 'token', token: TOKEN, slug: null });
  });

  it('accepts a bare token and a link wrapped in angle brackets', () => {
    expect(parseShareInput(`  ${TOKEN} `, SHORT)).toEqual({ kind: 'token', token: TOKEN, slug: null });
    expect(parseShareInput(`<https://simulador.latam-tools.com.br/s/${TOKEN}/>`, SHORT)).toEqual({ kind: 'token', token: TOKEN, slug: null });
  });

  it('reports a short link by its slug, ignoring trailing punctuation and a query', () => {
    expect(parseShareInput(`${SHORT}/x7Kf2a`, SHORT)).toEqual({ kind: 'short', token: null, slug: 'x7Kf2a' });
    expect(parseShareInput(`${SHORT}/x7Kf2a.`, SHORT)).toEqual({ kind: 'short', token: null, slug: 'x7Kf2a' });
    expect(parseShareInput(`${SHORT}/x7Kf2a?utm_source=discord`, SHORT)).toEqual({ kind: 'short', token: null, slug: 'x7Kf2a' });
  });

  it('rejects empty text and other sites', () => {
    expect(parseShareInput('', SHORT)).toBeNull();
    expect(parseShareInput(null, SHORT)).toBeNull();
    expect(parseShareInput('https://example.com/page', SHORT)).toBeNull();
    expect(parseShareInput(`${SHORT}/`, SHORT)).toBeNull();
    expect(parseShareInput('olá mundo', SHORT)).toBeNull();
  });
});

describe('isShortLink', () => {
  it('is false for a share URL, even on the shortener host', () => {
    expect(isShortLink(`${SHORT}/abc`, SHORT)).toBe(true);
    expect(isShortLink(`${SHORT}/s/${TOKEN}/`, SHORT)).toBe(false);
    expect(isShortLink(`${SHORT}-evil.com/abc`, SHORT)).toBe(false);
  });
});
