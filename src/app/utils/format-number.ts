// pt-BR number formatting for the code paths that build display strings by hand.
//
// Angular templates get this for free from LOCALE_ID (app.module.ts) via the `number`
// pipe. But several places assemble their own strings — the damage-formula "Cálculo"
// rows, the bonus-breakdown rows, engine-built stage labels — and those would otherwise
// emit JS's default "1234.5" next to a pipe-formatted "1.234,5" on the same screen.
//
// Intl.NumberFormat instances are expensive to construct, so they're created once here
// rather than per call.

const LOCALE = 'pt-BR';

const formatCache = new Map<string, Intl.NumberFormat>();

/**
 * Formats a number in pt-BR: `1234.5` -> `"1.234,5"`. Non-finite input returns "0"
 * rather than "NaN"/"∞" leaking into the UI.
 *
 * Defaults to "up to 3 decimals, trailing zeros dropped", matching how the `number` pipe
 * is used across the app (`1.0-3` / `1.0-2` / `1.0-0`). Pass `min`/`max` to pin precision
 * (e.g. `formatNumber(1.5, 1, 1)` for a rate that should always read "1,5").
 */
export const formatNumber = (value: number, min = 0, max = 3): string => {
  if (!Number.isFinite(value)) return '0';
  const key = `${min}-${max}`;
  let fmt = formatCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: min, maximumFractionDigits: max });
    formatCache.set(key, fmt);
  }
  return fmt.format(value);
};

/** Same as formatNumber but with an explicit `+` on positives — for values whose whole
 *  point is the change they represent (equipment bonuses, the graph's "Adicional" chips). */
export const formatSignedNumber = (value: number, min?: number, max?: number): string => {
  const formatted = formatNumber(value, min, max);
  return value > 0 ? `+${formatted}` : formatted;
};

// Precision contract for DamageFormulaCalc rows: trim trailing zeros but keep up to 2
// decimals, so fractional intermediates (weapon statBonus, variance) stay honest instead
// of rounding to an integer that wouldn't reconcile with the row below. Shared because
// the engine (damage-calculator.ts) and the UI (battle-hud.logic.ts) each build rows that
// land side-by-side in the same dialog — they have to agree on precision.
export const formatCalcNumber = (value: number): string => formatNumber(value, 0, 2);

/**
 * Hits/uses per second, at the 2 decimals the engine stores them with (see
 * engineHitsPerSec). Shared because the same rate is printed by the VelAtq summary, the
 * "otimizar a conjuração" popover and the golpes/s chart — at two different precisions
 * before this existed, so a 5 hits/s build read "5,0/s" in one and "5" in the other.
 */
export const formatRate = (value: number): string => formatNumber(value, 0, 2);

export const formatSignedCalcNumber = (value: number): string => formatSignedNumber(value, 0, 2);
