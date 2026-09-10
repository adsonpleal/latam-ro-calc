import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * A piece whose refine was never picked must not erase the rest of the build's bonuses.
 *
 * Reported anonymously (tracker AKrHoH6GV0m5kxgR4ETg): a Sombra Cruzada whose Lâminas
 * Retalhadoras hit for 7.085K in game showed 4.217.899 on the site, and the "Dano
 * crítico" total read 30% while the popover listing its sources added up to 157%.
 *
 * The piece that did it was a Bota Temporal SOR at refine 0. `bootRefine` is `undefined`
 * in that state — `createMainModel()`'s own default, and `isEmpty` in the share codec
 * drops a 0 so every shared link comes back that way — and the boot's "A cada 3 refinos:
 * Dano crítico +2%" line then computed `floor(undefined / 3) * 2` = NaN. NaN is falsy, so
 * `updateTotalStatus`'s "nothing collected yet" branch fired and the NEXT piece's bonus
 * *replaced* the running total instead of adding to it. Everything summed before the
 * unrefined piece was thrown away: 127 of the 187 points of Dano crítico here, and the
 * whole HP and SP totals, which the panel then rendered blank.
 *
 * Two guards, because either one alone would have hidden the other: the refine lookup
 * lands on 0 (`getRefineLevelByItemType`), and a bonus that still fails to evaluate is
 * skipped rather than allowed to reset a key (`updateTotalStatus`).
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const BOTA_TEMPORAL_SOR = 22005; // criDmg: ["3---2", "luk:120===30"] — the step line is the trap
const MANTO_TEMPORAL_AGI = 20964; // criDmg: ["2---3", …] — a refined piece summed before it
const M_FATAL = 310094; // criDmg: ["10"] — a flat piece summed after it
const COLAR_SOMBRIO_INICIAL = 24392; // hp: ["1---10"] — the same trap on a shadow slot
const BROCHE_DEMONIACO = 2983; // inert accessory, here only to open the enchant slot

const withSlot = (id: number, itemTypeId: number, itemSubTypeId: number) => ({ ...db[id], itemTypeId, itemSubTypeId });

/** The three pieces above worn together, with the boot's refine left as the caller says. */
const critDamage = (bootRefine: number | undefined) => {
  const items = {
    [BOTA_TEMPORAL_SOR]: withSlot(BOTA_TEMPORAL_SOR, 2, 516),
    [MANTO_TEMPORAL_AGI]: withSlot(MANTO_TEMPORAL_AGI, 2, 515),
    [M_FATAL]: db[M_FATAL],
    [COLAR_SOMBRIO_INICIAL]: withSlot(COLAR_SOMBRIO_INICIAL, 12, 0),
    [BROCHE_DEMONIACO]: withSlot(BROCHE_DEMONIACO, 2, 510),
  };

  const model: any = createMainModel();
  model.level = 217;
  model.luk = 125; // clears the boot's "SOR base 120 ou mais: Dano crítico +30%"
  model.garment = MANTO_TEMPORAL_AGI;
  model.garmentRefine = 10;
  model.boot = BOTA_TEMPORAL_SOR;
  model.bootRefine = bootRefine;
  model.accRight = BROCHE_DEMONIACO;
  model.accRightEnchant3 = M_FATAL;
  model.shadowPendant = COLAR_SOMBRIO_INICIAL;

  return equipStatusOf(makeCalculator(items), model);
};

describe('a refine left unset (tracker AKrHoH6GV0m5kxgR4ETg)', () => {
  it('sums every source of Dano crítico, exactly as if the refine were 0', () => {
    // Manto +10 (floor(10/2) × 3) + boot's SOR 120 clause + M-Fatal.
    expect(critDamage(undefined)['criDmg']).toBe(15 + 30 + 10);
    expect(critDamage(undefined)['criDmg']).toBe(critDamage(0)['criDmg']);
  });

  it('still counts the piece own refine tiers once a refine is picked', () => {
    // The boot's own "A cada 3 refinos: Dano crítico +2%" on top of the three above.
    expect(critDamage(9)['criDmg']).toBe(15 + 30 + 10 + 6);
  });

  it('leaves HP a number rather than NaN', () => {
    // The boot's flat +300 and the pendant's "+10 por refino" (0 refines, so nothing).
    expect(critDamage(undefined)['hp']).toBe(300);
  });
});
