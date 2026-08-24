import { describe, expect, it } from 'vitest';
import { encodeBuild } from './share-codec';
import { buildSharePath, isShareToken, readShareToken, SHARE_PATH_PREFIX } from './share-path';

const ORIGIN = 'https://simulador.latam-tools.com.br';

describe('isShareToken', () => {
  it('accepts every character lz-string can emit after the +/. mapping', () => {
    expect(isShareToken('AZaz09')).toBe(true);
    expect(isShareToken('N4IgxgN.gA6.0A7')).toBe(true); // '.' stands in for '+'
    expect(isShareToken('a$b-c')).toBe(true);
  });

  it('rejects anything outside that alphabet', () => {
    for (const bad of ['a/b', 'a b', 'a%2Fb', 'a?b', 'a#b', 'a&b', 'a=b', '<script>']) {
      expect(isShareToken(bad)).toBe(false);
    }
  });

  it('rejects the empty string and a token past the length cap', () => {
    expect(isShareToken('')).toBe(false);
    expect(isShareToken(null)).toBe(false);
    expect(isShareToken(undefined)).toBe(false);
    expect(isShareToken('a'.repeat(4096))).toBe(true);
    expect(isShareToken('a'.repeat(4097))).toBe(false);
  });
});

describe('buildSharePath', () => {
  it('emits the canonical path with a trailing slash', () => {
    expect(buildSharePath('abc')).toBe('/s/abc/');
    expect(buildSharePath('abc')).toContain(SHARE_PATH_PREFIX);
  });

  // A token whose last lz-string symbol was '+' becomes one ending in '.', and chat
  // clients strip a trailing period as sentence punctuation. The slash absorbs it.
  it('keeps a token that ends in a dot away from the end of the URL', () => {
    expect(buildSharePath('N4Igxg.')).toBe('/s/N4Igxg./');
    expect(buildSharePath('N4Igxg.').endsWith('.')).toBe(false);
  });
});

describe('readShareToken', () => {
  it('reads the canonical path form, with or without the trailing slash', () => {
    expect(readShareToken(`${ORIGIN}/s/abc`)).toBe('abc');
    expect(readShareToken(`${ORIGIN}/s/abc/`)).toBe('abc');
    expect(readShareToken(`${ORIGIN}/s/abc#/`)).toBe('abc');
    expect(readShareToken(`${ORIGIN}/s/abc/#/`)).toBe('abc');
    expect(readShareToken('/s/abc/')).toBe('abc');
  });

  it('reads the proxied card image path', () => {
    expect(readShareToken(`${ORIGIN}/s/abc/og.png`)).toBe('abc');
  });

  it('still reads the legacy hash-query and plain-query forms', () => {
    expect(readShareToken(`${ORIGIN}/#/?b=abc`)).toBe('abc');
    expect(readShareToken(`${ORIGIN}/?b=abc`)).toBe('abc');
    expect(readShareToken(`${ORIGIN}/?foo=1&b=abc`)).toBe('abc');
    expect(readShareToken(`${ORIGIN}/#/?b=abc&x=1`)).toBe('abc');
  });

  it('prefers the path form when both are present', () => {
    expect(readShareToken(`${ORIGIN}/s/fromPath/#/?b=fromQuery`)).toBe('fromPath');
  });

  it('only matches /s/ at the start of the path', () => {
    expect(readShareToken(`${ORIGIN}/assets/s/notatoken`)).toBeNull();
  });

  it('returns null when there is nothing to read', () => {
    expect(readShareToken(`${ORIGIN}/`)).toBeNull();
    expect(readShareToken(`${ORIGIN}/s/`)).toBeNull();
    expect(readShareToken('')).toBeNull();
    expect(readShareToken(null)).toBeNull();
  });

  it('rejects a token that fails the alphabet or the length cap', () => {
    expect(readShareToken(`${ORIGIN}/?b=${'a'.repeat(5000)}`)).toBeNull();
    expect(readShareToken(`${ORIGIN}/?b=a%2Fb`)).toBeNull();
  });
});

describe('round trip against a real token', () => {
  // The point of the whole module: whatever encodeBuild emits must survive being
  // put in a path and read back out, unchanged, byte for byte.
  const builds = [
    { class: 4261, level: 285, jobLevel: 70 },
    { class: 4252, level: 200, jobLevel: 60, weapon: 700016, weaponRefine: 11, str: 130, pow: 60 },
    { class: 4211, level: 1, jobLevel: 1 },
  ];

  it.each(builds)('survives the path form (class %#)', (build) => {
    const token = encodeBuild(build);
    expect(isShareToken(token)).toBe(true);
    expect(readShareToken(`${ORIGIN}${buildSharePath(token)}`)).toBe(token);
  });

  it.each(builds)('survives the legacy hash form (class %#)', (build) => {
    const token = encodeBuild(build);
    expect(readShareToken(`${ORIGIN}/#/?b=${token}`)).toBe(token);
  });
});
