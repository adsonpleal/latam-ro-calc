import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * The four Barreira / Ravage Mágico garments, 480065-480068.
 *
 * All four were encoded as "MHP +1% per refine" where the description says "A cada 2 refinos,
 * MHP + 1%", which doubled the HP percentage — a +15 gave 15% instead of 7%. The four are one
 * subject because they were written from the same template and broke the same way, so the
 * check runs over all of them.
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

describe.each([
  ['480065 Manto Barreira Mágica', 480065],
  ['480066 Cachecol Barreira Mágica', 480066],
  ['480067 Manto Ravage Mágico', 480067],
  ['480068 Cachecol Ravage Mágico', 480068],
])('%s', (_name, id) => {
  it('raises MHP by 1%% per 2 refines, not per 1', () => {
    expect(wornBonus({ garment: id, garmentRefine: 0 })['hpPercent'] ?? 0).toBe(0);
    expect(wornBonus({ garment: id, garmentRefine: 2 })['hpPercent']).toBe(1);
    expect(wornBonus({ garment: id, garmentRefine: 9 })['hpPercent']).toBe(4);
    expect(wornBonus({ garment: id, garmentRefine: 15 })['hpPercent']).toBe(7);
  });
});
