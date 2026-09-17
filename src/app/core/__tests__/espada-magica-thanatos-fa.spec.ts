import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * 480324 Espada Mágica de Thanatos-FA, checked against the pt-BR text the 0.1.129 ragassets
 * sync brought (before it the client shipped only a flavour line). Every line already
 * matched; what changed is that its two sets — with 400465 Marionete de Thanatos-LT, and with
 * either Pingente da Força (490382 / 490383) — matched the partners by English name. They are
 * id-based now, and every set expectation here was asserted against the name-matched record
 * first.
 */

const CAPA = 480324;
const MARIONETE_LT = 400465;
const MARIONETE = 400023;
const FISICA = 490382;
const MENTAL = 490383;

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;
const cape = (refine = 0, grade?: string, level = 200) =>
  wornBonus({ garment: CAPA, garmentRefine: refine, garmentGrade: grade, level });

/** What the cape adds on top of the partner worn alone. */
const withHelm = (helm: number, helmRefine: number, key: string) =>
  stat(wornBonus({ garment: CAPA, headUpper: helm, headUpperRefine: helmRefine }), key) -
  stat(wornBonus({ headUpper: helm, headUpperRefine: helmRefine }), key);
const withPendant = (pendant: number, key: string) =>
  stat(wornBonus({ garment: CAPA, accRight: pendant }), key) - stat(wornBonus({ accRight: pendant }), key);

describe('480324 Espada Mágica de Thanatos-FA', () => {
  it('Nv. base 250: P.ATQ e S.ATQM +8', () => {
    expect(stat(cape(0, undefined, 249), 'pAtk')).toBe(0);
    expect(stat(cape(0, undefined, 250), 'pAtk')).toBe(8);
    expect(stat(cape(0, undefined, 250), 'sMatk')).toBe(8);
  });

  it('a cada 2 refinos: à distância, corpo a corpo e all-element magic +3%', () => {
    for (const key of ['range', 'melee', 'm_my_element_all']) expect(stat(cape(9), key), key).toBe(12);
  });

  it('a cada 4 refinos: +5% against Médio e Grande', () => {
    for (const key of ['p_size_m', 'p_size_l', 'm_size_m', 'm_size_l']) {
      expect(stat(cape(3), key), key).toBe(0);
      expect(stat(cape(8), key), key).toBe(10);
    }
  });

  it('refino +9 and +11: +7% each against Dragão e Anjo', () => {
    for (const key of ['p_race_dragon', 'p_race_angel', 'm_race_dragon', 'm_race_angel']) {
      expect(stat(cape(8), key), key).toBe(0);
      expect(stat(cape(9), key), key).toBe(7);
      expect(stat(cape(11), key), key).toBe(14);
    }
  });

  it('Grau D: P.ATQ e S.ATQM +5; Grau C/B/A: ignores 5% more TEN/TENM of Dragão e Anjo each', () => {
    expect(stat(cape(0, 'D'), 'pAtk')).toBe(5);
    expect(stat(cape(0, 'D'), 'pene_res_race_dragon')).toBe(0);
    expect(stat(cape(0, 'C'), 'pene_res_race_dragon')).toBe(5);
    expect(stat(cape(0, 'B'), 'pene_mres_race_angel')).toBe(10);
    expect(stat(cape(0, 'A'), 'pene_res_race_angel')).toBe(15);
    expect(stat(cape(0, 'A'), 'pene_mres_race_dragon')).toBe(15);
  });

  describe('set with Marionete de Thanatos-LT', () => {
    it('conjuração variável -10%', () => {
      expect(withHelm(MARIONETE_LT, 0, 'vct')).toBe(10);
    });

    it('elmo +7: +20% against Sagrado e Sombrio', () => {
      expect(withHelm(MARIONETE_LT, 6, 'p_element_holy')).toBe(0);
      expect(withHelm(MARIONETE_LT, 7, 'p_element_holy')).toBe(20);
      expect(withHelm(MARIONETE_LT, 7, 'm_element_dark')).toBe(20);
    });

    it('elmo +9: +15% against Dragão e Anjo', () => {
      expect(withHelm(MARIONETE_LT, 8, 'p_race_dragon')).toBe(0);
      expect(withHelm(MARIONETE_LT, 9, 'p_race_dragon')).toBe(15);
      expect(withHelm(MARIONETE_LT, 9, 'm_race_angel')).toBe(15);
    });

    it('elmo +11: +15% against Médio e Grande', () => {
      expect(withHelm(MARIONETE_LT, 10, 'p_size_l')).toBe(0);
      expect(withHelm(MARIONETE_LT, 11, 'p_size_l')).toBe(15);
      expect(withHelm(MARIONETE_LT, 11, 'm_size_m')).toBe(15);
    });

    it('never fires with the older Marionete de Thanatos', () => {
      expect(withHelm(MARIONETE, 11, 'vct')).toBe(0);
      expect(withHelm(MARIONETE, 11, 'p_race_dragon')).toBe(0);
    });
  });

  it.each([FISICA, MENTAL])('set with pendant %i: ATQ e ATQM +50, P.ATQ e S.ATQM +3, Médio e Grande +15%', (pendant) => {
    expect(withPendant(pendant, 'atk')).toBe(50);
    expect(withPendant(pendant, 'matk')).toBe(50);
    expect(withPendant(pendant, 'pAtk')).toBe(3);
    expect(withPendant(pendant, 'sMatk')).toBe(3);
    expect(withPendant(pendant, 'p_size_m')).toBe(15);
    expect(withPendant(pendant, 'm_size_l')).toBe(15);
  });

  it('names every partner by id', () => {
    const script = JSON.stringify(ITEM_DB[CAPA].script);
    expect(script).not.toContain('EQUIP[');
    expect(script).toContain('EQUIP_ID[490382||490383]');
    expect(script).toContain('EQUIP_ID[400465]');
  });
});
