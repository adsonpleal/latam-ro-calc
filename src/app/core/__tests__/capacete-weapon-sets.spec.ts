import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * The three Passe de Batalha helmets — Capacete Decadente (401433), Fortificado (401434)
 * and Descartado (401435). Each pairs with a whole family of weapons and grants
 * "Dano físico e mágico contra todos os tamanhos +10%" with any one of them.
 *
 * Their `EQUIP_ID` lists only ever covered the first four or five partners, because the
 * client description used to name the rest with placeholder names that resolved to
 * nothing ("Cetro Fortificado", "Cauda de Gato Decandente", "Pulverizador Descartado").
 * The client's own text now names every partner, so the lists are complete — a wearer of
 * a Lâmina Decadente or a Revólver Descartado stopped losing 10% on both channels.
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

const FAMILIES: [string, number, number[]][] = [
  [
    '401433 Capacete Decadente',
    401433,
    [
      500018, // Espada Decadente
      510026, // Adaga Decadente
      510055, // Lâmina Decadente
      540043, // Livro Decadente
      550058, // Planta Decadente
      590015, // Cruz Decadente
      610015, // Katar Decadente
      620005, // Machado Decadente
    ],
  ],
  [
    '401434 Capacete Fortificado',
    401434,
    [
      510053, // Punhal Fortificado
      510054, // Gume Fortificado
      530009, // Pique Fortificado
      540013, // Grimório Fortificado
      550057, // Bastão Fortificado
      550059, // Cajado Fortificado
      600013, // Florete Fortificado
      640013, // Báculo Fortificado
    ],
  ],
  [
    '401435 Capacete Descartado',
    401435,
    [
      560011, // Punho Descartado
      570012, // Violino Descartado
      580012, // Chicote Descartado
      650020, // Triturador Descartado
      700021, // Arco Descartado
      800010, // Revólver Descartado
      810006, // Atirador Descartado
      820005, // Retalhador Descartado
      830009, // Aspersor Descartado
      840005, // Bombardeador Descartado
    ],
  ],
];

describe.each(FAMILIES)('%s', (_name, helmet, weapons) => {
  it.each(weapons)('fires the size combo with weapon %i', (weapon) => {
    const bonus = wornBonus({ headUpper: helmet, weapon });

    expect(bonus['p_size_all']).toBe(10);
    expect(bonus['m_size_all']).toBe(10);
  });

  it('grants nothing on its own', () => {
    const bonus = wornBonus({ headUpper: helmet });

    expect(bonus['p_size_all'] ?? 0).toBe(0);
    expect(bonus['m_size_all'] ?? 0).toBe(0);
  });
});
