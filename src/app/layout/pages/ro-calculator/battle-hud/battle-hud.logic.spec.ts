import { describe, expect, it } from 'vitest';
import {
  buildOptimizeInfo,
  computeCastbar,
  computeZeroPosWhatIf,
  deltaPercent,
  identifyCastBottleneck,
  pickBiggerDpsSide,
  pickHeroDamage,
} from './battle-hud.logic';

describe('computeCastbar', () => {
  it('splits sequential + parallel segment proportions relative to hitPeriod', () => {
    // fixa 0.2 + variável 0.5 + max(pós 2.52, recarga 1.0) = 3.22
    const r = computeCastbar({
      reducedFct: 0.2,
      reducedVct: 0.5,
      reducedAcd: 2.52,
      reducedCd: 1.0,
      castPeriod: 0.7,
      hitPeriod: 3.22,
      totalHitPerSec: 0.31,
    });
    expect(r.mode).toBe('sequential');
    expect(r.fixed!.percent).toBeCloseTo((0.2 / 3.22) * 100, 5);
    expect(r.variable!.percent).toBeCloseTo((0.5 / 3.22) * 100, 5);
    expect(r.parallel!.blockSeconds).toBe(2.52);
    expect(r.parallel!.blockPercent).toBeCloseTo((2.52 / 3.22) * 100, 5);
    // the three widths must fill the whole bar
    expect(r.fixed!.percent + r.variable!.percent + r.parallel!.blockPercent).toBeCloseTo(100, 5);
  });

  it('picks pós as the parallel winner when it is longer than recarga', () => {
    const r = computeCastbar({
      reducedFct: 0,
      reducedVct: 0,
      reducedAcd: 2.52,
      reducedCd: 1.0,
      castPeriod: 0,
      hitPeriod: 2.52,
      totalHitPerSec: 0.39,
    });
    expect(r.parallel!.winner).toBe('pos');
    // recharge lane fills proportionally to its share of the winning lane's duration
    expect(r.parallel!.recFillPercent).toBeCloseTo((1.0 / 2.52) * 100, 5);
  });

  it('picks recarga as the parallel winner when it is longer than pós', () => {
    const r = computeCastbar({
      reducedFct: 0,
      reducedVct: 0,
      reducedAcd: 0.5,
      reducedCd: 4,
      castPeriod: 0,
      hitPeriod: 4,
      totalHitPerSec: 0.25,
    });
    expect(r.parallel!.winner).toBe('recarga');
    expect(r.parallel!.recFillPercent).toBe(100);
  });

  it('zero-recarga case: recharge lane fill is 0 and pós alone wins', () => {
    const r = computeCastbar({
      reducedFct: 0.1,
      reducedVct: 0.1,
      reducedAcd: 1.5,
      reducedCd: 0,
      castPeriod: 0.2,
      hitPeriod: 1.7,
      totalHitPerSec: 0.58,
    });
    expect(r.mode).toBe('sequential');
    expect(r.parallel!.winner).toBe('pos');
    expect(r.parallel!.recFillPercent).toBe(0);
  });

  it('falls back to a single segment when hitEveryNSec forces blockPeriod to 0', () => {
    // calcSkillAspd: blockPeriod = hitEveryNSec > 0 ? 0 : ...; castPeriod = hitEveryNSec.
    // reducedAcd/reducedCd may still carry nonzero raw skill values, but must be ignored.
    const r = computeCastbar({
      reducedFct: 0,
      reducedVct: 0,
      reducedAcd: 1, // would normally contribute to the block, but hitEveryNSec forces it out
      reducedCd: 0,
      castPeriod: 0.5,
      hitPeriod: 0.5,
      totalHitPerSec: 2,
    });
    expect(r.mode).toBe('single');
    expect(r.single).toEqual({ seconds: 0.5, percent: 100 });
    expect(r.parallel).toBeUndefined();
  });
});

