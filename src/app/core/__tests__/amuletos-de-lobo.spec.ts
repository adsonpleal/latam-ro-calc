import { describe, expect, it } from 'vitest';
import { BASE_PERFECT_HIT, wornBonus } from './worn-bonus';

/**
 * 491084 Amuleto de Lobo Físico and 491085 Amuleto de Lobo Mágico.
 *
 * A matched pair: same shape, one physical and one magical, and each names two acceptable
 * partners out of the four Lobo Cinzento accessories. The partners do not overlap — the
 * physical amulet takes the Anel and the Pingente, the magical one the Colar and the Brincos —
 * so each amulet's set has to reject the other's partners, which is what the last test of each
 * block checks.
 *
 * Every bonus below is a line from the pt-BR description, which is the source of truth.
 */

const ANEL_LOBO_CINZENTO = 490107;
const PINGENTE_LOBO_CINZENTO = 490106;
const COLAR_LOBO_CINZENTO = 490109;
const BRINCOS_LOBO_CINZENTO = 490108;

describe('491084 Amuleto de Lobo Físico', () => {
  it('grants the fixed bonuses from the description', () => {
    const bonus = wornBonus({ accRight: 491084 });
    expect(bonus['cri']).toBe(5);
    expect(bonus['perfectHit']).toBe(BASE_PERFECT_HIT + 10);
    expect(bonus['aspd']).toBe(1);
    expect(bonus['range']).toBe(5);
    expect(bonus['melee']).toBe(5);
  });

  // "Conjunto / Anel do Lobo Cinzento ou Pingente do Lobo Cinzento"
  it.each([
    ['Anel do Lobo Cinzento', ANEL_LOBO_CINZENTO],
    ['Pingente do Lobo Cinzento', PINGENTE_LOBO_CINZENTO],
  ])('unlocks after-cast -5%% with %s', (_name, partner) => {
    expect(wornBonus({ accRight: 491084, accLeft: partner })['acd']).toBe(5);
  });

  it('does not unlock the set with an outside accessory', () => {
    expect(wornBonus({ accRight: 491084, accLeft: BRINCOS_LOBO_CINZENTO })['acd'] ?? 0).toBe(0);
  });
});

describe('491085 Amuleto de Lobo Mágico', () => {
  it('grants the fixed bonuses from the description', () => {
    const bonus = wornBonus({ accRight: 491085 });
    expect(bonus['vct']).toBe(5);
    expect(bonus['aspd']).toBe(1);
    expect(bonus['m_my_element_all']).toBe(5);
  });

  // "Conjunto / Colar do Lobo Cinzento ou Brincos do Lobo Cinzento"
  it.each([
    ['Colar do Lobo Cinzento', COLAR_LOBO_CINZENTO],
    ['Brincos do Lobo Cinzento', BRINCOS_LOBO_CINZENTO],
  ])('unlocks after-cast -5%% with %s', (_name, partner) => {
    expect(wornBonus({ accRight: 491085, accLeft: partner })['acd']).toBe(5);
  });

  it('does not unlock the set with an outside accessory', () => {
    expect(wornBonus({ accRight: 491085, accLeft: ANEL_LOBO_CINZENTO })['acd'] ?? 0).toBe(0);
  });
});
