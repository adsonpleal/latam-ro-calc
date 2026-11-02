import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The hundred Visual-enchant stones kRO ships and LATAM has not, swept out of the 44
 * Costume Enchant Stone boxes for tracker card vR5h55mOQVjZvABbndcz — reported by
 * Samuel Costa. They are previews (`preRelease`), so the name and description are the
 * English text divine-pride publishes, which is the convention for an item that has not
 * launched here (docs/item-json.md).
 *
 * Every number comes off that item's own divine-pride page: the English prose when it
 * states the step ("every level" / "every 2 levels"), and the parsed server script when
 * the two disagree, which is the tie-break PR #84 set.
 *
 * What the tables below hold: PREVIEW is every id and its slot, NO_BONUS the subset of it
 * that carries no bonus at all, and SETS and SCALED are one relation in two shapes — the
 * sets the Garment's prose declares, flat and skill-scaled. They are the record of what
 * the source said, so they stay literal; deriving them from item.json would make the test
 * circular. They do NOT cover the stones' unconditional bonuses: `setBonus` cancels those
 * by construction, so a clause missing from them is not necessarily an oversight.
 *
 * A set belongs to the piece whose own description declares it (docs/item-json.md §6).
 * For the fourth-class families that is the Garment: its prose spells out all three sets
 * with the Upper/Middle/Lower trio, while the trio's prose is silent and the set turns up
 * only in the parsed script. 314184 is the clearest case — it names Mace & Book Mastery
 * for the physical half and Fidus Animus for the magical one, where the trio's page shows
 * only `temp` and `temp2`. 312402 is the exception that proves the rule: its prose
 * declares sets with the Paladin, High Wizard and Stalker stones, so there the trio's own
 * clauses are the only declaration there is.
 *
 * Only the older generation of each stone is registered, which is what PR #84 and the
 * rest of the family already do. So an `EQUIP_ID` clause here names the one generation
 * that exists: `costume-enchant-combo-migration.spec.ts` derives the `||` group from
 * item.json itself, failing both an id the database does not have and a missing id that
 * it does — it is the guard for that rule, and it covers these rows too.
 *
 * `315056` (Fox Footprints) is the one stone from the sweep that is NOT here: its page
 * states no slot, and a slot cannot be guessed.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const FIELD_BY_SUB: Record<number, string> = {
  71: 'costumeEnchantUpper', 72: 'costumeEnchantMiddle', 73: 'costumeEnchantLower',
  74: 'costumeEnchantGarment', 75: 'costumeEnchantGarment4', 76: 'costumeEnchantGarment2',
};

