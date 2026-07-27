import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ACC_SIDE_PREFIX, CardPosition } from 'src/app/constants';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Carta Gerente (4229) and the three partners of its set.
 *
 * pt-BR description:
 *   INT +1. / Conjuração variável -5%.
 *   Conjunto [Carta Alarme] [Carta Relógio] [Carta Punk]: DEF e DEFM +3.
 *
 * The partners were missing from item.json too, so they are added alongside — a set gated on
 * ids that cannot be equipped is a set that never fires. They sit in four different slots
 * (head / calçado / armadura / capa), so the whole set is wearable at once.
 *
 * Not modelled: the partners' on-hit autocasts (Chama Reveladora, Bloqueio, Pântano dos
 * Mortos) — the engine has no bonus key for a proc, so their scripts stay empty apart from
 * Alarme's flat stats.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const GERENTE = 4229;
const ALARME = 4244;
const RELOGIO = 4299;
const PUNK = 4313;

/** Which card socket each one occupies, by the model key the calculator reads. */
const SLOT_OF: Record<number, string> = {
  [GERENTE]: 'headUpperCard',
  [ALARME]: 'bootCard',
  [RELOGIO]: 'armorCard',
  [PUNK]: 'garmentCard',
};

/** A carrier for each card socket — a card only loads when its host item is equipped. */
const HOST_OF: Record<number, [string, number]> = {
  [GERENTE]: ['headUpper', 5128],
  [ALARME]: ['boot', 2419],
  [RELOGIO]: ['armor', 2354],
  [PUNK]: ['garment', 2520],
};

const ALL_CARDS = [GERENTE, ALARME, RELOGIO, PUNK];

/**
 * Equip `cards`, always wearing all four host items. Keeping the hosts constant is what
 * makes two runs comparable: each host contributes its own printed DEF to `def`, so a
 * baseline with fewer hosts would swamp the +3 the set is supposed to add.
 */
function bonusOf(cards: number[]): Record<string, number> {
  const items: any = {};
  const model = createMainModel();
  model.level = 200;

  for (const card of ALL_CARDS) {
    const [hostSlot, hostId] = HOST_OF[card];
    items[hostId] = { ...db[hostId] };
    model[hostSlot] = hostId;
  }
  for (const card of cards) {
    items[card] = { ...db[card] };
    model[SLOT_OF[card]] = card;
  }

  return equipStatusOf(makeCalculator(items), model);
}

describe('Carta Gerente 4229', () => {
  it.each([GERENTE, ALARME, RELOGIO, PUNK])('ships item %i', (id) => {
    expect(db[id], `item ${id}`).toBeDefined();
    expect(db[id].itemTypeId).toBe(6); // card
    expect(latam[id], `item ${id} is a LATAM item`).toBeDefined();
  });

  it('routes each card to the socket its description names', () => {
    // "Equipa em: Equip. para Cabeça / Calçado / Armadura / Capa"
    expect(db[GERENTE].compositionPos).toBe(CardPosition.Head);
    expect(db[ALARME].compositionPos).toBe(CardPosition.Boot);
    expect(db[RELOGIO].compositionPos).toBe(CardPosition.Armor);
    expect(db[PUNK].compositionPos).toBe(CardPosition.Garment);
  });

  it('gives INT +1 and Conjuração variável -5% on its own', () => {
    const bonus = bonusOf([GERENTE]);

    expect(bonus['int']).toBe(1);
    expect(bonus['vct']).toBe(5); // a reduction is stored positive
  });

  it('adds DEF and DEFM +3 with all three partners', () => {
    const alone = bonusOf([GERENTE]);
    const full = bonusOf([GERENTE, ALARME, RELOGIO, PUNK]);

    expect(full['def'] - alone['def']).toBe(3);
    expect(full['mdef'] - alone['mdef']).toBe(3);
    expect(full['int']).toBe(1); // its own line is unchanged by the set
  });

  it('does not fire the set while any partner is missing', () => {
    const alone = bonusOf([GERENTE]);

    for (const missing of [ALARME, RELOGIO, PUNK]) {
      const worn = ALL_CARDS.filter((id) => id !== missing);
      const bonus = bonusOf(worn);

      expect(bonus['def'] - alone['def'], `without ${missing}`).toBe(0);
      expect(bonus['mdef'] - alone['mdef'], `without ${missing}`).toBe(0);
    }
  });

  it('does not fire from the partners alone, without the Gerente', () => {
    const bonus = bonusOf([ALARME, RELOGIO, PUNK]);
    const none = bonusOf([]);

    expect(bonus['mdef'] - none['mdef']).toBe(0);
  });

  it('keeps Carta Alarme\'s own stats', () => {
    // The hosts carry VIT of their own, so read the card's contribution as a delta.
    const none = bonusOf([]);
    const bonus = bonusOf([ALARME]);

    expect(bonus['vit'] - none['vit']).toBe(1);
    expect(bonus['hp'] - none['hp']).toBe(300);
  });

  it('declares the set only on the Gerente, so it cannot double up', () => {
    for (const id of [ALARME, RELOGIO, PUNK]) {
      expect(JSON.stringify(db[id].script), `item ${id}`).not.toContain(String(GERENTE));
    }
  });
});

describe('side-locked accessory card labels', () => {
  it('tags them in pt-BR, matching the client\'s "Aces. Direito/Esquerdo"', () => {
    expect(ACC_SIDE_PREFIX.right).toBe('[Direito]');
    expect(ACC_SIDE_PREFIX.left).toBe('[Esquerdo]');
  });

  it('leaves no English side tag behind', () => {
    for (const prefix of Object.values(ACC_SIDE_PREFIX)) {
      expect(prefix).not.toMatch(/right|left/i);
    }
  });
});
