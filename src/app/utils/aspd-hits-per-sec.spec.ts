import { describe, expect, it } from 'vitest';
import { ASPD_CAP, engineHitsPerSec, hitsPerSecCurve, MAX_HITS_PER_SEC } from './aspd-hits-per-sec';

describe('aspd hits per second', () => {
  // https://irowiki.org/wiki/ASPD#Hits_per_Second lists TWO formulas. The engine uses the
  // general one, 50 / (200 - ASPD), which is what the wiki's own "Number of Hits / ASPD
  // Required" table is built from. The longer table further down that section comes from
  // 1000 / ((200 - ASPD) * 10 + 70) — an iRO-only variant with an extra 70ms of attack
  // motion, flagged as such on the page. The two only agree at ASPD 193, so don't check
  // this curve against that table.
  it('follows 50 / (200 - VelAtq)', () => {
    const table: [number, number][] = [
      [193, 7.14],
      [190, 5],
      [188, 4.17],
      [184, 3.13],
      [175, 2],
      [150, 1],
      [125, 0.67],
    ];

    for (const [aspd, hits] of table) {
      expect(hitsPerSecCurve(aspd)).toBeCloseTo(hits, 1);
    }
  });

  // Ground truth: the auto-attack packets' attack motion, with adelay = 2 * amotion.
  // Sampled from 61.320 auto-attacks across 358 recordings.
  it('matches the rate implied by the recorded attack motions', () => {
    const observed: [number, number][] = [
      [70, 193],
      [80, 192],
      [90, 191],
      [100, 190],
      [130, 187],
      [210, 179],
    ];

    for (const [attackMotionMs, aspd] of observed) {
      expect(engineHitsPerSec(aspd)).toBeCloseTo(500 / attackMotionMs, 2);
    }
  });

  it('rounds to 2 decimals, and is never stepped', () => {
    expect(engineHitsPerSec(193)).toBe(7.14);
    expect(engineHitsPerSec(190)).toBe(5);
    expect(engineHitsPerSec(175)).toBe(2);
    expect(engineHitsPerSec(174)).toBe(1.92);
    expect(engineHitsPerSec(152)).toBe(1.04);
    // Below VelAtq 150 the rate really is under 1 hit/s — the old clamp hid that.
    expect(engineHitsPerSec(100)).toBe(0.5);
  });

  it('rewards every point of VelAtq, unlike the old floored value', () => {
    // Across the range builds actually live in, every single point moves the rate the
    // engine stores — where the floor used to hand out nothing for 24 points in a row.
    for (let aspd = 150; aspd < ASPD_CAP; aspd++) {
      expect(engineHitsPerSec(aspd + 1)).toBeGreaterThan(engineHitsPerSec(aspd));
    }
  });

  it('never goes backwards, and the raw curve always moves', () => {
    // Below VelAtq ~150 the curve is flat enough that 2-decimal rounding can tie two
    // adjacent points (0,51 twice). That costs ~1% of a sub-1-hit/s rate and only
    // affects builds far under any real one, so the 2 decimals stay — but the value
    // must still never decrease.
    for (let aspd = 0; aspd < ASPD_CAP; aspd++) {
      expect(engineHitsPerSec(aspd + 1)).toBeGreaterThanOrEqual(engineHitsPerSec(aspd));
      expect(hitsPerSecCurve(aspd + 1)).toBeGreaterThan(hitsPerSecCurve(aspd));
    }
  });

  it('caps at 7,14 hits/s', () => {
    expect(MAX_HITS_PER_SEC).toBe(7.14);
    expect(engineHitsPerSec(ASPD_CAP)).toBe(MAX_HITS_PER_SEC);
  });
});
