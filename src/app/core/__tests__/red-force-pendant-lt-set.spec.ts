import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * 490382 Pingente da Força Física-LT and its set with 400465 Marionete de Thanatos-LT.
 *
 * Card LRax73dMSYFoz5o4kpNj reported the pendant as missing; it had been listed since the
 * 0.1.97 client sync, two days before the card. What was left: the LATAM client ships only
 * the flavour line for it, so the effect is the kRO/iRO text on divine-pride 490382, and
 * the record carried that text minus its two sustain lines, with the partner matched by
 * the legacy display name. This file is the behavioural baseline for the move to
 * EQUIP_ID[400465] — every expectation on the set lines was recorded against the
 * name-matched record first and holds unchanged after the rewrite. The older Marionete de
 * Thanatos (400023) shares the family and never the set, which is precisely what the id
 * form must keep excluding.
 *
 * @see https://www.divine-pride.net/database/item/490382/
 */

const PENDANT = 490382;
const MARIONETE_LT = 400465;
const MARIONETE = 400023;

/** What the pendant adds on top of the helmet worn alone at the same refine. */
const pendantDelta = (helm: number | null, refine: number, key: string) => {
  const hat = helm === null ? {} : { headUpper: helm, headUpperRefine: refine };
  return (wornBonus({ ...hat, accRight: PENDANT })[key] || 0) - (wornBonus(hat)[key] || 0);
};

describe('490382 Pingente da Força Física-LT', () => {
  it('pays ATQ +8% and ATQM +8% on its own, and nothing of the set', () => {
    expect(pendantDelta(null, 0, 'atkPercent')).toBe(8);
    expect(pendantDelta(null, 0, 'matkPercent')).toBe(8);
    expect(pendantDelta(null, 0, 'pAtk')).toBe(0);
    expect(pendantDelta(null, 0, 'sMatk')).toBe(0);
    expect(pendantDelta(null, 0, 'acd')).toBe(0);
    expect(pendantDelta(null, 0, 'fct')).toBe(0);
    expect(pendantDelta(null, 0, 'hpDrain')).toBe(0);
    expect(pendantDelta(null, 0, 'magicHealHp')).toBe(0);
  });

  describe('with Marionete de Thanatos-LT', () => {
    it('cuts the after-cast delay 2% per 4 refines of the helmet', () => {
      expect(pendantDelta(MARIONETE_LT, 3, 'acd')).toBe(0);
      expect(pendantDelta(MARIONETE_LT, 4, 'acd')).toBe(2);
      expect(pendantDelta(MARIONETE_LT, 8, 'acd')).toBe(4);
      expect(pendantDelta(MARIONETE_LT, 11, 'acd')).toBe(4);
    });

    it('adds ATQ/ATQM +5%, P.ATQ +3 and S.ATQM +3 from +9', () => {
      expect(pendantDelta(MARIONETE_LT, 9, 'atkPercent')).toBe(13);
      expect(pendantDelta(MARIONETE_LT, 9, 'matkPercent')).toBe(13);
      expect(pendantDelta(MARIONETE_LT, 9, 'pAtk')).toBe(3);
      expect(pendantDelta(MARIONETE_LT, 9, 'sMatk')).toBe(3);

      expect(pendantDelta(MARIONETE_LT, 8, 'atkPercent')).toBe(8);
      expect(pendantDelta(MARIONETE_LT, 8, 'pAtk')).toBe(0);
      expect(pendantDelta(MARIONETE_LT, 8, 'sMatk')).toBe(0);
    });

    it('takes 0,2 s off the fixed cast from +11', () => {
      expect(pendantDelta(MARIONETE_LT, 11, 'fct')).toBe(0.2);
      expect(pendantDelta(MARIONETE_LT, 10, 'fct')).toBe(0);
    });

    it('records the two sustain lines from +7, on display-only keys', () => {
      expect(pendantDelta(MARIONETE_LT, 7, 'hpDrain')).toBe(7);
      expect(pendantDelta(MARIONETE_LT, 7, 'magicHealHp')).toBe(1500);
      expect(pendantDelta(MARIONETE_LT, 6, 'hpDrain')).toBe(0);
      expect(pendantDelta(MARIONETE_LT, 6, 'magicHealHp')).toBe(0);
    });
  });

  it('never fires with the older Marionete de Thanatos', () => {
    expect(pendantDelta(MARIONETE, 11, 'acd')).toBe(0);
    expect(pendantDelta(MARIONETE, 11, 'pAtk')).toBe(0);
    expect(pendantDelta(MARIONETE, 11, 'atkPercent')).toBe(8);
    expect(pendantDelta(MARIONETE, 11, 'fct')).toBe(0);
  });
});