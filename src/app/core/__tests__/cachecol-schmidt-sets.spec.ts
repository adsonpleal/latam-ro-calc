import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * 420748 Cachecol Físico de Schmidt and its three Brasão sets.
 *
 * Each Brasão is a different accessory and each set has two clauses: a flat one that always
 * applies, and a conditional one that needs base 125 in that Brasão's stat. Only the flat
 * halves were registered, so the conditional ones — the reason the scarf is worn at all —
 * did nothing.
 *
 * Every number here comes from the scarf's own pt-BR description (CLAUDE.md).
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const CACHECOL = 420748;
const BRASAO_STR = 32228;
const BRASAO_LUK = 32230;
const BRASAO_AGI = 32232;

const WEAPON = 1201; // Knife [3] — inert host so the calculator has something equipped

type Slots = Partial<Record<'headLower' | 'accLeft', number>>;

/** Equip `equip` at base stats `opts` and hand back the summed equipment bonus. */
function totals(equip: Slots, opts: { str?: number; luk?: number; } = {}): Record<string, number> {
  const { str = 1, luk = 1 } = opts;

  const items: any = { [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 } };
  for (const id of Object.values(equip)) items[id] = { ...db[id] };

  const model = createMainModel();
  model.level = 200;
  model.str = str;
  model.luk = luk;
  model.weapon = WEAPON;
  Object.assign(model, equip);

  return equipStatusOf(makeCalculator(items), model);
}

describe('Cachecol Físico de Schmidt (420748) — the set clauses', () => {
  it('nullifies the weapon size penalty with the Brasão FOR at base FOR 125', () => {
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_STR }, { str: 125 })['ignore_size_penalty']).toBe(1);
  });

  it('does not nullify it below FOR 125, nor without the Brasão', () => {
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_STR }, { str: 124 })['ignore_size_penalty'] ?? 0).toBe(0);
    expect(totals({ headLower: CACHECOL }, { str: 200 })['ignore_size_penalty'] ?? 0).toBe(0);
  });

  it('keeps the flat halves of the two sets — perfect hit +25 (FOR) and ATQ +25 (SOR)', () => {
    // perfectHit starts at the engine's DEFAULT_PERFECT_HIT of 5.
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_STR })['perfectHit']).toBe(30);
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_LUK })['atk']).toBe(25);
  });

  it('adds melee +10% with the Brasão SOR at base SOR 125', () => {
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_LUK }, { luk: 125 })['melee']).toBe(10);
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_LUK }, { luk: 124 })['melee'] ?? 0).toBe(0);
  });

  it('adds CRIT à distância +25 with the Brasão AGI, on its own key', () => {
    const t = totals({ headLower: CACHECOL, accLeft: BRASAO_AGI });

    expect(t['criRange']).toBe(25);
    // Never folded into `cri`: the skill crit rate reads `cri`, and this bonus is the
    // ranged BASIC attack's only (damage-calculator getRangedCriRate).
    expect(t['cri'] ?? 0).toBe(0);
  });

  it('gives no CRIT à distância without the Brasão AGI', () => {
    expect(totals({ headLower: CACHECOL })['criRange'] ?? 0).toBe(0);
    expect(totals({ headLower: CACHECOL, accLeft: BRASAO_LUK })['criRange'] ?? 0).toBe(0);
  });

  // Left out on purpose: the AGI set's second clause is "Aumenta a velocidade de
  // movimento", which the engine does not model for any item — there is no move-speed
  // stage in the damage formula to hang it on.
});
