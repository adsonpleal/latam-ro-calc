import { describe, expect, it } from 'vitest';
import { MAX_RELIEVE_LEVEL, RELIEVE_MONSTER_IDS, hasRelieve, relieveMultiplier, relieveReductionPercent } from './monster-relieve';

/**
 * The Aliviar table, held to https://browiki.org/wiki/Aliviar. The one number worth
 * guarding is level 10: the curve is a flat 10% per level until it stops one point short
 * of total immunity at 99%, and an off-by-one there turns "almost nothing lands" into
 * "nothing lands", which reads as a broken calculator rather than a hard boss.
 */
describe('Aliviar (NPC_RELIEVE_ON, 771)', () => {
  it('reduces 10% per level up to level 9, then 99% at level 10', () => {
    const table = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 99];
    for (const [level, percent] of table.entries()) {
      expect(relieveReductionPercent(level)).toBe(percent);
    }
    expect(MAX_RELIEVE_LEVEL).toBe(10);
  });

  it('turns the reduction into a damage multiplier', () => {
    expect(relieveMultiplier(0)).toBe(1);
    expect(relieveMultiplier(5)).toBeCloseTo(0.5, 10);
    expect(relieveMultiplier(10)).toBeCloseTo(0.01, 10);
  });

  /* The level arrives from localStorage, so anything can turn up here. */
  it('treats an out-of-range level as off rather than throwing', () => {
    for (const level of [-1, 11, 99, NaN]) {
      expect(relieveMultiplier(level)).toBe(1);
      expect(relieveReductionPercent(level)).toBe(0);
    }
  });

  /*
   * The list is the only thing deciding who gets the picker, so it is asserted by id: the
   * pt-BR names live in latam-monsters.json while monster.json can still carry an upstream
   * name (monster 20620 is "Red Pepper" there), which makes the ids the stable handle.
   *
   * None of these monsters lists skill 771 on divine-pride — the instance script turns it
   * on — so the membership below comes from bROWiki's instance pages, and the count is
   * asserted so that a monster cannot be added to the set without a source for it.
   */
  it('is offered for the monsters known to cast it, and no others', () => {
    // Jardim Secreto: https://browiki.org/wiki/Jardim_Secreto
    expect(hasRelieve(20620)).toBe(true); // Pimentinha Kappa (MD_REDPEPPER), normal
    expect(hasRelieve(20621)).toBe(true); // Pimentão Lambda (MD_REDPEPPER_H), hard

    // Arena Noturna: every opponent it can draw, per the per-round Nv. de Aliviar table.
    for (let id = 20856; id <= 20870; id++) expect(hasRelieve(id)).toBe(true);
    expect(hasRelieve(20872)).toBe(true); // Fenrir, the instance's boss

    // Torre da Constelação: the two configured MVPs.
    expect(hasRelieve(20996)).toBe(true); // Naght Sieger, Nv. 6-10 by Espinhos alive
    expect(hasRelieve(20994)).toBe(true); // Betelgeuse, Nv. 0-5 by ★ and up to 10 by Almas

    expect(hasRelieve(1002)).toBe(false); // Poring
    expect(hasRelieve(1087)).toBe(false); // Orc Hero, a red-aura MVP
    expect(hasRelieve(20871)).toBe(false); // Alphonse — an Arena opponent, but not in the DB
    expect(hasRelieve(20891)).toBe(false); // Criatura Desconhecida: Queda do Aeroplano has none
    expect(hasRelieve(21356)).toBe(false); // Ifrit da Torre — a floor boss, not a configured MVP
    expect(RELIEVE_MONSTER_IDS.size).toBe(20);
  });
});
