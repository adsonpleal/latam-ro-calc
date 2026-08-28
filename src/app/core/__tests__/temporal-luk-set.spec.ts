import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The Temporal SOR set: the armour (15346) and the manteau (20968) each pair with **either**
 * boot, and both pt-BR descriptions say so in the same words.
 *
 *   15346 "Armadura Temporal SOR"
 *     Conjunto / Bota Temporal SOR [1] ou Bota Modificada SOR [1]
 *     Dano crítico +10%.
 *     Soma dos refinos da Armadura e Bota for 21 ou mais:
 *     Ignora 20% adicional de DEF das raças Bruto e Demônio.
 *
 * The armour used to name its partners as `EQUIP[Temporal Luk Boots||Modified Temporal Luk
 * Boots]`, and **no item carries that second name** — the boot is "Modified Luk Boots",
 * without "Temporal". So the alternative never resolved and the set silently paid nothing
 * to anyone wearing the Modified boot, for either clause. The manteau, describing the same
 * pair, had it right all along.
 *
 * Both boots exist in two generations and only the slotted one belongs to the set, which is
 * what the `[1]` in the description means:
 *
 *   Bota Temporal SOR    22005 (0 slots)   22011 [1]  <- the set partner
 *   Botas Modificadas SOR 22112 (0 slots)  22118 [1]  <- the set partner
 *
 * They are also not two generations of one name as far as `EQUIP[...]` was concerned —
 * "Modified Luk Boot" and "Modified Luk Boots" are different strings — which is why the
 * migration's structural invariant does not demand 22112 here.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ARMOR = 15346;
const MANTEAU = 20968;
const TEMPORAL_BOOT = 22011;
const MODIFIED_BOOT = 22118;

/** The armour on its own, or with one of the two boots, at a given refine on both pieces. */
function statusOf(boot: number | 0, refine: number, piece = ARMOR, pieceSlot = 'armor') {
  const model: any = createMainModel();
  model.level = 200;
  model.jobLevel = 50;
  model[pieceSlot] = piece;
  model[`${pieceSlot}Refine`] = refine;
  if (boot) {
    model.boot = boot;
    model.bootRefine = refine;
  }

  return equipStatusOf(makeCalculator(db), model);
}

describe('Temporal SOR set: the armour pairs with either boot', () => {
  it('pays "Dano crítico +10%" with the Modified boot, not only the Temporal one', () => {
    const alone = statusOf(0, 0).criDmg ?? 0;
    const withTemporal = statusOf(TEMPORAL_BOOT, 0).criDmg ?? 0;
    const withModified = statusOf(MODIFIED_BOOT, 0).criDmg ?? 0;

    // The set bonus is +10 on top of whatever the pieces give on their own; the two boots
    // carry the same script, so both sides have to land on the same number.
    expect(withTemporal - alone).toBe(10);
    expect(withModified).toBe(withTemporal);
  });

  it('pays the extra Bruto/Demônio DEF pierce once the refines sum to 21, with either boot', () => {
    // 11 + 11 = 22, over the threshold. The armour alone already gives 30 at refine >= 7.
    const alone = statusOf(0, 11);
    const withTemporal = statusOf(TEMPORAL_BOOT, 11);
    const withModified = statusOf(MODIFIED_BOOT, 11);

    for (const key of ['p_pene_race_brute', 'p_pene_race_demon'] as const) {
      expect(withTemporal[key] - alone[key]).toBe(20);
      expect(withModified[key]).toBe(withTemporal[key]);
    }
  });

  it('does not pay the refine-gated pierce when the sum falls short', () => {
    // 5 + 5 = 10, under 21 — and under the armour's own +7 gate too, so it is 0 either way.
    const withTemporal = statusOf(TEMPORAL_BOOT, 5);
    expect(withTemporal.p_pene_race_brute ?? 0).toBe(0);
    expect(statusOf(MODIFIED_BOOT, 5).p_pene_race_brute ?? 0).toBe(0);
  });

  it('keeps the manteau paying with either boot too', () => {
    const alone = statusOf(0, 0, MANTEAU, 'garment').aspd ?? 0;
    expect((statusOf(TEMPORAL_BOOT, 0, MANTEAU, 'garment').aspd ?? 0) - alone).toBe(1);
    expect((statusOf(MODIFIED_BOOT, 0, MANTEAU, 'garment').aspd ?? 0) - alone).toBe(1);
  });

  it('names both slotted boots by id on both pieces', () => {
    for (const id of [ARMOR, MANTEAU]) {
      const script = JSON.stringify(db[id].script);
      expect(script).not.toMatch(/EQUIP\[/);
      for (const [, inner] of script.matchAll(/EQUIP_ID\[([^\]]+)\]/g)) {
        expect(inner.split('||').map(Number).sort((a, b) => a - b)).toEqual([TEMPORAL_BOOT, MODIFIED_BOOT]);
      }
    }
  });
});
