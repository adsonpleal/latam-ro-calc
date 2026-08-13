import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants, getMalangdoEnchants } from './_enchant_table';
import { MALANGDO_WEAPON_IDS } from './malangdo_weapons';

/**
 * Malangdo weapon enchants — reported by Luís: "CK, Rondel e outros itens não tem a
 * opção dos encantamentos de malangdo".
 *
 * The list itself is Snow's, from browiki.org/wiki/Encantamentos_de_Malangdo. What
 * broke was the lookup: getEnchants() matches an EnchantTable entry by exact
 * aegisName, and Faca de Combate carries "컴뱃나이프" — the client resource name
 * sync-latam-db.mjs falls back to when ragassets has no item_db aegis name. Rondel
 * without a slot did resolve (House_Auger), but the slotted one everybody uses did
 * not (House_Auger_ has no entry). Hence the id-keyed list.
 */

const db: Record<string, { id: number; name: string; slots?: number; itemTypeId: number; aegisName: string }> = JSON.parse(
  readFileSync('src/assets/demo/data/item.json', 'utf8'),
);

const ENCHANT_TYPE_ID = 11; // ItemTypeId.ENCHANT — what mapEnchant filters the dropdown by
const enchantsByAegis = new Set(Object.values(db).filter((i) => i.itemTypeId === ENCHANT_TYPE_ID).map((i) => i.aegisName));

const allIds = Object.values(MALANGDO_WEAPON_IDS).flat();

describe('MALANGDO_WEAPON_IDS', () => {
  it('lists only ids that exist in the item database', () => {
    expect(allIds.filter((id) => !db[id])).toEqual([]);
  });

  it('lists only weapons', () => {
    expect(allIds.filter((id) => db[id].itemTypeId !== 1).map((id) => `${id} ${db[id].name}`)).toEqual([]);
  });

  it('has no duplicate id', () => {
    expect(allIds.length).toBe(new Set(allIds).size);
  });

  it('covers every version of a weapon, slotted or not (the NPC takes them all)', () => {
    // Rondel: 1230 without a slot, 13017 with one. Both are enchantable in game.
    expect(MALANGDO_WEAPON_IDS['Rondel']).toEqual([1230, 13017]);
    expect(MALANGDO_WEAPON_IDS['Executora']).toEqual([1169, 1179]);
  });
});

describe('getMalangdoEnchants', () => {
  it('gives the two reported weapons their enchant slots', () => {
    // The bug: neither reached an EnchantTable entry by name.
    expect(getEnchants(db[1228].aegisName) ?? getEnchants(db[1228].name)).toBeUndefined();
    expect(getEnchants(db[13017].aegisName) ?? getEnchants(db[13017].name)).toBeUndefined();

    for (const id of [1228, 13017]) {
      const slots = getMalangdoEnchants(id, db[id].slots);
      expect(slots, `item ${id}`).toBeDefined();
      expect(slots.filter(Boolean).length, `item ${id} enchant count`).toBe(2);
    }
  });

  it('puts the two enchants in the last two positions', () => {
    const [e1, e2, e3, e4] = getMalangdoEnchants(1228, 0);
    expect([e1, e2]).toEqual([null, null]);
    expect(e3).toBe(e4);
    expect(e3).toContain('Expert_Archer2');
  });

  it('gives a 3-slot weapon a single enchant ("Armas de 3 slots receberão somente 1 encanto")', () => {
    // 13412 Lâmina Gêmea Azul [3]
    expect(db[13412].slots).toBe(3);
    expect(getMalangdoEnchants(13412, 3).filter(Boolean).length).toBe(1);
    expect(getMalangdoEnchants(13412, 3)[3]).toBeTruthy();
  });

  it('returns undefined for a weapon Snow does not take', () => {
    expect(getMalangdoEnchants(1201, 3)).toBeUndefined(); // Knife [3]
  });

  it('offers only enchants that exist in the database, so the dropdown can name them', () => {
    const pool = getMalangdoEnchants(1228, 0)[3];
    expect(pool.filter((aegisName) => !enchantsByAegis.has(aegisName))).toEqual([]);
  });
});
