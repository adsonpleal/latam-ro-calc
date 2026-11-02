import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Eight graphical-effect Visual-enchant stones that LATAM has been shipping all along and
 * item.json never had a record for — found while sweeping the 44 Costume Enchant Stone
 * boxes for tracker card vR5h55mOQVjZvABbndcz.
 *
 * These are not previews: they are on the server, so they are registered the ordinary way,
 * with `description: ""` and the pt-BR overlay from latam-items.json. They carry no bonus
 * at all — the client text only promises the effect, which is why `script` is empty and the
 * last test here holds that they move no number.
 *
 * Each one's slot comes from the same-named pt-BR stone already in item.json, whose own
 * name spells the slot out: "Pedra Gráfica: Cintilação (Topo)" puts 29041 in Topo, and so
 * on. The pt-BR text of the generation added here is the short "Exibe …" line, which names
 * the effect but not the slot, so the twin is the source.
 *
 * `missing-visual-enchants.spec.ts` guards this family by name, matching a slot in
 * parentheses; these eight slipped through because the client labels them "Gráfico: X" and
 * "Pegada: X", with no slot in the name. The first test below closes that hole by id.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const FIELD_BY_SUB: Record<number, string> = {
  71: 'costumeEnchantUpper',
  72: 'costumeEnchantMiddle',
  73: 'costumeEnchantLower',
  75: 'costumeEnchantGarment4',
};

/** [id, itemSubTypeId, the registered pt-BR twin whose name carries the slot]. */
const STONES: Array<[number, number, number]> = [
  [29041, 71, 25058], // Gráfico: Cintilação      — Pedra Gráfica: Cintilação (Topo)
  [29142, 72, 25136], // Gráfico: Raios Azuis     — Pedra Gráfica: Raios Azuis (Meio)
  [29143, 73, 25137], // Gráfico: Aura Verde      — Pedra Gráfica: Aura Verde (Baixo)
  [300152, 72, 1000319], // Gráfico: Luz Angelical   — Pedra Gráfica: Luz Angelical (Meio)
  [300157, 72, 1000345], // Gráfico: Relógios        — Pedra Gráfica: Relógios (Meio)
  [310322, 71, 1000365], // Gráfico: Corações        — Pedra Gráfica: Corações (Topo)
  [314171, 75, 1002239], // Gráfico: Pegadas do Banguela — Pedra de Pegada: … (Capa
  [314172, 75, 1002240], // Pegada: Pulinhos do Banguela — Pedra de Pegada: … (Capa)
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
  it.each(STONES)('%i is registered in the slot its twin %i occupies', (id, sub, twin) => {
    expect(db[id], `${id} missing from item.json`).toBeDefined();
    expect(db[id]).toMatchObject({ id, itemTypeId: 6, itemSubTypeId: sub });
    expect(db[twin].itemSubTypeId, `twin ${twin} moved slot`).toBe(sub);
  });

  it.each(STONES)('%i is on LATAM, so it is listed outright and not as a preview', (id) => {
    expect(latam[id], `${id} is not on LATAM — it would need preRelease`).toBeDefined();
    expect(db[id].preRelease).toBeUndefined();
    // The pt-BR name and description are overlaid from latam-items.json at runtime.
    expect(db[id].description).toBe('');
  });

  it('carries no bonus — the stones are graphics only', () => {
    const bare = worn(null);
    for (const [id] of STONES) {
      expect(db[id].script).toEqual({});
      expect(worn(id)).toEqual(bare);
    }
  });
});
