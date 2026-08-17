import { describe, expect, it } from 'vitest';
import { BASE_PERFECT_HIT, wornBonus } from './worn-bonus';

/**
 * 470458 Botas da Fonte — a boot with three ladders stacked on one another: a per-2-refine
 * step, refine thresholds at +7/+9/+11, Enchant Grade steps D/C/B, and two mutually exclusive
 * card sets.
 *
 * The ladders cascade: a grade-B boot also carries what D and C grant, and the set's fixed-cast
 * cut adds to the +11 one rather than replacing it. Those two are the ones worth pinning, since
 * a cascade encoded as a replacement reads exactly the same at the top step.
 *
 * Every bonus below is a line from the pt-BR description, which is the source of truth.
 */

const BOTAS = 470458;
const CARTA_ESPADACHIM_EGNIGEM = 4352;
const CARTA_ESPADACHIM_ANONIMA = 300266;

describe('470458 Botas da Fonte', () => {
  it('raises max HP and SP by 1%% per 2 refines', () => {
    const bonus = wornBonus({ boot: BOTAS, bootRefine: 11 });
    expect(bonus['hpPercent']).toBe(5);
    expect(bonus['spPercent']).toBe(5);
  });

  it('unlocks the +7, +9 and +11 refine steps', () => {
    const unrefined = wornBonus({ boot: BOTAS, bootRefine: 0 });
    expect(unrefined['atkPercent'] ?? 0).toBe(0);
    expect(unrefined['cri'] ?? 0).toBe(0);

    expect(wornBonus({ boot: BOTAS, bootRefine: 7 })['atkPercent']).toBe(7);

    const r9 = wornBonus({ boot: BOTAS, bootRefine: 9 });
    expect(r9['cri']).toBe(5);
    // The total already starts at DEFAULT_PERFECT_HIT (5), so the item's +10 becomes 15.
    expect(r9['perfectHit']).toBe(BASE_PERFECT_HIT + 10);
    expect(r9['fct'] ?? 0).toBe(0);

    expect(wornBonus({ boot: BOTAS, bootRefine: 11 })['fct']).toBe(0.5);
  });

  it('unlocks grades D, C and B as a cascade', () => {
    const d = wornBonus({ boot: BOTAS, bootGrade: 'D' });
    expect(d['res']).toBe(50);
    expect(d['mres']).toBe(50);
    expect(d['sta'] ?? 0).toBe(0);

    const c = wornBonus({ boot: BOTAS, bootGrade: 'C' });
    expect(c['sta']).toBe(5);
    expect(c['wis']).toBe(5);
    expect(c['pAtk'] ?? 0).toBe(0);

    expect(wornBonus({ boot: BOTAS, bootGrade: 'B' })['pAtk']).toBe(7);
  });

  // "Conjunto / Carta Espadachim Egnigem" (4352)
  it('with Carta Espadachim Egnigem: -0.5s fixed cast and +10%% against all elements', () => {
    const bonus = wornBonus({ boot: BOTAS, bootCard: CARTA_ESPADACHIM_EGNIGEM });
    expect(bonus['fct']).toBe(0.5);
    expect(bonus['p_element_all']).toBe(10);
  });

  it('adds the set -0.5s on top of the +11 refine one', () => {
    expect(wornBonus({ boot: BOTAS, bootRefine: 11, bootCard: CARTA_ESPADACHIM_EGNIGEM })['fct']).toBe(1);
  });

  // "Conjunto / Carta Espadachim Anônima" (300266)
  it('with Carta Espadachim Anônima: +10%% physical against all races', () => {
    expect(wornBonus({ boot: BOTAS, bootCard: CARTA_ESPADACHIM_ANONIMA })['p_race_all']).toBe(10);
  });

  it('fires no set bonus without a card', () => {
    const bonus = wornBonus({ boot: BOTAS });
    expect(bonus['p_element_all'] ?? 0).toBe(0);
    expect(bonus['p_race_all'] ?? 0).toBe(0);
  });
});
