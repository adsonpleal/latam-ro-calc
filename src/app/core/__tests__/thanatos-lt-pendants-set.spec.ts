import { describe, expect, it } from 'vitest';
import { wornBonus } from './worn-bonus';

/**
 * 490382 Pingente da Força Física-LT, 490383 Pingente da Força Mental-LT and their set with
 * 400465 Marionete de Thanatos-LT.
 *
 * Card LRax73dMSYFoz5o4kpNj reported the Física pendant as missing. At the time the LATAM
 * client shipped only a flavour line for either pendant, so the effect came from the
 * kRO/iRO text on divine-pride, and the Física record was moved to EQUIP_ID[400465] against
 * a behavioural baseline. The Mental pendant was left on the name-matched partner and
 * without its sustain lines.
 *
 * The 0.1.129 ragassets sync brought the pt-BR text for both, and two things follow from it:
 * the fixed-cast line is "Refino +10 ou mais" on both (the kRO text had +11), and the Mental
 * pendant's set is now id-based with its SP drain and [Efeito] regeneration registered. Every
 * other set line of the Mental pendant was asserted against the name-matched record first.
 * The older Marionete de Thanatos (400023) shares the family and never the set, which is
 * precisely what the id form must keep excluding.
 */

const FISICA = 490382;
const MENTAL = 490383;
const MARIONETE_LT = 400465;
const MARIONETE = 400023;

/** What the pendant adds on top of the helmet worn alone at the same refine. */
const pendantDelta = (pendant: number, helm: number | null, refine: number, key: string) => {
  const hat = helm === null ? {} : { headUpper: helm, headUpperRefine: refine };
  return (wornBonus({ ...hat, accRight: pendant })[key] || 0) - (wornBonus(hat)[key] || 0);
};

describe.each([
  ['490382 Pingente da Força Física-LT', FISICA, 'hpDrain', 7, 'magicHealHp', 1500],
  ['490383 Pingente da Força Mental-LT', MENTAL, 'spDrain', 4, 'magicHealSp', 100],
] as const)('%s', (_label, pendant, drainKey, drain, healKey, heal) => {
  const delta = (helm: number | null, refine: number, key: string) => pendantDelta(pendant, helm, refine, key);

  it('pays dano físico e mágico +8% on its own, and nothing of the set', () => {
    expect(delta(null, 0, 'atkPercent')).toBe(8);
    expect(delta(null, 0, 'matkPercent')).toBe(8);
    for (const key of ['pAtk', 'sMatk', 'acd', 'fct', drainKey, healKey]) expect(delta(null, 0, key), key).toBe(0);
  });

  describe('with Marionete de Thanatos-LT', () => {
    it('pós-conjuração -2% a cada 4 refinos of the helmet', () => {
      expect(delta(MARIONETE_LT, 3, 'acd')).toBe(0);
      expect(delta(MARIONETE_LT, 4, 'acd')).toBe(2);
      expect(delta(MARIONETE_LT, 8, 'acd')).toBe(4);
      expect(delta(MARIONETE_LT, 11, 'acd')).toBe(4);
    });

    it('refino +9: dano físico e mágico +5%, P.ATQ e S.ATQM +3', () => {
      expect(delta(MARIONETE_LT, 9, 'atkPercent')).toBe(13);
      expect(delta(MARIONETE_LT, 9, 'matkPercent')).toBe(13);
      expect(delta(MARIONETE_LT, 9, 'pAtk')).toBe(3);
      expect(delta(MARIONETE_LT, 9, 'sMatk')).toBe(3);

      expect(delta(MARIONETE_LT, 8, 'atkPercent')).toBe(8);
      expect(delta(MARIONETE_LT, 8, 'pAtk')).toBe(0);
      expect(delta(MARIONETE_LT, 8, 'sMatk')).toBe(0);
    });

    it('refino +10: conjuração fixa -0,2s', () => {
      expect(delta(MARIONETE_LT, 10, 'fct')).toBe(0.2);
      expect(delta(MARIONETE_LT, 9, 'fct')).toBe(0);
    });

    it('refino +7: the drain and the [Efeito] regeneration, on display-only keys', () => {
      expect(delta(MARIONETE_LT, 7, drainKey)).toBe(drain);
      expect(delta(MARIONETE_LT, 7, healKey)).toBe(heal);
      expect(delta(MARIONETE_LT, 6, drainKey)).toBe(0);
      expect(delta(MARIONETE_LT, 6, healKey)).toBe(0);
    });
  });

  it('never fires with the older Marionete de Thanatos', () => {
    expect(delta(MARIONETE, 11, 'acd')).toBe(0);
    expect(delta(MARIONETE, 11, 'pAtk')).toBe(0);
    expect(delta(MARIONETE, 11, 'atkPercent')).toBe(8);
    expect(delta(MARIONETE, 11, 'fct')).toBe(0);
  });
});