/** [id, itemSubTypeId] — the slot each page names, grouped by family. */
const PREVIEW: Array<[number, number]> = [
  [25206, 71], // Electric Effect
  [311426, 74], // Spell Magic Attack Stone
  [311469, 74], // Melee Physical Attack Stone
  [311470, 74], // Range Physical Attack Stone
  [311921, 71], [311922, 72], [311923, 73], [311924, 74], // Defense / Resist Defense
  [312398, 74], // Shinkiro
  [312399, 74], // Shiranui
  [312400, 74], // Shadow Cross
  [312401, 74], // Cardinal
  [312402, 74], [312403, 71], [312404, 72], [312405, 73], // Super Novice
  [312476, 74], // Sky Emperor
  [312477, 74], // Elemental Master
  [312478, 74], // Meister
  [312692, 74], // Abyss Chaser
  [312693, 74], // Troubadour & Trouvere
  [312694, 74], // Hyper Novice
  [313059, 74], // Dragon Knight
  [313060, 74], // Imperial Guard
  [313324, 74], // Biolo
  [313325, 74], // Inquisitor
  [313326, 74], // Spirit Handler
  [313359, 74], // Arch Mage
  [313360, 74], // Windhawk
  [313361, 74], // Soul Ascetic
  [313726, 71], [313727, 72], [313728, 73], [313735, 74], // Rune Knight II / Dragon Knight II
  [313729, 71], [313730, 72], [313731, 73], [313736, 74], // Wander Mins II / Troubadour II
  [313732, 71], [313733, 72], [313734, 73], [313737, 74], // Summoner II / Spirit Handler II
  [314021, 71], [314022, 72], [314023, 73], [314024, 74], // Guillotine Cross II / Shadow Cross II
  [314025, 71], [314026, 72], [314027, 73], [314028, 74], // Sura II / Inquisitor II
  [314029, 71], [314030, 72], [314031, 73], [314032, 74], // Soul Reaper II / Soul Ascetic II
  [314181, 71], [314182, 72], [314183, 73], [314184, 74], // Archbishop II / Cardinal II
  [314188, 74], // Abyss Chaser II
  [314189, 71], [314190, 72], [314191, 73], [314192, 74], // Super Novice II / Hyper Novice II
  [314670, 71], [314671, 72], [314672, 73], [314667, 74], // Warlock II / Arch Mage II
  [314673, 71], [314674, 72], [314675, 73], [314668, 74], // Genetic II / Biolo II
  [314676, 71], [314677, 72], [314678, 73], [314669, 74], // Star Emperor II / Sky Emperor II
  [315060, 71], [315061, 72], [315062, 73], [315057, 74], // Mechanic II / Meister II
  [315063, 71], [315064, 72], [315065, 73], [315058, 74], // Royal Guard II / Imperial Guard II
  [315066, 71], [315067, 72], [315068, 73], [315059, 74], // Rebellion II / Night Watch II
  [314853, 71], [314854, 72], [314855, 73], [314848, 74], // Karnos
  [314850, 71], [314851, 72], [314852, 73], // Druid
  [1002623, 75], // Blue Star Footprints
  [1002624, 75], // Sacred Blue Light Footprints
  [1002822, 75], // [Footprints] Flower Garden
  [1002830, 75], // Fox Footprints (Garment)
  [1002855, 75], // Cherry Blossom Footprints
  [1002856, 75], // Sprout Footprints
];

/**
 * Stones that carry no bonus at all, registered for the picker alone — the precedent is
 * the "% conversão" enchants, whose effect the description promises and the engine never
 * reads. The graphical ones have nothing to read; the Karnos and Druid stones scale
 * skills of two classes the Skill Catalogue does not have yet, so every one of their
 * clauses stayed in the description.
 */
const NO_BONUS = [
  25206, // Electric Effect
  1002623, 1002624, 1002822, 1002830, 1002855, 1002856, // footprints
  314848, 314853, 314854, 314855, // Karnos
  314850, 314851, 314852, // Druid
];

/**
 * [garment, partner, key, value] — a set the Garment's own prose declares at a flat
 * value, one row per pair, read off that garment's page.
 */
