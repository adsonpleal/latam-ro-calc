import { describe, expect, it } from 'vitest';
import { JOB_4_MAX_JOB_LEVEL } from '../app-config';
import { NightWatch } from './NightWatch';

/**
 * Bônus de classe e de talento do Guarda Noturno, conferidos contra
 * **irowiki.org/wiki/Night_Watch**, seção "Job & Talent Bonuses".
 *
 * A tabela de lá é transposta em relação ao código: para cada atributo ela lista os
 * níveis de classe em que ele chega a +1, +2, +3... É essa lista que está reproduzida
 * aqui, e o teste expande-a por nível e compara com a tabela do arquivo da classe — assim
 * a fonte fica legível do lado do teste e não some dentro de 140 linhas de array.
 *
 * Isto pegou dois erros: SOR chegava um nível tarde (irowiki dá +1 já no nível 2) e AGI
 * chegava a +8 no nível 25 em vez do 32.
 *
 * O nível 50 tem uma segunda confirmação, independente do irowiki: a gravação
 * `Armas + Mira.rrf` traz `SP_PATK = 70` sem arma, e P.ATQ é ⌊POD/3⌋ + ⌊CON/5⌋ + 15 do
 * conjunto sombrio POD, o que só fecha com POD 117 e CON 81 — exatamente 100 + 9 e
 * 62 + 9 + 10, os bônus desta tabela no nível 50.
 */

/** Para cada atributo, os níveis de classe em que ele chega a +1, +2, +3, ... */
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

/** Quantos degraus da lista já passaram no nível `lv`. */
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

  // O topo é o que toda build real usa, então vale a pena estar escrito por extenso.
  it('no nível 50 (máximo da 4ª Expandida) os bônus são os da gravação', () => {
    const b = new NightWatch().getJobBonusStatus(50);
    expect({ str: b.str, agi: b.agi, vit: b.vit, int: b.int, dex: b.dex, luk: b.luk })
      .toEqual({ str: 3, agi: 8, vit: 6, int: 8, dex: 11, luk: 7 });
    expect({ pow: b.pow, sta: b.sta, wis: b.wis, spl: b.spl, con: b.con, crt: b.crt })
      .toEqual({ pow: 9, sta: 6, wis: 4, spl: 0, con: 9, crt: 5 });
  });
});
