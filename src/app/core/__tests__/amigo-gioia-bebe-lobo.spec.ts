import { describe, expect, it } from 'vitest';
import { BASE_PERFECT_HIT, ESPADA_1H, wornBonus } from './worn-bonus';

/**
 * Amigo Gioia (410705) and Bebê Lobo (410706), the two lower head gears the LATAM client
 * named in the 18/08/2026 update. Both hang their real bonus off a card, so the combo is
 * the part worth pinning: the piece alone must not pay it.
 *
 * Gioia's own line reads "Dano mágico *de* propriedade Fantasma", the additive stage
 * (`m_my_element_*`), while its Carta Gioia line reads "*contra oponentes de* propriedade
 * Fantasma", the own-multiplier stage (`m_element_*`) — see [[m-element-vs-my-element]].
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

const AMIGO_GIOIA = 410705;
const BEBE_LOBO = 410706;
const CARTA_GIOIA = 4576;
const CARTA_FOFINHO = 27152;
const CARTA_ATROCE = 4425;

describe('410705 Amigo Gioia', () => {
  it('grants the flat lines on its own, and no set multiplier', () => {
    const bonus = wornBonus({ headLower: AMIGO_GIOIA });

    expect(bonus['acd']).toBe(5);
    expect(bonus['m_my_element_ghost']).toBe(7);
    expect(bonus['m_element_ghost'] ?? 0).toBe(0);
  });

  it('adds the Carta Gioia multiplier only with the card equipped', () => {
    const bonus = wornBonus({ headLower: AMIGO_GIOIA, accRight: CARTA_GIOIA });

    // The card carries its own +100 on the additive stage; the set pays the other stage.
    expect(bonus['m_element_ghost']).toBe(10);
    expect(bonus['m_my_element_ghost']).toBe(107);
  });
});

describe('410706 Bebê Lobo', () => {
  it('grants the flat lines on its own, and no boss damage', () => {
    const bonus = wornBonus({ headLower: BEBE_LOBO });

    expect(bonus['acd']).toBe(5);
    expect(bonus['perfectHit']).toBe(BASE_PERFECT_HIT + 10);
    expect(bonus['p_class_boss'] ?? 0).toBe(0);
    expect(bonus['aspd'] ?? 0).toBe(0);
  });

  it('adds the Carta Fofinho set with the card equipped', () => {
    const bonus = wornBonus({ headLower: BEBE_LOBO, accRight: CARTA_FOFINHO });

    expect(bonus['aspd']).toBe(1);
    expect(bonus['p_class_boss']).toBe(15);
  });

  // Carta Atroce is a weapon card, so it only registers with a weapon to sit in.
  it('adds the Carta Atroce set with the card equipped', () => {
    const bonus = wornBonus({ headLower: BEBE_LOBO, weapon: ESPADA_1H, weaponCard: CARTA_ATROCE });

    expect(bonus['p_class_boss']).toBe(15);
    expect(bonus['aspd'] ?? 0).toBe(0);
  });

  it('stacks the two sets when both cards are worn', () => {
    const bonus = wornBonus({
      headLower: BEBE_LOBO,
      accRight: CARTA_FOFINHO,
      weapon: ESPADA_1H,
      weaponCard: CARTA_ATROCE,
    });

    expect(bonus['p_class_boss']).toBe(30);
  });
});
