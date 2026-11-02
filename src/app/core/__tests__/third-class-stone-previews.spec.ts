import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The eleven third-class Visual-enchant families of Topo/Meio/Baixo stones that kRO ships
 * in Costume Enchant Stone boxes 25-30 and LATAM has not — tracker card vR5h55mOQVjZvABbndcz.
 *
 * All 33 records were already in item.json, imported with their scripts but with no way to
 * reach them: a stone shows up in a picker only when it is in latam-items.json or carries
 * `preRelease`, and these had neither. So this is the flag plus the dpRO English text for
 * the six that still held the Thai description (311356-311361); the scripts came with the
 * import and are left as they were, except for the two clauses below.
 *
 * Two set clauses the dpRO prose spells out had no script key at all — the "2% chance to
 * restore 1% of damage as SP" on 311361 (with Ranger Stone (Garment)) and on 311462 (with
 * Star Emperor Stone (Garment)). They are `spDrain`, a display-only key, so they name the
 * magnitude and not the trigger chance (docs/item-json.md §3.4).
 *
 * Six more hidden stones were deliberately left unflagged: Magic Power (310664-310667),
 * Critical (311354) and Concentration (311355) are already on LATAM under their re-issued
 * ids (1000527-1000530, 1000855, 1000856), so flagging the old generation would only put a
 * second, Prévia-labelled copy of a stone players already own in the picker. The last test
 * here holds that line.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const UPPER = ['costumeEnchantUpper', 71] as const;
const MIDDLE = ['costumeEnchantMiddle', 72] as const;
const LOWER = ['costumeEnchantLower', 73] as const;

/** Model field and itemSubTypeId of each stone's slot. */
const SLOT: Record<number, readonly [string, number]> = {
  311356: UPPER, 311357: MIDDLE, 311358: LOWER, // Archbishop
  311359: UPPER, 311360: MIDDLE, 311361: LOWER, // Ranger
  311427: UPPER, 311428: MIDDLE, 311429: LOWER, // Sura
  311430: UPPER, 311431: MIDDLE, 311432: LOWER, // Mechanic
  311433: UPPER, 311434: MIDDLE, 311435: LOWER, // Guillotine Cross
  311460: UPPER, 311461: MIDDLE, 311462: LOWER, // Star Emperor
  311463: UPPER, 311464: MIDDLE, 311465: LOWER, // Rebellion
  311466: UPPER, 311467: MIDDLE, 311468: LOWER, // Soul Reaper
  311912: UPPER, 311913: MIDDLE, 311914: LOWER, // Kagerou
  311915: UPPER, 311916: MIDDLE, 311917: LOWER, // Oboro
  311918: UPPER, 311919: MIDDLE, 311920: LOWER, // Summoner
};

/**
 * The garment stones the sets pair with, each named in both generations — the old
 * 25xxx/310xxx id and the re-issued 29xxx/1000xxx one — as the family requires.
 */
const ARCHBISHOP = [25709, 29516] as const;
const ARCHBISHOP_II = [310011, 1000019] as const;
const RANGER = [25416, 29431] as const;
const RANGER_II = [310003, 1000011] as const;
const SURA = [25412, 29426] as const;
const SURA_II = [25797, 29427] as const;
const MECHANIC = [25497, 29484] as const;
const MECHANIC_II = [310007, 1000015] as const;
const GUILLOTINE_CROSS = [25717, 29524] as const;
const GUILLOTINE_CROSS_II = [310188, 1000221] as const;
const STAR_EMPEROR = [25849, 29658] as const;
const REBELLION = [25858, 29667] as const;
const SOUL_REAPER = [25842, 29654] as const;
const KAGEROU = [25853, 29662] as const;
const OBORO = [25854, 29663] as const;
const DORAM = [25862, 29671] as const;

/** Equip a stone (and optionally a garment stone) and read the summed bonus back. */
function worn(
  stone: number | null,
  opts: { skills?: Array<[string, number]>; garment?: number } = {},
): Record<string, number> {
  const items: Record<number, any> = {};
  const model: any = { ...createMainModel(), level: 200 };

  if (stone !== null) {
    items[stone] = db[stone];
    model[SLOT[stone][0]] = stone;
  }
  if (opts.garment) {
    items[opts.garment] = db[opts.garment];
    model.costumeEnchantGarment = opts.garment;
  }

  const calc = makeCalculator(items).setLearnedSkills(new Map(opts.skills ?? []));

  return equipStatusOf(calc, model);
}