describe('identifyCastBottleneck', () => {
  it('flags pós as the bottleneck when it is the largest time-costing component', () => {
    expect(identifyCastBottleneck({ reducedFct: 0.2, reducedVct: 0.5, reducedAcd: 2.52, reducedCd: 1.0 })).toBe('pos');
  });

  it('flags recarga as the bottleneck when it outlasts pós', () => {
    expect(identifyCastBottleneck({ reducedFct: 0.1, reducedVct: 0.1, reducedAcd: 0.2, reducedCd: 3 })).toBe('recarga');
  });

  it('flags variável as the bottleneck when the cast itself dominates', () => {
    expect(identifyCastBottleneck({ reducedFct: 0.1, reducedVct: 3, reducedAcd: 0.2, reducedCd: 0 })).toBe('variavel');
  });
});

describe('computeZeroPosWhatIf', () => {
  it('computes the DPS gain from zeroing the after-cast delay', () => {
    // hitPeriod 3.22 -> newHitPeriod = castPeriod(0.7) + reducedCd(1.0) = 1.7
    const r = computeZeroPosWhatIf({ dps: 17480, hitPeriod: 3.22, castPeriod: 0.7, reducedCd: 1.0 })!;
    expect(r.newHitPeriod).toBeCloseTo(1.7, 5);
    expect(r.gainPercent).toBeCloseTo((3.22 / 1.7 - 1) * 100, 5);
    expect(r.newDps).toBeCloseTo(17480 * (3.22 / 1.7), 5);
  });

  it('returns null when the new hit period would be non-positive', () => {
    expect(computeZeroPosWhatIf({ dps: 100, hitPeriod: 1, castPeriod: 0, reducedCd: 0 })).toBeNull();
  });

  it('reports zero gain when pós was never the bottleneck (recarga unchanged)', () => {
    const r = computeZeroPosWhatIf({ dps: 500, hitPeriod: 2, castPeriod: 1, reducedCd: 1 })!;
    expect(r.newHitPeriod).toBe(2);
    expect(r.gainPercent).toBe(0);
  });
});

describe('buildOptimizeInfo', () => {
  it('bundles bottleneck, per-component hints, and the what-if together', () => {
    const info = buildOptimizeInfo({
      reducedFct: 0.2,
      reducedVct: 0.5,
      reducedAcd: 2.52,
      reducedCd: 1.0,
      castPeriod: 0.7,
      hitPeriod: 3.22,
      dps: 17480,
      sumDex2Int1: 985,
    });
    expect(info.bottleneck).toBe('pos');
    expect(info.components.map((c) => c.key)).toEqual(['fixa', 'variavel', 'pos', 'recarga']);
    expect(info.whatIf).not.toBeNull();
    expect(info.components.find((c) => c.key === 'variavel')!.hint).toContain('985 / 530');
    expect(info.isOptimized).toBe(false);
  });

  it('flags nothing to improve when fixa/variável/pós are all ~0 and the what-if gain is negligible', () => {
    // castPeriod (fixa+variável) = 0, blockPeriod = max(acd, cd) = recarga = 0.5 -> hitPeriod 0.5.
    // Zeroing pós (already 0) can't change hitPeriod, so the what-if reports 0% gain.
    const info = buildOptimizeInfo({
      reducedFct: 0,
      reducedVct: 0,
      reducedAcd: 0,
      reducedCd: 0.5,
      castPeriod: 0,
      hitPeriod: 0.5,
      dps: 1000,
      sumDex2Int1: 0,
    });
    expect(info.isOptimized).toBe(true);
    expect(info.headline).toBe('Ritmo já otimizado — nada relevante a melhorar.');
    expect(info.whatIf).toBeNull();
    expect(info.components.find((c) => c.key === 'fixa')!.doneText).toBe('já zerada ✓');
    expect(info.components.find((c) => c.key === 'variavel')!.doneText).toBe('já zerada ✓');
    expect(info.components.find((c) => c.key === 'pos')!.doneText).toBe('já zerada ✓');
    // Recarga is never reducible, so it never gets a "done" checkmark of its own.
    expect(info.components.find((c) => c.key === 'recarga')!.doneText).toBeNull();
  });

  it('shows the stats-met message for variável once DEX*2+INT reaches 530, regardless of leftover seconds', () => {
    const info = buildOptimizeInfo({
      reducedFct: 0.2,
      reducedVct: 0.01,
      reducedAcd: 0.3,
      reducedCd: 0.1,
      castPeriod: 0.21,
      hitPeriod: 0.51,
      dps: 1000,
      sumDex2Int1: 530,
    });
    const variavel = info.components.find((c) => c.key === 'variavel')!;
    expect(variavel.doneText).toBe('stats já zeram a conjuração variável ✓');
    expect(variavel.hint).toContain('530 / 530');
  });

  it('suppresses the what-if line when the projected DPS gain from zeroing pós is under 1%', () => {
    // Recarga (3.0) and pós (3.02) are nearly tied, so zeroing pós barely moves hitPeriod
    // (3.22 -> 3.2): ~0.625% gain, below the 1% threshold worth surfacing.
    const info = buildOptimizeInfo({
      reducedFct: 0.1,
      reducedVct: 0.1,
      reducedAcd: 3.02,
      reducedCd: 3.0,
      castPeriod: 0.2,
      hitPeriod: 3.22,
      dps: 1000,
      sumDex2Int1: 0,
    });
    expect(info.whatIf).toBeNull();
  });
});

