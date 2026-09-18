import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * The zodiac gems — shoe enchants whose whole payload is a combo with 22101 Botas do
 * ArchAngeling, tiered on the *boots'* refine, not the gem's.
 *
 * Their sibling 29151 Gema de Aquário was already in the db and spells the partner
 * `EQUIP[Angel Poring Shoes]`, the legacy name form: it resolves through the item's
 * English `enName` and stops paying the moment the item is renamed or re-issued. The five
 * added here name the partner by id instead (AGENTS.md, "Combos are matched by id").
 *
 * The +9 line reads "+3% adicional", so it stacks on the +7 line rather than replacing
 * it — 5% in total at +9, which is what two thresholds give and one would not.
 */

const GEMA_DE_LEAO = 29148; // FOR +1, physical damage tier
const GEMA_DE_PEIXES = 29149; // INT +1, magic damage tier
const BOTAS_ARCHANGELING = 22101;

describe('29148 Gema de Leão', () => {
  it('grants only its own stat while the boots are not worn', () => {
    const bonus = wornBonus({ boot: 2421, bootEnchants: [GEMA_DE_LEAO] });

    expect(bonus['str']).toBe(1);
    expect(bonus['hpPercent'] ?? 0).toBe(0);
    expect(bonus['spPercent'] ?? 0).toBe(0);
    expect(bonus['atkPercent'] ?? 0).toBe(0);
  });

  it('pays the ungated half of the set as soon as the boots are on', () => {
    const bonus = wornBonus({ boot: BOTAS_ARCHANGELING, bootEnchants: [GEMA_DE_LEAO], bootRefine: 0 });

    expect(bonus['hpPercent']).toBe(5);
    expect(bonus['spPercent']).toBe(5);
    expect(bonus['atkPercent'] ?? 0).toBe(0);
    expect(bonus['acd'] ?? 0).toBe(0);
  });

  it('tiers the physical damage on the boots refine, the +9 line stacking on the +7', () => {
    for (const [refine, expected] of [
      [6, 0],
      [7, 2],
      [8, 2],
      [9, 5],
      [12, 5],
    ] as const) {
      const bonus = wornBonus({ boot: BOTAS_ARCHANGELING, bootEnchants: [GEMA_DE_LEAO], bootRefine: refine });

      expect(bonus['atkPercent'] ?? 0, `refine ${refine}`).toBe(expected);
    }
  });

  it('opens the after-cast cut only at +12', () => {
    expect(wornBonus({ boot: BOTAS_ARCHANGELING, bootEnchants: [GEMA_DE_LEAO], bootRefine: 11 })['acd'] ?? 0).toBe(0);
    expect(wornBonus({ boot: BOTAS_ARCHANGELING, bootEnchants: [GEMA_DE_LEAO], bootRefine: 12 })['acd']).toBe(5);
  });
});

describe('29149 Gema de Peixes', () => {
  it('tiers magic damage where Leão tiers physical', () => {
    const bonus = wornBonus({ boot: BOTAS_ARCHANGELING, bootEnchants: [GEMA_DE_PEIXES], bootRefine: 9 });

    // INT +1 from the gem on top of the boots' own "Todos os atributos +1".
    expect(bonus['int']).toBe(2);
    expect(bonus['matkPercent']).toBe(5);
    expect(bonus['atkPercent'] ?? 0).toBe(0);
  });
});
