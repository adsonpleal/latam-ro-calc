import { describe, expect, it } from 'vitest';
import { ESPADA_1H, ESPADA_2H, ITEM_DB, LIVRO, MACHADO_2H, wornBonus } from './worn-bonus';

/**
 * Cards whose payload hangs on the weapon carrying them — and, with them, the reading that
 * decides how far a condition reaches.
 *
 * The rule these three pin down: a clause sharing a line with the condition inherits it, and
 * a clause on its own line does not. Getting that backwards is not a rounding error — it is
 * a bonus firing on gear the game never grants it to, which is exactly what Carta Ju was
 * doing before 300189 was corrected.
 *
 * Every bonus below is a line from the pt-BR description, which is the source of truth.
 */

describe('300172 Carta Sugador de Cérebro — no condition at all', () => {
  it('removes 15% of max HP — "MHP - 15%"', () => {
    expect(wornBonus({ weapon: ESPADA_1H, weaponCard: 300172 })['hpPercent']).toBe(-15);
  });

  it('brings nothing else (SP drain and life absorption are not modelled)', () => {
    expect(Object.keys(ITEM_DB[300172].script)).toEqual(['hpPercent']);
  });
});

describe('300176 Carta Forma de Vida Não Identificada — a weapon-class condition', () => {
  // "Se a arma equipada for Espada de Duas Mãos ou Machado de Duas Mãos, dano
  //  físico corpo a corpo +10%, Velocidade de ataque + 1."
  it.each([
    ['Espada de Duas Mãos', ESPADA_2H],
    ['Machado de Duas Mãos', MACHADO_2H],
  ])('grants +10%% melee and +1 ASPD with %s', (_weaponClass, weapon) => {
    const bonus = wornBonus({ weapon, weaponCard: 300176 });
    expect(bonus['melee']).toBe(10);
    expect(bonus['aspd']).toBe(1);
  });

  it('grants none of that on a weapon of another class', () => {
    const bonus = wornBonus({ weapon: ESPADA_1H, weaponCard: 300176 });
    expect(bonus['melee'] ?? 0).toBe(0);
    expect(bonus['aspd'] ?? 0).toBe(0);
  });

  // "A cada 2 refinos, dano físico corpo a corpo +1% adicional." — its own line in the
  // description, without repeating the weapon condition, so it always applies (the same
  // reading already used for Carta Verme Tumular 300171).
  it('adds +1%% melee per 2 refines', () => {
    expect(wornBonus({ weapon: ESPADA_2H, weaponCard: 300176, weaponRefine: 10 })['melee']).toBe(10 + 5);
  });

  it('keeps the refine step on a weapon of another class', () => {
    expect(wornBonus({ weapon: ESPADA_1H, weaponCard: 300176, weaponRefine: 10 })['melee']).toBe(5);
  });
});

describe('300189 Carta Ju da Arena — a refine step inside the condition', () => {
  // "Se a arma for um livro, dano ... +20% adicional. Se o refino for +14 ou superior,
  // dano ... +30% adicional." — both clauses sit on the SAME line, so the refine step
  // inherits the book condition. Before the correction, the +30% applied on any weapon.
  const BOLTS = ['14', '19', '20'] as const;

  it('grants the bolts +15%% on any weapon', () => {
    const bonus = wornBonus({ weapon: ESPADA_1H, weaponCard: 300189 });
    for (const skill of BOLTS) expect(bonus[skill]).toBe(15);
  });

  it('adds +20%% when the weapon is a book', () => {
    const bonus = wornBonus({ weapon: LIVRO, weaponCard: 300189 });
    for (const skill of BOLTS) expect(bonus[skill]).toBe(35);
  });

  it('adds +30%% on a book refined to +14', () => {
    const bonus = wornBonus({ weapon: LIVRO, weaponCard: 300189, weaponRefine: 14 });
    for (const skill of BOLTS) expect(bonus[skill]).toBe(65);
  });

  it('does NOT grant the +30%% on a +14 that is not a book', () => {
    const bonus = wornBonus({ weapon: ESPADA_1H, weaponCard: 300189, weaponRefine: 14 });
    for (const skill of BOLTS) expect(bonus[skill]).toBe(15);
  });
});
