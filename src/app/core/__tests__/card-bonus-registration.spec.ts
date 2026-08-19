import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardPosition } from 'src/app/constants/card-position.enum';
import { createMainModel, createRawTotalBonus } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Cards registered straight from their pt-BR description, and the guards that keep them
 * honest — every card the calculator gained out of the "Faltam 470 cartas no banco" queue.
 *
 * The three waves below were registered under a stricter bar than the catalogue that
 * followed: **every** line of the description had to map to a bonus key the engine already
 * reads, so their whole script is flat and the engine hands all of it back. The rest of the
 * catalogue came in afterwards, under what the replay import needs — see the last describe
 * in this file, and tools/register-missing-cards.mjs for why it is every card now.
 *
 * Nothing here was hand-typed. The keys come from rules each witnessed against an item
 * ALREADY in item.json carrying the same phrase (`--witness` in
 * `tools/classify-missing-cards.mjs` proves all 43: "Resistência a oponentes de propriedade"
 * off Livro do Apocalipse (1557), "Resistência a danos físicos a distância" off Carta
 * Gazeti de Cristal (27110), "monstros Normais e Chefes" off Escudo de Torneio (2133),
 * "Resistência a oponentes de tamanho" off Bardiche Dentilhado (1375), the negative sign off
 * Faca de Combate (1228)). The magnitudes come from the pt-BR line itself, and the slot was
 * confirmed twice over — by the description's own "Equipa em:" line and by the RagnaPlace
 * API — before any record was written.
 *
 * This spec checks the result from both ends: the engine actually surfaces each script
 * through `loadItemFromModel().prepareAllItemBonus()`, and the data still says what the
 * pt-BR text says. The per-wording blocks at the bottom pin the readings that were decided
 * once and must not drift — a resistance line is not a damage line, a penalty stays
 * negative, a named race is never widened into its "all" key.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** Strip the client's ^RRGGBB colour codes. */
const plain = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/**
 * The 64 registered first, off the two the community named ("Marionete Demoníaca,
 * Doppelganger e etc.") and the wider gap the report exposed.
 */
const FIRST_WAVE = [
  4002, 4003, 4004, 4006, 4008, 4011, 4012, 4013, 4014, 4015, 4016, 4023, 4027, 4028,
  4030, 4032, 4042, 4043, 4049, 4050, 4052, 4056, 4059, 4068, 4074, 4078, 4081, 4095,
  4097, 4106, 4108, 4109, 4113, 4116, 4120, 4136, 4138, 4142, 4272, 4309, 4314, 4328,
  4340, 4362, 4450, 4452, 4453, 4505, 4515, 4516, 4526, 4527, 4545, 4640, 4659, 4663,
  4664, 4665, 4666, 4667, 27291, 27342, 31016, 31021,
];

/**
 * The 35 that followed, once the classification became a committed script: they cleared the
 * same bar all along and were held back only because the first wave's phrase table did not
 * know their wordings ("a oponentes de propriedade X", plural element/race lists, two
 * bonuses comma-joined on one line, "Resistência a danos físicos a distância", "monstros
 * Normais e Chefes", "X e Y +N" sharing one magnitude, "Crítico" for CRIT).
 */
const SECOND_WAVE = [
  4009, 4018, 4019, 4021, 4026, 4029, 4045, 4066, 4071, 4102, 4125, 4174, 4252, 4442,
  4443, 4444, 4445, 4447, 4449, 4639, 4660, 4661, 4668, 27027, 27029, 27158, 27316,
  27336, 27337, 27341, 27346, 27349, 27353, 27358, 300143,
];

/**
 * The 13 that followed once the slot stopped being read off one spelling only.
 *
 * Nothing about their effects was ever the problem — every line maps, and always did. They
 * were filed as "slotless" because the classifier looked for "Equipa em:" and these print the
 * older "Utilização:" / "Equipado em:". A card always compounds onto something, so a card the
 * text does not seem to place is a gap in the reading, not a property of the card.
 */
const THIRD_WAVE = [4186, 4202, 4220, 4225, 4339, 4401, 4469, 4470, 4471, 4473, 4475, 4476, 4477];

