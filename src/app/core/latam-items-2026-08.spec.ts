import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * Itens que entraram (ou passaram a existir no cliente LATAM) na atualização de
 * agosto/2026 do GRF.
 *
 * Duas frentes, e as duas valem teste:
 *
 *  - **Sete cadastros novos** — 300172, 300176, 460181, 470458, 470459, 491084 e
 *    491085, que o cliente passou a trazer e o item.json não tinha.
 *  - **Cinco correções** — ids que já estavam cadastrados e só agora ganharam a
 *    descrição pt-BR do cliente. Confrontar script contra descrição pegou a Carta
 *    Ju (300189), cujo degrau de refino não estava preso à condição de livro, e as
 *    quatro capas Barreira/Ravage (480065-480068), que somavam MHP a cada refino
 *    em vez de a cada 2.
 *
 * Cada bônus abaixo é a linha da descrição pt-BR, que é a fonte da verdade.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

/** Um item do db com o tipo/subtipo que o slot do modelo espera. */
const comSlot = (id: number, itemTypeId: number, itemSubTypeId: number) => ({
  ...db[id],
  itemTypeId,
  itemSubTypeId,
});

/**
 * Monta o cálculo com os itens pedidos e devolve o bônus somado do equipamento.
 * Só recebe o que cada teste precisa; o resto do boneco fica vazio.
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

// Armas usadas só como portadoras de carta / condição de classe de arma.
const ESPADA_2H = 1160; // Espada Larga — twohandSword
const MACHADO_2H = 1371; // Machado do Apocalipse — twohandAxe
const ESPADA_1H = 1123; // Haedonggum — sword
const LIVRO = 1551; // Bíblia — book

/** `totalEquipStatus` já parte de DEFAULT_PERFECT_HIT; o item soma em cima. */
const BASE_PERFECT_HIT = 5;

describe('Cartas novas', () => {
  describe('300172 Carta Sugador de Cérebro', () => {
    it('tira 15% do HP máximo — "MHP - 15%"', () => {
      expect(bonus({ weapon: ESPADA_1H, weaponCard: 300172 })['hpPercent']).toBe(-15);
    });

    it('não traz nada além disso (dreno de SP e absorção de vida não são modelados)', () => {
      expect(Object.keys(db[300172].script)).toEqual(['hpPercent']);
    });
  });

  describe('300176 Carta Forma de Vida Não Identificada', () => {
    // "Se a arma equipada for Espada de Duas Mãos ou Machado de Duas Mãos, dano
    //  físico corpo a corpo +10%, Velocidade de ataque + 1."
    it.each([
      ['Espada de Duas Mãos', ESPADA_2H],
      ['Machado de Duas Mãos', MACHADO_2H],
    ])('dá +10%% corpo a corpo e +1 de ASPD com %s', (_classe, arma) => {
      const b = bonus({ weapon: arma, weaponCard: 300176 });
      expect(b['melee']).toBe(10);
      expect(b['aspd']).toBe(1);
    });

    it('não dá nada disso numa arma de outra classe', () => {
      const b = bonus({ weapon: ESPADA_1H, weaponCard: 300176 });
      expect(b['melee'] ?? 0).toBe(0);
      expect(b['aspd'] ?? 0).toBe(0);
    });

    // "A cada 2 refinos, dano físico corpo a corpo +1% adicional." — linha própria
    // na descrição, sem repetir a condição de arma, então vale sempre (mesma
    // leitura já usada na Carta Verme Tumular 300171).
    it('soma +1%% corpo a corpo a cada 2 refinos', () => {
      expect(bonus({ weapon: ESPADA_2H, weaponCard: 300176, weaponRefine: 10 })['melee']).toBe(10 + 5);
    });

    it('mantém o degrau de refino fora da arma de outra classe', () => {
      expect(bonus({ weapon: ESPADA_1H, weaponCard: 300176, weaponRefine: 10 })['melee']).toBe(5);
    });
  });
});

