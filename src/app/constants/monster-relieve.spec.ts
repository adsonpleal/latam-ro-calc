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
   * Both Jardim Secreto MVPs (https://browiki.org/wiki/Jardim_Secreto). The list is the
   * only thing deciding who gets the picker, so it is asserted by id: the pt-BR names
   * ("Pimentinha"/"Pimentão") live in latam-monsters.json and monster.json still carries
   * the upstream Red Pepper / Senior Red Pepper, which makes the ids the stable handle.
   */
  it('is offered for the two monsters known to cast it, and no others', () => {
    expect(hasRelieve(20620)).toBe(true); // Pimentinha Kappa (MD_REDPEPPER), normal
    expect(hasRelieve(20621)).toBe(true); // Pimentão Lambda (MD_REDPEPPER_H), hard
    expect(hasRelieve(1002)).toBe(false); // Poring
    expect(hasRelieve(1087)).toBe(false); // Orc Hero, a red-aura MVP
    expect(RELIEVE_MONSTER_IDS.size).toBe(2);
  });
});
