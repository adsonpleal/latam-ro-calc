import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * Items that arrived (or came to exist in the LATAM client) with the August 2026 GRF
 * update.
 *
 * Two fronts, both worth testing:
 *
 *  - **Seven new records** — 300172, 300176, 460181, 470458, 470459, 491084 and
 *    491085, which the client started shipping and item.json did not have.
 *  - **Five corrections** — ids already registered that only now got the client's pt-BR
 *    description. Checking script against description caught Carta Ju (300189), whose
 *    refine step was not tied to the book condition, and the four Barreira/Ravage
 *    garments (480065-480068), which added MHP per refine instead of per 2.
 *
 * Every bonus below is a line from the pt-BR description, which is the source of truth.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** A db item carrying the type/subtype the model slot expects. */
const comSlot = (id: number, itemTypeId: number, itemSubTypeId: number) => ({
  ...db[id],
  itemTypeId,
  itemSubTypeId,
});

/**
 * Builds the calculation with the requested items and returns the summed equipment
 * bonus. It only takes what each test needs; the rest of the doll stays empty.
 */
function bonus(opts: {
  weapon?: number;
  weaponRefine?: number;
  weaponCard?: number;
  headMiddle?: number;
  boot?: number;
  bootRefine?: number;
  bootGrade?: string;
  bootCard?: number;
  accRight?: number;
  accLeft?: number;
  garment?: number;
  garmentRefine?: number;
  shield?: number;
}): Record<string, number> {
  const itens: Record<number, any> = {};
  const model: any = createMainModel();
  model.level = 200;

  if (opts.weapon) {
    itens[opts.weapon] = db[opts.weapon];
    model.weapon = opts.weapon;
    model.weaponRefine = opts.weaponRefine ?? 0;
  }
  if (opts.weaponCard) {
    itens[opts.weaponCard] = comSlot(opts.weaponCard, 6, 0);
    model.weaponCard1 = opts.weaponCard;
  }
  if (opts.headMiddle) {
    itens[opts.headMiddle] = comSlot(opts.headMiddle, 2, 512);
    model.headMiddle = opts.headMiddle;
  }
  if (opts.boot) {
    itens[opts.boot] = comSlot(opts.boot, 2, 516);
    model.boot = opts.boot;
    model.bootRefine = opts.bootRefine ?? 0;
    if (opts.bootGrade) model.bootGrade = opts.bootGrade;
  }
  if (opts.bootCard) {
    itens[opts.bootCard] = comSlot(opts.bootCard, 6, 0);
    model.bootCard = opts.bootCard;
  }
  if (opts.accRight) {
    itens[opts.accRight] = comSlot(opts.accRight, 2, 510);
    model.accRight = opts.accRight;
  }
  if (opts.accLeft) {
    itens[opts.accLeft] = comSlot(opts.accLeft, 2, 511);
    model.accLeft = opts.accLeft;
  }
  if (opts.garment) {
    itens[opts.garment] = comSlot(opts.garment, 2, 515);
    model.garment = opts.garment;
    model.garmentRefine = opts.garmentRefine ?? 0;
  }
  if (opts.shield) {
    itens[opts.shield] = comSlot(opts.shield, 2, 514);
    model.shield = opts.shield;
  }

  return equipStatusOf(makeCalculator(itens), model);
}

// Weapons used only as card carriers / weapon-class conditions.
const ESPADA_2H = 1160; // Espada Larga — twohandSword
const MACHADO_2H = 1371; // Machado do Apocalipse — twohandAxe
const ESPADA_1H = 1123; // Haedonggum — sword
const LIVRO = 1551; // Bíblia — book

/** `totalEquipStatus` already starts at DEFAULT_PERFECT_HIT; the item adds on top. */
const BASE_PERFECT_HIT = 5;

