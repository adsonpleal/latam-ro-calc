import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

/**
 * Encantos do Coelho Macabro-LT (escudo 460020).
 *
 * The picker looks each pool entry up by aegisName and drops the ones that resolve to
 * nothing, so a line missing from the pool and a line missing from `item.json` both show
 * up only as a shorter dropdown. The Pedra Defensora stones were missing from both.
 *
 * The bonuses are pinned against the LATAM client's own text, which ships here as
 * `latam-items.json`, so an edit to either side has to move both.
 *
 * @see https://hazyforest.com/enchants:mad_bunny-lt — the pool, ten lines at three levels
 * @see https://divine-pride.net/database/item/310861 — the aegis names and the effects
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ITEM_TYPE_ID_ENCHANT = 11;

/** The shield the pool belongs to. */
const SHIELD_ID = 460020;
const SHIELD_AEGIS = 'Mad_Bunny_K_LT';

/** The three stones this spec exists for, with the aegisName the pool names them by. */
const DEFENSE_STONES: [number, string][] = [
  [310861, 'Mad_Bunny_Enchant_4_1'],
  [310862, 'Mad_Bunny_Enchant_4_2'],
  [310863, 'Mad_Bunny_Enchant_4_3'],
];

/** An item reaches a picker only once the LATAM merge flags it. */
const isReachable = (id: string | number) => !!latam[id] || !!items[id]?.preRelease;

const byAegis = new Map<string, any>(Object.values(items).map((item: any) => [item.aegisName, item]));

/** The client wraps effect lines in `^rrggbb` colour codes; these three are plain. */
const description = (id: number): string => (latam[id]?.description ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** `DEF +200.` → 200. The only form the client uses for flat DEF. */
const flatDef = (id: number): number | undefined => {
  const match = description(id).match(/DEF \+(\d+)\./);
  return match ? Number(match[1]) : undefined;
};

/** `Resistência a todas as propriedades +5%.` → 5, absent on the first two levels. */
const allElementResistance = (id: number): number | undefined => {
  const match = description(id).match(/Resistência a todas as propriedades \+(\d+)%\./);
  return match ? Number(match[1]) : undefined;
};

describe('Encantos do Coelho Macabro-LT', () => {
  it('gives the shield one shared pool in its last two enchant positions', () => {
    const pools = getEnchants(SHIELD_AEGIS);

    expect(pools, `${SHIELD_AEGIS} has no EnchantTable entry`).toBeDefined();
    expect(items[SHIELD_ID]?.aegisName).toBe(SHIELD_AEGIS);
    expect(isReachable(SHIELD_ID), `${SHIELD_ID} would be hidden from the picker`).toBe(true);

    const [slot1, slot2, slot3, slot4] = pools!;
    expect(slot1).toBeNull();
    expect(slot2).toBeNull();
    expect(slot3).toBe(slot4);
  });

  it('resolves every enchant it offers to a reachable enchant record', () => {
    const [, , slot3] = getEnchants(SHIELD_AEGIS)!;

    for (const name of slot3 as string[]) {
      const enchant = byAegis.get(name);

      expect(enchant, `the pool offers "${name}", which no item.json record carries`).toBeDefined();
      expect(enchant.itemTypeId, `${name}`).toBe(ITEM_TYPE_ID_ENCHANT);
      expect(isReachable(enchant.id), `${name} (${enchant.id}) would show as an empty row`).toBe(true);
    }
  });

  it.each(DEFENSE_STONES)('offers %i (%s) with the DEF the client states', (id, aegisName) => {
    const [, , slot3] = getEnchants(SHIELD_AEGIS)!;
    const item = items[id];

    // Both halves of the reported gap: the pool never named the stone, and no record
    // carried it. Either one alone is enough to make the line vanish from the dropdown.
    expect(slot3, `the pool has to name ${aegisName}`).toContain(aegisName);
    expect(item, `item ${id} is missing from item.json`).toBeDefined();
    expect(item.aegisName).toBe(aegisName);
    expect(item.itemTypeId).toBe(ITEM_TYPE_ID_ENCHANT);

    const def = flatDef(id);
    expect(def, `the client text for ${id} no longer states a flat DEF`).toBeDefined();
    expect(item.script.def).toEqual([String(def)]);
  });

  it('carries the all-element resistance only on level 3, as the client text does', () => {
    // Levels 1 and 2 are DEF alone; the 5% resistance arrives with level 3 (310863).
    expect(allElementResistance(310861)).toBeUndefined();
    expect(allElementResistance(310862)).toBeUndefined();
    expect(items[310861].script.subele_all).toBeUndefined();
    expect(items[310862].script.subele_all).toBeUndefined();

    const resistance = allElementResistance(310863);
    expect(resistance, 'the client text for 310863 no longer states the resistance').toBe(5);
    expect(items[310863].script.subele_all).toEqual([String(resistance)]);
  });
});
