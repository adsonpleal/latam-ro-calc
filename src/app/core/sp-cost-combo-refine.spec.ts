import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { ITEM_DB } from './__tests__/worn-bonus';

/**
 * The eight "Custo de SP das habilidades" records whose clause is gated on something more
 * than the item's own refine — the ones the sweep in sp-cost-percent.spec.ts left out.
 *
 * NO new condition token was needed. Two shapes the engine already implements cover all of
 * them, they were simply not reached for:
 *
 *   "Soma dos refinos do conjunto N ou mais"     -> REFINE[slotA,slotB,...==N]===V
 *       the slot-sum branch of validateCondition (calculator.ts, "REFINE[headUpper,garment==22]")
 *   "A cada refino de cada peça do conjunto"     -> REFINE[slotA,slotB,...==1]---V
 *       the refineCombo branch of calcStepBonus, which sums the same slots and divides
 *
 * Both are combined with EQUIP_ID[a&&b&&...] so the sum only counts once the set is
 * actually worn — REFINE[...] on its own reads whatever happens to sit in those slots.
 * The summed refine INCLUDES the wearer's own piece, which is what "do conjunto" means.
 *
 * The odd one out is 22037 Coturno Heroico, "A cada refino a partir do +8 até o +13": a
 * bounded ladder, written as six thresholds the way 19249 Spell Circuit already writes
 * its own (+11..+15). That is deliberate — it needs no range token and it cannot run away
 * above +13.
 */

/** Shadow slot -> the model fields the calculator reads. */
const shadow = (pieces: Record<string, number>, refines: Record<string, number> = {}) => {
  const model: any = createMainModel();
  model.level = 200;
  const items: Record<number, any> = {};
  for (const [slot, id] of Object.entries(pieces)) {
    items[id] = ITEM_DB[id];
    model[slot] = id;
    model[`${slot}Refine`] = refines[slot] ?? 0;
  }

  return equipStatusOf(makeCalculator(items), model);
};

const sp = (t: Record<string, number>) => t['spCostPercent'] ?? 0;

describe('22037 Coturno Heroico — a refine ladder bounded at +13', () => {
  const worn = (bootRefine: number) => {
    const model: any = createMainModel();
    model.level = 200;
    model.boot = 22037;
    model.bootRefine = bootRefine;

    return equipStatusOf(makeCalculator({ 22037: ITEM_DB[22037] }), model);
  };

  it('gives the flat -5 below +8', () => {
    expect(sp(worn(0))).toBe(-5);
    expect(sp(worn(7))).toBe(-5);
  });

  it('takes one more point per refine from +8', () => {
    expect(sp(worn(8))).toBe(-6);
    expect(sp(worn(10))).toBe(-8);
    expect(sp(worn(13))).toBe(-11); // -5 and six rungs
  });

  it('stops at +13 — the ladder does not keep climbing', () => {
    expect(sp(worn(14))).toBe(-11);
    expect(sp(worn(20))).toBe(-11);
  });
});

describe('24675 / 24677 Pedras Preciosas — "Soma dos refinos 18 ou mais"', () => {
  it.each([
    [24675, 'shadowArmor', 24676, 'shadowBoot'],
    [24677, 'shadowEarring', 24678, 'shadowPendant'],
  ] as const)('%i: +40 only with the partner AND the summed refine', (id, slot, partner, partnerSlot) => {
    // partner missing: the sum is irrelevant
    expect(sp(shadow({ [slot]: id }, { [slot]: 20 }))).toBe(0);
    // partner worn, sum below 18
    expect(sp(shadow({ [slot]: id, [partnerSlot]: partner }, { [slot]: 9, [partnerSlot]: 8 }))).toBe(0);
    // exactly 18
    expect(sp(shadow({ [slot]: id, [partnerSlot]: partner }, { [slot]: 9, [partnerSlot]: 9 }))).toBe(40);
    // the wearer's own refine counts toward the sum
    expect(sp(shadow({ [slot]: id, [partnerSlot]: partner }, { [slot]: 18, [partnerSlot]: 0 }))).toBe(40);
  });
});

/**
 * Careful with the arithmetic in this block and the next: the partner pieces carry their
 * own flat "Custo de SP das habilidades -1%" too (they were registered in the earlier
 * sweep), so a worn set is never just the wearer's clauses. The totals below spell that
 * out rather than hiding it in a delta.
 */
