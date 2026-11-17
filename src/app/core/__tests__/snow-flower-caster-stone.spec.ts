import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';
import { plainDescription } from './refine-line';

/**
 * Flor Invernal (Variável) — 311107, `Ice_F_Orb_Caster`, the garment slot-3 stone of the
 * Snow Flower family (card r07yI1Nf2wjSffW7LkCz, reported by Reagan*).
 *
 * The LATAM description, in all three published languages, gives an **ungated** -10% plus
 * three -8% refine steps, so a +11 garment reaches -34%:
 *
 *   ATQM +30. / Conjuração variável -10%.
 *   Refino +7 ou mais:  Conjuração variável -8% adicional.
 *   Refino +9 ou mais:  Conjuração variável -8% adicional.
 *   Refino +11 ou mais: Conjuração variável -8% adicional.
 *
 * The record arrived from the Thai calculator in 9ac46140 ("added Snow Flower sets") with
 * the Thai base of 8%, which is also what kRO publishes (divine-pride 311107 reads "reduces
 * variable casting time by 8%", total 32%). LATAM ships 10% instead, and that is the number
 * this file pins: `pt-BR description is source of truth`, and here the es and en client
 * tables agree with it, so there is no single-language typo to discount.
 *
 * Each step is asserted on its own rather than through the +11 total, because the bug was
 * exactly one of the four values: the base read 8 while the three steps were right.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const STONE = 311107;
/** Manto Invernal: its own `vct` clause only fires beside the Sapatos, so the stone stands alone. */
const MANTEAU = 480159;

/** The stone in the garment's third enchant slot, at `refine`. */
function worn(refine: number) {
  const calc = makeCalculator({ [MANTEAU]: db[MANTEAU], [STONE]: db[STONE] });
  return equipStatusOf(calc, {
    ...createMainModel(), level: 200,
    garment: MANTEAU, garmentRefine: refine, garmentEnchant3: STONE,
  });
}

describe('Flor Invernal (Variável)', () => {
  it('pays the ungated -10% with no refine at all', () => {
    expect(worn(0)).toMatchObject({ vct: 10, matk: 30 });
  });

  it.each([
    // 8 and 10 are not filler: they bracket the 9 and 11 gates from below, so a gate read
    // off the wrong element of this record's own `vct` array cannot stay green.
    [6, 10], // below the first gate the base is all there is
    [7, 18], [8, 18],
    [9, 26], [10, 26],
    [11, 34],
  ])('reaches -%i%% variable cast at refine +%i', (refine, expected) => {
    expect(worn(refine).vct).toBe(expected);
  });

  it('still matches the LATAM description it was read from', () => {
    const pt = plainDescription(latam[STONE].description);
    expect(latam[STONE].name).toBe('Flor Invernal (Variável)');
    expect(pt).toContain('Conjuração variável -10%.');
    expect(pt.match(/Conjuração variável -8% adicional\./g)).toHaveLength(3);
  });
});