/** Every card registered this way. The guards below hold for all of them, wave or no wave. */
const ADDED = [...FIRST_WAVE, ...SECOND_WAVE, ...THIRD_WAVE];

/**
 * Where a card position is actually worn, plus an inert host to carry it there.
 *
 * `loadItemFromModel` only reads `<slot>Card` when the slot itself holds an item
 * (`this.equipItem.get(mainItemType) ? model[itemRelation] : 0`), so a card with no host
 * reaches the engine as a zero. Every host below has an empty `script`, which keeps the
 * "without the card" baseline honest; the assertions still work off the delta so a host
 * that ever gains a bonus cannot quietly be counted as the card's.
 */
const WORN: Record<number, { slot: string; cardField: string; host: number }> = {
  [CardPosition.Weapon]: { slot: 'weapon', cardField: 'weaponCard1', host: 1201 }, // Knife [3]
  [CardPosition.Head]: { slot: 'headUpper', cardField: 'headUpperCard', host: 5171 }, // Elmo das Valquírias
  [CardPosition.Armor]: { slot: 'armor', cardField: 'armorCard', host: 2319 }, // Jaqueta Brilhante
  [CardPosition.Shield]: { slot: 'shield', cardField: 'shieldCard', host: 2123 }, // Travessa de Orleans
  [CardPosition.Garment]: { slot: 'garment', cardField: 'garmentCard', host: 2515 }, // Asa de Águia
  [CardPosition.Boot]: { slot: 'boot', cardField: 'bootCard', host: 2421 }, // Sapatos das Valquírias
  [CardPosition.Acc]: { slot: 'accRight', cardField: 'accRightCard', host: 2971 }, // Relógio de Bolso
  [CardPosition.AccR]: { slot: 'accRight', cardField: 'accRightCard', host: 2983 }, // Broche Demoníaco
  [CardPosition.AccL]: { slot: 'accLeft', cardField: 'accLeftCard', host: 2976 }, // Lampião das Trevas
};

/** Equip the host at `position`, optionally with `cardId` in its socket, and run the engine. */
function bonusAt(position: number, cardId?: number): Record<string, number> {
  const { slot, cardField, host } = WORN[position];

  const db: Record<number, any> = { [host]: { ...items[host] } };
  if (cardId !== undefined) db[cardId] = { ...items[cardId] };

  const model = createMainModel();
  model.level = 200;
  model[slot] = host;
  model[`${slot}Refine`] = 0;
  if (cardId !== undefined) model[cardField] = cardId;

  return equipStatusOf(makeCalculator(db), model);
}

/** What the card, and only the card, adds to the equipment bonus. */
function grantedBy(id: number): Record<string, number> {
  const position = items[id].compositionPos;
  const without = bonusAt(position);
  const withCard = bonusAt(position, id);

  const granted: Record<string, number> = {};
  for (const key of new Set([...Object.keys(without), ...Object.keys(withCard)])) {
    const delta = (withCard[key] || 0) - (without[key] || 0);
    if (delta !== 0) granted[key] = delta;
  }

  return granted;
}

/** The card's registered script, as the numbers the engine should hand back. */
const scriptOf = (id: number): Record<string, number> =>
  Object.fromEntries(Object.entries(items[id].script as Record<string, string[]>).map(([key, values]) => [key, Number(values[0])]));

