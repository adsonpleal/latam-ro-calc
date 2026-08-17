import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * 1000524 "Pedra de Corpo (Dual)" — the costume-garment enchant stone, reported missing
 * from the "Encantamento Capa 2" picker (tracker card HJGKoKdgrU2oiV1uhaBx).
 *
 * The record it was missing behind is 310661 "Melee Stone (Dual)", the upstream Thai item
 * of the same stone: LATAM never received that id, so it is `presentInLatam: false` and
 * ro-calculator.component.ts filters it out of every dropdown. LATAM re-issued the stone
 * as 1000524, which had no item.json record at all.
 *
 * The effect comes from the pt-BR description in latam-items.json: melee +4%, and three
 * separate `Conjunto` clauses worth +2% each, one per Corpo piece. They are three
 * independent conditions and not one combined clause, which is what the negative cases
 * below pin — a single `EQUIP_ID[a&&b&&c]` would read identically at the top step.
 *
 * The partners are 310327/310328/310329, the Corpo (Topo/Meio/Baixo) stones already in
 * the database. LATAM also ships 1000377/378/379 under the same pt-BR names; those are
 * not in item.json, so wearing them does not fire the combo — see the tracker card filed
 * alongside this fix.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const CORPO_DUAL = 1000524;
const CORPO_TOPO = 310327;
const CORPO_MEIO = 310328;
const CORPO_BAIXO = 310329;

interface Stones {
  dual?: boolean;
  topo?: boolean;
  meio?: boolean;
  baixo?: boolean;
}

/** Wear the requested stones in their costume-enchant slots and read `melee` back. */
function meleeOf(stones: Stones): number {
  const items: Record<number, any> = {};
  const model: any = createMainModel();
  model.level = 200;

  const wear = (id: number, slot: string) => {
    items[id] = db[id];
    model[slot] = id;
  };

  if (stones.dual) wear(CORPO_DUAL, 'costumeEnchantGarment2');
  if (stones.topo) wear(CORPO_TOPO, 'costumeEnchantUpper');
  if (stones.meio) wear(CORPO_MEIO, 'costumeEnchantMiddle');
  if (stones.baixo) wear(CORPO_BAIXO, 'costumeEnchantLower');

  return equipStatusOf(makeCalculator(items), model)['melee'] ?? 0;
}

describe('1000524 Pedra de Corpo (Dual)', () => {
  it('is in the database, in the slot the "Encantamento Capa 2" picker reads', () => {
    // itemSubTypeId 76 is CostumeEnhGarment2; the picker switches on it directly.
    expect(db[CORPO_DUAL]).toBeDefined();
    expect(db[CORPO_DUAL].itemSubTypeId).toBe(76);
  });

  it('gives melee +4% on its own', () => {
    expect(meleeOf({ dual: true })).toBe(4);
  });

  it('adds +2% for each Corpo piece, one clause at a time', () => {
    expect(meleeOf({ dual: true, topo: true })).toBe(4 + 3 + 2);
    expect(meleeOf({ dual: true, meio: true })).toBe(4 + 3 + 2);
    expect(meleeOf({ dual: true, baixo: true })).toBe(4 + 3 + 2);
  });

  it('stacks all three clauses with the full Corpo set', () => {
    // 4 (dual) + 2+2+2 (its three clauses) + 3+3+3 (each piece's own melee)
    // + 6 (the Topo piece's own "com Meio e Baixo" set bonus).
    expect(meleeOf({ dual: true, topo: true, meio: true, baixo: true })).toBe(25);
  });

  it('grants nothing when the stone is not worn', () => {
    expect(meleeOf({})).toBe(0);
    // The Corpo pieces alone must not pick up the dual stone's clauses.
    expect(meleeOf({ topo: true, meio: true, baixo: true })).toBe(3 + 3 + 3 + 6);
  });
});
