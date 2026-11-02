import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Eighteen graphical-effect Visual-enchant stones that LATAM has been shipping all along
 * and item.json never had a record for — found while sweeping the 44 Costume Enchant Stone
 * boxes for tracker card vR5h55mOQVjZvABbndcz.
 *
 * These are not previews: they are on the server, so they are registered the ordinary way,
 * with `description: ""` and the pt-BR overlay from latam-items.json. They carry no bonus
 * at all — the client text only promises the effect, which is why `script` is empty and the
 * last assertion here holds that they move no number.
 *
 * Each one's slot comes from the same-named pt-BR stone already in item.json, whose own
 * name spells the slot out: "Pedra Gráfica: Cintilação (Topo)" puts 29041 in Topo, and so
 * on. The pt-BR text of the generation added here is the short "Exibe …" line, which names
 * the effect but not the slot, so the twin is the source. The whole record is cloned from
 * that twin, which is why none of them needed a hand-written `resName` or `aegisName`.
 *
 * They slipped past `missing-visual-enchants.spec.ts` because its guard matched a slot in
 * parentheses in the name and the client labels these "Gráfico: X" / "Pegada: X", with no
 * slot at all. That guard now matches the prefix too, so the next such stone fails there
 * rather than waiting for another sweep; the table below is the slot and no-bonus check.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const FIELD_BY_SUB: Record<number, string> = {
  71: 'costumeEnchantUpper', 72: 'costumeEnchantMiddle', 73: 'costumeEnchantLower',
  74: 'costumeEnchantGarment', 75: 'costumeEnchantGarment4', 76: 'costumeEnchantGarment2',
};

/** [id, itemSubTypeId, the registered pt-BR twin whose name carries the slot]. */
const STONES: Array<[number, number, number]> = [
  [29041, 71, 25058], // Cintilação
  [29142, 72, 25136], // Raios Azuis
  [29143, 73, 25137], // Aura Verde
  [29162, 72, 25177], // Sombra
  [29727, 71, 1001252], // Dragão Alado
  [300152, 72, 1000319], // Luz Angelical
  [300157, 72, 1000345], // Relógios
  [300385, 72, 1000875], // Popstar
  [300419, 71, 1001069], // Camélia
  [310322, 71, 1000365], // Corações
  [311926, 72, 1001175], // Rosas Românticas
  [313558, 74, 1001907], // Bolinhos
  [313559, 74, 1001908], // Pandas
  [314094, 72, 1002193], // Espírito de Liderança
  [314095, 72, 1002194], // Espírito de Influência
  [314171, 75, 1002239], // Pegadas do Banguela
  [314172, 75, 1002240], // Pulinhos do Banguela
  [314802, 73, 1002585], // Espaço Digital
];

/** Wear one stone and read the summed equipment bonus back. */
function worn(id: number | null): Record<string, number> {
  const items: Record<number, any> = {};
  const model: any = { ...createMainModel(), level: 200 };

  if (id !== null) {
    items[id] = db[id];
    model[FIELD_BY_SUB[db[id].itemSubTypeId]] = id;
  }

  return equipStatusOf(makeCalculator(items), model);
}

describe('LATAM graphical-effect Visual-enchant stones', () => {
  const bare = worn(null);

  it.each(STONES)('%i sits where its twin %i does, is listed outright and pays nothing', (id, sub, twin) => {
    expect(db[id], `${id} missing from item.json`).toBeDefined();
    expect(db[id]).toMatchObject({ id, itemTypeId: 6, itemSubTypeId: sub });
    expect(db[twin].itemSubTypeId, `twin ${twin} moved slot`).toBe(sub);

    expect(latam[id], `${id} is not on LATAM — it would need preRelease`).toBeDefined();
    expect(db[id].preRelease).toBeUndefined();
    // The pt-BR name and description are overlaid from latam-items.json at runtime.
    expect(db[id].description).toBe('');

    expect(db[id].script).toEqual({});
    expect(worn(id)).toEqual(bare);
  });
});
