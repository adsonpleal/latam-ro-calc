import { describe, expect, it } from 'vitest';
import { ESPADA_1H, wornBonus } from './worn-bonus';

/**
 * 460181 Protetor Pænitentia and the set it forms with any Pænitentia weapon.
 *
 * The set clause is "Qualquer Arma Pænitentia", which is three different weapons rather than
 * a named partner — and specifically not the Pænitentia Aegis shield, which shares the family
 * name without satisfying the condition.
 *
 * Every bonus below is a line from the pt-BR description, which is the source of truth.
 */

const PROTETOR = 460181;
const AEGIS_SHIELD = 460013;

describe('460181 Protetor Pænitentia', () => {
  it('grants +5%% physical and magical against all sizes', () => {
    const bonus = wornBonus({ headMiddle: PROTETOR });
    expect(bonus['p_size_all']).toBe(5);
    expect(bonus['m_size_all']).toBe(5);
  });

  // "Conjunto / Qualquer Arma Pænitentia / Pós-conjuração -10%."
  it.each([
    ['Pænitentia Gladius', 500019],
    ['Pænitentia Codex', 540014],
    ['Pænitentia Ruina', 840006],
  ])('unlocks ACD -10%% with %s', (_name, weapon) => {
    expect(wornBonus({ headMiddle: PROTETOR, weapon })['acd']).toBe(10);
  });

  it('does not unlock ACD with a weapon outside the family', () => {
    expect(wornBonus({ headMiddle: PROTETOR, weapon: ESPADA_1H })['acd'] ?? 0).toBe(0);
  });

  it('does not unlock ACD with the Pænitentia Aegis shield — the set needs a WEAPON', () => {
    expect(wornBonus({ headMiddle: PROTETOR, shield: AEGIS_SHIELD })['acd'] ?? 0).toBe(0);
  });

  it('grants no ACD on its own', () => {
    expect(wornBonus({ headMiddle: PROTETOR })['acd'] ?? 0).toBe(0);
  });
});
