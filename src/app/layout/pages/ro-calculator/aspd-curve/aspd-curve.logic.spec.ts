import { describe, expect, it } from 'vitest';
import { ASPD_LANDMARKS, aspdForHits, gainFromAspd } from './aspd-curve.logic';
import { ASPD_CAP, hitsPerSecCurve } from '../../../../utils';

// The rate itself is tested in src/app/utils/aspd-hits-per-sec.spec.ts, against the same
// function the engine calls. What's here is only the chart's own arithmetic.
describe('aspd-curve.logic', () => {
  it('lists the wiki landmarks', () => {
    expect(ASPD_LANDMARKS).toEqual([
      { hits: 1, aspd: 150 },
      { hits: 2, aspd: 175 },
      { hits: 3, aspd: 184 },
      { hits: 4, aspd: 188 },
      { hits: 5, aspd: 190 },
      { hits: 6, aspd: 192 },
      { hits: 7, aspd: 193 },
    ]);
  });

  it('has every landmark be the lowest VelAtq reaching its rate', () => {
    for (const { hits, aspd } of ASPD_LANDMARKS) {
      expect(hitsPerSecCurve(aspd)).toBeGreaterThanOrEqual(hits);
      expect(hitsPerSecCurve(aspd - 1)).toBeLessThan(hits);
    }
  });

  it('rounds a fractional requirement up (183.33 -> 184)', () => {
    expect(aspdForHits(3)).toBe(184);
    expect(aspdForHits(5)).toBe(190);
  });

  it('prices +10 VelAtq differently depending on where the build sits', () => {
    // The whole point of the hyperbola: the same +10 is worth far more up high.
    expect(gainFromAspd(150)).toMatchObject({ aspd: 160, hits: 1.25, percent: 25 });
    expect(gainFromAspd(180)).toMatchObject({ aspd: 190, hits: 5, percent: 100 });
  });

  it('clamps the what-if to the cap and reports the points actually gained', () => {
    expect(gainFromAspd(190)).toMatchObject({ aspd: ASPD_CAP, plus: 3, hits: 7.14 });
    expect(gainFromAspd(150)).toMatchObject({ plus: 10 });
  });

  it('has nothing left to offer at the cap', () => {
    expect(gainFromAspd(ASPD_CAP)).toBeNull();
  });
});
