// Guards the gap between what the client has and what the calculator can calculate.
//
// A ragassets sync adds names to latam-items.json and never touches item.json, so a new
// piece of gear arrives invisible: no picker offers it and nothing errors. The Armaduras
// Desconhecidas (450595-450600) spent a release like that. This spec fails while any item
// of a type the calculator models has no record — which is what the sync-with-ragassets
// skill's "New items" step is for.

import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM tool without type declarations
import { WANTED, classifyItem, findMissingItems, readJson } from './missing-items.mjs';

const entry = (name: string, description: string) => ({ name, description, aegisName: null });

describe('classifyItem', () => {
  it('reads the type line of current descriptions', () => {
    expect(classifyItem(entry('Armadura Desconhecida FOR', '...\nTipo: ^777777Armadura^000000\nDEF: 120'))).toBe('armor');
    expect(classifyItem(entry('Anel', 'Tipo: Aces. Direito'))).toBe('accessory');
    expect(classifyItem(entry('Botas de Mana', 'Tipo: Calçado Def: 0'))).toBe('shoes');
    expect(classifyItem(entry('Flecha Atordoante', 'Tipo: Munição'))).toBe('ammo');
  });

  it('reads the spaced and untranslated type lines too', () => {
    // 20494 [Visual] Poring OVNI and 20371 Costume Special Kafra Hat hid behind these.
    expect(classifyItem(entry('[Visual] Poring OVNI', 'Tipo : Visual DEF : 0\nPosição : Superior'))).toBe('costume');
    expect(classifyItem(entry('Costume Special Kafra Hat', 'Type : Costume Defense : 0\nEquip on: Upper'))).toBe('costume');
  });

  it('reads the type out of the first Classes: line of old descriptions', () => {
    const arco = 'Arco básico.\n-------------------------\nClasses: Arco\nATQ: 15 ATQM: 0\nClasses: Arqueiro e suas evoluções';
    expect(classifyItem(entry('Arco', arco))).toBe('weapon');
  });

  it('does not count a box typed as the gear it holds', () => {
    expect(classifyItem(entry('Cx Anel do Ganhador[7Dias]', 'Uma caixa contendo 1 Anel do Ganhador [A].\nTipo: Acessório'))).toBe('box');
  });

  it('does not count gear no class can wear', () => {
    expect(classifyItem(entry('Capote do Tutorial', 'Tipo: Armadura\nClasses: Nenhuma'))).toBe('unequippable');
  });

  it('does not count ammo nobody equips', () => {
    expect(classifyItem(entry('Munição P', 'Catalisador de [Calibre Letal], não é necessário equipar.\nTipo: Munição'))).toBe('skill-catalyst');
    expect(classifyItem(entry('Cápsula de Chamas', 'Um projétil de Lança-Granadas que carrega a propriedade Fogo.\nTipo: Munição'))).toBe('grenade-sphere');
    expect(classifyItem(entry('[Munição] Poção do Furor Físico', 'Feito para arremessar.\nTipo: Munição'))).toBe('throwable');
    expect(classifyItem(entry('Projétil de Fogo', 'Um projétil envolto em Fogo.\nTipo: Munição'))).toBe('ammo');
  });

  it('keeps pet gear, bait and throwables out of the wanted set', () => {
    for (const [type, expected] of [
      ['Acessório de Mascote', 'pet-accessory'],
      ['Isca', 'taming-bait'],
      ['Roupa', 'outfit-consumable'],
    ]) {
      const category = classifyItem(entry('x', `Tipo: ${type}`));
      expect(category).toBe(expected);
      expect(WANTED).not.toContain(category);
    }
    expect(WANTED).not.toContain(classifyItem(entry('Bomba de Maçã', 'Classes: Projétil\nATQ: 0')));
  });

  it('returns null for items that are not gear at all', () => {
    expect(classifyItem(entry('Poção Vermelha', 'Recupera HP.\nPeso: 7'))).toBeNull();
  });
});

describe('item.json coverage of the client', () => {
  const missing = findMissingItems(readJson('latam-items.json'), readJson('item.json'));

  it('leaves no type it cannot place', () => {
    // A new "Tipo:" wording lands here instead of silently dropping out of the check.
    expect(Object.keys(missing).filter((c) => c.startsWith('unknown:'))).toEqual([]);
  });

  it('has a record for every weapon, gear piece, ammo, costume and card the client ships', () => {
    const wanted = Object.fromEntries(
      WANTED.filter((c: string) => missing[c]?.length).map((c: string) => [c, missing[c].map((i: any) => `${i.id} ${i.name}`)]),
    );
    expect(wanted).toEqual({});
  });
});
