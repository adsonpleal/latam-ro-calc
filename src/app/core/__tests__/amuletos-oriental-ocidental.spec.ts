import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * 490150 Amuleto Oriental and 490151 Amuleto Ocidental, which were in no picker at all
 * because neither existed in item.json.
 *
 * They are a pair by design: each takes one accessory side, so both can be worn at once and
 * their "Dano físico e mágico +5%" adds up. The set the two of them form — [Bolas de Fogo]
 * level 3 and a chance to petrify the attacker — is outside what the calculator models, and
 * is deliberately not registered.
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ORIENTAL = 490150;
const OCIDENTAL = 490151;

const WEAPON = 1201; // Knife [3] — inert host so the calculator has something equipped

type Slots = Partial<Record<'accLeft' | 'accRight', number>>;

/** Equip `equip` alongside the inert knife and hand back the summed equipment bonus. */
function totals(equip: Slots): Record<string, number> {
  const items: any = { [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 } };
  for (const id of Object.values(equip)) items[id] = { ...db[id] };

  const model = createMainModel();
  model.level = 200;
  model.weapon = WEAPON;
  Object.assign(model, equip);

  return equipStatusOf(makeCalculator(items), model);
}

describe('Amuleto Oriental (490150) and Ocidental (490151)', () => {
  it('are in the database, one per accessory side', () => {
    expect(db[ORIENTAL].itemSubTypeId).toBe(511); // Aces. Esquerdo
    expect(db[OCIDENTAL].itemSubTypeId).toBe(510); // Aces. Direito
    expect(db[ORIENTAL].slots).toBe(1);
    expect(db[OCIDENTAL].slots).toBe(1);
  });

  it('each grants "Dano físico e mágico +5%"', () => {
    const left = totals({ accLeft: ORIENTAL });
    expect(left['atkPercent']).toBe(5);
    expect(left['matkPercent']).toBe(5);

    const right = totals({ accRight: OCIDENTAL });
    expect(right['atkPercent']).toBe(5);
    expect(right['matkPercent']).toBe(5);
  });

  it('stacks when both sides are worn', () => {
    const both = totals({ accLeft: ORIENTAL, accRight: OCIDENTAL });
    expect(both['atkPercent']).toBe(10);
    expect(both['matkPercent']).toBe(10);
  });
});
