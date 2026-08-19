import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

/**
 * Ziki's "Sombrio Magistral" enchants, on the Manopla and the Escudo.
 *
 * Both take the same two pools: the six trait stats at +3 in slot 3, and the six base
 * stats at +5 in slot 4. Slot 4 used to list DES twice and never offer VIT, so the VIT
 * enchant was unreachable from the picker — reported on the tracker
 * (wQBd3BfBnvn2Xr5VbRdX) by Ronjero.
 *
 * https://browiki.org/wiki/Encantamento
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ITEM_TYPE_ID_ENCHANT = 11;

/** The two items Ziki encants, by id and aegisName. */
const MASTER_SHADOWS: [number, string][] = [
  [24792, 'S_Master_Weapon'],
  [24793, 'S_Master_Shield'],
];

/** Slot 3: POD/STA/SAB/FEI/CON/CRV +3, in the wiki's order. */
const TRAIT_POOL = ['M_Pow3', 'M_Sta3', 'M_Wis3', 'M_Spl3', 'M_Con3', 'M_Crt3'];

/** Slot 4: FOR/AGI/VIT/INT/DES/SOR +5, in the wiki's order — one line per stat. */
const STAT_POOL = ['Strength5', 'Agility5', 'Vitality5', 'Inteligence5', 'Dexterity5', 'Luck5'];

/** An item is offered by a picker only once the merge flags it. */
const isReachable = (id: string | number) => !!latam[id] || !!items[id]?.preRelease;

const byAegis = new Map<string, any>();
for (const key of Object.keys(items)) byAegis.set(items[key].aegisName, items[key]);

describe('Sombrio Magistral enchants', () => {
  it.each(MASTER_SHADOWS)('lists %i (%s) as a reachable shadow item', (id, aegisName) => {
    expect(items[id]?.aegisName, `item ${id}`).toBe(aegisName);
    expect(isReachable(id), `${id} would be hidden from the picker`).toBe(true);
  });

  it.each(MASTER_SHADOWS)('offers %i (%s) the trait pool in slot 3 and the stat pool in slot 4', (_id, aegisName) => {
    const pools = getEnchants(aegisName);
    expect(pools, `${aegisName} has no EnchantTable entry`).toBeDefined();

    const [slot1, slot2, slot3, slot4] = pools!;

    expect(slot1).toBeNull();
    expect(slot2).toBeNull();
    expect(slot3).toEqual(TRAIT_POOL);
    expect(slot4).toEqual(STAT_POOL);
  });

  it.each(MASTER_SHADOWS)('never repeats a stat in %i (%s) slot 4', (_id, aegisName) => {
    const slot4 = getEnchants(aegisName)![3] as string[];

    expect(new Set(slot4).size, `${aegisName} offers the same enchant twice`).toBe(slot4.length);
  });

  it.each(MASTER_SHADOWS)('resolves every enchant %i (%s) offers to a reachable enchant record', (_id, aegisName) => {
    const [, , slot3, slot4] = getEnchants(aegisName)!;

    for (const name of [...(slot3 as string[]), ...(slot4 as string[])]) {
      const enchant = byAegis.get(name);

      expect(enchant, `${aegisName} offers "${name}", which no item.json record carries`).toBeDefined();
      expect(enchant.itemTypeId, `${name}`).toBe(ITEM_TYPE_ID_ENCHANT);
      expect(isReachable(enchant.id), `${name} (${enchant.id}) would show as an empty row`).toBe(true);
    }
  });
});