describe('every registered card reaches the engine', () => {
  it('is registered as a card, in the LATAM client, at a real card position', () => {
    const valid = new Set(Object.values(CardPosition).filter((v): v is number => typeof v === 'number'));

    for (const id of ADDED) {
      expect(items[id], `${id} missing from item.json`).toBeTruthy();
      expect(items[id].itemTypeId, `${id} itemTypeId`).toBe(6);
      expect(items[id].itemSubTypeId, `${id} itemSubTypeId`).toBe(0);
      expect(latam[id], `${id} missing from latam-items.json`).toBeTruthy();
      expect(valid.has(items[id].compositionPos), `${id} compositionPos ${items[id].compositionPos}`).toBe(true);
      expect(Object.keys(items[id].script).length, `${id} has an empty script`).toBeGreaterThan(0);
    }
  });

  it('hands its whole script back through loadItemFromModel().prepareAllItemBonus()', () => {
    // The end-to-end check: a record can be perfectly shaped and still reach nothing, which
    // is how Carta Mosca Caçadora sat in the database while appearing in no picker.
    for (const id of ADDED) {
      expect(grantedBy(id), `${id} ${latam[id].name}`).toEqual(scriptOf(id));
    }
  });

  it('grants nothing at all when its slot is empty', () => {
    // The negative half of the test above: without the host the socket is not read, so a
    // non-zero delta there would mean the "with card" run was measuring something else.
    for (const position of Object.keys(WORN).map(Number)) {
      const { slot, cardField, host } = WORN[position];
      const cards = ADDED.filter((id) => items[id].compositionPos === position);

      for (const id of cards) {
        const db = { [host]: { ...items[host] }, [id]: { ...items[id] } };
        const model = createMainModel();
        model.level = 200;
        model[cardField] = id; // card in the socket, nothing wearing it
        const orphan = equipStatusOf(makeCalculator(db), model);

        for (const key of Object.keys(items[id].script)) {
          expect(orphan[key] || 0, `${id} ${latam[id].name} leaked "${key}" with no ${slot}`).toBe(0);
        }
      }
    }
  });
});

describe('the data still says what the pt-BR description says', () => {
  it('only uses bonus keys the engine actually reads', () => {
    // Never invent a key: an unknown one lands where nothing looks. See CLAUDE.md.
    const known = new Set(Object.keys(createRawTotalBonus()));

    for (const id of ADDED) {
      for (const key of Object.keys(items[id].script)) {
        expect(known.has(key), `${id} uses unknown key "${key}"`).toBe(true);
      }
    }
  });

  it('routes to the slot its own description names, in whichever wording', () => {
    // A compositionPos no branch of the card router matches is how Carta Mosca Caçadora
    // vanished from every picker — see the 0.1.60-beta entry.
    //
    // Four wordings, treated as equal evidence, matching tools/classify-missing-cards.mjs
    // resolveSlot: "Equipa em:", the older "Utilização:" / "Equipado em:" / "Localização:",
    // and "Classes:" — which on a card names the equipment type (4421 Carta Drosera prints
    // "Classes: Arma") though on ordinary gear the same label lists job classes. Reading only
    // the modern spelling is what left 50 placeable cards looking slotless.
    const SLOT_LINE = /(?:Equipa em|Equipado em|Utiliza[cç][aã]o|Localiza[cç][aã]o|Classes)\s*:\s*([^\n]*)/;
    const BY_SLOT: Record<string, number> = {
      Arma: CardPosition.Weapon,
      Armadura: CardPosition.Armor,
      Escudo: CardPosition.Shield,
      Capa: CardPosition.Garment,
      Calçado: CardPosition.Boot,
      Acessório: CardPosition.Acc,
      'Aces. Direito': CardPosition.AccR,
      'Aces. Esquerdo': CardPosition.AccL,
      // The client prints the head slot both ways; this batch uses the long spelling.
      'Equip. para Cabeça': CardPosition.Head,
      'Equipamento para Cabeça': CardPosition.Head,
    };

    for (const id of ADDED) {
      const slot = SLOT_LINE.exec(plain(latam[id].description))?.[1].trim();
      expect(BY_SLOT[slot!], `${id} ${latam[id].name} "${slot}"`).toBe(items[id].compositionPos);
    }
  });

  it('carries no number that is not in its own description', () => {
    // The guard against a mis-parsed line: every magnitude in the script has to appear in
    // the pt-BR text it was read from.
    for (const id of ADDED) {
      const description = plain(latam[id].description).replace(/\./g, '');

      for (const values of Object.values(items[id].script) as string[][]) {
        for (const value of values) {
          expect(description.includes(String(Math.abs(Number(value)))), `${id} value ${value}`).toBe(true);
        }
      }
    }
  });

  it('never widens a named race, element or size into its "all" key', () => {
    // "Resistência as raças Bruto e Doram" is two keys, not subrace_all. The wide keys are
    // a different effect and would apply against every target.
    const WIDE = ['subele_all', 'subrace_all', 'subsize_all', 'subclass_all', 'p_element_all', 'p_race_all', 'p_size_all', 'p_class_all'];

    for (const id of ADDED) {
      for (const key of WIDE) {
        expect(items[id].script[key], `${id} ${latam[id].name} uses "${key}"`).toBeUndefined();
      }
    }
  });
});

