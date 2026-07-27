import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { decodeBuild, decodeShared, dropDefaults, encodeBuild } from './share-codec';

const preset = { class: 4261, level: 230, jobLevel: 50, weapon: 700016, weaponRefine: 11, str: 0, agi: 0 };

describe('dropDefaults', () => {
  it('drops defaults but keeps the always-keep set', () => {
    expect(dropDefaults(preset, new Set(['class', 'level', 'jobLevel']))).toEqual({
      class: 4261,
      level: 230,
      jobLevel: 50,
      weapon: 700016,
      weaponRefine: 11,
    });
  });

  it('drops empty arrays and objects, keeps populated ones', () => {
    expect(dropDefaults({ a: [], b: [0, 0], c: [0, 5], d: {}, e: { x: 1 }, f: '' })).toEqual({ c: [0, 5], e: { x: 1 } });
  });

  it('tolerates null/undefined input', () => {
    expect(dropDefaults(null)).toEqual({});
    expect(dropDefaults(undefined)).toEqual({});
  });
});

describe('encodeBuild / decodeShared', () => {
  it('round-trips a build with no comparison', () => {
    const out = decodeShared(encodeBuild(preset));
    expect(out?.preset).toEqual({ class: 4261, level: 230, jobLevel: 50, weapon: 700016, weaponRefine: 11 });
    expect(out?.compare).toBeNull();
  });

  it('round-trips a build with a comparison', () => {
    const compare = { itemNames: ['weapon', 'armor'], model2: { weapon: 1291, weaponRefine: 9, rawOptionTxts: [] } };
    const out = decodeShared(encodeBuild(preset, compare));

    expect(out?.compare).toEqual({ itemNames: ['weapon', 'armor'], model2: { weapon: 1291, weaponRefine: 9 } });
    // the build itself is unaffected by the comparison riding along
    expect(out?.preset).toEqual(decodeShared(encodeBuild(preset))?.preset);
  });

  it('keeps tokens for uncompared builds byte-identical to the no-comparison encoding', () => {
    // Guards the wire format: adding the comparison must cost nothing when unused,
    // so every link shared before this change still encodes the same way.
    const bare = encodeBuild(preset);
    expect(encodeBuild(preset, null)).toBe(bare);
    expect(encodeBuild(preset, undefined)).toBe(bare);
    expect(encodeBuild(preset, { itemNames: [], model2: { weapon: 1 } })).toBe(bare);
  });

  it('sparse-ifies model2 rather than carrying its ~180 default fields', () => {
    const fat = { itemNames: ['weapon'], model2: { weapon: 1291, armor: 0, shield: null, boot: 0, rawOptionTxts: [] } };
    const lean = { itemNames: ['weapon'], model2: { weapon: 1291 } };
    expect(encodeBuild(preset, fat)).toBe(encodeBuild(preset, lean));
  });

  it('sanitizes a corrupt comparison to null instead of throwing', () => {
    for (const cmp of [{ i: 'nope', m: {} }, { i: [], m: {} }, { i: ['weapon'] }, { i: ['weapon'], m: 'x' }, 'junk', 7]) {
      const token = compressToEncodedURIComponent(JSON.stringify({ ...preset, __cmp: cmp })).replace(/\+/g, '.');
      const out = decodeShared(token);
      expect(out?.compare).toBeNull();
      expect(out?.preset['class']).toBe(4261);
    }
  });

  it('returns null for absent or invalid tokens', () => {
    expect(decodeShared(null)).toBeNull();
    expect(decodeShared(undefined)).toBeNull();
    expect(decodeShared('')).toBeNull();
    expect(decodeShared('not-a-real-token')).toBeNull();
  });
});

describe('decodeBuild', () => {
  it('still returns just the preset, with the comparison key stripped', () => {
    const compare = { itemNames: ['weapon'], model2: { weapon: 1291 } };
    const build = decodeBuild(encodeBuild(preset, compare));

    expect(build).toEqual({ class: 4261, level: 230, jobLevel: 50, weapon: 700016, weaponRefine: 11 });
    expect(Object.keys(build ?? {})).not.toContain('__cmp');
  });

  it('reads a token written before the comparison existed', () => {
    const legacy = compressToEncodedURIComponent(JSON.stringify({ class: 4261, level: 230, jobLevel: 50 })).replace(/\+/g, '.');
    expect(decodeBuild(legacy)).toEqual({ class: 4261, level: 230, jobLevel: 50 });
  });
});
