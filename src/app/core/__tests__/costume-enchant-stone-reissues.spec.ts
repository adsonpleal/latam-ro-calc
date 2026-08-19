import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The Visual-enchant stones the client re-issued under new ids (tracker cards
 * `simulador-pedras-de-encantar-visual-falta-a-familia-de-codigos-novos-c` and
 * 98dHg2oGRWVkwCnlttFr). 255 of them had no item.json record: where both generations
 * exist the player finds the stone under the old name, and where only the new one exists
 * the stone was unreachable in every picker.
 *
 * Two things this pins.
 *
 * 1. **A re-issue keeps its original record's English `name`.** Combo clauses are authored
 *    as `EQUIP[<english name>]` and resolved against `enName` (`Calculator.matchName`),
 *    which the LATAM overlay copies from that field before swapping in the pt-BR name. So
 *    giving the re-issue the same English name makes every existing set fire for either
 *    generation without editing the record that declares the set. The pt-BR label the user
 *    picks from still comes from latam-items.json and is unaffected.
 *
 * 2. **The two id-based clauses were widened by hand**, because `EQUIP_ID[...]` cannot
 *    profit from the name trick: the three Corpo clauses on 1000524 and the Invocador
 *    (Topo) clause on 29671 now read `EQUIP_ID[<old>||<new>]`.
 *
 * The Propriedade family (1000527-1000530) has no old-code counterpart at all and is
 * written from the pt-BR description. Its (Topo) text lists "Propriedade (Topo)" among its
 * own set partners, which cannot be worn twice; the rest of the family — Corpo 310327,
 * Alcance 310325 — requires Meio + Baixo, and that is what is encoded.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const SUBTYPE = { Topo: 71, Meio: 72, Baixo: 73, Capa: 74, Dual: 76 } as const;
const SLOT_FIELD = {
  Topo: 'costumeEnchantUpper',
  Meio: 'costumeEnchantMiddle',
  Baixo: 'costumeEnchantLower',
  Capa: 'costumeEnchantGarment',
  Dual: 'costumeEnchantGarment2',
} as const;

type Slot = keyof typeof SUBTYPE;

/** Wear the given stones and read one key of the summed equipment bonus back. */
function bonusOf(key: string, stones: Array<[number, Slot]>): number {
  const items: Record<number, any> = {};
  const model: any = createMainModel();
  model.level = 200;

  for (const [id, slot] of stones) {
    items[id] = db[id];
    model[SLOT_FIELD[slot]] = id;
  }

  return equipStatusOf(makeCalculator(items), model)[key] ?? 0;
}

