import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The Wolf/Poe cards, and the set that was wired to the wrong pair.
 *
 * LATAM ships FOUR cards here, in two generations that share their effects:
 *
 *   27390  Carta Lobo   Inseto +15%, and NO set block
 *   27392  Carta Poe    Planta +15%, set [Carta Wolf]
 *  300128  Carta Wolf   Inseto +15%, set [Carta Po] + [Carta Isaac]
 *  300130  Carta Poe    Planta +15%, set [Carta Wolf]
 *
 * Both registered records carried the same *upstream Thai* set — ATQ +5%, ATQM +5% and
 * size-Médio +5%, gated on `EQUIP[Poe Richard Card]`. That clause was not inert: the legacy
 * by-name lookup resolves "Poe Richard Card" to 300130, which LATAM does ship, so anyone
 * wearing that pair collected three bonuses no pt-BR description promises. On 27390 the
 * pt-BR carries no set at all; on 300128 the pt-BR set is a different one entirely. Both
 * are gone, and the real set is registered on the side whose own text declares it.
 *
 * "[Carta Wolf]" is 300128 by name — 27390 is called "Carta Lobo", a different string.
 *
 * NOT modelled, on purpose: 300128's own set ([Carta Po] + [Carta Isaac] -> Pós-conjuração
 * -3%, físico vs Médio +7%). "[Carta Po]" is Poe Richard, which is 300130. Carta Isaac is
 * not in the LATAM client — it exists in item.json only as the inherited Thai record 27396,
 * with no latam-items.json entry — so the set can never fire, and a clause gated on an
 * unobtainable partner would model nothing while reading as if it did. Recorded here rather
 * than guessed at.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const LOBO = 27390;
const WOLF = 300128;
const POE = 300130;
const ISAAC = 27396;

const KNIFE = 1201; // Knife [3] — three card sockets, so a pair fits in one weapon

/** Equip the knife with `cards` in its sockets and read back the equipment bonus. */
function bonusOf(cards: number[]): Record<string, number> {
  const items: any = { [KNIFE]: { ...db[KNIFE], itemTypeId: 1, itemSubTypeId: 256 } };
  for (const id of cards) items[id] = { ...db[id] };

  const model = createMainModel();
  model.level = 200;
  model.weapon = KNIFE;
  cards.forEach((id, i) => (model[`weaponCard${i + 1}`] = id));

  return equipStatusOf(makeCalculator(items), model);
}

/** What wearing `cards` adds over wearing `baseline` — the set clause, isolated. */
function delta(baseline: number[], cards: number[]): Record<string, number> {
  const before = bonusOf(baseline);
  const after = bonusOf(cards);

  const out: Record<string, number> = {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const d = (after[key] || 0) - (before[key] || 0);
    if (d !== 0) out[key] = d;
  }

  return out;
}

describe('the phantom set is gone from both Wolf records', () => {
  it('27390 grants only what its pt-BR promises', () => {
    expect(db[LOBO].script).toEqual({ p_race_insect: ['15'], m_race_insect: ['15'] });
  });

  it('300128 grants only what its pt-BR promises', () => {
    expect(db[WOLF].script).toEqual({ p_race_insect: ['15'], m_race_insect: ['15'] });
  });

  it('pairing 27390 with Carta Poe adds nothing beyond the two cards themselves', () => {
    // The regression this file exists for: before the fix this delta carried atkPercent,
    // matkPercent, p_size_m and m_size_m at +5 each, off a set 27390 does not have.
    expect(delta([LOBO], [LOBO, POE])).toEqual({ p_race_plant: 15, m_race_plant: 15 });
  });
});

describe('Carta Poe (300130) — the set its own description declares', () => {
  it('adds nothing on its own', () => {
    expect(delta([], [POE])).toEqual({ p_race_plant: 15, m_race_plant: 15 });
  });

  it('adds físico/mágico +5% and size-Médio +5% with Carta Wolf', () => {
    expect(delta([WOLF], [WOLF, POE])).toEqual({
      p_race_plant: 15,
      m_race_plant: 15,
      atkPercent: 5,
      matkPercent: 5,
      p_size_m: 5,
      m_size_m: 5,
    });
  });

  it('every magnitude in the set appears in the card\'s own pt-BR text', () => {
    const text = (latam[POE].description as string).replace(/\^[0-9a-fA-F]{6}/g, '');

    expect(text).toContain('[Carta Wolf]');
    expect(text).toContain('Dano físico +5%');
    expect(text).toContain('Dano mágico +5%');
    expect(text).toContain('tamanho Médio +5%');
  });
});

describe('Carta Isaac is why 300128\'s own set stays out', () => {
  it('is an inherited record with no LATAM entry, so the set could never fire', () => {
    expect(db[ISAAC]).toBeDefined();
    expect(latam[ISAAC]).toBeUndefined();
    // 300128's pt-BR names it as a required partner; nothing in the client can supply it.
    expect((latam[WOLF].description as string)).toContain('[Carta Isaac]');
  });
});