describe('the two cards the community named', () => {
  // Reported as "Marionete Demoníaca, Doppelganger e etc." — the two named ones, which is
  // where the whole queue started.
  it('4142 Carta Doppelganger — "Velocidade de ataque +10%"', () => {
    expect(items[4142].script).toEqual({ aspdPercent: ['10'] });
    expect(items[4142].compositionPos).toBe(CardPosition.Weapon);
  });

  it('31021 Carta Marionete Demoníaca — "ATQ da arma -3%" and "Velocidade de ataque +10%"', () => {
    // "ATQ da arma +N%" is the old wording of today's "Dano físico +N%", i.e. atkPercent
    // — see dano-fisico-percent.spec.ts. The -3% is a penalty, so it stays negative.
    expect(items[31021].script).toEqual({ atkPercent: ['-3'], aspdPercent: ['10'] });
    expect(items[31021].compositionPos).toBe(CardPosition.Weapon);
  });
});

describe('the readings the first wave settled', () => {
  it('reads "Resistência a raça X" as damage taken (subrace_), not damage dealt', () => {
    // 4059 Carta Soldado Andre: "Reduz em 30% o dano causado por monstros da raça Planta."
    // Same effect as the modern "Resistência a raça +N%" wording, which Batina (2327) and
    // Asas de Anjo (2254) already carry as subrace_.
    expect(items[4059].script).toEqual({ subrace_plant: ['30'] });
  });

  it('reads "Dano físico contra a propriedade X" as damage dealt (p_element_)', () => {
    // 4030 Carta Mandrágora: "Dano físico contra a propriedade Vento +20%."
    expect(items[4030].script).toEqual({ p_element_wind: ['20'] });
  });

  it('keeps a cast-time penalty negative, since the key stores reductions positive', () => {
    // Carta Fen (4077, already in the DB) is the precedent: "Conjuração variável +25%"
    // is registered as vct -25.
    expect(items[4077].script.vct).toEqual(['-25']);
  });
});