describe('re-issued Visual-enchant stones', () => {
  describe('are registered in the slot their picker reads', () => {
    // The ids the tracker card lists as the ones that count towards damage.
    const CARD: Array<[number, Slot]> = [
      [1000377, 'Topo'], [1000378, 'Meio'], [1000379, 'Baixo'],
      [1000375, 'Topo'], [1000376, 'Baixo'], [1000523, 'Dual'],
      [1000527, 'Dual'], [1000528, 'Topo'], [1000529, 'Meio'], [1000530, 'Baixo'],
      [1000522, 'Dual'], [1000521, 'Dual'], [1000520, 'Dual'],
      [1000525, 'Dual'], [1000526, 'Dual'],
      [1000675, 'Dual'], [1000676, 'Dual'], [1000855, 'Dual'],
      [1000856, 'Dual'], [1000921, 'Dual'], [1001055, 'Dual'], [1001172, 'Dual'],
    ];

    it.each(CARD)('%i sits in the %s enchant slot', (id, slot) => {
      expect(db[id], `${id} missing from item.json`).toBeDefined();
      expect(db[id].itemSubTypeId).toBe(SUBTYPE[slot]);
    });

    it('registers the whole family, not just the ids the card named', () => {
      const perSlot = (sub: number) =>
        Object.values(db).filter((i: any) => i.itemSubTypeId === sub).length;

      // Topo 117, Meio 139, Baixo 133, Capa 80, Dual 27 — the 255 re-issues on top of the
      // records that were already there. Bump these deliberately when the client adds more.
      expect([71, 72, 73, 74, 76].map(perSlot)).toEqual([117, 139, 133, 80, 27]);
    });
  });

  describe('Corpo — the set fires across both generations', () => {
    // Each piece gives melee +3% on its own; the (Topo) piece adds +6% with Meio and Baixo.
    it('pays the old-code set', () => {
      expect(bonusOf('melee', [[310327, 'Topo'], [310328, 'Meio'], [310329, 'Baixo']])).toBe(15);
    });

    it('pays the same for the all-new-code set', () => {
      expect(bonusOf('melee', [[1000377, 'Topo'], [1000378, 'Meio'], [1000379, 'Baixo']])).toBe(15);
    });

    it('pays a mixed set — the new Topo with the old Meio and Baixo', () => {
      expect(bonusOf('melee', [[1000377, 'Topo'], [310328, 'Meio'], [310329, 'Baixo']])).toBe(15);
    });

    it('does not pay the (Topo) set bonus with only one partner', () => {
      expect(bonusOf('melee', [[1000377, 'Topo'], [1000378, 'Meio']])).toBe(6);
    });
  });

  describe('1000524 Pedra de Corpo (Dual) — the clause the card was filed on', () => {
    // dual 4 + 2 per Corpo piece + 3 per piece + the Topo piece's own +6% set.
    it('recognises the new-code pieces, which it did not before', () => {
      expect(
        bonusOf('melee', [
          [1000524, 'Dual'], [1000377, 'Topo'], [1000378, 'Meio'], [1000379, 'Baixo'],
        ]),
      ).toBe(25);
    });

    it('still recognises the old-code pieces', () => {
      expect(
        bonusOf('melee', [
          [1000524, 'Dual'], [310327, 'Topo'], [310328, 'Meio'], [310329, 'Baixo'],
        ]),
      ).toBe(25);
    });

    it('pays one clause per piece worn', () => {
      expect(bonusOf('melee', [[1000524, 'Dual'], [1000378, 'Meio']])).toBe(4 + 2 + 3);
    });
  });

  describe('Alcance — same shape, ranged damage', () => {
    it('pays the new-code Dual with a mixed set', () => {
      // dual 4 + 2·3 + 3·3 + the (Topo) piece's +6%.
      expect(
        bonusOf('range', [
          [1000523, 'Dual'], [1000375, 'Topo'], [310330, 'Meio'], [1000376, 'Baixo'],
        ]),
      ).toBe(25);
    });
  });

  describe('Propriedade — new stones, no old-code counterpart', () => {
    it('gives +3% a piece', () => {
      expect(bonusOf('m_my_element_all', [[1000529, 'Meio']])).toBe(3);
      expect(bonusOf('m_my_element_all', [[1000530, 'Baixo']])).toBe(3);
    });

    it('adds the (Topo) +6% only with both Meio and Baixo', () => {
      expect(bonusOf('m_my_element_all', [[1000528, 'Topo']])).toBe(3);
      expect(bonusOf('m_my_element_all', [[1000528, 'Topo'], [1000529, 'Meio']])).toBe(6);
      expect(
        bonusOf('m_my_element_all', [[1000528, 'Topo'], [1000529, 'Meio'], [1000530, 'Baixo']]),
      ).toBe(15);
    });

    it('adds the (Dual) +4% plus one +2% clause per piece', () => {
      expect(bonusOf('m_my_element_all', [[1000527, 'Dual']])).toBe(4);
      expect(bonusOf('m_my_element_all', [[1000527, 'Dual'], [1000529, 'Meio']])).toBe(4 + 2 + 3);
      expect(
        bonusOf('m_my_element_all', [
          [1000527, 'Dual'], [1000528, 'Topo'], [1000529, 'Meio'], [1000530, 'Baixo'],
        ]),
      ).toBe(4 + 6 + 15);
    });
  });

  describe('the talent (Dual) stones', () => {
    it.each([
      ['acd', 1000675, 5],
      ['crt', 1000676, 5],
      ['con', 1000856, 5],
      ['spl', 1000921, 5],
      ['pow', 1001055, 5],
    ])('%s from %i is +%i', (key, id, value) => {
      expect(bonusOf(key as string, [[id as number, 'Dual']])).toBe(value);
    });

    it('Sabsta gives both SAB and STA', () => {
      expect(bonusOf('wis', [[1001172, 'Dual']])).toBe(5);
      expect(bonusOf('sta', [[1001172, 'Dual']])).toBe(5);
    });

    it('Critical gives crit rate and crit damage', () => {
      expect(bonusOf('cri', [[1000855, 'Dual']])).toBe(10);
      expect(bonusOf('criDmg', [[1000855, 'Dual']])).toBe(10);
    });

    it('grants nothing when not worn', () => {
      expect(bonusOf('pow', [])).toBe(0);
      expect(bonusOf('m_my_element_all', [])).toBe(0);
    });
  });

  describe('1000522 Pedra de Variável -10% (Dual)', () => {
    it('gives -5% variable cast on its own', () => {
      expect(bonusOf('vct', [[1000522, 'Dual']])).toBe(5);
      expect(bonusOf('fct', [[1000522, 'Dual']])).toBe(0);
    });

    it('adds -0,5s fixed cast with either generation of the (Capa) stone', () => {
      expect(bonusOf('fct', [[1000522, 'Dual'], [29358, 'Capa']])).toBe(0.5);
      expect(bonusOf('fct', [[1000522, 'Dual'], [25306, 'Capa']])).toBe(0.5);
    });
  });
});
