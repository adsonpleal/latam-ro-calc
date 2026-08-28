import { describe, expect, it } from 'vitest';
import { formatNumber, formatSignedNumber } from './format-number';

describe('formatNumber', () => {
  it('groups thousands with "." and marks decimals with "," (pt-BR)', () => {
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(1234567.891)).toBe('1.234.567,891');
    expect(formatNumber(1234.5)).toBe('1.234,5');
  });

  it('uses a real "." as the group separator, not a non-breaking space', () => {
    // Some locales (fr-FR) group with U+00A0, which would break string comparisons and
    // copy/paste. pt-BR must not.
    expect(formatNumber(1000).charCodeAt(1)).toBe(46);
  });

  it('drops trailing zeros by default but honours an explicit precision', () => {
    expect(formatNumber(1000)).toBe('1.000');
    expect(formatNumber(1000, 2, 2)).toBe('1.000,00');
    expect(formatNumber(1.5, 1, 1)).toBe('1,5');
    expect(formatNumber(1234.567, 0, 2)).toBe('1.234,57');
  });

  it('leaves values under 1000 ungrouped', () => {
    expect(formatNumber(999)).toBe('999');
    expect(formatNumber(-300)).toBe('-300');
  });

  it('returns "0" for non-finite input instead of leaking NaN/Infinity into the UI', () => {
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(Infinity)).toBe('0');
  });

  it('never prints negative zero', () => {
    // "Pós-conjuração -0%": bonusValueText negates a reduction stat for display, so a
    // build with no cast reduction at all reached Intl as -0.
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(-0, 3, 3)).toBe('0,000');
    expect(formatSignedNumber(-0)).toBe('0');
  });
});

describe('formatSignedNumber', () => {
  it('prefixes positives with "+" and leaves the native "-" on negatives', () => {
    expect(formatSignedNumber(1234)).toBe('+1.234');
    expect(formatSignedNumber(-1234)).toBe('-1.234');
  });

  it('does not sign zero', () => {
    expect(formatSignedNumber(0)).toBe('0');
  });
});
