import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * LATAM gear whose pt-BR description only arrived with the 0.1.129 ragassets sync — before
 * it the client shipped a flavour line or nothing, and the records had been built from the
 * Thai/kRO text. Each is checked here against the pt-BR text, which is the source of truth.
 *
 *   460020 Coelho Macabro-LT     — Grau D's resistance to every element was missing.
 *   490374 Ventilador Portátil-LT, 490375 Ventilador Quebrado-LT
 *                                — "Todos os atributos +1" was missing on both; the Portátil's
 *                                  set named its partner by English name.
 *   590030 Clava Primordial-LT   — [Adoramus] scaled +5% a cada 3 refinos where the text says
 *                                  +3%; the set with Bota Primordial-LT named it by name.
 *   2025 Cetro Rubi              — the class line now reads "Magos, Espiritualistas e
 *                                  evoluções"; the upstream record also allowed Acolytes.
 *
 * The set expectations were asserted against the name-matched records before the move to
 * EQUIP_ID. Left out: the fans' EXP bonus and "A conjuração não pode ser interrompida".
 */

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

describe('460020 Coelho Macabro-LT', () => {
  const COELHO = 460020;
  const shield = (refine = 0, grade?: string) => wornBonus({ shield: COELHO, shieldRefine: refine, shieldGrade: grade });

  it('base: velocidade de ataque +3, dano físico e mágico +5% and +2% a cada 2 refinos', () => {
    expect(stat(shield(0), 'aspd')).toBe(3);
    expect(stat(shield(0), 'atkPercent')).toBe(5);
    expect(stat(shield(5), 'matkPercent')).toBe(9);
  });

  it('refine tiers: +7 VCT -5% and ASPD +5%, +9 melee/ranged/magic +7%, +12 CRÍT +15', () => {
    expect([stat(shield(6), 'vct'), stat(shield(7), 'vct')]).toEqual([0, 5]);
    expect([stat(shield(6), 'aspdPercent'), stat(shield(7), 'aspdPercent')]).toEqual([0, 5]);
    for (const key of ['range', 'melee', 'm_my_element_all']) {
      expect([stat(shield(8), key), stat(shield(9), key)], key).toEqual([0, 7]);
    }
    expect([stat(shield(11), 'cri'), stat(shield(12), 'cri')]).toEqual([0, 15]);
  });

  it('Grau D: resistência a oponentes de todas as propriedades +10%', () => {
    expect(stat(shield(0), 'subele_all')).toBe(0);
    expect(stat(shield(0, 'D'), 'subele_all')).toBe(10);
    expect(stat(shield(0, 'A'), 'subele_all')).toBe(10);
  });

  it('Grau C: POD e FEI +2; Grau B: P.ATQ e S.ATQM +2; Grau A: pós-conjuração -5%', () => {
    expect([stat(shield(0, 'D'), 'pow'), stat(shield(0, 'C'), 'pow'), stat(shield(0, 'C'), 'spl')]).toEqual([0, 2, 2]);
    expect([stat(shield(0, 'C'), 'pAtk'), stat(shield(0, 'B'), 'pAtk'), stat(shield(0, 'B'), 'sMatk')]).toEqual([0, 2, 2]);
    expect([stat(shield(0, 'B'), 'acd'), stat(shield(0, 'A'), 'acd')]).toEqual([0, 5]);
  });
});

describe('Ventiladores -LT', () => {
  const PORTATIL = 490374;
  const QUEBRADO = 490375;

  it.each([PORTATIL, QUEBRADO])('%i: todos os talentos +1, todos os atributos +1', (id) => {
    const t = wornBonus({ accRight: id });
    expect(stat(t, 'allTrait')).toBe(1);
    expect(stat(t, 'allStatus')).toBe(1);
  });

  it('Portátil in a set with Quebrado: todos os talentos +3 adicional', () => {
    const both = wornBonus({ accRight: PORTATIL, accLeft: QUEBRADO });
    expect(stat(both, 'allTrait')).toBe(5);
    expect(stat(both, 'allStatus')).toBe(2);
  });

  it('names the partner by id', () => {
    expect(ITEM_DB[PORTATIL].script.allTrait).toEqual(['1', 'EQUIP_ID[490375]===3']);
  });
});

describe('590030 Clava Primordial-LT', () => {
  const CLAVA = 590030;
  const BOTA = 470094;
  const mace = (refine = 0, grade?: string, level = 200) =>
    wornBonus({ weapon: CLAVA, weaponRefine: refine, weaponGrade: grade, level });

  it('dano mágico +5%; propriedade Sagrado +1% a cada 2 refinos and +10% at +7', () => {
    expect(stat(mace(0), 'matkPercent')).toBe(5);
    expect(stat(mace(6), 'm_my_element_holy')).toBe(3);
    expect(stat(mace(7), 'm_my_element_holy')).toBe(13);
  });

  it('[Adoramus] +3% a cada 3 refinos, and +30% at +11', () => {
    expect(stat(mace(2), '2040')).toBe(0);
    expect(stat(mace(9), '2040')).toBe(9);
    expect(stat(mace(10), '2040')).toBe(9);
    expect(stat(mace(11), '2040')).toBe(39);
  });

  it('refine tiers: +7 VCT -10%, +9 vs todas as raças +15%', () => {
    expect([stat(mace(6), 'vct'), stat(mace(7), 'vct')]).toEqual([0, 10]);
    expect([stat(mace(8), 'm_race_all'), stat(mace(9), 'm_race_all')]).toEqual([0, 15]);
  });

  it('grades: D dano mágico +3%; C S.ATQM +1 and Sagrado/Neutro +15%; B FEI +3, S.ATQM +2', () => {
    expect(stat(mace(0, 'D'), 'matkPercent')).toBe(8);
    expect(stat(mace(0, 'C'), 'sMatk')).toBe(1);
    expect(stat(mace(0, 'C'), 'm_my_element_neutral')).toBe(15);
    expect(stat(mace(0, 'C'), 'm_my_element_holy')).toBe(15);
    expect(stat(mace(0, 'B'), 'spl')).toBe(3);
    expect(stat(mace(0, 'B'), 'sMatk')).toBe(3);
  });

  it('Nv. base 210: FEI +2, S.ATQM +1', () => {
    expect(stat(mace(0, undefined, 210), 'spl')).toBe(2);
    expect(stat(mace(0, undefined, 210), 'sMatk')).toBe(1);
  });

  it('set with Bota Primordial-LT: S.ATQM +2, dano mágico +10%', () => {
    const delta = (key: string) =>
      stat(wornBonus({ weapon: CLAVA, boot: BOTA }), key) - stat(wornBonus({ boot: BOTA }), key);
    expect(delta('sMatk')).toBe(2);
    expect(delta('matkPercent')).toBe(15);
    expect(JSON.stringify(ITEM_DB[CLAVA].script)).not.toContain('EQUIP[');
  });
});

describe('2025 Cetro Rubi', () => {
  it('equips Magos and Espiritualistas, not Noviços', () => {
    expect(ITEM_DB[2025].usableClass).toEqual(['Mage', 'SoulLinker']);
  });
});
