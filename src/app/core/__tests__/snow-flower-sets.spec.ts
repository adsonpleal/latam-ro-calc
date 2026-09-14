import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * The Snow Flower gear from Episode 19 (Issgard), a `preRelease` family since 14/09/2026
 * (https://hazyforest.com/episodes:19_issgard_land_of_snow_flower).
 *
 * The records came from the Thai calculator with their set lines on `EQUIP[Snow Flower X]`,
 * which names the piece without the "[1]" its record carries — so no Snow Flower set bonus
 * could ever fire. They are on `EQUIP_ID` now; this pins each pairing both ways: paid with
 * the partner, absent without it, and absent with the *other* partner of the same slot.
 */

const ARMOR = 450206;
const ROBE = 450207;
const MANTEAU = 480159;
const MUFFLER = 480160;
const BOOTS = 470115;
const SHOES = 470116;

describe('Snow Flower sets', () => {
  it('Armor + Manteau: ATK +50', () => {
    const alone = wornBonus({ armor: ARMOR });
    const set = wornBonus({ armor: ARMOR, garment: MANTEAU });
    const wrongGarment = wornBonus({ armor: ARMOR, garment: MUFFLER });

    expect(alone['atk']).toBe(130);
    expect(set['atk']).toBe(180);
    expect(wrongGarment['atk']).toBe(130);
  });

  it('Armor + Muffler: global cooldown -10%', () => {
    expect(wornBonus({ armor: ARMOR })['acd'] ?? 0).toBe(0);
    expect(wornBonus({ armor: ARMOR, garment: MUFFLER })['acd']).toBe(10);
    expect(wornBonus({ armor: ARMOR, garment: MANTEAU })['acd'] ?? 0).toBe(0);
  });

  it('Manteau + Boots: critical damage +15%, Manteau + Shoes: variable cast -15%', () => {
    expect(wornBonus({ garment: MANTEAU, boot: BOOTS })['criDmg']).toBe(15);
    expect(wornBonus({ garment: MANTEAU, boot: SHOES })['criDmg'] ?? 0).toBe(0);

    expect(wornBonus({ garment: MANTEAU })['vct'] ?? 0).toBe(0);
    expect(wornBonus({ garment: MANTEAU, boot: SHOES })['vct']).toBe(15);
  });

  it('Boots + Armor: ATK +7%, Boots + Robe: ASPD +7%', () => {
    expect(wornBonus({ boot: BOOTS, armor: ARMOR })['atkPercent']).toBe(7);
    expect(wornBonus({ boot: BOOTS, armor: ROBE })['atkPercent'] ?? 0).toBe(0);
    expect(wornBonus({ boot: BOOTS, armor: ROBE })['aspdPercent']).toBe(7);
  });
});
