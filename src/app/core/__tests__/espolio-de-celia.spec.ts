import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * 400095 Espólio de Celia — rebuilt from its pt-BR description.
 *
 * The entry was carrying the upstream item's script for this id (see the Escudo Ilusión B
 * case of 11/08/2026): the partner conditions were right, since EQUIP[Boltigin],
 * EQUIP[Dust Grave] and EQUIP[Psychic Spear Rod] still match the English names of 28633
 * Lançarin, 26160 Castigo Diamante and 26159 Lança Psíquica — but almost every payload
 * was another server's. What was wrong:
 *
 *   +9 "Conjuração variável -10%" sat on `aspdPercent`, i.e. attack speed
 *   [Castigo Diamante]'s per-refine damage was keyed to 2446 Castigo de Nerthus
 *     instead of 2447 Pó de Diamante
 *   [Lança Psíquica]'s was keyed to 2449 Onda Psíquica instead of 2454 Lanças dos Aesir
 *   every per-refine step read 10% where the description says 3%
 *   [Lançarin]'s flat magic damage read 10% where the description says 2%
 *   both sets' "+3% adicional" element lines were absent
 *   `matk 2---10`, `fct` on [Castigo Diamante] and `cd__2449` on [Lança Psíquica] are
 *     granted by no line of the description and were removed
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const CELIA = 400095;
const LANCARIN = 28633;
const CASTIGO_DIAMANTE = 26160;
const LANCA_PSIQUICA = 26159;

function bonusOf(refine: number | null, weapon?: number, weaponRefine = 0): Record<string, number> {
  const db: Record<number, any> = {};
  if (refine !== null) db[CELIA] = { ...items[CELIA] };
  if (weapon) db[weapon] = { ...items[weapon] };

  const model: any = createMainModel();
  model.level = 200;
  if (refine !== null) {
    model.headUpper = CELIA;
    model.headUpperRefine = refine;
  }
  if (weapon) {
    model.weapon = weapon;
    model.weaponRefine = weaponRefine;
  }

  return equipStatusOf(makeCalculator(db), model);
}

/**
 * What the helm contributes to `key`, with and without it on. All three partner weapons
 * carry refine-gated bonuses on the very skills their set touches — Lançarin alone gives
 * +30% on the bolts at +9 — so a raw total says nothing about the set.
 */
function setDelta(key: string, weapon: number, weaponRefine: number): number {
  return (bonusOf(0, weapon, weaponRefine)[key] || 0) - (bonusOf(null, weapon, weaponRefine)[key] || 0);
}

describe('400095 Espólio de Celia — own lines', () => {
  it('gives 2% magic damage every 2 refines', () => {
    expect(bonusOf(0)['matkPercent']).toBe(0);
    expect(bonusOf(10)['matkPercent']).toBe(10);
  });

  it('gives all stats +3 from +7', () => {
    expect(bonusOf(6)['allStatus'] || 0).toBe(0);
    expect(bonusOf(7)['allStatus']).toBe(3);
  });

  it('cuts variable cast 10% from +9 — not attack speed', () => {
    expect(bonusOf(8)['vct'] || 0).toBe(0);
    expect(bonusOf(9)['vct']).toBe(10);
    expect(bonusOf(9)['aspdPercent'] || 0).toBe(0);
  });

  it('gives 20% Neutro/Terra/Água magic damage from +11', () => {
    for (const key of ['m_my_element_neutral', 'm_my_element_earth', 'm_my_element_water']) {
      expect(bonusOf(10)[key] || 0, key).toBe(0);
      expect(bonusOf(11)[key], key).toBe(20);
    }
  });

  it('grants no flat ATQM — no line of the description gives any', () => {
    expect(bonusOf(10)['matk'] || 0).toBe(0);
  });
});

describe('400095 [Lançarin]', () => {
  it('gives 2% magic damage, not 10%', () => {
    // Refine 0 so the helm's own "a cada 2 refinos" step contributes nothing.
    expect(bonusOf(0, LANCARIN)['matkPercent']).toBe(2);
  });

  it('gives 3% per weapon refine on the three bolts', () => {
    for (const skill of ['19', '14', '20']) {
      expect(setDelta(skill, LANCARIN, 0), skill).toBe(0);
      expect(setDelta(skill, LANCARIN, 10), skill).toBe(30);
    }
  });
});

describe('400095 [Castigo Diamante]', () => {
  it('gives 3% per weapon refine on Pó de Diamante (2447), not Castigo de Nerthus (2446)', () => {
    expect(setDelta('2447', CASTIGO_DIAMANTE, 10)).toBe(30);
    expect(setDelta('2446', CASTIGO_DIAMANTE, 10)).toBe(0);
  });

  it('adds 3% Terra and Água magic damage', () => {
    expect(setDelta('m_my_element_earth', CASTIGO_DIAMANTE, 0)).toBe(3);
    expect(setDelta('m_my_element_water', CASTIGO_DIAMANTE, 0)).toBe(3);
  });

  it('grants no fixed-cast cut — the description has no such line', () => {
    expect(bonusOf(0, CASTIGO_DIAMANTE)['fct'] || 0).toBe(0);
  });
});

describe('400095 [Lança Psíquica]', () => {
  it('gives 3% per weapon refine on Lanças dos Aesir (2454), not Onda Psíquica (2449)', () => {
    expect(setDelta('2454', LANCA_PSIQUICA, 10)).toBe(30);
    // The rod's own +9 Onda Psíquica bonus stays; the helm must add nothing to it.
    expect(setDelta('2449', LANCA_PSIQUICA, 10)).toBe(0);
  });

  it('adds 3% Neutro and Vento magic damage', () => {
    expect(setDelta('m_my_element_neutral', LANCA_PSIQUICA, 0)).toBe(3);
    expect(setDelta('m_my_element_wind', LANCA_PSIQUICA, 0)).toBe(3);
  });

  it('grants no Onda Psíquica cooldown cut — the description has no such line', () => {
    expect(setDelta('cd__2449', LANCA_PSIQUICA, 10)).toBe(0);
  });
});

describe('400095 keeps the three sets apart', () => {
  it('one weapon never fires another set', () => {
    const withLancarin = bonusOf(0, LANCARIN, 10);
    expect(withLancarin['2447'] || 0).toBe(0);
    expect(withLancarin['2454'] || 0).toBe(0);
    expect(withLancarin['m_my_element_earth'] || 0).toBe(0);
  });
});
