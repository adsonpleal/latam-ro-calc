import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * Varmund's elemental rune gear from Varmundt's Biosphere, a `preRelease` family since
 * 14/09/2026 (https://hazyforest.com/dungeons:varmundts_biosphere).
 *
 * Each rune manteau pays its set line only with the armor *and* the boots of its own
 * element. The records carried that on name-based `EQUIP[...]`, under Thai-era names
 * ("Varmundt Plain Rune …") that the divine-pride English replaces ("Varmund Grass Rune …"),
 * so they moved to `EQUIP_ID` in the same change. A three-piece set must not fire on two.
 */

const GRASS_ARMOR = 450201;
const GRASS_BOOTS = 470108;
const GRASS_MANTEAU = 480145;
const FIRE_BOOTS = 470109;

/** The Max HP % the manteau adds on top of what the other worn pieces already pay. */
const manteauHpPercent = (worn: Parameters<typeof wornBonus>[0]) =>
  (wornBonus(worn)['hpPercent'] ?? 0) - (wornBonus({ ...worn, garment: undefined })['hpPercent'] ?? 0);

describe('Varmund Grass Rune set', () => {
  it('pays Max HP +10% with the Grass armor and the Grass boots', () => {
    expect(manteauHpPercent({ garment: GRASS_MANTEAU, armor: GRASS_ARMOR, boot: GRASS_BOOTS })).toBe(10);
  });

  it('pays nothing on two of the three pieces', () => {
    expect(manteauHpPercent({ garment: GRASS_MANTEAU, armor: GRASS_ARMOR })).toBe(0);
    expect(manteauHpPercent({ garment: GRASS_MANTEAU, boot: GRASS_BOOTS })).toBe(0);
  });

  it('pays nothing with boots of another element', () => {
    expect(manteauHpPercent({ garment: GRASS_MANTEAU, armor: GRASS_ARMOR, boot: FIRE_BOOTS })).toBe(0);
  });
});
