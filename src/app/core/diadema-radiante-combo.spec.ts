import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * 410183 Diadema Radiante — Luís: "Bônus do Combo do Diadema Radiante [1] (Meio) não está
 * entrando (Diadema Radiante + Colar Radiante Rubi + Anel Radiante Rubi, por exemplo)."
 *
 * The bulk LATAM import kept the Diadema's own +2% line and dropped its Conjunto block
 * entirely, so the set granted nothing at all.
 *
 * The pt-BR description groups each gem's ring WITH its necklace and separates the gems
 * with "ou", so the set needs both halves of one gem — six alternatives, which EQUIP_ID
 * can only express as one entry per pair. Divine-pride instead registers twelve two-piece
 * combos (Diadema + any single accessory); where the two disagree the description wins,
 * since it is what the LATAM server ships and what players read.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const DIADEMA = 410183;
const GEMS: [string, number, number][] = [
  ['Rubi', 490056, 490057],
  ['Ametista', 490058, 490059],
  ['Esmeralda', 490060, 490061],
  ['Zircônio', 490062, 490063],
  ['Safira', 490064, 490065],
  ['Aquamarina', 490066, 490067],
];

/** Equip the given slots and read back the summed equipment bonus. */
const bonusOf = ({ head, ring, necklace }: { head?: number; ring?: number; necklace?: number }) => {
  const items: any = {};
  if (head) items[head] = { ...db[head], itemTypeId: 2, itemSubTypeId: 512 };
  if (ring) items[ring] = { ...db[ring], itemTypeId: 2, itemSubTypeId: 510 };
  if (necklace) items[necklace] = { ...db[necklace], itemTypeId: 2, itemSubTypeId: 511 };

  const calc = makeCalculator(items);

  const model = createMainModel();
  model.level = 200;
  if (head) model.headMiddle = head;
  if (ring) model.accRight = ring;
  if (necklace) model.accLeft = necklace;

  return equipStatusOf(calc, model);
};

describe('Diadema Radiante 410183 set', () => {
  it('is wired to partners that all exist in the db', () => {
    expect(db[DIADEMA]).toBeDefined();
    for (const [gem, ring, necklace] of GEMS) {
      expect(db[ring], `${gem} ring ${ring}`).toBeDefined();
      expect(db[necklace], `${gem} necklace ${necklace}`).toBeDefined();
    }
  });

  /** The full set bonus, as printed on the Diadema. */
  const expectFullSet = (bonus: Record<string, number>) => {
    expect(bonus['atk']).toBe(50); // "ATQ e ATQM +50"
    expect(bonus['matk']).toBe(50);
    expect(bonus['p_class_boss']).toBe(8); // "... contra Chefes +8%"
    expect(bonus['m_class_boss']).toBe(8);
    expect(bonus['p_element_dark']).toBe(10); // "... Sombrio e Maldito +10%"
    expect(bonus['m_element_dark']).toBe(10);
    expect(bonus['p_element_undead']).toBe(10);
    expect(bonus['m_element_undead']).toBe(10);
  };

  it.each(GEMS)('fires with the %s ring + necklace pair', (_gem, ring, necklace) => {
    expectFullSet(bonusOf({ head: DIADEMA, ring, necklace }));
  });

  it.each(GEMS)('does not fire on the %s ring alone — the description wants both', (_gem, ring) => {
    const bonus = bonusOf({ head: DIADEMA, ring });

    expect(bonus['atk']).toBe(0);
    expect(bonus['p_class_boss']).toBe(0);
  });

  it.each(GEMS)('does not fire on the %s necklace alone', (_gem, _ring, necklace) => {
    const bonus = bonusOf({ head: DIADEMA, necklace });

    expect(bonus['atk']).toBe(0);
    expect(bonus['p_class_boss']).toBe(0);
  });

  it('does not fire on a mismatched pair — ring and necklace must share a gem', () => {
    // Rubi ring + Safira necklace: each gem is its own "ou" branch, not a mix-and-match.
    const bonus = bonusOf({ head: DIADEMA, ring: 490056, necklace: 490065 });

    expect(bonus['atk']).toBe(0);
    expect(bonus['p_class_boss']).toBe(0);
  });

  it('grants the set once, not once per encoded gem branch', () => {
    const bonus = bonusOf({ head: DIADEMA, ring: 490056, necklace: 490057 });

    expect(bonus['atk']).toBe(50);
    expect(bonus['p_class_boss']).toBe(8);
  });

  it('does not fire without the Diadema itself', () => {
    const bonus = bonusOf({ ring: 490056, necklace: 490057 });

    expect(bonus['atk']).toBe(0);
    expect(bonus['p_element_dark']).toBe(0);
  });

  it('keeps the Diadema base bonus, which is not part of the set', () => {
    const bonus = bonusOf({ head: DIADEMA });

    expect(bonus['atkPercent']).toBe(2);
    expect(bonus['matkPercent']).toBe(2);
    expect(bonus['atk']).toBe(0);
  });

  it('gates on exactly the six gem pairs that exist', () => {
    // The description names a seventh "[Anel/Colar Radiante Topázio]" pair, but the
    // Shine_* family is only the circlet plus six gem pairs — LATAM ships no such item and
    // id 490068 is unused, so there is no id to gate on. A named-but-absent partner is a
    // missing-item problem; the condition must not reference a phantom id.
    const ids = (db[DIADEMA].script.atk as string[]).flatMap((e) => e.match(/\d{6}/g) ?? []);
    expect(ids.map(Number).sort()).toEqual(GEMS.flatMap(([, r, n]) => [r, n]).sort());
    expect(ids).toHaveLength(12);
  });

  it('is not declared a second time on the accessories', () => {
    // The Diadema is the sole carrier; the rings/necklaces declare only their own
    // (unrelated) Angelical / ring-necklace combos, so the set cannot double up.
    for (const [, ring, necklace] of GEMS) {
      for (const id of [ring, necklace]) {
        const encoded = JSON.stringify(db[id].script);
        expect(encoded, `item ${id}`).not.toContain(String(DIADEMA));
      }
    }
  });
});
