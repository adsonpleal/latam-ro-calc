import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Items whose own description grants "+N% de dano de [Perícia]" with no set involved,
 * and whose `script` had no key for it. Found by tools/audit-skill-bonuses.mjs while
 * sweeping the "de Cinzas" helm family; unlike those, these need no partner, so the
 * bonus was simply absent from every build that equipped the piece.
 *
 * The pt-BR description is the source of truth (CLAUDE.md); each row quotes its line.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

function bonusOf(id: number, slot: string, refine: number): Record<string, number> {
  const model: any = createMainModel();
  model.level = 200;
  model[slot] = id;
  model[`${slot}Refine`] = refine;

  return equipStatusOf(makeCalculator({ [id]: { ...items[id] } }), model);
}

/** The four elemental staves, plain and Fortalecido: a flat bonus on their own spells. */
const STAVES: [string, number, Record<string, number>][] = [
  ['2007 Cajado do Açoite de Ouro', 2007, { 84: 12 }],
  ['2008 Cajado Aquático', 2008, { 14: 10 }],
  ['2009 Cajado Vermelho', 2009, { 19: 10, 17: 10 }],
  ['2010 Cajado Florestal', 2010, { 90: 10, 91: 10 }],
  ['2011 Cajado do Açoite de Ouro Fortalecido', 2011, { 84: 30 }],
  ['2012 Cajado Aquático Fortalecido', 2012, { 14: 30 }],
  ['2013 Cajado Vermelho Fortalecido', 2013, { 19: 30, 17: 30 }],
  ['2014 Cajado Florestal Fortalecido', 2014, { 90: 30, 91: 30 }],
];

describe.each(STAVES)('%s', (_label, id, expected) => {
  it('grants its spell bonus at any refine', () => {
    for (const [skill, value] of Object.entries(expected)) {
      expect(bonusOf(id, 'weapon', 0)[skill], `skill ${skill}`).toBe(value);
      expect(bonusOf(id, 'weapon', 10)[skill], `skill ${skill}`).toBe(value);
    }
  });
});

/**
 * The starter kit. Every one reads "Refino +7 ou mais: Dano de [X] +15%", and every one
 * had only its cast/range line registered.
 */
const INICIAL: [string, number, string][] = [
  ['2046 Bastão Inicial', 2046, '2211'], // Meteoro Escarlate
  ['13341 Shuriken Huuma Inicial', 13341, '3009'], // Turbilhão de Pétalas
  ['13483 Espada Inicial', 13483, '2477'], // Canhão de Prótons
  ['18165 Arbaleste Inicial', 18165, '2233'], // Tempestade de Flechas
  ['18166 Arco Inicial', 18166, '2418'], // Temporal de Flechas
  ['26015 Lança Inicial', 26015, '2317'], // Lança do Destino
  ['26119 Cajado Inicial', 26119, '2449'], // Onda Psíquica
  ['26120 Cauda de Gato Inicial', 26120, '5028'], // Meteoros de Nepeta
  ['28616 Bíblia Inicial', 28616, '2040'], // Adoramus
];

describe.each(INICIAL)('%s', (_label, id, skill) => {
  it('grants +15% from refine 7', () => {
    expect(bonusOf(id, 'weapon', 6)[skill] || 0).toBe(0);
    expect(bonusOf(id, 'weapon', 7)[skill]).toBe(15);
  });
});

describe('28631 Enciclopédia Ancestral', () => {
  it('+15% Chute Solar at +7, +20% Explosão Solar at +11', () => {
    expect([bonusOf(28631, 'weapon', 6)['2593'] || 0, bonusOf(28631, 'weapon', 6)['2592'] || 0]).toEqual([0, 0]);
    expect(bonusOf(28631, 'weapon', 7)['2593']).toBe(15);
    expect(bonusOf(28631, 'weapon', 10)['2592'] || 0).toBe(0);
    expect(bonusOf(28631, 'weapon', 11)['2592']).toBe(20);
  });
});

describe('470413 Bota Natalina', () => {
  // "Dano de [Campo Gravitacional] [Vulcão Napalm] [Espíritos Anciões] e
  //  [Magnus Exorcismus] +15%. A cada refino: os mesmos +2%."
  const SPELLS = ['484', '400', '13', '79'];

  it('grants 15% flat plus 2% per refine to all four spells', () => {
    expect(SPELLS.map((s) => bonusOf(470413, 'boot', 0)[s])).toEqual(SPELLS.map(() => 15));
    expect(SPELLS.map((s) => bonusOf(470413, 'boot', 10)[s])).toEqual(SPELLS.map(() => 35));
  });

  it('keeps the fixed-cast cut it already had', () => {
    expect(bonusOf(470413, 'boot', 7)['fct']).toBe(0.5);
  });
});
