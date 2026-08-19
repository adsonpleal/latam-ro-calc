import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

/**
 * Encantos das Botas do Bem e do Mal.
 *
 * The picker's data path, end to end: the shoe dropdown lists an item when the merged
 * data marks it `presentInLatam`, and the enchant dropdowns beside it are filled from
 * `getEnchants(aegisName)` — each pool entry looked up by aegisName in the same item
 * table. A boot that is listed but whose pool names nothing resolvable would show empty
 * enchant slots, which is exactly the failure the capacetes had (see
 * capacete-passe-batalha.spec.ts).
 *
 * The bonuses themselves live in good-evil-boot-sets.spec.ts; this file only pins what
 * the dropdowns are offered.
 *
 * Slot order per Hazy Forest is 3 then 2, and the table's four positions map to the UI's
 * enchant1..enchant4: the boots take nothing in the first two, the class's own Good/Evil
 * Vigor in the third, and one shared pool of fifteen in the fourth.
 *
 * https://hazyforest.com/enchants:good_evil_boots_shadow_cross
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ITEM_TYPE_ID_ENCHANT = 11;
const ITEM_SUB_TYPE_ID_SHOES = 516;

/** The 18 boots, by id, aegisName and the class the picker filters them to. */
const BOOTS: [number, string, string][] = [
  [470207, 'FateSin_Boots_CD', 'Cardinal'],
  [470208, 'FateSin_Boots_IQ', 'Inquisitor'],
  [470209, 'FateSin_Boots_SOA', 'SoulAscetic'],
  [470210, 'FateSin_Boots_BO', 'Biolo'],
  [470211, 'FateSin_Boots_DK', 'DragonKnight'],
  [470212, 'FateSin_Boots_SH', 'SpiritHandler'],
  [470213, 'FateSin_Boots_EM', 'ElementalMaster'],
  [470214, 'FateSin_Boots_WH', 'Windhawk'],
  [470215, 'FateSin_Boots_SKE', 'SkyEmperor'],
  [470221, 'FateSin_Boots_MT', 'Meister'],
  [470222, 'FateSin_Boots_SHC', 'ShadowCross'],
  [470223, 'FateSin_Boots_SS', 'Shinkiro'],
  [470224, 'FateSin_Boots_ABC', 'AbyssChaser'],
  [470225, 'FateSin_Boots_TR', 'Troubadour'],
  [470226, 'FateSin_Boots_HN', 'HyperNovice'],
  [470236, 'FateSin_Boots_IG', 'ImperialGuard'],
  [470237, 'FateSin_Boots_AG', 'ArchMage'],
  [470238, 'FateSin_Boots_NW', 'NightWatch'],
];

/** Slot 4: the same fifteen lines on every class, in the table's order. */
const SHARED_POOL = [
  'Expert_Fighter3', 'Expert_Fighter4', 'Expert_Fighter5',
  'Expert_Magician3', 'Expert_Magician4', 'Expert_Magician5',
  'Expert_Archer3', 'Expert_Archer4', 'Expert_Archer5',
  'Attack_Delay_2', 'Attack_Delay_3', 'Attack_Delay_4',
  'Spell5', 'Spell6', 'Spell7',
];

/** An item is offered by a picker only once the merge flags it. */
const isReachable = (id: string | number) => !!latam[id] || !!items[id]?.preRelease;

const byAegis = new Map<string, any>();
for (const key of Object.keys(items)) byAegis.set(items[key].aegisName, items[key]);

describe('Encantos das Botas do Bem e do Mal', () => {
  it.each(BOOTS)('lists %i (%s) as reachable shoes for %s', (id, aegisName, className) => {
    const item = items[id];

    expect(item?.aegisName, `item ${id}`).toBe(aegisName);
    expect(item.itemSubTypeId).toBe(ITEM_SUB_TYPE_ID_SHOES);
    expect(item.usableClass).toContain(className);
    expect(isReachable(id), `${id} would be hidden from the picker`).toBe(true);
  });

  it.each(BOOTS)('gives %i (%s) its own Vigor pair in slot 3 and the shared pool in slot 4', (_id, aegisName) => {
    const pools = getEnchants(aegisName);
    expect(pools, `${aegisName} has no EnchantTable entry`).toBeDefined();

    const [slot1, slot2, slot3, slot4] = pools!;
    const suffix = aegisName.replace('FateSin_Boots_', '');

    expect(slot1).toBeNull();
    expect(slot2).toBeNull();
    expect(slot3).toEqual([`Justice_Vigor_${suffix}`, `Injustice_Vigor_${suffix}`]);
    expect(slot4).toEqual(SHARED_POOL);
  });

  it.each(BOOTS)('resolves every enchant %i (%s) offers to a reachable enchant record', (_id, aegisName) => {
    const [, , slot3, slot4] = getEnchants(aegisName)!;

    for (const name of [...(slot3 as string[]), ...(slot4 as string[])]) {
      const enchant = byAegis.get(name);

      expect(enchant, `${aegisName} offers "${name}", which no item.json record carries`).toBeDefined();
      expect(enchant.itemTypeId, `${name}`).toBe(ITEM_TYPE_ID_ENCHANT);
      expect(isReachable(enchant.id), `${name} (${enchant.id}) would show as an empty row`).toBe(true);
    }
  });
});