const SETS: Array<[number, number, string, number]> = [
  [311426, 310664, 'sMatk', 1], [311426, 310665, 'sMatk', 1], [311426, 310666, 'sMatk', 1],
  [311426, 1000921, 'sMatk', 5], // Spell (Dual), the re-issued generation
  [311469, 310327, 'pAtk', 1], [311469, 310328, 'pAtk', 1], [311469, 310329, 'pAtk', 1],
  [311469, 1001055, 'pAtk', 5], // Power (Dual)
  [311470, 310325, 'pAtk', 1], [311470, 25061, 'pAtk', 1], [311470, 310326, 'pAtk', 1],
  [311470, 311355, 'pAtk', 5], // Concentration
  [311924, 1001172, 'res', 15], [311924, 1001172, 'mres', 15], // Sabsta (Dual)
  [312398, 311913, '5484', 10], [312398, 311912, '5485', 10],
  [312399, 311915, '5488', 10], [312399, 311917, '5490', 10],
  [312400, 311434, '5289', 10], [312400, 311433, '5292', 10],
  [312401, 311358, '5273', 10], [312401, 311356, '5284', 10],
  [312402, 25710, 'def', 120], // Paladin Stone (Upper) — declared by 312402's own prose
  [312476, 311461, '5466', 10], [312476, 311462, '5467', 15],
  [312477, 311012, '5371', 10], [312477, 311011, '5372', 10],
  [312478, 311432, '6002', 15], [312478, 311430, '6003', 10],
  [312692, 311364, '5316', 15], [312692, 311363, '5322', 10],
  [312693, 311006, '5353', 10], [312693, 311007, '5355', 15],
  [312694, 312404, '5456', 10], [312694, 312405, '5457', 10],
  [313059, 310882, '5208', 10], [313059, 310883, '5213', 15],
  [313060, 310887, '5267', 15], [313060, 310888, 'm_size_all', 10],
  [313324, 311010, '5340', 10], [313324, 311009, '6006', 10],
  [313325, 311429, '5241', 10], [313325, 311428, '5244', 10],
  [313326, 311918, '5435', 15], [313326, 311920, '5437', 10],
  [313359, 310885, '5217', 10], [313359, 310884, '5220', 10],
  [313360, 311361, '5330', 10], [313360, 311360, '5334', 15],
  [313361, 311466, '5426', 15], [313361, 311467, '5427', 10], [313361, 311468, '5430', 10],
  [313735, 313727, '6001', 10], [313735, 313728, '6502', 15],
  [313736, 313730, '5356', 10], [313736, 313731, '6521', 15],
  [313737, 313732, '5445', 10], [313737, 313734, '5446', 15], [313737, 313733, 'sMatk', 3],
  [314024, 314021, '5287', 10], [314024, 314022, '5289', 10],
  [314028, 314026, '5252', 10], [314028, 314027, 'hpPercent', 5],
  [314032, 314031, '5424', 20], [314032, 314029, '5425', 10], [314032, 314030, 'sMatk', 3],
  [314184, 314183, '5277', 10], [314184, 314182, '5283', 15],
  [314188, 314186, '5320', 15], [314188, 314187, '6513', 15],
  [314192, 314190, '5452', 10],
  [314667, 314671, '5218', 10], [314667, 314670, '5222', 10],
  [314668, 314675, '6509', 15], [314668, 314674, '6510', 15],
  [314669, 314676, '5469', 10], [314669, 314677, '5470', 10], [314669, 314678, '5503', 15],
  [315057, 315060, '6004', 10], [315057, 315062, '6507', 15],
  [315058, 315063, '5265', 15], [315058, 315064, '6503', 10],
  [315059, 315067, '5408', 10], [315059, 315066, '5500', 10],
];

/**
 * [garment, partner, key, skill, step, perStep] — the same relation as SETS, for the sets
 * whose value scales with a learned skill. `step` is the "every N levels" the page states;
 * getting it wrong halves or doubles the bonus, which is why every row carries it.
 */