describe('New cards', () => {
  describe('300172 Carta Sugador de Cérebro', () => {
    it('removes 15% of max HP — "MHP - 15%"', () => {
      expect(bonus({ weapon: ESPADA_1H, weaponCard: 300172 })['hpPercent']).toBe(-15);
    });

    it('brings nothing else (SP drain and life absorption are not modelled)', () => {
      expect(Object.keys(db[300172].script)).toEqual(['hpPercent']);
    });
  });

  describe('300176 Carta Forma de Vida Não Identificada', () => {
    // "Se a arma equipada for Espada de Duas Mãos ou Machado de Duas Mãos, dano
    //  físico corpo a corpo +10%, Velocidade de ataque + 1."
    it.each([
      ['Espada de Duas Mãos', ESPADA_2H],
      ['Machado de Duas Mãos', MACHADO_2H],
    ])('grants +10%% melee and +1 ASPD with %s', (_classe, arma) => {
      const b = bonus({ weapon: arma, weaponCard: 300176 });
      expect(b['melee']).toBe(10);
      expect(b['aspd']).toBe(1);
    });

    it('grants none of that on a weapon of another class', () => {
      const b = bonus({ weapon: ESPADA_1H, weaponCard: 300176 });
      expect(b['melee'] ?? 0).toBe(0);
      expect(b['aspd'] ?? 0).toBe(0);
    });

    // "A cada 2 refinos, dano físico corpo a corpo +1% adicional." — its own line in the
    // description, without repeating the weapon condition, so it always applies (the same
    // reading already used for Carta Verme Tumular 300171).
    it('adds +1%% melee per 2 refines', () => {
      expect(bonus({ weapon: ESPADA_2H, weaponCard: 300176, weaponRefine: 10 })['melee']).toBe(10 + 5);
    });

    it('keeps the refine step on a weapon of another class', () => {
      expect(bonus({ weapon: ESPADA_1H, weaponCard: 300176, weaponRefine: 10 })['melee']).toBe(5);
    });
  });
});

describe('460181 Protetor Pænitentia', () => {
  it('grants +5%% physical and magical against all sizes', () => {
    const b = bonus({ headMiddle: 460181 });
    expect(b['p_size_all']).toBe(5);
    expect(b['m_size_all']).toBe(5);
  });

  // "Conjunto / Qualquer Arma Pænitentia / Pós-conjuração -10%."
  it.each([
    ['Pænitentia Gladius', 500019],
    ['Pænitentia Codex', 540014],
    ['Pænitentia Ruina', 840006],
  ])('unlocks ACD -10%% with %s', (_nome, arma) => {
    expect(bonus({ headMiddle: 460181, weapon: arma })['acd']).toBe(10);
  });

  it('does not unlock ACD with a weapon outside the family', () => {
    expect(bonus({ headMiddle: 460181, weapon: ESPADA_1H })['acd'] ?? 0).toBe(0);
  });

  it('does not unlock ACD with the Pænitentia Aegis shield — the set needs a WEAPON', () => {
    expect(bonus({ headMiddle: 460181, shield: 460013 })['acd'] ?? 0).toBe(0);
  });

  it('grants no ACD on its own', () => {
    expect(bonus({ headMiddle: 460181 })['acd'] ?? 0).toBe(0);
  });
});

