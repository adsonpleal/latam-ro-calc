import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

/**
 * Encantos das Gáleas de Cinzas-LT.
 *
 * The picker's data path, end to end: the upper-headgear dropdown lists an item when the
 * merged data marks it `presentInLatam`, and the enchant dropdowns beside it are filled
 * from `getEnchants(aegisName)` — each pool entry looked up by aegisName in the same item
 * table. A helmet that is listed but whose pool names nothing resolvable would show empty
 * enchant slots, which is exactly the failure the capacetes had (see
 * capacete-passe-batalha.spec.ts).
 *
 * The bonuses themselves live in thanos-helmet-lt-sets.spec.ts; this file only pins what
 * the dropdowns are offered.
 *
 * Slot order per Hazy Forest is 3 then 2, and the table's four positions map to the UI's
 * enchant1..enchant4 one place further along — the same offset the Good & Evil crowns
 * use. The helmets take nothing in the first two, one shared pool of twelve Gray Spells
 * in the third, and seven three-level lines in the fourth.
 *
 * All four helmets share both pools: Hazy Forest lists the four Gray Spell flavours as
 * one pool against all four target items, not one flavour per helmet.
 *
 * https://hazyforest.com/enchants:thanos_helmet-lt
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ITEM_TYPE_ID_ENCHANT = 11;
const ITEM_SUB_TYPE_ID_HEADGEAR = 512;

/** The four helmets, by id and aegisName. */
const HELMETS: [number, string][] = [
  [400135, 'Thanos_Helm1_LT'],
  [400142, 'Thanos_Helm2_LT'],
  [400145, 'Thanos_Helm3_LT'],
  [400151, 'Thanos_Helm4_LT'],
];

/** Slot 3: the twelve Gray Spells — four flavours, three levels each. */
const GRAY_SPELLS = [
  'Gray_Melee1', 'Gray_Melee2', 'Gray_Melee3',
  'Gray_Range1', 'Gray_Range2', 'Gray_Range3',
  'Gray_Magic1', 'Gray_Magic2', 'Gray_Magic3',
  'Gray_Fight1', 'Gray_Fight2', 'Gray_Fight3',
];

/** Slot 4: seven lines at Lv1-3 apiece, in the table's order. */
const SHARED_POOL = [
  'Tenacity1', 'Tenacity2', 'Tenacity3',
  'Acute1', 'Acute2', 'Acute3',
  'Mettle1', 'Mettle2', 'Mettle3',
  'MasterArcher1', 'MasterArcher2', 'MasterArcher3',
  'MagicEessence1', 'MagicEessence2', 'MagicEessence3',
  'Adamatine1', 'Adamatine2', 'Adamatine3',
  'Affection1', 'Affection2', 'Affection3',
];

/** An item is offered by a picker only once the merge flags it. */
const isReachable = (id: string | number) => !!latam[id] || !!items[id]?.preRelease;

const byAegis = new Map<string, any>();
for (const key of Object.keys(items)) byAegis.set(items[key].aegisName, items[key]);

describe('Encantos das Gáleas de Cinzas-LT', () => {
  it.each(HELMETS)('lists %i (%s) as a reachable upper headgear', (id, aegisName) => {
    const item = items[id];

    expect(item?.aegisName, `item ${id}`).toBe(aegisName);
    expect(item.itemSubTypeId).toBe(ITEM_SUB_TYPE_ID_HEADGEAR);
    expect(item.location).toBe('Upper');
    expect(item.usableClass).toContain('all');
    expect(isReachable(id), `${id} would be hidden from the picker`).toBe(true);
  });

  it.each(HELMETS)('gives %i (%s) the Gray Spells in slot 3 and the shared pool in slot 4', (_id, aegisName) => {
    const pools = getEnchants(aegisName);
    expect(pools, `${aegisName} has no EnchantTable entry`).toBeDefined();

    const [slot1, slot2, slot3, slot4] = pools!;

    expect(slot1).toBeNull();
    expect(slot2).toBeNull();
    expect(slot3).toEqual(GRAY_SPELLS);
    expect(slot4).toEqual(SHARED_POOL);
  });

  it.each(HELMETS)('resolves every enchant %i (%s) offers to a reachable enchant record', (_id, aegisName) => {
    const [, , slot3, slot4] = getEnchants(aegisName)!;

    for (const name of [...(slot3 as string[]), ...(slot4 as string[])]) {
      const enchant = byAegis.get(name);

      expect(enchant, `${aegisName} offers "${name}", which no item.json record carries`).toBeDefined();
      expect(enchant.itemTypeId, `${name}`).toBe(ITEM_TYPE_ID_ENCHANT);
      expect(isReachable(enchant.id), `${name} (${enchant.id}) would show as an empty row`).toBe(true);
    }
  });

  it('offers Affection, which the pool was missing until the helmets were surfaced', () => {
    // Six of the seven slot-4 lines were here; Affection was not, because its records
    // (29111-29113) only reached item.json with the Good & Evil crowns in 0.1.72-beta.
    const [, , , slot4] = getEnchants('Thanos_Helm1_LT')!;

    expect(slot4).toContain('Affection1');
    expect(slot4).toContain('Affection2');
    expect(slot4).toContain('Affection3');
  });
});
