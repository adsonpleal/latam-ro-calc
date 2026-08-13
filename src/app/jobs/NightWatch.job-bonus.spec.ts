import { describe, expect, it } from 'vitest';
import { JOB_4_MAX_JOB_LEVEL } from '../app-config';
import { NightWatch } from './NightWatch';

/**
 * Night Watch job and trait bonuses, checked against **irowiki.org/wiki/Night_Watch**,
 * "Job & Talent Bonuses" section.
 *
 * That table is transposed relative to the code: per stat, it lists the job levels at
 * which the stat reaches +1, +2, +3... That list is what is reproduced here, and the test
 * expands it per level and compares against the table in the class file — so the source
 * stays readable on the test side instead of disappearing into 140 lines of array.
 *
 * This caught two errors: LUK arrived one level late (irowiki gives +1 already at level
 * 2) and AGI reached +8 at level 25 instead of 32.
 *
 * Level 50 has a second confirmation, independent of irowiki: the `Armas + Mira.rrf`
 * recording reports `SP_PATK = 70` with no weapon, and P.ATK is ⌊POW/3⌋ + ⌊CON/5⌋ + 15
 * from the shadow POW set, which only closes at POW 117 and CON 81 — exactly 100 + 9 and
 * 62 + 9 + 10, this table's bonuses at level 50.
 */

/** Per stat, the job levels at which it reaches +1, +2, +3, ... */
const IROWIKI_JOB = {
  str: [1, 2, 30],
  agi: [2, 8, 12, 13, 20, 23, 24, 32],
  vit: [3, 5, 6, 16, 20, 29],
  int: [4, 5, 14, 16, 17, 19, 26, 30],
  dex: [6, 7, 11, 12, 14, 18, 19, 21, 22, 27, 31],
  luk: [2, 4, 9, 10, 13, 15, 25],
};

const IROWIKI_TRAIT = {
  pow: [7, 21, 23, 32, 35, 40, 44, 46, 50],
  sta: [1, 15, 33, 41, 42, 46],
  wis: [10, 22, 38, 48],
  spl: [] as number[],
  con: [26, 28, 31, 36, 38, 41, 45, 47, 49],
  crt: [27, 33, 34, 36, 43],
};

/** How many steps of the list have been passed at level `lv`. */
const at = (niveis: number[], lv: number) => niveis.filter((n) => n <= lv).length;

const NIVEIS = Array.from({ length: JOB_4_MAX_JOB_LEVEL }, (_, i) => i + 1);

describe('Guarda Noturno — bônus de classe e talento vs. irowiki', () => {
  it.each(NIVEIS)('nível de classe %i: FOR/AGI/VIT/INT/DES/SOR', (lv) => {
    const b = new NightWatch().getJobBonusStatus(lv);
    expect([b.str, b.agi, b.vit, b.int, b.dex, b.luk]).toEqual([
      at(IROWIKI_JOB.str, lv), at(IROWIKI_JOB.agi, lv), at(IROWIKI_JOB.vit, lv),
      at(IROWIKI_JOB.int, lv), at(IROWIKI_JOB.dex, lv), at(IROWIKI_JOB.luk, lv),
    ]);
  });

  it.each(NIVEIS)('nível de classe %i: POD/STA/SAB/FEI/CON/CRV', (lv) => {
    const b = new NightWatch().getJobBonusStatus(lv);
    expect([b.pow, b.sta, b.wis, b.spl, b.con, b.crt]).toEqual([
      at(IROWIKI_TRAIT.pow, lv), at(IROWIKI_TRAIT.sta, lv), at(IROWIKI_TRAIT.wis, lv),
      at(IROWIKI_TRAIT.spl, lv), at(IROWIKI_TRAIT.con, lv), at(IROWIKI_TRAIT.crt, lv),
    ]);
  });

  // The top is what every real build uses, so it is worth spelling out.
  it('matches the recording at level 50 (the Expanded 4th maximum)', () => {
    const b = new NightWatch().getJobBonusStatus(50);
    expect({ str: b.str, agi: b.agi, vit: b.vit, int: b.int, dex: b.dex, luk: b.luk })
      .toEqual({ str: 3, agi: 8, vit: 6, int: 8, dex: 11, luk: 7 });
    expect({ pow: b.pow, sta: b.sta, wis: b.wis, spl: b.spl, con: b.con, crt: b.crt })
      .toEqual({ pow: 9, sta: 6, wis: 4, spl: 0, con: 9, crt: 5 });
  });
});