describe('470458 Botas da Fonte', () => {
  it('raises max HP and SP by 1%% per 2 refines', () => {
    const b = bonus({ boot: 470458, bootRefine: 11 });
    expect(b['hpPercent']).toBe(5);
    expect(b['spPercent']).toBe(5);
  });

  it('unlocks the +7, +9 and +11 refine steps', () => {
    const unrefined = bonus({ boot: 470458, bootRefine: 0 });
    expect(unrefined['atkPercent'] ?? 0).toBe(0);
    expect(unrefined['cri'] ?? 0).toBe(0);

    expect(bonus({ boot: 470458, bootRefine: 7 })['atkPercent']).toBe(7);

    const r9 = bonus({ boot: 470458, bootRefine: 9 });
    expect(r9['cri']).toBe(5);
    // The total already starts at DEFAULT_PERFECT_HIT (5), so the item's +10 becomes 15.
    expect(r9['perfectHit']).toBe(BASE_PERFECT_HIT + 10);
    expect(r9['fct'] ?? 0).toBe(0);

    expect(bonus({ boot: 470458, bootRefine: 11 })['fct']).toBe(0.5);
  });

  it('libera os graus D, C e B em cascata', () => {
    const d = bonus({ boot: 470458, bootGrade: 'D' });
    expect(d['res']).toBe(50);
    expect(d['mres']).toBe(50);
    expect(d['sta'] ?? 0).toBe(0);

    const c = bonus({ boot: 470458, bootGrade: 'C' });
    expect(c['sta']).toBe(5);
    expect(c['wis']).toBe(5);
    expect(c['pAtk'] ?? 0).toBe(0);

    expect(bonus({ boot: 470458, bootGrade: 'B' })['pAtk']).toBe(7);
  });

  // "Conjunto / Carta Espadachim Egnigem" (4352)
  it('with Carta Espadachim Egnigem: -0.5s fixed cast and +10%% against all elements', () => {
    const b = bonus({ boot: 470458, bootCard: 4352 });
    expect(b['fct']).toBe(0.5);
    expect(b['p_element_all']).toBe(10);
  });

  it('adds the set -0.5s on top of the +11 refine one', () => {
    expect(bonus({ boot: 470458, bootRefine: 11, bootCard: 4352 })['fct']).toBe(1);
  });

  // "Conjunto / Carta Espadachim Anônima" (300266)
  it('with Carta Espadachim Anônima: +10%% physical against all races', () => {
    expect(bonus({ boot: 470458, bootCard: 300266 })['p_race_all']).toBe(10);
  });

  it('fires no set bonus without a card', () => {
    const b = bonus({ boot: 470458 });
    expect(b['p_element_all'] ?? 0).toBe(0);
    expect(b['p_race_all'] ?? 0).toBe(0);
  });
});

describe('470459 Sapato Quimera', () => {
  it('grants SPL and WIS +5 and after-cast -3%% with no refine requirement', () => {
    const b = bonus({ boot: 470459 });
    expect(b['spl']).toBe(5);
    expect(b['wis']).toBe(5);
    expect(b['acd']).toBe(3);
  });

  it('adds MATK +7 per 3 refines', () => {
    expect(bonus({ boot: 470459, bootRefine: 9 })['matk']).toBe(21);
  });

  it('libera os degraus +7, +9 e +11', () => {
    const r7 = bonus({ boot: 470459, bootRefine: 7 });
    expect(r7['sMatk']).toBe(3);
    expect(r7['matkPercent']).toBe(5);

    expect(bonus({ boot: 470459, bootRefine: 9 })['vct']).toBe(10);

    const r11 = bonus({ boot: 470459, bootRefine: 11 });
    expect(r11['m_size_s']).toBe(15);
    expect(r11['m_size_m']).toBe(15);
    // A descrição limita o bônus a Pequeno e Médio.
    expect(r11['m_size_l'] ?? 0).toBe(0);
  });

  it('unlocks grades D, C, B and A', () => {
    const d = bonus({ boot: 470459, bootGrade: 'D' });
    expect(d['spl']).toBe(5 + 5);
    expect(d['matkPercent']).toBe(5);

    expect(bonus({ boot: 470459, bootGrade: 'C' })['fct']).toBe(1);
    expect(bonus({ boot: 470459, bootGrade: 'B' })['sMatk']).toBe(7);

    // Grade A: "A cada 2 refinos: FEI +8" — stacks on the base +5 and the grade-D +5.
    expect(bonus({ boot: 470459, bootGrade: 'A', bootRefine: 10 })['spl']).toBe(5 + 5 + 40);
  });

  // "Conjunto / [Carta Quimera Única]" (300262). "Maldito" is what the LATAM client calls
  // the Undead element (same mapping as Diadema Radiante 410183).
  it('with Carta Quimera Única: +15%% magic damage against the Maldito element', () => {
    expect(bonus({ boot: 470459, bootCard: 300262 })['m_element_undead']).toBe(15);
  });

  it('does not fire the set without the card', () => {
    expect(bonus({ boot: 470459 })['m_element_undead'] ?? 0).toBe(0);
  });
});

