import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel, createRawTotalBonus } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * "Dano físico +N%" / "Dano mágico +N%" always map to `atkPercent` / `matkPercent`.
 *
 * Reported on 400511 Coroa Scaraba: the +7 line "Dano físico +10%" was cadastrada as
 * `p_final`, so the crown multiplied the damage *after* DEF instead of raising ATK.
 *
 * That line is the client's current wording for what it used to print as "ATQ +N%" /
 * "ATQ da arma +N%" — 455 items carry it today against 3 of the old text, and the
 * label of `atkPercent` followed the rename in 83323c4.
 *
 * `p_final`/`m_final` (a multiplier applied after DEF) held 68 of those entries. The two
 * keys came from the upstream engine, but only 5 of the entries did — the other 65 were
 * written by the LATAM item-porting batches of 2026-07-03/23 for the very same phrase that
 * ~690 items already kept in atkPercent/matkPercent. No LATAM description prints "final"
 * anywhere near a damage line, so the keys were converted away and then deleted from the
 * engine, the EquipmentSummaryModel and createRawTotalBonus.
 *
 * The first test is the guard: an item that reintroduces one is modelling an effect the
 * client never prints, and would now land on a key nothing reads.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** Strip the client's ^RRGGBB colour codes. */
const plain = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

const CROWN = 400511;
const WEAPON = 1201; // Knife [3] — inert host so the model has a weapon

function crownBonus(refine: number): Record<string, number> {
  const calc = makeCalculator({
    [WEAPON]: { ...items[WEAPON], itemTypeId: 1, itemSubTypeId: 256 },
    [CROWN]: { ...items[CROWN] },
  });

  const model = createMainModel();
  model.level = 200;
  model.weapon = WEAPON;
  model.headUpper = CROWN;
  model.headUpperRefine = refine;

  return equipStatusOf(calc, model);
}

describe('as chaves p_final / m_final não existem mais', () => {
  it('não há entradas dessas chaves no item.json, nem na forma chance__', () => {
    const offenders = Object.entries<any>(items)
      .filter(([, item]) => Object.keys(item.script || {}).some((key) => /p_final|m_final/.test(key)))
      .map(([id, item]) => `${id} ${item.name}`);

    expect(offenders).toEqual([]);
  });

  it('a lista autoritativa de chaves não as declara', () => {
    const keys = Object.keys(createRawTotalBonus());

    expect(keys).not.toContain('p_final');
    expect(keys).not.toContain('m_final');
  });
});

describe('a descrição pt-BR "Dano físico/mágico +N%" cai em atkPercent/matkPercent', () => {
  // Bare percentage line only: "contra <raça>", "a distância", "corpo a corpo" e "crítico"
  // são outras chaves.
  const bare = (kind: 'físico' | 'mágico') =>
    new RegExp(`^Dano ${kind === 'físico' ? 'f[ií]sico' : 'm[áa]gico'} \\+ ?\\d+(?:[.,]\\d+)?%( adicional)?\\.?$`, 'i');

  const withBareLine = (kind: 'físico' | 'mágico') =>
    Object.keys(latam)
      .filter((id) => items[id])
      .filter((id) => plain(latam[id].description).split('\n').some((line: string) => bare(kind).test(line.trim())));

  it('os itens com a linha física não guardam o efeito em p_final', () => {
    const ids = withBareLine('físico');
    expect(ids.length).toBeGreaterThan(350); // guarda contra o filtro casar zero item

    expect(ids.filter((id) => items[id].script?.p_final)).toEqual([]);
  });

  it('os itens com a linha mágica não guardam o efeito em m_final', () => {
    const ids = withBareLine('mágico');
    expect(ids.length).toBeGreaterThan(350);
    expect(ids.filter((id) => items[id].script?.m_final)).toEqual([]);
  });
});

describe('400511 Coroa Scaraba — "Refino +7 ou mais: Dano físico +10%"', () => {
  it('rende atkPercent 10 a partir do +7', () => {
    expect(crownBonus(7)['atkPercent']).toBe(10);
    expect(crownBonus(12)['atkPercent']).toBe(10);
  });

  it('não rende nada abaixo do +7', () => {
    expect(crownBonus(6)['atkPercent'] ?? 0).toBe(0);
  });

  it('os outros degraus de refino continuam nos mesmos valores', () => {
    const at12 = crownBonus(12);
    expect(at12['atk']).toBe(120); // a cada 2 refinos: ATQ +20
    expect(at12['cri']).toBe(24); // a cada 2 refinos: CRIT +4
    expect(at12['criDmg']).toBe(40); // a cada 3 refinos: Dano crítico +10%
    expect(at12['acd']).toBe(10); // +9: Pós-conjuração -10%
    expect(at12['range']).toBe(15); // +11: Dano físico a distância +15%
    expect(at12['melee']).toBe(15); // +11: Dano físico corpo a corpo +15%
    expect(at12['p_race_all']).toBe(15); // +12: Dano físico contra todas as raças +15%
  });
});
