import { describe, expect, it } from 'vitest';
import itemDb from '../../../assets/demo/data/item.json';
import latamDb from '../../../assets/demo/data/latam-items.json';
import { getEnchants } from './_enchant_table';

/**
 * Enchant options for the Gray Wolf garments — 480090 Sobrepeliz do Lobo Cinzento and
 * 480091 Capa do Lobo Cinzento. Luís reported slot 1 as incomplete: it offered only the
 * three "Dano" orbs, while in game it also takes "Total" and "Espelho".
 *
 * The expectations below are the enchant tables as published, keyed by the pt-BR name the
 * player sees. The code numbers the sockets the way the game does (4 down to 2), so the
 * player-facing "Slot 1" is `grayWolfGarment_slot2` — this is why the gap was easy to miss.
 */

const items = itemDb as Record<string, any>;
const latam = latamDb as Record<string, { name?: string }>;

const SLOT_1 = ['Total 1', 'Total 2', 'Total 3', 'Dano 1', 'Dano 2', 'Dano 3', 'Espelho 1', 'Espelho 2', 'Espelho 3'];
const SLOT_2 = ['Rapidez', 'Variável', 'Crítico', 'Precisão'].flatMap((n) => [1, 2, 3].map((i) => `${n} ${i}`));
const SLOT_3 = ['FOR', 'DES', 'AGI', 'INT', 'VIT', 'SOR'].flatMap((n) => [1, 2, 3].map((i) => `${n} ${i}`));

/** aegisName -> the pt-BR name shown in the dropdown, so failures read like the PDF. */
const NAME_BY_AEGIS = new Map<string, string>(
  Object.entries(items)
    .filter(([, item]) => String(item.aegisName).startsWith('Wolf_Orb'))
    .map(([id, item]) => [item.aegisName as string, latam[id]?.name ?? item.name]),
);

function optionNames(aegisNames: string[]): string[] {
  return aegisNames.map((a) => NAME_BY_AEGIS.get(a) ?? `<${a} missing from item.json>`);
}

describe.each([
  ['480090 Sobrepeliz do Lobo Cinzento', 'Gray_W_Muffler'],
  ['480091 Capa do Lobo Cinzento', 'Gray_W_Manteau'],
])('%s enchants', (_label, aegisName) => {
  // enchants is [_, slot2, slot3, slot4] — game socket numbering, descending.
  const [, slot2, slot3, slot4] = getEnchants(aegisName);

  it('offers all 9 slot-1 orbs, including Total and Espelho', () => {
    expect(optionNames(slot2).map((n) => n.replace('Orbe Lupino - ', '')).sort()).toEqual([...SLOT_1].sort());
  });

  it('offers all 12 slot-2 orbs', () => {
    expect(optionNames(slot3).map((n) => n.replace('Orbe Lupino - ', '')).sort()).toEqual([...SLOT_2].sort());
  });

  it('offers all 18 slot-3 stat orbs', () => {
    expect(optionNames(slot4).map((n) => n.replace('Orbe Lupino - ', '')).sort()).toEqual([...SLOT_3].sort());
  });
});

describe('resistance-only Wolf Orbs', () => {
  // Reflected-damage resistance has no bonus key. An empty script is the honest encoding;
  // anything else invents a bonus the item does not give.
  it.each([
    ['310585', 'Wolf_Orb_M_Counter_1'],
    ['310586', 'Wolf_Orb_M_Counter_2'],
    ['310587', 'Wolf_Orb_M_Counter_3'],
  ])('%s %s grants no modelled bonus', (id, aegis) => {
    expect(items[id]?.aegisName).toBe(aegis);
    expect(items[id]?.script).toEqual({});
  });

  // The "Total" orbs, on the other hand, land squarely on the defender-reduction keys the
  // PVP work added (docs/pvp.md §4) — class, element, size and race, each at its own refine
  // step. They were left empty back when nothing read those keys. See size-resistance.spec.
  it.each([
    ['310579', 'Wolf_Orb_Above_1', 3],
    ['310580', 'Wolf_Orb_Above_2', 5],
    ['310581', 'Wolf_Orb_Above_3', 7],
  ])('%s %s reduces damage taken by %i%% per step', (id, aegis, percent) => {
    expect(items[id]?.aegisName).toBe(aegis);
    expect(items[id]?.script).toEqual({
      subclass_all: [`${percent}`],
      subele_all: [`7===${percent}`],
      subsize_all: [`9===${percent}`],
      subrace_all: [`11===${percent}`],
    });
  });

  it('does not hand out AGI, which the Total orbs never mentioned', () => {
    // Regression: 310579-581 shipped `{"agi": ["3","7===3","9===3","11===3"]}`, the
    // resistance percentages pasted into the wrong key.
    for (const id of ['310579', '310580', '310581']) {
      expect(items[id].script.agi).toBeUndefined();
    }
  });
});