const SCALED: Array<[number, number, string, string, number, number]> = [
  [312398, 311914, 'range', 'Infiltration', 1, 3],
  [312399, 311916, 'vct', 'Melting', 1, 3],
  [312400, 311435, 'cRate', 'Shadow Sense', 1, 1],
  [312401, 311357, 'm_my_element_holy', 'Fidus Animus', 2, 3],
  [312402, 25454, '2038', 'Transcendence', 1, 3], // High Wizard Stone (Middle), Judex
  [312402, 25492, '2005', 'Break Through', 1, 3], // Stalker Stone (Lower), Wind Cutter
  [312476, 311460, 'cri', 'War Book Mastery', 2, 1],
  [312476, 311460, 'cRate', 'War Book Mastery', 2, 1],
  [312477, 311013, 'm_element_all', 'Spell Enchanting', 1, 3],
  [312478, 311431, 'p_size_all', 'Two Hand Defending', 2, 3],
  [312692, 311362, 'p_size_all', 'Dagger & Bow Mastery', 2, 3],
  [312693, 311005, 'p_element_all', 'Stage Manner', 1, 3],
  [312694, 312403, 'm_element_all', 'Jack Frost Nova', 2, 3],
  [313060, 310889, 'm_element_all', 'Shield Mastery', 2, 3],
  [313324, 311008, 'p_element_all', 'Bionic Pharmacy', 1, 3],
  [313325, 311427, 'p_element_all', 'Will of Faith', 2, 3],
  [313326, 311919, 'p_race_all', 'Mystical Creature Mastery', 2, 3],
  [313359, 310886, 'm_size_all', 'Two hand Staff Mastery', 2, 3],
  [313735, 313726, 'p_size_all', 'Dragonic Aura', 2, 3],
  [313736, 313729, 'm_element_all', 'Stage Manner', 1, 3],
  [314024, 314023, 'p_race_all', 'Cross Slash (Shadow Cross)', 1, 3],
  [314028, 314025, 'p_size_all', 'Third Exor Flame', 1, 3],
  [314032, 314030, 'fct', 'Talisman of Soul Stealing', 1, 0.1],
  [314184, 314181, 'p_race_all', 'Mace & Book Mastery', 2, 3],
  [314184, 314181, 'm_race_all', 'Fidus Animus', 2, 3],
  [314188, 314185, 'p_size_all', 'Dagger & Bow Mastery', 2, 3],
  [314192, 314189, 'p_element_all', 'Self Study Tactics', 2, 3],
  [314192, 314191, 'melee', 'Angel of Power', 1, 15], // the client's "Breaking Limit"
  [314667, 314672, 'm_size_all', 'Two hand Staff Mastery', 2, 3],
  [314668, 314673, 'p_element_all', 'Bionic Pharmacy', 1, 3],
  [314669, 314676, 'p_element_all', 'Sky Mastery', 2, 3],
  [315057, 315061, 'p_size_all', 'Two Hand Defending', 2, 3],
  [315058, 315065, 'p_element_all', 'Spear & Sword Mastery', 2, 3],
  [315059, 315068, 'p_size_all', 'PFI', 2, 3],
  [315059, 315068, 'fct', 'PFI', 2, 0.1],
];

/** Each family's pieces: the Garment and every partner the two tables name for it. */
const FAMILY = new Map<number, number[]>();
for (const [garment, partner] of [...SETS, ...SCALED] as Array<[number, number]>) {
  FAMILY.set(garment, [...new Set([...(FAMILY.get(garment) ?? []), partner])]);
}

/** Wear any number of stones, each in the slot its own record names. */
function worn(ids: number[], skills: Array<[string, number]> = []): Record<string, number> {
  const items: Record<number, any> = {};
  const model: any = { ...createMainModel(), level: 200 };

  for (const id of ids) {
    items[id] = db[id];
    model[FIELD_BY_SUB[db[id].itemSubTypeId]] = id;
  }

  return equipStatusOf(makeCalculator(items).setLearnedSkills(new Map(skills)), model);
}

/** What the pair adds over each piece worn alone — the set bonus and nothing else. */
function setBonus(a: number, b: number, key: string, skills: Array<[string, number]> = []): number {
  const alone = (worn([a], skills)[key] ?? 0) + (worn([b], skills)[key] ?? 0);
  return (worn([a, b], skills)[key] ?? 0) - alone;
}