describe('pickBiggerDpsSide', () => {
  it('picks current when it is larger', () => {
    expect(pickBiggerDpsSide(17480, 17040)).toBe('current');
  });

  it('picks simulated when it is larger', () => {
    expect(pickBiggerDpsSide(15000, 17040)).toBe('simulated');
  });

  it('ties when both sides are equal', () => {
    expect(pickBiggerDpsSide(1000, 1000)).toBe('tie');
  });
});

describe('pickHeroDamage', () => {
  it('uses base skill figures when no effected damage is present', () => {
    const r = pickHeroDamage({ skillDps: 1000, skillMinDamage: 100, skillMaxDamage: 200, effectedSkillDamageMin: 0 }, true);
    expect(r).toEqual({ dps: 1000, min: 100, max: 200, effected: false });
  });

  it('switches to effected figures when present and a chance is selected', () => {
    const r = pickHeroDamage(
      {
        skillDps: 1000,
        skillMinDamage: 100,
        skillMaxDamage: 200,
        effectedSkillDps: 1200,
        effectedSkillDamageMin: 150,
        effectedSkillDamageMax: 250,
      },
      true,
    );
    expect(r).toEqual({ dps: 1200, min: 150, max: 250, effected: true });
  });

  it('handles a missing dmg object', () => {
    expect(pickHeroDamage(undefined, true)).toEqual({ dps: 0, min: 0, max: 0, effected: false });
  });

  // Fix 10: unselecting the last Efeito leaves totalSummary.dmg.effectedSkillDamageMin
  // stale (parent pipeline skips the refresh) — hasSelectedChances=false must force the
  // base figures regardless of what's still sitting in the effected fields.
  it('falls back to base figures when no chance is selected, even if effected damage is still present', () => {
    const r = pickHeroDamage(
      {
        skillDps: 1000,
        skillMinDamage: 100,
        skillMaxDamage: 200,
        effectedSkillDps: 1200,
        effectedSkillDamageMin: 150,
        effectedSkillDamageMax: 250,
      },
      false,
    );
    expect(r).toEqual({ dps: 1000, min: 100, max: 200, effected: false });
  });
});

describe('deltaPercent', () => {
  it('computes a positive delta', () => {
    expect(deltaPercent(100, 120)).toBe(20);
  });

  it('computes a negative delta', () => {
    expect(deltaPercent(17480, 17040)).toBeCloseTo(((17040 - 17480) / 17480) * 100, 5);
  });

  it('returns null when current is 0', () => {
    expect(deltaPercent(0, 50)).toBeNull();
  });
});
