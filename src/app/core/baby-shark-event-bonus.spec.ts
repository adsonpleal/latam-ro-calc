import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils/create-main-model';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';
import { eventDay, isEventRunning, readUntilCondition } from './event-window';

/**
 * The Baby Shark collaboration's "[Durante o Evento]" bonuses, paid through 11/10/2026.
 *
 * The client never says when an event ends, so these were left out of the scripts until the
 * end date was known. The official announcement (ro.gnjoyamericas.com, news/event/93) runs the
 * event from 15/09/2026 after maintenance to 12/10/2026 *before* maintenance, so 11/10 is the
 * last whole day it pays; the three items carry their event block behind `UNTIL[2026-10-11]`.
 * The announcement lists the event bonus on the two cards; the head is a quest reward it does
 * not describe, and its block comes from the client text.
 * EXP and DROP rates are not modelled for any item, so those halves stay out.
 *
 *  - [Visual] Cabeça do Baby Shark (401367): ATQ e ATQM +50, CRIT +10, conjuração variável
 *    -10%, dano físico e mágico contra todos os tamanhos +10%;
 *  - Carta Baby Shark (300834) and Carta Família Tubarão (300835): dano físico e mágico
 *    contra todos os tamanhos +10% e contra todas as raças de monstros +10%.
 *
 * The head's block is not a guess at the client's wording: Ynk's Quimera Lava recording from
 * 17/09/2026 reads ATQ Equip. 1.250 in its status window, which the engine reaches only with
 * the head's +50 (ShadowCross.res-penetration-replay.spec.ts).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const HEAD = 401367;
const CARDS = [300834, 300835];
/** Casaco Pirata — any one-slot garment would do; the card's bonus is read as a difference. */
const GARMENT = 480174;

/** Midday in São Paulo on the given day. */
const saoPauloNoon = (day: string) => new Date(`${day}T12:00:00-03:00`);

const statusAt = (now: Date, model: Record<string, unknown>) =>
  equipStatusOf(makeCalculator(items).setClock(() => now), { ...createMainModel(), level: 239, ...model });

const EVENT_KEYS = ['atk', 'matk', 'cri', 'vct', 'p_size_all', 'm_size_all', 'p_race_all', 'm_race_all'];
const pick = (status: Record<string, number>) => Object.fromEntries(EVENT_KEYS.map((k) => [k, status[k] || 0]));
const diff = (a: Record<string, number>, b: Record<string, number>) =>
  Object.fromEntries(EVENT_KEYS.map((k) => [k, (a[k] || 0) - (b[k] || 0)]).filter(([, v]) => v !== 0));

describe('event window — a São Paulo calendar day, the last day included', () => {
  it('reads the clause and its last day', () => {
    expect(readUntilCondition('UNTIL[2026-10-11]===50')).toEqual({ clause: 'UNTIL[2026-10-11]', lastDay: '2026-10-11' });
    expect(readUntilCondition('LEVEL[201]===200')).toBeUndefined();
  });

  it('23:59 on 11/10 in São Paulo is still the event, although it is already 12/10 in UTC', () => {
    const lateNight = new Date('2026-10-12T02:59:00Z');
    expect(eventDay(lateNight)).toBe('2026-10-11');
    expect(isEventRunning('2026-10-11', lateNight)).toBe(true);
  });

  it('midnight on 12/10 in São Paulo is not — the event closes at the maintenance that morning', () => {
    expect(isEventRunning('2026-10-11', new Date('2026-10-12T03:00:00Z'))).toBe(false);
  });
});

describe('Baby Shark event bonuses — paid through 11/10/2026, gone from 12/10', () => {
  it('[Visual] Cabeça do Baby Shark: ATQ/ATQM +50, CRIT +10, conjuração variável -10%, tamanhos +10%', () => {
    const during = pick(statusAt(saoPauloNoon('2026-10-11'), { costumeUpper: HEAD }));
    const bare = pick(statusAt(saoPauloNoon('2026-10-11'), {}));
    expect(diff(during, bare)).toEqual({ atk: 50, matk: 50, cri: 10, vct: 10, p_size_all: 10, m_size_all: 10 });
  });

  it('[Visual] Cabeça do Baby Shark pays nothing from 12/10/2026', () => {
    const after = pick(statusAt(saoPauloNoon('2026-10-12'), { costumeUpper: HEAD }));
    const bare = pick(statusAt(saoPauloNoon('2026-10-12'), {}));
    expect(diff(after, bare)).toEqual({});
  });

  for (const card of CARDS) {
    it(`card ${card}: tamanhos and raças +10%, physical and magical, only during the event`, () => {
      const withCard = (day: string) => pick(statusAt(saoPauloNoon(day), { garment: GARMENT, garmentCard: card }));
      const withoutCard = (day: string) => pick(statusAt(saoPauloNoon(day), { garment: GARMENT }));

      expect(diff(withCard('2026-10-11'), withoutCard('2026-10-11'))).toMatchObject({ p_size_all: 10, m_size_all: 10, p_race_all: 10, m_race_all: 10 });
      expect(diff(withCard('2026-10-12'), withoutCard('2026-10-12'))).not.toHaveProperty('p_size_all');
      expect(diff(withCard('2026-10-12'), withoutCard('2026-10-12'))).not.toHaveProperty('m_race_all');
    });
  }

  it('the per-level ATQ of the Carta Baby Shark does not depend on the event', () => {
    const during = statusAt(saoPauloNoon('2026-10-11'), { garment: GARMENT, garmentCard: 300834 });
    const after = statusAt(saoPauloNoon('2026-10-12'), { garment: GARMENT, garmentCard: 300834 });
    expect(during.atk).toBe(after.atk);
  });
});
