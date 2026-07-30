import { round } from './round';

/**
 * Attack speed as hits per second — the one owner of the rate, shared by the engine
 * (damage-calculator.getBasicAspd), the VelAtq cap (_character-base.calcAspd) and the
 * "Golpes por segundo" chart, so a change here can't leave one of them behind.
 *
 * The relation is a hyperbola, not a line: `50 / (200 - VelAtq)`. It approaches infinity
 * as VelAtq approaches 200, which is why the last few points are worth far more than the
 * first few.
 *
 * Verified against 61.320 auto-attack packets from 358 recordings: those packets carry
 * the server's attack motion and, since `adelay = 2 * amotion`, the real rate is
 * `500 / attackMT` — identical to the formula below, and fractional in 99,6% of
 * observations (70ms -> 7,14/s at the cap, 130ms -> 3,85/s, ...). It used to be floored
 * to an integer here, which understated DPS by up to ~22% at mid VelAtq.
 */

/** Hard cap on VelAtq — `calcAspd` clamps its result here, which is also what keeps
 *  `200 - aspd` safely positive for every caller below. */
export const ASPD_CAP = 193;

/** The continuous curve. Undefined behaviour at/above 200, which VelAtq can't reach. */
export const hitsPerSecCurve = (aspd: number): number => 50 / (200 - aspd);

/**
 * The rate the engine stores and every consumer displays. Rounded to 2 decimals rather
 * than kept at full float precision so the summary, the DPS step-by-step popover and the
 * MCP output all show and multiply the same number — the breakdown has to reconcile with
 * the total. Below VelAtq ~150 that rounding can tie two adjacent points; that costs ~1%
 * of a sub-1-hit/s rate and is far below any real build.
 */
export const engineHitsPerSec = (aspd: number): number => round(hitsPerSecCurve(aspd), 2);

/** Rate at the VelAtq cap: 7,14 hits/s. */
export const MAX_HITS_PER_SEC = engineHitsPerSec(ASPD_CAP);
