import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * 470459 Sapato Quimera — the magic counterpart of the Botas da Fonte ladders: a per-3-refine
 * MATK step, thresholds at +7/+9/+11, grades D through A, and one card set.
 *
 * Two readings are pinned here because they are easy to widen by accident: the +11 step is
 * Pequeno and Médio only, and grade A's "a cada 2 refinos" stacks on both the base +5 and the
 * grade-D +5 rather than superseding them.
 *
 * Every bonus below is a line from the pt-BR description, which is the source of truth.
 */

const SAPATO = 470459;
const CARTA_QUIMERA_UNICA = 300262;

describe('470459 Sapato Quimera', () => {
  it('grants SPL and WIS +5 and after-cast -3%% with no refine requirement', () => {
    const bonus = wornBonus({ boot: SAPATO });
    expect(bonus['spl']).toBe(5);
    expect(bonus['wis']).toBe(5);
    expect(bonus['acd']).toBe(3);
  });

  it('adds MATK +7 per 3 refines', () => {
    expect(wornBonus({ boot: SAPATO, bootRefine: 9 })['matk']).toBe(21);
  });

  it('unlocks the +7, +9 and +11 refine steps', () => {
    const r7 = wornBonus({ boot: SAPATO, bootRefine: 7 });
    expect(r7['sMatk']).toBe(3);
    expect(r7['matkPercent']).toBe(5);

    expect(wornBonus({ boot: SAPATO, bootRefine: 9 })['vct']).toBe(10);

    const r11 = wornBonus({ boot: SAPATO, bootRefine: 11 });
    expect(r11['m_size_s']).toBe(15);
    expect(r11['m_size_m']).toBe(15);
    // The description limits the bonus to Small and Medium.
    expect(r11['m_size_l'] ?? 0).toBe(0);
  });

  it('unlocks grades D, C, B and A', () => {
    const d = wornBonus({ boot: SAPATO, bootGrade: 'D' });
    expect(d['spl']).toBe(5 + 5);
    expect(d['matkPercent']).toBe(5);

    expect(wornBonus({ boot: SAPATO, bootGrade: 'C' })['fct']).toBe(1);
    expect(wornBonus({ boot: SAPATO, bootGrade: 'B' })['sMatk']).toBe(7);

    // Grade A: "A cada 2 refinos: FEI +8" — stacks on the base +5 and the grade-D +5.
    expect(wornBonus({ boot: SAPATO, bootGrade: 'A', bootRefine: 10 })['spl']).toBe(5 + 5 + 40);
  });

  // "Conjunto / [Carta Quimera Única]" (300262). "Maldito" is what the LATAM client calls
  // the Undead element (same mapping as Diadema Radiante 410183).
  it('with Carta Quimera Única: +15%% magic damage against the Maldito element', () => {
    expect(wornBonus({ boot: SAPATO, bootCard: CARTA_QUIMERA_UNICA })['m_element_undead']).toBe(15);
  });

  it('does not fire the set without the card', () => {
    expect(wornBonus({ boot: SAPATO })['m_element_undead'] ?? 0).toBe(0);
  });
});
