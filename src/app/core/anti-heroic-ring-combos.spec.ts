import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from '../utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

// Ticket KtNEaMMzuxzM4NzSMYmW, reported by TANK.
// Source: Anel Anti-Heroico's LATAM description (490088).
// "Carta Apóstola Shenime" / "Carta Apóstolo Ahat" are the client cards
// 27323 (Carta Shenime) / 27322 (Carta Ahat), respectively.
const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const RING = 490088;
const INERT_ACCESSORY = 2983;
const SHENIME = 27323;
const AHAT = 27322;

function bonuses(modelValues: Record<string, number>) {
  return equipStatusOf(makeCalculator(db), { ...createMainModel(), ...modelValues });
}

describe('Anel Anti-Heroico combos', () => {
  it.each(['accRight', 'accLeft'])('grants the Shenime combo with the ring in %s', side => {
    const result = bonuses({ [side]: RING, [`${side}Card`]: SHENIME });
    expect(result.hpPercent).toBe(20); // card's own 5% + ring's 15%
    expect(result.spPercent).toBe(0);
  });

  it.each(['accRight', 'accLeft'])('grants the Ahat combo with the ring in %s', side => {
    const result = bonuses({ [side]: RING, [`${side}Card`]: AHAT });
    expect(result.spPercent).toBe(20);
    expect(result.hpPercent).toBe(0);
  });

  it('matches the card by id even when it is in the other accessory', () => {
    expect(bonuses({ accRight: RING, accLeft: INERT_ACCESSORY, accLeftCard: SHENIME }).hpPercent).toBe(20);
  });

  it('preserves the card pair bonuses while applying both ring combos', () => {
    const result = bonuses({ accRight: RING, accRightCard: SHENIME,
      accLeft: INERT_ACCESSORY, accLeftCard: AHAT });
    expect(result.hpPercent).toBe(25); // own 5 + Ahat pair 5 + ring 15
    expect(result.spPercent).toBe(25);
  });

  it('grants neither card combo without its partner', () => {
    const ring = bonuses({ accRight: RING });
    expect(ring.hpPercent).toBe(0);
    expect(ring.spPercent).toBe(0);
    const cards = bonuses({ accRight: INERT_ACCESSORY, accRightCard: SHENIME });
    expect(cards.hpPercent).toBe(5);
    expect(cards.spPercent).toBe(0);
  });

  it('keeps the existing rule that a repeated set bonus applies once', () => {
    const result = bonuses({ accRight: RING, accRightCard: SHENIME, accLeft: RING });
    expect(result.hpPercent).toBe(20); // card's 5 + the set's 15, deduplicated by the engine
  });

  it('adds the FOR 3 physical damage combo only with the essence equipped', () => {
    const base = bonuses({ accRight: RING });
    const combo = bonuses({ accRight: RING, accRightCard: 4910 });
    expect(base.p_class_normal).toBe(5);
    expect(base.p_class_boss).toBe(5);
    expect(combo.p_class_normal).toBe(10);
    expect(combo.p_class_boss).toBe(10);
    expect(combo.str).toBe(8); // essence 4 + ring combo 4
    expect(combo.matkPercent).toBe(5);
  });
});
