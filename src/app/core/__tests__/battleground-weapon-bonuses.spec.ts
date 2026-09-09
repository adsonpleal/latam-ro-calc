import { describe, expect, it } from 'vitest';
import { ITEM_DB, wornBonus } from './worn-bonus';

/**
 * The weapons the ports kept missing.
 *
 * They were invisible to the audit that found the missing head gear, because that one
 * tested for an "Equipa em:" line and a weapon has none — its footer is
 * `Tipo: Katar` + `ATQ: n ATQM: n` + `Nível da arma: n`. 416 of them were absent.
 *
 * The cases below pin one of each shape the batch produced, chosen where getting it
 * wrong would be silent: the anti-player battleground line (which is where
 * `p_race_player_human` and `p_pene_race_*` both appear), a weapon whose base magic
 * attack has to ride in the script, and one whose whole payload sits behind a set block
 * and is therefore deliberately absent.
 */

const KATAR_CARNIFICINA_A = 1279;
const MACA_CAMPO_A = 1542;
const CAJADO_SAFIRA = 2024; // "Nível da Tipo: 4" — the client's own typo for the weapon level
const SOQUEIRA_INICIAL = 1848;
const REVOLVER_SOLDADO = 13108;

describe('1279 Katar da Carnificina A', () => {
  it('splits the anti-player line into the monster race and the player race', () => {
    const bonus = wornBonus({ weapon: KATAR_CARNIFICINA_A });

    // "Humano e Humanoide" is two different keys: Humanoide is the demihuman
    // monster race, Humano is the player race.
    expect(bonus['p_race_demihuman']).toBe(70);
    expect(bonus['p_race_player_human']).toBe(70);
    expect(bonus['p_pene_race_demihuman']).toBe(20);
    expect(bonus['p_pene_race_player_human']).toBe(20);
    expect(bonus['str']).toBe(1);
    expect(bonus['dex']).toBe(1);
    expect(bonus['luk']).toBe(1);
  });
});

describe('1542 Maça de Campo de Batalha A', () => {
  it('carries the same pair from a description that words the DEF line differently', () => {
    // 1279 says "Ignora 20% da DEF", this one "Ignora 20% de DEF".
    const bonus = wornBonus({ weapon: MACA_CAMPO_A });

    expect(bonus['p_race_demihuman']).toBe(75);
    expect(bonus['p_pene_race_demihuman']).toBe(20);
  });
});

describe('weapon structural fields', () => {
  it('reads the weapon level through the client typo on the Safira weapons', () => {
    // The client prints "Nível da Tipo: 4" where it means "Nível da arma".
    expect(ITEM_DB[CAJADO_SAFIRA].itemLevel).toBe(4);
    expect(ITEM_DB[CAJADO_SAFIRA].itemTypeId).toBe(1);
  });

  it('gates the battleground gun to the Justiceiro line', () => {
    // "Justiceiros e evoluções" — Justiceiro is JT_GUNSLINGER, so the token
    // reaches Insurgente and Guerrilheiro.
    expect(ITEM_DB[REVOLVER_SOLDADO].usableClass).toEqual(['Gunslinger']);
  });

  it('gates the katars to the Assassin line, not to an NPC class', () => {
    // "Mercenários e evoluções" — JT_ASSASSIN.
    expect(ITEM_DB[KATAR_CARNIFICINA_A].usableClass).toEqual(['Assassin']);
  });
});

describe('1848 Soqueira Inicial', () => {
  it('grants its ungated line and nothing from the set block', () => {
    const bonus = wornBonus({ weapon: SOQUEIRA_INICIAL });

    expect(bonus['aspdPercent']).toBe(10);
    // "Dano físico +5%", "Velocidade de ataque +1" and the per-level ATQ all sit
    // under "Conjunto", whose partners this record does not name by id — so none
    // of them is encoded, rather than paying out unconditionally.
    expect(bonus['atkPercent'] ?? 0).toBe(0);
    expect(bonus['aspd'] ?? 0).toBe(0);
    expect(bonus['atk'] ?? 0).toBe(0);
  });
});
