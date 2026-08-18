import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * Elmo da Fé Felina II (400244), the Invocador head gear.
 *
 * Its "+7 ou mais" line was never registered. The client used to word it as *physical*
 * damage against every size, which reads as a copy-paste slip on a magic-only helm; the
 * LATAM client now words it as magic, matching the rest of the item, so the bonus is in
 * as `m_size_all` and nothing physical is granted.
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

const ELMO_DA_FE_FELINA_II = 400244;

describe('400244 Elmo da Fé Felina II', () => {
  it('grants no size bonus below +7', () => {
    const bonus = wornBonus({ headUpper: ELMO_DA_FE_FELINA_II, headUpperRefine: 6 });

    expect(bonus['m_size_all'] ?? 0).toBe(0);
    expect(bonus['p_size_all'] ?? 0).toBe(0);
  });

  it('grants 5% magic damage against every size from +7', () => {
    for (const refine of [7, 9, 15]) {
      const bonus = wornBonus({ headUpper: ELMO_DA_FE_FELINA_II, headUpperRefine: refine });

      expect(bonus['m_size_all']).toBe(5);
      expect(bonus['p_size_all'] ?? 0).toBe(0);
    }
  });
});