describe('the wordings the second wave was the first to register', () => {
  it('4442 Carta Tatacho — resistance and damage against the same element are two keys', () => {
    // "Resistência a oponentes de propriedade Neutro +20%" is damage taken (subele_), and
    // "Dano físico contra oponentes de propriedade Neutro +5%" is damage dealt
    // (p_element_) — Livro do Apocalipse (1557) and Carta Anaconda (4062) respectively.
    expect(grantedBy(4442)).toEqual({ subele_neutral: 20, p_element_neutral: 5 });
  });

  it('27158 Carta Les — a resistance line alone grants no damage', () => {
    // Its only line is "Resistência a oponentes de propriedade Vento +30%", so the
    // damage-dealt twin must stay untouched.
    const granted = grantedBy(27158);

    expect(granted['subele_wind']).toBe(30);
    expect(granted['p_element_wind']).toBeUndefined();
  });

  it('4102 Carta Sussurro — a resistance penalty stays negative', () => {
    // "Esquiva +20" and "Resistência a propriedade Fantasma -50%": the second is a weakness,
    // and flipping its sign would turn the game's worst trade into a bonus. Faca de Combate
    // (1228) is the precedent for storing it as written.
    expect(grantedBy(4102)).toEqual({ flee: 20, subele_ghost: -50 });
  });

  it('4174 Carta Deviling — +50% Neutro against -50% on the other nine elements', () => {
    const granted = grantedBy(4174);

    expect(granted['subele_neutral']).toBe(50);
    for (const element of ['fire', 'water', 'earth', 'wind', 'undead', 'ghost', 'dark', 'holy', 'poison']) {
      expect(granted[`subele_${element}`], `subele_${element}`).toBe(-50);
    }
  });

  it('4661 Carta Basilisco Guerreiro — two sizes up, the third down', () => {
    expect(grantedBy(4661)).toEqual({ subsize_m: 20, subsize_l: 20, subsize_s: -15 });
  });

  it('4125 Carta Deviace — one magnitude shared by a six-race list', () => {
    // "Dano físico contra as raças Humano, Humanoide, Bruto, Doram, Planta e Inseto +7%":
    // the same +7 on each, the way Nagan (1130) splits its two-race line.
    expect(grantedBy(4125)).toEqual({
      p_race_player_human: 7,
      p_race_demihuman: 7,
      p_race_brute: 7,
      p_race_player_doram: 7,
      p_race_plant: 7,
      p_race_insect: 7,
    });
  });

  it('4029 Carta Lobo — "Crítico" on a comma-joined line is CRIT, not crit damage', () => {
    // "ATQ +15, Crítico +1". Fatal 1 (4863) carries the same word as `cri`; `criDmg` is
    // spelled "Dano crítico".
    expect(grantedBy(4029)).toEqual({ atk: 15, cri: 1 });
  });

  it('4045 and 4252 — "danos físicos a distância" is damage taken, not damage dealt', () => {
    // dmg_taken_range, off Carta Gazeti de Cristal (27110). `range` is the dealt side.
    expect(grantedBy(4045)).toEqual({ dmg_taken_range: 35 });
    expect(grantedBy(4252)).toEqual({ dmg_taken_range: 5 });
    expect(grantedBy(4045)['range']).toBeUndefined();
  });

  it('4639 Carta Tappy — "monstros Normais e Chefes" is both class keys', () => {
    // Escudo de Torneio (2133) prints the identical line and carries both.
    expect(grantedBy(4639)).toEqual({ p_class_normal: 1, p_class_boss: 1 });
  });

  it('4668 Carta Esporo de Água Doce — "VIT e INT +1" is +1 each, and it is a head card', () => {
    // Desejo dos Deuses (5747) is the witness for the shared-magnitude wording.
    expect(grantedBy(4668)).toEqual({ vit: 1, int: 1 });
    expect(items[4668].compositionPos).toBe(CardPosition.Head);
  });

  it('27336 Carta Sorrateiro Caótico — a race pair and an element on the same card', () => {
    expect(grantedBy(27336)).toEqual({ subrace_brute: 15, subrace_player_doram: 15, subele_poison: 15 });
  });

  it('27358 Carta Foragido — three elements at -100% and five at +30%', () => {
    expect(grantedBy(27358)).toEqual({
      subele_holy: -100,
      subele_ghost: -100,
      subele_fire: -100,
      subele_poison: 30,
      subele_earth: 30,
      subele_wind: 30,
      subele_dark: 30,
      subele_undead: 30,
    });
  });
});

/**
 * The whole catalogue, once "a card the engine cannot model" stopped meaning "a card the
 * database does not have".
 *
 * The replay import is what changed the answer: a .rrf names the cards the character is
 * wearing, and an id with no record is dropped with a "fora do banco de dados" toast — so a
 * missing card is one the calculator cannot even show you are wearing. Every card is
 * registered now, 204 of them with an empty script. Honestly empty: the pt-BR description
 * is overlaid at runtime and says what the card really does, whatever the script holds.
 *
 * The guards that survive are the ones about not writing something wrong — the slot has to
 * be the one the card's own text names, and every key has to be one the engine reads.
 */
