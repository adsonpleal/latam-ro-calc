import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * What the Gray Wolf orbs are worth once socketed.
 *
 * The DEF/DEFM half comes from two reports filed the same day, by Ted and anonymously: the
 * Traje and the Veste offered no DEF and no DEFM orb. The orbs and their scripts were in
 * item.json all along — only the pools were missing them, which
 * `gray-wolf-enchants.spec.ts` now holds. What is pinned here is the other half: that the
 * orb actually scores once it is in a socket, refine steps included.
 *
 * The rest are the orbs that had no item.json record at all. Most land on display-only
 * keys, which by design never touch the damage pipeline — `healing-stats.spec.ts` holds
 * that line for every sustain key at once.
 *
 * @see https://browiki.org/wiki/Equipamentos_Cinzentos
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const TRAJE = 450177;
const VESTE = 450178;
const BOTAS = 470087;
const PINGENTE = 490106;

const SLOT_OF: Record<number, string> = {
  [TRAJE]: 'armor',
  [VESTE]: 'armor',
  [BOTAS]: 'boot',
  [PINGENTE]: 'accLeft',
};

/** Equip `piece` at `refine`, optionally with `orb` in its first socket. */
function statusOf(piece: number, orb: number | undefined, refine = 0): Record<string, number> {
  const items: any = { [piece]: { ...db[piece] } };
  if (orb) items[orb] = { ...db[orb] };

  const slot = SLOT_OF[piece];
  const model = createMainModel();
  model.level = 200;
  model[slot] = piece;
  model[`${slot}Refine`] = refine;
  if (orb) model[`${slot}Enchant1`] = orb;

  return equipStatusOf(makeCalculator(items), model);
}

/**
 * What the orb alone adds to `key` — the piece's own DEF and its refine bonus land on the
 * same totals, so the orb is only legible as the difference against the bare piece.
 */
function orbBonus(piece: number, orb: number, key: string, refine = 0): number {
  return (statusOf(piece, orb, refine)[key] || 0) - (statusOf(piece, undefined, refine)[key] || 0);
}

describe.each([
  ['450177 Traje do Lobo Cinzento', TRAJE],
  ['450178 Veste do Lobo Cinzento', VESTE],
])('DEF and DEFM orbs on the %s', (_label, piece) => {
  // "DEF +150. No refino +7: DEF +75 adicional." — the steps add up as the refine climbs.
  it.each([
    [0, 150],
    [6, 150],
    [7, 225],
    [9, 300],
    [11, 375],
  ])('Orbe Lupino - DEF 1 grants +%i DEF at refine %i', (refine, expected) => {
    expect(orbBonus(piece, 310496, 'def', refine)).toBe(expected);
  });

  it.each([
    [0, 15],
    [6, 15],
    [7, 22],
    [9, 29],
    [11, 36],
  ])('Orbe Lupino - DEFM 1 grants +%i DEFM at refine %i', (refine, expected) => {
    expect(orbBonus(piece, 310497, 'mdef', refine)).toBe(expected);
  });

  it('scores the third tier at its own numbers', () => {
    expect(orbBonus(piece, 310500, 'def', 0)).toBe(250);
    expect(orbBonus(piece, 310500, 'def', 11)).toBe(250 + 75 + 100 + 100);
    expect(orbBonus(piece, 310501, 'mdef', 11)).toBe(25 + 7 + 10 + 10);
  });

  it('grants no DEF at all without an orb in the socket', () => {
    // Guards the difference above against a piece whose own DEF happened to move.
    expect(orbBonus(piece, 310496, 'mdef', 11)).toBe(0);
    expect(orbBonus(piece, 310497, 'def', 11)).toBe(0);
  });
});

describe('Orbe Lupino - Maré (310564)', () => {
  // "Recarga de [Proteção da Orla] e [Festa do Camarão] -1 segundo." Both are Animista
  // support skills; cd__<id> is a cooldown reduction in seconds, and the number is stored
  // positive (see 2056 Gravitação).
  const TUNA_PARTY = 5039;
  const SHRIMP_PARTY = 5051;

  it.each([
    [0, 1],
    [7, 2],
    [9, 4],
    [11, 6],
  ])('cuts both cooldowns by %i second(s) at refine %i', (refine, expected) => {
    expect(orbBonus(TRAJE, 310564, `cd__${TUNA_PARTY}`, refine)).toBe(expected);
    expect(orbBonus(TRAJE, 310564, `cd__${SHRIMP_PARTY}`, refine)).toBe(expected);
  });
});

describe('the sustain orbs', () => {
  it('Cura 2 (310593) adds healing effectiveness, stepping with the refine', () => {
    expect(orbBonus(BOTAS, 310593, 'healPower', 0)).toBe(5);
    expect(orbBonus(BOTAS, 310593, 'healPower', 11)).toBe(20);
  });

  it('Cura 1 and Cura 3 (310590 / 310596) step on their own, uneven, numbers', () => {
    // 310590 reads 3 / +4 / +5 / +5 and 310596 reads 5 / +5 / +7 / +7 — neither is flat.
    expect(orbBonus(BOTAS, 310590, 'healPower', 0)).toBe(3);
    expect(orbBonus(BOTAS, 310590, 'healPower', 11)).toBe(3 + 4 + 5 + 5);
    expect(orbBonus(BOTAS, 310596, 'healPower', 11)).toBe(5 + 5 + 7 + 7);
  });

  it.each([
    [310635, 'hpRecovRate', 20],
    [310637, 'hpRecovRate', 30],
    [310639, 'hpRecovRate', 40],
    [310641, 'hpRecovRate', 50],
    [310636, 'spRecovRate', 20],
    [310638, 'spRecovRate', 30],
    [310640, 'spRecovRate', 40],
    [310642, 'spRecovRate', 50],
  ])('%i adds %s +%i%%, unaffected by the refine', (orb, key, expected) => {
    expect(orbBonus(PINGENTE, orb, key, 0)).toBe(expected);
    expect(orbBonus(PINGENTE, orb, key, 11)).toBe(expected);
  });

  it('stores the leech magnitude, not the chance that triggers it', () => {
    // "4% de chance de converter 2% do dano físico causado em HP" -> hpDrain 2, not 4.
    expect(orbBonus(PINGENTE, 310643, 'hpDrain')).toBe(2);
    expect(orbBonus(PINGENTE, 310644, 'spDrain')).toBe(3);
  });

  it('normalises the [Cura Mágica] procs to per second', () => {
    // Vida: 700 HP a cada 0,5 segundos. Mente: 100 SP a cada 0,5 segundos.
    expect(orbBonus(PINGENTE, 310645, 'magicHealHp')).toBe(1400);
    expect(orbBonus(PINGENTE, 310646, 'magicHealSp')).toBe(200);
  });
});
