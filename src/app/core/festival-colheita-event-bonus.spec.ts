import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils/create-main-model';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * [Visual] Batata Quente (31975): the 2026 Festival da Colheita's "[Durante o Evento]" block,
 * paid through 22/11/2026.
 *
 * The official announcement (ro.gnjoyamericas.com, news/event/99) runs the festival from
 * 29/10/2026 after maintenance to 23/11/2026 *before* maintenance, and warns that the event
 * options go away at that maintenance — so 22/11 is the last whole day, and the whole block,
 * sets included, sits behind `UNTIL[2026-11-22]`. The values are the pt-BR client text
 * (latam-items.json), every line of which is under "[Durante o Evento]":
 *
 *  - dano físico à distância +10%, dano físico corpo a corpo +10%, dano mágico de todas as
 *    propriedades +10%;
 *  - conjunto com [Visual] Chapéu do Festival da Colheita (31368): dano físico +10% e
 *    conjuração fixa -0,2 s;
 *  - conjunto com [Visual] Espetinhos (31580): dano mágico +10% e conjuração fixa -0,2 s.
 *
 * Both partners are prizes of the same festival's raffle on that page, and divine-pride lists
 * the two combos (Sweet_Potato_In_Mouth_ATK / _MATK) against these ids.
 * EXP and DROP rates are not modelled for any item, so those lines stay out.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const POTATO = 31975;
const HAT = 31368;
const SKEWERS = 31580;

/** Midday in São Paulo on the given day. */
const saoPauloNoon = (day: string) => new Date(`${day}T12:00:00-03:00`);

const statusAt = (day: string, model: Record<string, unknown>) =>
  equipStatusOf(makeCalculator(items).setClock(() => saoPauloNoon(day)), { ...createMainModel(), level: 200, ...model });

const EVENT_KEYS = ['range', 'melee', 'm_element_all', 'atkPercent', 'matkPercent', 'fct'];
const diff = (a: Record<string, number>, b: Record<string, number>) =>
  Object.fromEntries(EVENT_KEYS.map((k) => [k, (a[k] || 0) - (b[k] || 0)]).filter(([, v]) => v !== 0));

describe('Festival da Colheita — [Visual] Batata Quente, paid through 22/11/2026', () => {
  const LAST_DAY = '2026-11-22';
  const AFTER = '2026-11-23';

  it('alone: distância, corpo a corpo e mágico de todas as propriedades +10%', () => {
    expect(diff(statusAt(LAST_DAY, { costumeLower: POTATO }), statusAt(LAST_DAY, {}))).toEqual({
      range: 10, melee: 10, m_element_all: 10,
    });
  });

  it('with the Chapéu do Festival da Colheita: dano físico +10% e conjuração fixa -0,2 s on top', () => {
    const set = statusAt(LAST_DAY, { costumeLower: POTATO, costumeUpper: HAT });
    expect(diff(set, statusAt(LAST_DAY, { costumeUpper: HAT }))).toEqual({
      range: 10, melee: 10, m_element_all: 10, atkPercent: 10, fct: 0.2,
    });
  });

  it('with the Espetinhos: dano mágico +10% e conjuração fixa -0,2 s on top', () => {
    const set = statusAt(LAST_DAY, { costumeLower: POTATO, costumeMiddle: SKEWERS });
    expect(diff(set, statusAt(LAST_DAY, { costumeMiddle: SKEWERS }))).toEqual({
      range: 10, melee: 10, m_element_all: 10, matkPercent: 10, fct: 0.2,
    });
  });

  it('pays nothing from 23/11/2026, sets included', () => {
    const all = { costumeLower: POTATO, costumeUpper: HAT, costumeMiddle: SKEWERS };
    expect(diff(statusAt(AFTER, all), statusAt(AFTER, {}))).toEqual({});
  });
});