describe('Wolf amulets', () => {
  describe('491084 Amuleto de Lobo Físico', () => {
    it('grants the fixed bonuses from the description', () => {
      const b = bonus({ accRight: 491084 });
      expect(b['cri']).toBe(5);
      expect(b['perfectHit']).toBe(BASE_PERFECT_HIT + 10);
      expect(b['aspd']).toBe(1);
      expect(b['range']).toBe(5);
      expect(b['melee']).toBe(5);
    });

    // "Conjunto / Anel do Lobo Cinzento ou Pingente do Lobo Cinzento"
    it.each([
      ['Anel do Lobo Cinzento', 490107],
      ['Pingente do Lobo Cinzento', 490106],
    ])('unlocks after-cast -5%% with %s', (_name, partner) => {
      expect(bonus({ accRight: 491084, accLeft: partner })['acd']).toBe(5);
    });

    it('does not unlock the set with an outside accessory', () => {
      expect(bonus({ accRight: 491084, accLeft: 490108 })['acd'] ?? 0).toBe(0);
    });
  });

  describe('491085 Amuleto de Lobo Mágico', () => {
    it('grants the fixed bonuses from the description', () => {
      const b = bonus({ accRight: 491085 });
      expect(b['vct']).toBe(5);
      expect(b['aspd']).toBe(1);
      expect(b['m_my_element_all']).toBe(5);
    });

    // "Conjunto / Colar do Lobo Cinzento ou Brincos do Lobo Cinzento"
    it.each([
      ['Colar do Lobo Cinzento', 490109],
      ['Brincos do Lobo Cinzento', 490108],
    ])('unlocks after-cast -5%% with %s', (_name, partner) => {
      expect(bonus({ accRight: 491085, accLeft: partner })['acd']).toBe(5);
    });

    it('does not unlock the set with an outside accessory', () => {
      expect(bonus({ accRight: 491085, accLeft: 490107 })['acd'] ?? 0).toBe(0);
    });
  });
});

describe('Corrections the client description pointed out', () => {
  // 300189: "Se a arma for um livro, dano ... +20% adicional. Se o refino for +14 ou
  // superior, dano ... +30% adicional." — both clauses sit on the SAME line, so the
  // refine step inherits the book condition. Before, the +30% applied on any weapon.
  describe('300189 Carta Ju da Arena', () => {
    const BOLTS = ['14', '19', '20'] as const;

    it('grants the bolts +15%% on any weapon', () => {
      const b = bonus({ weapon: ESPADA_1H, weaponCard: 300189 });
      for (const skill of BOLTS) expect(b[skill]).toBe(15);
    });

    it('adds +20%% when the weapon is a book', () => {
      const b = bonus({ weapon: LIVRO, weaponCard: 300189 });
      for (const skill of BOLTS) expect(b[skill]).toBe(35);
    });

    it('adds +30%% on a book refined to +14', () => {
      const b = bonus({ weapon: LIVRO, weaponCard: 300189, weaponRefine: 14 });
      for (const skill of BOLTS) expect(b[skill]).toBe(65);
    });

    it('does NOT grant the +30%% on a +14 that is not a book', () => {
      const b = bonus({ weapon: ESPADA_1H, weaponCard: 300189, weaponRefine: 14 });
      for (const skill of BOLTS) expect(b[skill]).toBe(15);
    });
  });

  // 480065-480068: "A cada 2 refinos, MHP + 1%". It was encoded as per refine, which
  // doubled the HP percentage — a +15 gave 15% instead of 7%.
  describe.each([
    ['480065 Manto Barreira Mágica', 480065],
    ['480066 Cachecol Barreira Mágica', 480066],
    ['480067 Manto Ravage Mágico', 480067],
    ['480068 Cachecol Ravage Mágico', 480068],
  ])('%s', (_name, id) => {
    it('raises MHP by 1%% per 2 refines, not per 1', () => {
      expect(bonus({ garment: id, garmentRefine: 0 })['hpPercent'] ?? 0).toBe(0);
      expect(bonus({ garment: id, garmentRefine: 2 })['hpPercent']).toBe(1);
      expect(bonus({ garment: id, garmentRefine: 9 })['hpPercent']).toBe(4);
      expect(bonus({ garment: id, garmentRefine: 15 })['hpPercent']).toBe(7);
    });
  });
});
