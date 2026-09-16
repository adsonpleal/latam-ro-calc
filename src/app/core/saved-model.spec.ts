import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils/create-main-model';
import { normalizeSavedModel } from './saved-model';

describe('normalizeSavedModel', () => {
  it('fills a sparse share delta from the defaults', () => {
    const m = normalizeSavedModel({ class: 4252, level: 250, weapon: 1291 });
    expect(m.class).toBe(4252);
    expect(m.weapon).toBe(1291);
    expect(m.jobLevel).toBe(createMainModel().jobLevel);
    expect(Array.isArray(m.rawOptionTxts)).toBe(true);
  });

  it('returns a fresh default model for an empty save', () => {
    expect(normalizeSavedModel(null)).toEqual(createMainModel());
  });

  it('moves the legacy 51-56 option indexes down by 31', () => {
    const raw: string[] = [];
    raw[51] = 'atk:5';
    expect(normalizeSavedModel({ rawOptionTxts: raw }).rawOptionTxts[20]).toBe('atk:5');
  });

  it('never shares an object default between two builds', () => {
    const a = normalizeSavedModel({});
    const b = normalizeSavedModel({});
    expect(a.skillBuffMap).not.toBe(b.skillBuffMap);
  });
});
