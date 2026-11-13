import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * Soco-Inglês Afiado do Éden (560024), pinned to the pt-BR client text:
 *
 *   A cada nível de [Combo Quádruplo]: HP máx. +2%.
 *   Dano físico +5%.
 *   Nível de base 105 ou mais:
 *     Recarga de [Garra de Tigre] -1 segundo.
 *     Dano de [Soco Furacão] e [Garra de Tigre] +25%.
 *   Nível de base 110 ou mais:
 *     Dano físico corpo a corpo +15%.
 *     Dano físico contra todos os tamanhos +15%.
 *   Nível de base 115 ou mais:
 *     Dano de [Soco Furacão] e [Garra de Tigre] +15% adicional.
 *
 * The 25% + 15% pair was keyed to 2329 — Ruína — instead of 2327, Soco Furacão, so a Shura
 * wearing it read +40% on a skill the knuckle never mentions (board card P5DiExGP3rp3OxqdEjGX,
 * reported by xMorwen). The three ids sit next to each other in the client's own catalog and
 * all three belong to the same class, which is what let it pass unnoticed.
 */

const SOQUEIRA = 560024;
const SOCO_FURACAO = 2327;
const RUINA = 2329;
const GARRA_DE_TIGRE = 2330;
const COMBO_QUADRUPLO = 272;

const stat = (bonus: Record<string, number>, key: number | string) => bonus[String(key)] ?? 0;

describe('560024 Soco-Inglês Afiado do Éden', () => {
  it('carries the client text as a script, and names no skill the text leaves out', () => {
    expect(ITEM_DB[SOQUEIRA].script).toEqual({
      [SOCO_FURACAO]: ['SUM[level==105]===25', 'SUM[level==115]===15'],
      [GARRA_DE_TIGRE]: ['SUM[level==105]===25', 'SUM[level==115]===15'],
      [`cd__${GARRA_DE_TIGRE}`]: ['SUM[level==105]===1'],
      atkPercent: ['5'],
      hpPercent: [`SKILL_ID[${COMBO_QUADRUPLO}==1]---2`],
      melee: ['SUM[level==110]===15'],
      p_size_all: ['SUM[level==110]===15'],
    });
  });

  it.each([
    { level: 104, pays: 0 },
    { level: 105, pays: 25 },
    { level: 115, pays: 40 },
  ])('pays $pays% to Soco Furacão and Garra de Tigre at base $level, and nothing to Ruína', ({ level, pays }) => {
    const bonus = wornBonus({ weapon: SOQUEIRA, level });

    expect(stat(bonus, SOCO_FURACAO)).toBe(pays);
    expect(stat(bonus, GARRA_DE_TIGRE)).toBe(pays);
    expect(stat(bonus, RUINA)).toBe(0);
  });
});
