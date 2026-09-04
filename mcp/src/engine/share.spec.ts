/**
 * The browser ↔ agent bridge: a build must survive the trip out to a share token and
 * back without changing what it calculates.
 */
import { describe, expect, it } from 'vitest';
import { loadDatasetFromDisk } from '../data/dataset.node';
import { BuildInput, resolveBuild } from './build-input';
import { applyPreset } from './preset';
import { projectResult } from './project';
import { readShareToken } from 'src/app/core/share-path';
import { buildShareUrl, parseShare, toPreset } from './share';
import { solve } from './solve';

const dataset = loadDatasetFromDisk();
const DUMMY_NEUTRAL = 21077;
const ORIGIN = 'https://simulador.latam-tools.com.br';

const project = (input: BuildInput) => {
  const rb = resolveBuild(input, dataset);
  const calc = solve(rb, dataset, dataset.monsters[DUMMY_NEUTRAL]);
  return { rb, out: projectResult(calc, rb) };
};

/** Solve, encode, decode, solve again — the projected result must be identical. */
const roundTrips = (input: BuildInput) => {
  const first = project(input);
  const url = buildShareUrl(toPreset(first.rb.model, first.rb.char), ORIGIN);
  const second = project({ share: url });
  return { url, a: first.out, b: second.out };
};

describe('share round-trip', () => {
  it('preserves a bare build', () => {
    const { a, b } = roundTrips({ class: 4261, level: 230, jobLevel: 47, stats: { int: 133, spl: 100, vit: 120 }, atkSkill: 'Poison Burst==5' });
    expect(b['damage']).toEqual(a['damage']);
    expect(b['stats']).toEqual(a['stats']);
    expect(b['build']).toEqual(a['build']);
  });

  it('preserves equipment, refines and cards', () => {
    const { a, b } = roundTrips({
      class: 4257,
      level: 200,
      jobLevel: 50,
      stats: { agi: 100, dex: 130, luk: 50, pow: 60, con: 40 },
      gear: { weapon: 700016, weaponRefine: 11, ammo: 1773 },
      atkSkill: 'Focused Arrow Strike==5',
    });
    expect(b['damage']).toEqual(a['damage']);
    expect(b['build']).toEqual(a['build']);
  });

  it('preserves buffs and consumables', () => {
    const { a, b } = roundTrips({
      class: 4261,
      level: 230,
      jobLevel: 47,
      stats: { int: 133, spl: 100 },
      atkSkill: 'Poison Burst==5',
      skills: { buffs: { Infection: 5 } },
      consumables: [12414],
    });
    expect(b['damage']).toEqual(a['damage']);
  });

  it('a token for a build with no comparison decodes to no comparison', () => {
    const { rb } = project({ class: 4261, level: 230, jobLevel: 47 });
    const url = buildShareUrl(toPreset(rb.model, rb.char), ORIGIN);
    expect(parseShare(url).compare).toBeNull();
  });

  it('carries a comparison when one is supplied', () => {
    const { rb } = project({ class: 4257, level: 200, jobLevel: 50, gear: { weapon: 700016, weaponRefine: 11 } });
    const compare = { itemNames: ['weapon'], model2: { weapon: 18186, weaponRefine: 9 } };
    const url = buildShareUrl(toPreset(rb.model, rb.char), ORIGIN, compare);

    const decoded = parseShare(url);
    expect(decoded.compare).toEqual(compare);
    // and the build itself is untouched by the comparison riding along
    expect(decoded.preset['weapon']).toBe(700016);
  });
});

describe('parseShare', () => {
  const { rb } = project({ class: 4261, level: 230, jobLevel: 47 });
  const url = buildShareUrl(toPreset(rb.model, rb.char), ORIGIN);
  const token = readShareToken(url) as string;

  it('accepts a full URL, a bare token and a hash fragment alike', () => {
    const fromUrl = parseShare(url).preset;
    expect(parseShare(token).preset).toEqual(fromUrl);
    expect(parseShare(`#/?b=${token}`).preset).toEqual(fromUrl);
    expect(parseShare(`http://localhost:4200/?b=${token}`).preset).toEqual(fromUrl);
  });

  it('accepts both URL forms, old and new', () => {
    const fromUrl = parseShare(url).preset;
    // The canonical form the share dialog hands out...
    expect(parseShare(`${ORIGIN}/s/${token}/`).preset).toEqual(fromUrl);
    expect(parseShare(`${ORIGIN}/s/${token}`).preset).toEqual(fromUrl);
    // ...and the legacy one, which must keep working for every link already pasted.
    expect(parseShare(`${ORIGIN}/#/?b=${token}`).preset).toEqual(fromUrl);
  });

  it('throws rather than silently calculating a default build', () => {
    expect(() => parseShare('')).toThrow(/vazio/);
    expect(() => parseShare('https://simulador.latam-tools.com.br/#/?b=obviously-not-a-token')).toThrow(/inválido|corrompido/);
  });
});

describe('applyPreset', () => {
  it('migrates the legacy 51..56 random-option slots down to 20..25', () => {
    const model = applyPreset({ class: 4261, rawOptionTxts: Object.assign([], { 51: 'atk:10', 56: 'matk:20' }) }) as any;
    expect(model.rawOptionTxts[20]).toBe('atk:10');
    expect(model.rawOptionTxts[25]).toBe('matk:20');
    expect(model.rawOptionTxts[51]).toBeUndefined();
  });

  it('restores omitted fields to their defaults', () => {
    const model = applyPreset({ class: 4261, level: 200 }) as any;
    // Empty equipment slots are `undefined`, not 0 — loadItemFromModel treats both as
    // "nothing equipped", but the distinction matters for the share codec, which drops
    // both as defaults.
    expect(model.weapon).toBeUndefined();
    expect(model.jobLevel).toBe(1);
    expect(Array.isArray(model.consumables)).toBe(true);
    expect(model.level).toBe(200);
  });
});
