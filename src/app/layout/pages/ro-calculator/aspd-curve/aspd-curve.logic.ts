import { ASPD_CAP, hitsPerSecCurve, round } from '../../../../utils';

/**
 * Chart-only helpers for the "Golpes por segundo" dialog — https://irowiki.org/wiki/ASPD.
 *
 * The rate itself lives in src/app/utils/aspd-hits-per-sec.ts, shared with the engine, so
 * the chart can't plot a curve the damage calculation no longer uses. What's here is only
 * what the chart adds on top: the landmark table and the "what would more VelAtq buy"
 * arithmetic.
 */

export interface AspdLandmark {
  /** A whole hits/s figure, for orientation on the curve. */
  hits: number;
  /** Lowest VelAtq that reaches it. */
  aspd: number;
}

/** Lowest VelAtq reaching `hits` hits/s: 50 / (200 - a) >= h  <=>  a >= 200 - 50/h. */
export const aspdForHits = (hits: number): number => Math.ceil(200 - 50 / hits);

/**
 * 1..7 hits/s and the VelAtq each needs — 150, 175, 184, 188, 190, 192, 193. These are
 * landmarks for reading the chart, NOT breakpoints: the rate is continuous, so every
 * point of VelAtq pays. (The same table appears on the iRO Wiki page.)
 */
export const ASPD_LANDMARKS: AspdLandmark[] = Array.from({ length: 7 }, (_, i) => ({
  hits: i + 1,
  aspd: aspdForHits(i + 1),
}));

export interface AspdGain {
  /** VelAtq after the increase, clamped to the cap. */
  aspd: number;
  /** Points actually gained — less than requested when the cap truncates the increase. */
  plus: number;
  hits: number;
  /** Extra hits/s the increase buys. */
  delta: number;
  /** That gain as a percentage of the current rate. */
  percent: number;
}

/**
 * What `plus` more VelAtq would be worth from here — the number that actually answers
 * "is this +VelAtq gear worth it?", since the answer depends entirely on the starting
 * point. Null once the build is already at the cap.
 */
export const gainFromAspd = (aspd: number, plus = 10): AspdGain | null => {
  if (aspd >= ASPD_CAP) return null;
  const target = Math.min(aspd + plus, ASPD_CAP);
  const current = hitsPerSecCurve(aspd);
  const hits = hitsPerSecCurve(target);
  return {
    aspd: target,
    plus: target - aspd,
    hits: round(hits, 2),
    delta: round(hits - current, 2),
    percent: round((hits / current - 1) * 100, 1),
  };
};
