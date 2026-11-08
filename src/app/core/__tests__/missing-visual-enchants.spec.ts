import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const fieldBySub: Record<number, string> = {
  71: 'costumeEnchantUpper', 72: 'costumeEnchantMiddle', 73: 'costumeEnchantLower',
  74: 'costumeEnchantGarment', 75: 'costumeEnchantGarment4', 76: 'costumeEnchantGarment2',
};

function worn(ids: number[], learned: Array<[string, number]> = []) {
  const model: any = { ...createMainModel(), level: 200 };
  const items: Record<number, any> = {};
  for (const id of ids) {
    items[id] = db[id];
    model[fieldBySub[db[id].itemSubTypeId]] = id;
  }
  const calc = makeCalculator(items).setLearnedSkills(new Map(learned));
  return equipStatusOf(calc, model);
}

describe('missing LATAM visual enchants requested by Samuel Costa', () => {
  it('registers every enchant in the client catalog', () => {
    const missing = Object.entries<any>(latam)
      // The client omits the closing parenthesis on Pegadas do Banguela, and names the
      // graphical effects "Gráfico: X" / "Pegada: X" with no slot at all — eighteen of
      // those hid from the slot pattern until card vR5h55mOQVjZvABbndcz swept the boxes.
      .filter(([, item]) => /\((Topo|Meio|Baixo|Capa|Dual)\)?/.test(item.name)
        || /^(Gráfico|Pegada):/.test(item.name))
      .filter(([id]) => !fieldBySub[db[id]?.itemSubTypeId])
      .map(([id, item]) => `${id} ${item.name}`);
    expect(missing).toEqual([]);
  });

  it.each([
    [1000666, 'Lesson', 'vct', 1],
    [1000667, 'Circling Nature', 'cd__2418', 0.1],
    [1000668, "Frigg's Song", 'fct', 0.1],
    [1000669, 'Cart Cannon', 'range', 2],
    [1000670, 'Cart Remodeling', 'vct', 2],
    [1000671, 'Sword Mastery', 'fct', 0.1],
    [1000672, 'Striking', 'fct', 0.1],
    // 2, not the 1% the pt-BR client prints — see sorcerer-middle-stone.spec.ts.
    [1000673, 'Diamond Dust', 'vct', 2],
    [1000674, 'Earth Grave', 'm_my_element_all', 2],
  ] as const)('%i scales %s only by learned levels', (id, skill, key, perLevel) => {
    expect(worn([id])[key] || 0).toBe(0);
    expect(worn([id], [[skill, 1]])[key]).toBeCloseTo(perLevel);
    expect(worn([id], [[skill, 5]])[key]).toBeCloseTo(perLevel * 5);
    if (id === 1000667) expect(worn([id], [[skill, 5]])['cd__2413']).toBeCloseTo(0.5);
  });

  it.each([
    [1000666, [25501, 29488], 'spDrain', 1],
    [1000666, [310265, 1000304], '2413', 15],
    [1000667, [25501, 29488], 'p_size_all', 15],
    [1000667, [310265, 1000304], 'm_my_element_all', 15],
    [1000668, [25501, 29488], '2418', 15],
    [1000668, [310265, 1000304], '2414', 15],
    [1000669, [25449, 29467], '490', 15],
    [1000669, [310261, 1000300], '2481', 15],
    [1000670, [25449, 29467], '2477', 15],
    [1000670, [310261, 1000300], '2476', 15],
    [1000671, [25449, 29467], '490', 15],
    [1000671, [310261, 1000300], '2476', 15],
    [1000672, [25420, 29435], 'cd__2450', 2],
    [1000672, [25801, 29614], '2446', 15],
    [1000673, [25420, 29435], '2449', 15],
    [1000673, [25801, 29614], '2454', 15],
    [1000674, [25420, 29435], '2448', 15],
    [1000674, [25801, 29614], '2447', 15],
  ] as const)('%i recognises both generations of %j for %s', (id, partners, key, value) => {
    expect(worn([id])[key] || 0).toBe(0);
    for (const partner of partners) {
      // The cape can grant its own skill bonus; isolate the new stone's contribution.
      const delta = (worn([id, partner])[key] || 0) - (worn([partner])[key] || 0);
      expect(delta).toBe(value);
    }
    expect(worn([id, 29358])[key] || 0).toBe(0);
  });

  it('grants EXP +2% per piece and the extra +3% only with all three slots, across generations', () => {
    for (const top of [25171, 29159]) {
      expect(worn([top]).expGainPercent).toBe(2);
      for (const middle of [25141, 29145]) {
        expect(worn([top, middle]).expGainPercent).toBe(4);
        for (const lower of [25015, 29027]) {
          expect(worn([lower]).expGainPercent).toBe(2);
          expect(worn([top, lower]).expGainPercent).toBe(4);
          expect(worn([middle, lower]).expGainPercent).toBe(4);
          expect(worn([top, middle, lower]).expGainPercent).toBe(9);
        }
      }
    }
  });

  it('offers graphical effects in the middle slot and footprints in cape slot four without bonuses', () => {
    const effects = [1002193, 1002194, 1002239, 1002240];
    expect(effects.map(id => db[id].itemSubTypeId)).toEqual([72, 72, 75, 75]);
    for (const id of effects) {
      expect(db[id].script).toEqual({});
      expect(worn([id])).toEqual(worn([]));
    }
  });
});