describe('460181 Protetor Pænitentia', () => {
  it('dá +5%% físico e mágico contra todos os tamanhos', () => {
    const b = bonus({ headMiddle: 460181 });
    expect(b['p_size_all']).toBe(5);
    expect(b['m_size_all']).toBe(5);
  });

  // "Conjunto / Qualquer Arma Pænitentia / Pós-conjuração -10%."
  it.each([
    ['Pænitentia Gladius', 500019],
    ['Pænitentia Codex', 540014],
    ['Pænitentia Ruina', 840006],
  ])('libera o ACD -10%% com a %s', (_nome, arma) => {
    expect(bonus({ headMiddle: 460181, weapon: arma })['acd']).toBe(10);
  });

  it('não libera o ACD com uma arma fora da família', () => {
    expect(bonus({ headMiddle: 460181, weapon: ESPADA_1H })['acd'] ?? 0).toBe(0);
  });

  it('não libera o ACD com o escudo Pænitentia Aegis — o conjunto pede uma ARMA', () => {
    expect(bonus({ headMiddle: 460181, shield: 460013 })['acd'] ?? 0).toBe(0);
  });

  it('não dá ACD nenhum sozinho', () => {
    expect(bonus({ headMiddle: 460181 })['acd'] ?? 0).toBe(0);
  });
});