describe('24240 Greva Sombria Conjurante — flat, set, and summed-refine tiers add', () => {
  const SET = { shadowBoot: 24240, shadowArmor: 24242, shadowShield: 24241 };

  it('alone: only the flat -1', () => {
    expect(sp(shadow({ shadowBoot: 24240 }))).toBe(-1);
  });

  it('with the set at refine 0: its own -1, the set\'s -1, and -1 from each partner', () => {
    expect(sp(shadow(SET))).toBe(-4);
  });

  it('needs 25 summed refine for the third tier', () => {
    expect(sp(shadow(SET, { shadowBoot: 8, shadowArmor: 8, shadowShield: 8 }))).toBe(-4); // 24
    expect(sp(shadow(SET, { shadowBoot: 9, shadowArmor: 8, shadowShield: 8 }))).toBe(-5); // 25
  });
});

describe('24112 Malha Sombria do Fluxo — own refine, then the set', () => {
  const SET = { shadowArmor: 24112, shadowBoot: 24111, shadowShield: 24113 };

  it('own tiers: -1, then -1 more at +7 and again at +9', () => {
    expect(sp(shadow({ shadowArmor: 24112 }, { shadowArmor: 6 }))).toBe(-1);
    expect(sp(shadow({ shadowArmor: 24112 }, { shadowArmor: 7 }))).toBe(-2);
    expect(sp(shadow({ shadowArmor: 24112 }, { shadowArmor: 9 }))).toBe(-3);
  });

  it('the set adds +40 and then takes one point per summed refine', () => {
    // own -1, plus -1 from each partner's own flat clause, plus the set's +40
    expect(sp(shadow(SET))).toBe(-1 - 1 - 1 + 40);
    // 5 + 5 + 5 = 15 summed; the wearer's own +7 tier has not been reached
    expect(sp(shadow(SET, { shadowArmor: 5, shadowBoot: 5, shadowShield: 5 }))).toBe(-1 - 1 - 1 + 40 - 15);
  });

  it('the +40 needs both partners — with one, only the two flat clauses', () => {
    expect(sp(shadow({ shadowArmor: 24112, shadowBoot: 24111 }))).toBe(-2);
  });
});

describe('24088 / 24322 — the six-piece Joias set', () => {
  const JOIAS = {
    shadowArmor: 24084, shadowBoot: 24085, shadowShield: 24086,
    shadowWeapon: 24087, shadowEarring: 24088, shadowPendant: 24089,
  };

  it('24088: nothing from the set clause while a piece is missing', () => {
    const { shadowPendant: _dropped, ...missingOne } = JOIAS;
    expect(sp(shadow(missingOne, {}))).toBe(0);
  });

  it('24088: one point off per summed refine once the six are worn', () => {
    expect(sp(shadow(JOIAS))).toBe(0);
    const at5 = Object.fromEntries(Object.keys(JOIAS).map((s) => [s, 5]));
    expect(sp(shadow(JOIAS, at5))).toBe(-30); // 6 x 5
  });

  it('24088: the +100 penalty lands once the summed refine reaches 45', () => {
    const at7 = Object.fromEntries(Object.keys(JOIAS).map((s) => [s, 7])); // 42
    const at8 = Object.fromEntries(Object.keys(JOIAS).map((s) => [s, 8])); // 48
    expect(sp(shadow(JOIAS, at7))).toBe(-42);
    expect(sp(shadow(JOIAS, at8))).toBe(100 - 48);
  });

  it('24322 Brinco de Gemas: same set, plus its own -2 and the +7 tier', () => {
    // The Gemas earring takes the earring slot, so the Joias earring is not worn.
    const withGemas = { ...JOIAS, shadowEarring: 24322 };
    expect(sp(shadow({ shadowEarring: 24322 }))).toBe(-2);
    expect(sp(shadow({ shadowEarring: 24322 }, { shadowEarring: 7 }))).toBe(-3);

    const at8 = Object.fromEntries(Object.keys(withGemas).map((s) => [s, 8])); // 48 summed
    expect(sp(shadow(withGemas, at8))).toBe(-2 - 1 + 100 - 48);
  });
});

describe('24335 Manopla Sombria de Gemas — three-piece Gemas set', () => {
  const SET = { shadowWeapon: 24335, shadowEarring: 24322, shadowShield: 24336 };

  it('alone: -2, and -1 more from +7', () => {
    expect(sp(shadow({ shadowWeapon: 24335 }))).toBe(-2);
    expect(sp(shadow({ shadowWeapon: 24335 }, { shadowWeapon: 7 }))).toBe(-3);
  });

  it('the +70 lands at 25 summed refine, and the per-refine cut runs alongside', () => {
    // Each partner carries its own spCostPercent too, so assert the delta the set adds.
    const at8 = { shadowWeapon: 8, shadowEarring: 8, shadowShield: 8 }; // 24 summed
    const at9 = { shadowWeapon: 9, shadowEarring: 8, shadowShield: 8 }; // 25 summed
    expect(sp(shadow(SET, at9)) - sp(shadow(SET, at8))).toBe(70 - 1);
  });
});
