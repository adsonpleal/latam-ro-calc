import { describe, expect, it } from 'vitest';
import { mapLine, SKILL } from './card-catalog.mjs';

/**
 * The phrase table that turns a card's pt-BR description into script entries.
 *
 * The cards themselves are pinned by their data, in
 * src/app/core/__tests__/card-skill-damage.spec.ts. This file pins the readings the table
 * makes, so a wording the client ships on exactly one card is still covered by a test that
 * says which wording it is — tracker tsasuuTzUtOWBW78UJo4 was a whole wording nobody had
 * taught the table, and it went unnoticed because no card's absence looks like anything.
 */

describe('"Dano de [Perícia] +N%" — the key is the skill id', () => {
  it('shares one magnitude across every skill the line lists', () => {
    // 4438 Carta Banshee. Espíritos Anciões 13, Ataque Espiritual 11, Vulcão Napalm 400.
    expect(mapLine('Dano de [Espíritos Anciões], [Ataque Espiritual] e [Vulcão Napalm] +20%.')).toEqual([
      { key: '13', value: 20 },
      { key: '11', value: 20 },
      { key: '400', value: 20 },
    ]);
  });

  it('reads a list the client joins with nothing at all', () => {
    // 4191 Carta Loli Ruri prints "[Lanças de Gelo] [Relâmpago] e [Lanças de Fogo]" — the
    // brackets are the separator, so no joiner has to be known.
    expect(mapLine('Dano de [Lanças de Gelo] [Relâmpago] e [Lanças de Fogo] +10%.')).toEqual([
      { key: '14', value: 10 },
      { key: '20', value: 10 },
      { key: '19', value: 10 },
    ]);
  });

  it('reads "+N% adicional" as the same key again, because entries sum', () => {
    // 27173 Carta Bandido de Elite, on its refine bands.
    expect(mapLine('Dano de [Disparo Espalhado] +20% adicional.')).toEqual([{ key: '520', value: 20 }]);
  });

  it('blocks the whole line when one member has no id', () => {
    // 4304 Carta Tamruan: Escudo Bumerangue is in the catalog, Punição Divina is not.
    // Registering the half that resolves would ship a cheaper card than the client's.
    expect(SKILL['Escudo Bumerangue']).toBe('251');
    expect(SKILL['Punição Divina']).toBeUndefined();
    expect(mapLine('Dano de [Punição Divina] e [Escudo Bumerangue] +10%.')).toBeNull();
  });

  it('does not eat the bare damage lines that are not about a skill', () => {
    expect(mapLine('Dano mágico +5%.')).toEqual([{ key: 'matkPercent', value: 5 }]);
    expect(mapLine('Dano físico +5%.')).toEqual([{ key: 'atkPercent', value: 5 }]);
    expect(mapLine('Dano crítico +5%.')).toEqual([{ key: 'criDmg', value: 5 }]);
  });
});

describe('the critical-rate stat, under all three spellings the client has used', () => {
  // The LATAM database prints the accented "CRÍT" on 348 descriptions and the bare "CRIT"
  // on one; "Crítico" is what the oldest cards say. All three are the same `cri`.
  it.each(['CRÍT +1', 'CRIT +1', 'Crítico +1'])('%s', (line) => {
    expect(mapLine(line)).toEqual([{ key: 'cri', value: 1 }]);
  });
});
