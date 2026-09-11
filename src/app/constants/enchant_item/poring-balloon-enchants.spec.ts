import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';
import { poringBalloonSlot3, poringBalloonSlot4 } from './poring_balloon';

/**
 * Balões Poring — the enchant pool the family had no row for at all.
 *
 * Reported on the tracker (card qMsZoORogUVMYKCZyBWW) as "faltam os encantamentos dos
 * balões de drops, ghostring, marin, metaling, poporing, poring e poring natalino". The
 * card names seven; the wiki table lists ten balloons together and they roll the same
 * stones, so all of them get the row — plus 19095, which the wiki does not carry at all.
 *
 * Slot 3 is the eleven "Mestre" stones. They carry no script because the engine has no
 * key for experience or drop rate, and they are listed anyway so the picker offers the
 * roll the game offers. See poring_balloon.ts.
 *
 * https://browiki.org/wiki/Predefini%C3%A7%C3%A3o:Bal%C3%B5es_Poring
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ITEM_TYPE_ID_ENCHANT = 11;

const byAegisName = new Map<string, any>(Object.values(items).map((a: any) => [a.aegisName, a]));

/** The eleven balloons, by id and aegisName — the wiki's "Alvo" column, plus 19095. */
const BALLOONS: [number, string, string][] = [
  [19143, 'Poring_Balloon', 'Balão de Poring'],
  [19146, 'Marin_Balloon', 'Balão de Marin'],
  [19147, 'Drops_Balloon', 'Balão de Drops'],
  [19148, 'SantaPoring_Balloon', 'Balão de Poring Natalino'],
  [19149, 'Poporing_Balloon', 'Balão de Poporing'],
  [19150, 'Metaling_Balloon', 'Balão de Metaling'],
  [19151, 'Deviling_Balloon', 'Balão de Deviling'],
  [19152, 'Angeling_Balloon', 'Balão de Angeling'],
  [19153, 'Ghostring_Balloon', 'Balão de Ghostring'],
  [19154, 'Archangeling_Balloon', 'Balão de Archangeling'],
  // Not on the wiki's "Alvo" list, and it has no browiki page at all — its aegisName
  // predates the rest of the family. In game it takes the same roll.
  [19095, 'Happy_Balloon_K', 'Balões da Família Poring'],
];

/** Slot 3: the eleven "Mestre" stones, in wiki order (ten races, then all monsters). */
const POOL_3: [string, number, string][] = [
  ['aegis_310994', 310994, 'Mestre Amorfo'],
  ['aegis_310995', 310995, 'Mestre Morto'],
  ['aegis_310996', 310996, 'Mestre Bruto'],
  ['aegis_310997', 310997, 'Mestre Planta'],
  ['aegis_310998', 310998, 'Mestre Inseto'],
  ['aegis_310999', 310999, 'Mestre Peixe'],
  ['aegis_311000', 311000, 'Mestre Demônio'],
  ['aegis_311001', 311001, 'Mestre Humanoide'],
  ['aegis_311002', 311002, 'Mestre Anjo'],
  ['aegis_311003', 311003, 'Mestre Dragão'],
  ['aegis_311004', 311004, 'Mestre dos Mestres'],
];

/** Slot 4: aegisName, item id, pt-BR name — the twelve stones, in wiki order. */
const POOL_4: [string, number, string][] = [
  ['aegis_310986', 310986, 'Músculo 1'],
  ['aegis_310988', 310988, 'Intelecto 1'],
  ['aegis_310990', 310990, 'HP máx. +3%'],
  ['aegis_310992', 310992, 'SP máx. +3%'],
  ['aegis_310987', 310987, 'Músculo 2'],
  ['aegis_310989', 310989, 'Intelecto 2'],
  ['aegis_310991', 310991, 'HP máx. +5%'],
  ['aegis_310993', 310993, 'SP máx. +5%'],
  ['aegis_310982', 310982, 'P.ATQ +1'],
  ['aegis_310984', 310984, 'S.ATQM +1'],
  ['aegis_310983', 310983, 'P.ATQ +2'],
  ['aegis_310985', 310985, 'S.ATQM +2'],
];

describe('Balões Poring — enchant pool', () => {
  it.each(BALLOONS)('%i (%s) is "%s" and takes enchants', (id, aegisName, name) => {
    expect(items[id].aegisName).toBe(aegisName);
    expect(latam[id].name).toBe(name);
    expect(getEnchants(aegisName), `${aegisName} has no EnchantTable entry`).toBeDefined();
  });

  it.each(BALLOONS)('%i (%s) offers the twelve stones in slot 4', (_id, aegisName) => {
    const [, , , slot4] = getEnchants(aegisName)!;

    expect(slot4).toEqual(POOL_4.map(([aegis]) => aegis));
  });

  it.each(BALLOONS)('%i (%s) offers the eleven Mestre stones in slot 3', (_id, aegisName) => {
    const [, , slot3] = getEnchants(aegisName)!;

    expect(slot3).toEqual(POOL_3.map(([aegis]) => aegis));
  });

  // The balloons take two sockets in game, so the first two positions stay empty.
  it.each(BALLOONS)('%i (%s) offers nothing in the first two slots', (_id, aegisName) => {
    const [slot1, slot2] = getEnchants(aegisName)!;

    expect(slot1).toBeNull();
    expect(slot2).toBeNull();
  });

  // The dropdown looks each pool entry up by aegisName in the merged item table and reads
  // `.name` off it, so an entry that resolves to nothing is an empty row, not an error.
  it.each([...POOL_3, ...POOL_4])('%s is the enchant item %i (%s)', (aegisName, id, name) => {
    const item = byAegisName.get(aegisName);

    expect(item, `${aegisName} is not in item.json`).toBeDefined();
    expect(item.id).toBe(id);
    expect(item.itemTypeId).toBe(ITEM_TYPE_ID_ENCHANT);
    expect(latam[id]?.name).toBe(name);
  });

  it('offers both tiers of every family in slot 4, and every stone pays', () => {
    expect(poringBalloonSlot4).toHaveLength(12);
    for (const aegisName of poringBalloonSlot4) {
      const script = byAegisName.get(aegisName)?.script ?? {};
      expect(Object.keys(script).length, `${aegisName} has an empty script`).toBeGreaterThan(0);
    }
  });

  // The other half of the same statement: slot 3 is deliberately inert. If one of these
  // ever grows a script it means a real bonus was mistaken for an EXP rate, or an EXP key
  // was invented for the engine — both worth stopping on.
  it('carries the Mestre stones as listed-but-inert, with no script at all', () => {
    expect(poringBalloonSlot3).toHaveLength(11);
    for (const aegisName of poringBalloonSlot3) {
      const item = byAegisName.get(aegisName);
      expect(item, `${aegisName} is not in item.json`).toBeDefined();
      expect(Object.keys(item.script ?? {}), `${aegisName} should carry no bonus`).toEqual([]);
      expect(latam[item.id].description).toContain('EXP adquirida');
    }
  });
});
