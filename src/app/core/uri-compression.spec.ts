import { describe, expect, it } from 'vitest';
import fixtures from './uri-compression.fixtures.json';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from './uri-compression';
import { decodeShared, encodeBuild } from './share-codec';
import { decodeCustomBundle, encodeCustomBundle } from './custom-item-library';
import { CustomItemDefinition } from './custom-items';

describe('historical URI compression format', () => {
  for (const { input, output } of fixtures.encode) {
    it(`preserves encoding of ${input.slice(0, 40) || 'empty string'}`, () => {
      expect(compressToEncodedURIComponent(input)).toBe(output);
      expect(decompressFromEncodedURIComponent(output)).toBe(input);
    });
  }
  for (const { input, output } of fixtures.decode) {
    it(`preserves decoding of ${input.slice(0, 40) || 'empty token'}`, () => {
      expect(decompressFromEncodedURIComponent(input)).toBe(output);
    });
  }
  it('preserves null and query-string space handling', () => {
    expect(compressToEncodedURIComponent(null)).toBe('');
    expect(decompressFromEncodedURIComponent(null)).toBe('');
    const text = '日本語 🐉 ação';
    expect(decompressFromEncodedURIComponent(compressToEncodedURIComponent(text).replace(/\+/g, ' '))).toBe(text);
  });
  it('preserves historical build links with and without comparisons', () => {
    for (const { preset, compare, token } of fixtures.builds) {
      expect(encodeBuild(preset, compare)).toBe(token);
      expect(decodeShared(token)).toEqual({ preset, compare });
    }
  });
  it('preserves saved custom-item bundle tokens', () => {
    const items = fixtures.customBundle.items as CustomItemDefinition[];
    expect(encodeCustomBundle(items)).toBe(fixtures.customBundle.token);
    expect(decodeCustomBundle(fixtures.customBundle.token)).toEqual(items);
  });
});