/** What `stone` adds on top of the garment stone worn by itself. */
function setBonus(stone: number, garment: number, key: string): number {
  return (worn(stone, { garment })[key] ?? 0) - (worn(null, { garment })[key] ?? 0);
}

describe('third-class costume-enchant stone previews', () => {
  it.each(Object.keys(SLOT).map(Number))('%i is a preview in its costume-enchant slot', (id) => {
    expect(db[id]).toMatchObject({ id, preRelease: true, itemTypeId: 6, itemSubTypeId: SLOT[id][1] });
    expect(latam[id], `${id} is on LATAM — drop the flag instead`).toBeUndefined();
    // preRelease rows have no pt-BR overlay, so the English text is the only one there is.
    expect(db[id].description).toMatch(/[A-Za-z]/);
    expect(db[id].description, `${id} still carries the Thai description`).not.toMatch(/[฀-๿]/);
  });

  it.each([
    [311356, 'Clementia', 'acd', 3],
    [311357, 'Laudaagnus', 'vct', 3],
    [311358, 'Expiatio', 'fct', 0.1],
    [311360, 'Trap Research', 'vct', 1],
    [311361, 'Fear Breeze', 'range', 2],
    [311428, 'Gentle Touch - Alive', 'melee', 2],
    [311429, 'Gentle Touch - Opposite', 'range', 2],
    [311430, 'Fire Earth Research', 'vct', 1],
    // The Mechanic (Meio) clause pays melee and ranged alike.
    [311431, 'Madogear License', 'melee', 1],
    [311431, 'Madogear License', 'range', 1],
    [311432, 'Axe Mastery', 'acd', 1],
    [311434, 'Dark Illusion', 'melee', 2],
    [311435, 'Cross Ripper Slasher', 'range', 2],
    [311460, 'Blessing of Moon', '2576', 3],
    [311461, 'Blessing of Sun', 'melee', 2],
    [311462, 'Blessing of Star', '2584', 4],
    // Rebellion (Topo): size damage and Dragon Tail, both off Platinum Altar.
    [311463, 'Platinum Altar', 'p_size_all', 2],
    [311463, 'Platinum Altar', '2566', 4],
    [311464, 'Fire Rain', 'range', 2],
    // Rebellion (Baixo): Fire Dance and Hammer of God, both off Heat Barrel ("Hot Barrel").
    [311465, 'Hot Barrel', '2561', 4],
    [311465, 'Hot Barrel', '2571', 4],
    [311466, 'Espa', 'm_my_element_all', 1],
    [311467, 'Eswhoo', 'm_size_all', 1],
    [311912, 'Righthand Mastery', 'p_size_all', 2],
    [311913, '16th Night', 'range', 2],
    [311914, 'Pure Soul', '3007', 5],
    [311915, 'Righthand Mastery', 'm_size_all', 2],
    [311916, 'Pure Soul', 'spPercent', 3],
    // Oboro (Baixo): Flaming Petals, Freezing Spear and Wind Blade off 16th Night.
    [311917, '16th Night', '534', 4],
    [311917, '16th Night', '537', 4],
    [311917, '16th Night', '540', 4],
    // Summoner (Topo): one clause per skill, each on its own meter.
    [311918, 'Picky Peck', '5036', 5],
    [311918, 'Silvervine Stem Spear', '5028', 5],
    [311919, 'Frash Shrimp', 'vct', 2],
    [311920, 'Arclouse Dash', 'range', 2],
  ] as const)('%i scales %s by %s per level', (id, skill, key, perLevel) => {
    expect(worn(id)[key] ?? 0).toBe(0);
    expect(worn(id, { skills: [[skill, 1]] })[key]).toBeCloseTo(perLevel);
    expect(worn(id, { skills: [[skill, 5]] })[key]).toBeCloseTo(perLevel * 5);
  });

  it('scales the stones whose clause counts every second learned level', () => {
    // "For every 2 skill level of Main Ranger learned, reduces global cooldown by 1%."
    expect(worn(311359, { skills: [['Main Ranger', 1]] }).acd ?? 0).toBe(0);
    expect(worn(311359, { skills: [['Main Ranger', 4]] }).acd).toBe(2);
    // "For every 2 level of Rising Dragon, reduce fixed casting time by 0.1 seconds."
    expect(worn(311427, { skills: [['Rising Dragon', 4]] }).fct).toBeCloseTo(0.2);
    // "For every 2 levels of New Poison Research, reduces global cooldown by 1%."
    expect(worn(311433, { skills: [['New Poison Research', 4]] }).acd).toBe(2);
  });

  it.each([
    [311356, ARCHBISHOP, 'm_my_element_all', 15],
    [311356, ARCHBISHOP_II, 'm_size_all', 15],
    [311357, ARCHBISHOP, '2040', 15], // Adoramus
    [311357, ARCHBISHOP_II, '2038', 15], // Judex
    [311358, ARCHBISHOP, 'm_race_all', 15],
    [311358, ARCHBISHOP_II, 'm_my_element_all', 15],
    [311359, RANGER, 'cd__5002', 45], // No Limits cooldown, in seconds
    [311359, RANGER_II, '382', 15], // Focused Arrow Strike
    [311360, RANGER, '2233', 15], // Arrow Storm
    [311360, RANGER_II, '2236', 15], // Aimed Bolt
    [311361, RANGER, 'spDrain', 1],
    [311361, RANGER_II, 'p_size_all', 15],
    [311427, SURA, '2518', 20], // Lightning Ride
    [311427, SURA_II, '2336', 15], // Knuckle Arrow
    [311428, SURA, '2518', 20],
    [311428, SURA_II, '2330', 15], // Tiger Cannon
    [311429, SURA, '2332', 15], // Rampage Blast
    [311429, SURA_II, '2336', 15],
    [311430, MECHANIC, '2280', 15], // Axe Tornado
    [311430, MECHANIC_II, '2256', 15], // Knuckle Boost
    [311431, MECHANIC, '2278', 15], // Axe Boomerang
    [311431, MECHANIC_II, '2261', 15], // Arm Cannon
    [311432, MECHANIC, '2279', 15], // Power Swing
    [311432, MECHANIC_II, '2258', 15], // Vulcan Arm
    [311433, GUILLOTINE_CROSS, '2037', 15], // Cross Ripper Slasher
    [311433, GUILLOTINE_CROSS_II, '2029', 15], // Counter Slash
    [311434, GUILLOTINE_CROSS, '2036', 15], // Rolling Cutter
    [311434, GUILLOTINE_CROSS_II, '2022', 15], // Cross Impact
    [311435, GUILLOTINE_CROSS, '2037', 15],
    [311435, GUILLOTINE_CROSS_II, 'p_race_all', 15],
    [311460, STAR_EMPEROR, '2579', 15], // New Moon Kick
    [311461, STAR_EMPEROR, '2592', 15], // Solar Burst
    [311462, STAR_EMPEROR, 'spDrain', 1],
    [311463, REBELLION, '2554', 15], // Vanishing Buster
    [311464, REBELLION, '2565', 15], // Round Trip
    [311465, REBELLION, 'fct', 0.5],
    [311467, SOUL_REAPER, '2604', 15], // Eswhoo
    [311468, SOUL_REAPER, 'fct', 0.5],
    [311912, KAGEROU, '3009', 25], // Swirling Petal
    [311913, KAGEROU, '3004', 25], // Cross Slash
    [311914, KAGEROU, '3007', 25], // Kunai Splash
    [311915, OBORO, '537', 25], // Freezing Spear
    [311915, OBORO, '540', 25], // Wind Blade
    [311916, OBORO, '536', 30], // Exploding Dragon
    [311917, OBORO, 'vct', 15],
    [311918, DORAM, 'fct', 0.5],
    [311919, DORAM, '5028', 25], // Catnip Meteor
    [311920, DORAM, '5036', 25], // Lunatic Carrot Beat
  ] as const)('%i with %j pays %s', (stone, garments, key, value) => {
    expect(worn(stone)[key] ?? 0).toBe(0);
    for (const garment of garments) {
      expect(setBonus(stone, garment, key)).toBeCloseTo(value);
    }
  });

  it('leaves the stones LATAM already has under a re-issued id unflagged', () => {
    // The re-issue on the right is the one LATAM ships.
    const twinned = [
      [310664, 1000528], [310665, 1000529], [310666, 1000530], [310667, 1000527],
      [311354, 1000855], [311355, 1000856],
    ] as const;

    for (const [oldGen, reissue] of twinned) {
      expect(latam[reissue], `${reissue} should be the LATAM copy`).toBeDefined();
      expect(db[oldGen].preRelease, `${oldGen} duplicates ${reissue}`).toBeUndefined();
      expect(latam[oldGen]).toBeUndefined();
    }
  });
});