describe('costume-enchant stone previews', () => {
  it('leaves the slotless Fox Footprints unregistered', () => {
    expect(db[315056]).toBeUndefined();
  });

  it('covers the whole sweep', () => {
    // The catalogue-side count is the per-slot tuple in costume-enchant-stone-reissues
    // .spec.ts, which already names these 100; this one guards the table against an edit.
    expect(PREVIEW).toHaveLength(100);
    expect(NO_BONUS.filter((id) => !PREVIEW.some(([p]) => p === id))).toEqual([]);

    // Every other preview carries a bonus, so a record that silently lost its script
    // shows up here rather than passing as one of the deliberately empty ones.
    const bonusless = PREVIEW
      .filter(([id]) => !NO_BONUS.includes(id) && !Object.keys(db[id].script ?? {}).length)
      .map(([id]) => id);
    expect(bonusless).toEqual([]);
  });

  it.each(PREVIEW)('%i is a preview in its costume-enchant slot', (id, sub) => {
    expect(db[id]).toMatchObject({
      id, preRelease: true, itemTypeId: 6, itemSubTypeId: sub, slots: 0, compositionPos: 65535,
    });
    expect(latam[id], `${id} is on LATAM — register it properly instead`).toBeUndefined();
    // A preRelease row has no pt-BR overlay, so the English text is the only one there is.
    expect(db[id].description).toMatch(/[A-Za-z]/);
    expect(db[id].description, `${id} still carries the Thai description`).not.toMatch(/[฀-๿]/);
  });

  it.each(SETS)('%i pays %i a flat %s', (garment, partner, key, value) => {
    expect(setBonus(garment, partner, key)).toBeCloseTo(value);
  });

  it.each(SCALED)(
    '%s + %s: %s scales with %s, every %s level(s) worth %s',
    (garment, partner, key, skill, step, perStep) => {
      expect(setBonus(garment, partner, key, [[skill, step - 1]])).toBe(0);
      expect(setBonus(garment, partner, key, [[skill, step]])).toBeCloseTo(perStep);
      expect(setBonus(garment, partner, key, [[skill, step * 4]])).toBeCloseTo(perStep * 4);
    },
  );

  it('pays the Defense set only with all three trio pieces on', () => {
    // "Resist Defense Stone (Garment) / Defense Stone (Upper) / (Middle) / (Lower):
    // RES + 10, MRES + 10" — an && group, so two of the three pay nothing. The Upper
    // declares a set of its own on top, at +5, which needs the other two.
    const garment = worn([311924]);

    for (const key of ['res', 'mres'] as const) {
      // Any two of the trio satisfy neither clause.
      expect(worn([311924, 311921, 311922])[key]).toBe(garment[key]);
      expect(worn([311924, 311922, 311923])[key]).toBe(garment[key]);
      // All three: the Garment's +10 and the Upper's own +5.
      expect(worn([311924, 311921, 311922, 311923])[key] - garment[key]).toBeCloseTo(15);
      expect(worn([311921, 311922, 311923])[key]).toBeCloseTo(5);
    }
  });

  // The two halves of every pair were authored from both ends of it, so a clause could
  // easily sit on the Garment AND on the trio piece and pay twice (docs/item-json.md §6).
  // Each family is worn whole here, which is where a doubled clause shows.
  it.each([...FAMILY.keys()])('%s pays its sets once with the whole family on', (garment) => {
    const LEARNED = 10;
    const pieces = [garment, ...FAMILY.get(garment)];
    const skills = SCALED
      .filter(([g]) => g === garment)
      .map(([, , , skill]) => [skill, LEARNED] as [string, number]);

    const expected: Record<string, number> = {};
    for (const [g, , key, value] of SETS) {
      if (g === garment) expected[key] = (expected[key] ?? 0) + value;
    }
    for (const [g, , key, , step, perStep] of SCALED) {
      if (g === garment) expected[key] = (expected[key] ?? 0) + perStep * Math.floor(LEARNED / step);
    }

    const whole = worn(pieces, skills);
    for (const [key, value] of Object.entries(expected)) {
      const alone = pieces.reduce((sum, id) => sum + (worn([id], skills)[key] ?? 0), 0);
      expect(whole[key] - alone, `${garment} "${key}"`).toBeCloseTo(value);
    }
  });

  it.each(NO_BONUS)('%s moves no number at all', (id) => {
    expect(Object.keys(db[id].script ?? {})).toEqual([]);
    expect(worn([id])).toEqual(worn([]));
  });
});
