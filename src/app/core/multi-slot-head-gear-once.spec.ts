import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * A head gear spanning several positions is ONE physical item, but producers write its id
 * into every slot it covers — `replay/replay-to-model.ts` fans out the equipped bitmask
 * that way (one `HEAD_MID|HEAD_LOW` record becomes both `headMiddle` and `headLower`), and
 * share links saved before the UI enforced occupancy can too.
 *
 * The UI clears the collision a debounce later, but the engine must not depend on that:
 * `loadItemFromModel` is reachable directly, and applying the script once per slot would
 * double every bonus the item grants.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ODIUM = 436003; // Máscara de Odium — "Equipa em: Meio e Baixo", hpPercent +5

function bonusOf(model: Record<string, any>) {
  const items: any = { [ODIUM]: { ...db[ODIUM] } };
  const calc = makeCalculator(items);

  const base = createMainModel();
  base.level = 200;
  Object.assign(base, model);
  return equipStatusOf(calc, base);
}

describe('multi-slot head gear counted once by the engine', () => {
  it('applies the mask once when it sits in a single slot', () => {
    expect(bonusOf({ headLower: ODIUM })['hpPercent']).toBe(5);
    expect(bonusOf({ headMiddle: ODIUM })['hpPercent']).toBe(5);
  });

  it('still applies it once when a producer fans it across both slots it occupies', () => {
    // What replay import emits for one HEAD_MID|HEAD_LOW record.
    expect(bonusOf({ headMiddle: ODIUM, headLower: ODIUM })['hpPercent']).toBe(5);
  });

  it('keeps the first slot, so refine and cards come from one place', () => {
    const bonus = bonusOf({ headMiddle: ODIUM, headLower: ODIUM });

    expect(bonus['hpPercent']).toBe(5);
    expect(bonus['hp']).toBe(0); // no phantom second contribution
  });

  it('leaves two genuinely different head gears alone', () => {
    // Only a repeated id collapses; distinct items in distinct slots both count.
    const items: any = { [ODIUM]: { ...db[ODIUM] }, 5325: { ...db['5325'] } };
    const calc = makeCalculator(items);
    const model = createMainModel();
    model.level = 200;
    model.headMiddle = 5325; // Robo Eye, dex +1
    model.headLower = ODIUM;
    const bonus = equipStatusOf(calc, model);

    expect(bonus['hpPercent']).toBe(5);
    expect(bonus['dex']).toBe(1);
  });
});
