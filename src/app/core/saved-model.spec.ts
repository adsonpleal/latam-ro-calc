import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils/create-main-model';
import { decodeBuild, encodeBuild } from './share-codec';
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

  it('restores the selected accumulation from a shared build', () => {
    const token = encodeBuild({ class: 4302, level: 200, jobLevel: 50, skillStacks: { 'Eternal Slash': 5, 'Crescive Bolt': 0 } });
    const restored = normalizeSavedModel(decodeBuild(token));
    expect(restored.skillStacks).toEqual({ 'Eternal Slash': 5, 'Crescive Bolt': 0 });
  });

  // The per-tile counts say how many of Florescer's twenty flowers landed, and they were
  // being written to the token and then dropped on the way back in: the loop above only
  // restores keys `createMainModel()` declares, and `rotationStacks` was not one of them.
  // A single-tab build reopened with every tile at its default. Card mkvqph0HW51cDiRaXxKS.
  it('restores the per-tile counts of a single-rotation build', () => {
    const token = encodeBuild({ class: 4252, level: 250, jobLevel: 70, rotation: ['All Bloom==5', 'All Bloom==5'], rotationStacks: [12, 20] });
    const restored = normalizeSavedModel(decodeBuild(token));
    expect(restored.rotationStacks).toEqual([12, 20]);
  });

  // Board card EaFyaPWUTldpRPFX7YMs: the stat foods used to be one per stat, so a build
  // shared back then carries `consumables2` indexed by stat, with a hole wherever a stat
  // was left empty. They are a plain set of chosen ids now, and the link has to come back
  // with exactly the foods it was shared with — no buff gained, none lost.
  it('loads a stat-food selection shared before the two foods could stack', () => {
    const token = encodeBuild({ class: 4252, level: 250, jobLevel: 70, consumables2: [null, null, 12431, null, 14620] });
    const restored = normalizeSavedModel(decodeBuild(token));
    expect(restored.consumables2).toEqual([12431, 14620]);
  });

  it('keeps a stick and a dish of the same stat, and never repeats one', () => {
    const restored = normalizeSavedModel({ consumables2: [14616, 12429, 14616] });
    expect(restored.consumables2).toEqual([14616, 12429]);
  });
});
