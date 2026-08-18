import { describe, expect, it } from 'vitest';
import { targetReduction } from './target-reduction';

describe('targetReduction', () => {
  it('names the red aura when the aura is what reduces the damage', () => {
    const r = targetReduction({ isRedAura: true, relieveLevel: 0 });

    expect(r.label).toBe('Redução de aura (99,9%)');
    expect(r.multiplier).toBe(0.001);
  });

  // Reported from the formula trace: an Aliviar reduction was labelled as the aura's.
  it('names Aliviar when Aliviar is what reduces the damage', () => {
    const r = targetReduction({ isRedAura: false, relieveLevel: 10 });

    expect(r.label).toBe('Redução por Aliviar (99%)');
    expect(r.multiplier).toBeCloseTo(0.01, 10);
  });

  // The old label hard-coded 99,9% whatever was reducing the damage, so half the damage
  // gone read as almost all of it.
  it('reports the reduction the level actually applies', () => {
    expect(targetReduction({ isRedAura: false, relieveLevel: 5 }).label).toBe('Redução por Aliviar (50%)');
    expect(targetReduction({ isRedAura: false, relieveLevel: 1 }).label).toBe('Redução por Aliviar (10%)');
  });

  it('credits both when both are on, since they multiply', () => {
    const r = targetReduction({ isRedAura: true, relieveLevel: 10 });

    expect(r.label).toBe('Redução de aura e Aliviar (99,999%)');
    expect(r.multiplier).toBeCloseTo(0.00001, 10);
  });

  it('leaves an ordinary target alone, with nothing to label', () => {
    const r = targetReduction({ isRedAura: false, relieveLevel: 0 });

    expect(r).toEqual({ multiplier: 1, percent: 0, label: '' });
  });

  it('treats an out-of-range level as no Aliviar, since it arrives from saved data', () => {
    expect(targetReduction({ isRedAura: false, relieveLevel: 99 }).multiplier).toBe(1);
    expect(targetReduction({ isRedAura: false, relieveLevel: -1 }).multiplier).toBe(1);
  });
});
