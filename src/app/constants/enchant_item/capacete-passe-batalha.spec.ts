import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

/**
 * Encantos dos Capacetes (Passe de Batalha).
 *
 * Reported: the three capacetes take enchants in game, but the calculator offered none —
 * they had no EnchantTable entry at all, so `getEnchants` returned undefined and every
 * enchant dropdown stayed empty.
 *
 * bROWiki (Passe de Batalha): "Capacetes que podem ser encantados: Capacete Fortificado,
 * Capacete Decadente, Capacete Descartado. Ordem do encanto: Slot 4 > Slot 3 > Slot 2."
 * All three slots draw from the same pool of eight; slot 1 takes none.
 *
 * The `x2`/`x1` "Limite" column caps how many copies of one enchant a single capacete may
 * carry. Nothing in the engine models a cross-slot limit, so it is not asserted here — the
 * pool is per-slot and identical, which is what the dropdowns need.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** The three capacetes, by item id and by the aegisName getEnchants is keyed on. */
const CAPACETES: [number, string, string][] = [
  [401433, 'RTC3등투구', 'Capacete Decadente'],
  [401434, 'RTC준우승자투구', 'Capacete Fortificado'],
  [401435, 'RTC우승자투구', 'Capacete Descartado'],
];

/** The eight enchants of the "Encantos dos Capacetes" table, in the wiki's order. */
const ENCHANTS: [number, string, string][] = [
  [313365, 'Battle_Pass_ATK', 'Encanto de Ataque'],
  [313366, 'Battle_Pass_MATK', 'Encanto de Poder'],
  [310105, 'Automatic_Orb24', 'P-Mágico'],
  [313367, 'Battle_Pass_Magical Force', 'Encanto de Conjuração'],
  [313368, 'Battle_Pass_Attacker Force', 'Encanto de Talento'],
  [313369, 'Battle_Pass_Range Force', 'Encanto Decadente'],
  [313370, 'Battle_Pass_Critical Force', 'Encanto Fortificado'],
  [313371, 'Battle_Pass_Global Cooldown', 'Encanto de Sucata'],
];

const ITEM_TYPE_ID_ENCHANT = 11;

describe('Encantos dos Capacetes', () => {
  it.each(CAPACETES)('offers the enchant pool on item %i (%s)', (id, aegisName) => {
    expect(items[id]?.aegisName, `item ${id}`).toBe(aegisName);
    expect(getEnchants(aegisName), `${aegisName} has no EnchantTable entry`).toBeDefined();
  });

  it.each(CAPACETES)('gives %i slots 2, 3 and 4 the same eight enchants, and nothing on slot 1', (_id, aegisName) => {
    const [slot1, slot2, slot3, slot4] = getEnchants(aegisName)!;
    const pool = ENCHANTS.map(([, aegis]) => aegis);

    expect(slot1).toBeNull();
    expect(slot2).toEqual(pool);
    expect(slot3).toEqual(pool);
    expect(slot4).toEqual(pool);
  });

  it.each(ENCHANTS)('resolves enchant %i (%s) to a real enchant item named "%s"', (id, aegisName, ptName) => {
    // The dropdown looks each name up in a map keyed by aegisName over itemTypeId 11; an
    // entry that resolves to nothing would silently drop out of the list.
    expect(items[id], `item ${id}`).toBeDefined();
    expect(items[id].aegisName).toBe(aegisName);
    expect(items[id].itemTypeId).toBe(ITEM_TYPE_ID_ENCHANT);
    expect(latam[id]?.name, `item ${id} pt-BR name`).toBe(ptName);
  });

  it('does not leak the pool onto unrelated headgear', () => {
    // The Illusion Goibne helm has its own (different) enchant pool; the classic one has none.
    expect(getEnchants('Goibne_Helmet_IL')).not.toContainEqual(ENCHANTS.map(([, aegis]) => aegis));
    expect(getEnchants('게브네이투구')).toBeUndefined();
  });
});