describe('the whole card catalogue', () => {
  /**
   * "Carta" is also the pt-BR word for a letter, and 19 records whose name starts with it
   * are not compound cards: correspondence, Halloween event props, quest props, pet bait, a
   * consumable, and one lower head gear (5536, the joke hat "Carta Imperfeita", which
   * item.json has always held as the hat it is).
   *
   * Listed by id rather than filtered by a rule, because none of them prints a slot line
   * and the footer's "Tipo: Carta" does not separate them either — 17 real cards print no
   * "Tipo:" line at all. Same list as NOT_A_CARD in tools/card-catalog.mjs.
   */
  const NOT_A_CARD = [
    5536, 6043, 6044, 6546, 6925, 6929, 7148, 7183, 7416, 7468, 7469, 7471, 7490, 7501,
    7643, 12370, 22511, 25167, 25627,
  ];

  const CARDS = Object.keys(latam)
    .filter((id) => /^Carta /.test(latam[id].name || '') && !NOT_A_CARD.includes(Number(id)))
    .map(Number);

  it('holds a record for every card the LATAM client ships', () => {
    // 1083 records are named "Carta …"; 19 of them are not cards. The other 1064 are all
    // here. A client update shipping a new card fails this line, which is the point.
    expect(Object.keys(latam).filter((id) => /^Carta /.test(latam[id].name || ''))).toHaveLength(1083);
    expect(CARDS).toHaveLength(1064);
    expect(CARDS.filter((id) => !items[id])).toEqual([]);
  });

  it('shapes every one of them as a card at a real card position', () => {
    const valid = new Set(Object.values(CardPosition).filter((v): v is number => typeof v === 'number'));

    for (const id of CARDS) {
      expect(items[id].itemTypeId, `${id} ${latam[id].name} itemTypeId`).toBe(6);
      expect(items[id].itemSubTypeId, `${id} ${latam[id].name} itemSubTypeId`).toBe(0);
      expect(valid.has(items[id].compositionPos), `${id} ${latam[id].name} compositionPos ${items[id].compositionPos}`).toBe(true);
    }
  });

  it('routes every one of them to the slot its own description names', () => {
    // Every wording is equal evidence, in the order tools/card-catalog.mjs resolves them.
    // Reading only the modern "Equipa em:" is what once left 50 placeable cards looking
    // slotless.
    const BY_SLOT: Record<string, number> = {
      Arma: CardPosition.Weapon,
      Armadura: CardPosition.Armor,
      Escudo: CardPosition.Shield,
      Capa: CardPosition.Garment,
      Calçado: CardPosition.Boot,
      Acessório: CardPosition.Acc,
      'Aces. Direito': CardPosition.AccR,
      'Aces. Esquerdo': CardPosition.AccL,
      'Equip. para Cabeça': CardPosition.Head,
      'Equipamento para Cabeça': CardPosition.Head,
      // The client's own typos, one card each: 27105 prints "Aces. DIreito" and 27116 the
      // Spanish "Accesorio".
      'Aces. DIreito': CardPosition.AccR,
      Accesorio: CardPosition.Acc,
    };

    /**
     * The two cards whose text names no slot at all, from divine-pride's "Compound on".
     * There is no such thing as a card without a slot, so a card the client's text does not
     * place is a gap in the text, not a property of the card.
     */
    const FROM_DIVINE_PRIDE: Record<number, number> = {
      4414: CardPosition.Shield, // Seeker Card — "Compounds On: Shield"
      4417: CardPosition.Boot, // Ice Titan Card — "Compounds On: Shoes"
    };

    // "Classes:" names the equipment type on a card ("Classes: Arma" on 4421) though the
    // same label lists job classes on ordinary gear, and 4423 prints "Tipo:" twice — once
    // for "Carta", once for the slot. Both are read only when the value IS a slot.
    const SLOT_LINE = /(?:Equipa em|Equipado em|Utiliza[cç][aã]o|Localiza[cç][aã]o)\s*:\s*([^\n]*)/;
    const FALLBACK_LINE = /(?:Classes|Tipo)\s*:\s*([^\n]*)/g;

    for (const id of CARDS) {
      if (FROM_DIVINE_PRIDE[id] !== undefined) {
        expect(items[id].compositionPos, `${id} ${latam[id].name}`).toBe(FROM_DIVINE_PRIDE[id]);
        continue;
      }

      const description = plain(latam[id].description);
      const named =
        SLOT_LINE.exec(description)?.[1].trim() ??
        [...description.matchAll(FALLBACK_LINE)].map((m) => m[1].trim()).filter((value) => value in BY_SLOT).pop();

      expect(BY_SLOT[named!], `${id} ${latam[id].name} "${named}"`).toBe(items[id].compositionPos);
    }
  });
});