describe('470458 Botas da Fonte', () => {
  it('sobe 1%% de HP e SP máximos a cada 2 refinos', () => {
    const b = bonus({ boot: 470458, bootRefine: 11 });
    expect(b['hpPercent']).toBe(5);
    expect(b['spPercent']).toBe(5);
  });

  it('libera os degraus de refino +7, +9 e +11', () => {
    const semRefino = bonus({ boot: 470458, bootRefine: 0 });
    expect(semRefino['atkPercent'] ?? 0).toBe(0);
    expect(semRefino['cri'] ?? 0).toBe(0);

    expect(bonus({ boot: 470458, bootRefine: 7 })['atkPercent']).toBe(7);

    const r9 = bonus({ boot: 470458, bootRefine: 9 });
    expect(r9['cri']).toBe(5);
    // O total já parte de DEFAULT_PERFECT_HIT (5), então os +10 do item viram 15.
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
  it('com a Carta Espadachim Egnigem: -0,5s de conjuração fixa e +10%% contra todas as propriedades', () => {
    const b = bonus({ boot: 470458, bootCard: 4352 });
    expect(b['fct']).toBe(0.5);
    expect(b['p_element_all']).toBe(10);
  });

  it('soma o -0,5s do conjunto ao do refino +11', () => {
    expect(bonus({ boot: 470458, bootRefine: 11, bootCard: 4352 })['fct']).toBe(1);
  });

  // "Conjunto / Carta Espadachim Anônima" (300266)
  it('com a Carta Espadachim Anônima: +10%% físico contra todas as raças', () => {
    expect(bonus({ boot: 470458, bootCard: 300266 })['p_race_all']).toBe(10);
  });

  it('não dispara conjunto nenhum sem carta', () => {
    const b = bonus({ boot: 470458 });
    expect(b['p_element_all'] ?? 0).toBe(0);
    expect(b['p_race_all'] ?? 0).toBe(0);
  });
});

describe('470459 Sapato Quimera', () => {
  it('dá FEI e SAB +5 e pós-conjuração -3%% sem depender de refino', () => {
    const b = bonus({ boot: 470459 });
    expect(b['spl']).toBe(5);
    expect(b['wis']).toBe(5);
    expect(b['acd']).toBe(3);
  });

  it('soma ATQM +7 a cada 3 refinos', () => {
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

  it('libera os graus D, C, B e A', () => {
    const d = bonus({ boot: 470459, bootGrade: 'D' });
    expect(d['spl']).toBe(5 + 5);
    expect(d['matkPercent']).toBe(5);

    expect(bonus({ boot: 470459, bootGrade: 'C' })['fct']).toBe(1);
    expect(bonus({ boot: 470459, bootGrade: 'B' })['sMatk']).toBe(7);

    // Grau A: "A cada 2 refinos: FEI +8" — soma sobre os +5 base e +5 do grau D.
    expect(bonus({ boot: 470459, bootGrade: 'A', bootRefine: 10 })['spl']).toBe(5 + 5 + 40);
  });

  // "Conjunto / [Carta Quimera Única]" (300262). "Maldito" é como o cliente LATAM
  // chama a propriedade Morto-Vivo (mesmo mapeamento do Diadema Radiante 410183).
  it('com a Carta Quimera Única: +15%% de dano mágico contra a propriedade Maldito', () => {
    expect(bonus({ boot: 470459, bootCard: 300262 })['m_element_undead']).toBe(15);
  });

  it('não dispara o conjunto sem a carta', () => {
    expect(bonus({ boot: 470459 })['m_element_undead'] ?? 0).toBe(0);
  });
});

describe('Amuletos de Lobo', () => {
  describe('491084 Amuleto de Lobo Físico', () => {
    it('dá os bônus fixos da descrição', () => {
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
    ])('libera o pós-conjuração -5%% com o %s', (_nome, parceiro) => {
      expect(bonus({ accRight: 491084, accLeft: parceiro })['acd']).toBe(5);
    });

    it('não libera o conjunto com um acessório de fora', () => {
      expect(bonus({ accRight: 491084, accLeft: 490108 })['acd'] ?? 0).toBe(0);
    });
  });

  describe('491085 Amuleto de Lobo Mágico', () => {
    it('dá os bônus fixos da descrição', () => {
      const b = bonus({ accRight: 491085 });
      expect(b['vct']).toBe(5);
      expect(b['aspd']).toBe(1);
      expect(b['m_my_element_all']).toBe(5);
    });

    // "Conjunto / Colar do Lobo Cinzento ou Brincos do Lobo Cinzento"
    it.each([
      ['Colar do Lobo Cinzento', 490109],
      ['Brincos do Lobo Cinzento', 490108],
    ])('libera o pós-conjuração -5%% com o %s', (_nome, parceiro) => {
      expect(bonus({ accRight: 491085, accLeft: parceiro })['acd']).toBe(5);
    });

    it('não libera o conjunto com um acessório de fora', () => {
      expect(bonus({ accRight: 491085, accLeft: 490107 })['acd'] ?? 0).toBe(0);
    });
  });
});

describe('Correções apontadas pela descrição do cliente', () => {
  // 300189: "Se a arma for um livro, dano ... +20% adicional. Se o refino for +14
  // ou superior, dano ... +30% adicional." — as duas orações estão na MESMA linha,
  // então o degrau de refino herda a condição de livro. Antes o +30% valia em
  // qualquer arma.
  describe('300189 Carta Ju da Arena', () => {
    const BOLTS = ['14', '19', '20'] as const;

    it('dá +15%% aos bolts em qualquer arma', () => {
      const b = bonus({ weapon: ESPADA_1H, weaponCard: 300189 });
      for (const skill of BOLTS) expect(b[skill]).toBe(15);
    });

    it('soma +20%% quando a arma é um livro', () => {
      const b = bonus({ weapon: LIVRO, weaponCard: 300189 });
      for (const skill of BOLTS) expect(b[skill]).toBe(35);
    });

    it('soma +30%% no livro refinado a +14', () => {
      const b = bonus({ weapon: LIVRO, weaponCard: 300189, weaponRefine: 14 });
      for (const skill of BOLTS) expect(b[skill]).toBe(65);
    });

    it('NÃO dá o +30%% num +14 que não é livro', () => {
      const b = bonus({ weapon: ESPADA_1H, weaponCard: 300189, weaponRefine: 14 });
      for (const skill of BOLTS) expect(b[skill]).toBe(15);
    });
  });

  // 480065-480068: "A cada 2 refinos, MHP + 1%". Estava como "a cada refino", o
  // que dobrava o HP percentual — num +15 dava 15% em vez de 7%.
  describe.each([
    ['480065 Manto Barreira Mágica', 480065],
    ['480066 Cachecol Barreira Mágica', 480066],
    ['480067 Manto Ravage Mágico', 480067],
    ['480068 Cachecol Ravage Mágico', 480068],
  ])('%s', (_nome, id) => {
    it('sobe 1%% de MHP a cada 2 refinos, não a cada 1', () => {
      expect(bonus({ garment: id, garmentRefine: 0 })['hpPercent'] ?? 0).toBe(0);
      expect(bonus({ garment: id, garmentRefine: 2 })['hpPercent']).toBe(1);
      expect(bonus({ garment: id, garmentRefine: 9 })['hpPercent']).toBe(4);
      expect(bonus({ garment: id, garmentRefine: 15 })['hpPercent']).toBe(7);
    });
  });
});
