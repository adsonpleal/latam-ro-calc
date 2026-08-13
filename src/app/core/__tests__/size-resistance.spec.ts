import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Size resistance — the `subsize_all/s/m/l` keys.
 *
 * Reported by Luís: in the "Redução de dano" popover the SIZE row only showed the 20%
 * Medium from Carta Yeti de Cristal; "Resistência a todos os tamanhos" never appeared.
 * His hunch (that the items were missing their defensive scripts) was right: of the ~65
 * pt-BR descriptions granting size resistance, only Carta Yeti had `subsize_*` in its
 * `script`. The engine and the popover already read the keys — the data was missing.
 *
 * The pt-BR description is the source of truth (CLAUDE.md). The Einbech Mine weapon set
 * ([Medalha Rubra|Azul] + [Dragona Rubra|Azul]) is declared on the medal side, where the
 * same set's `fct`/`acd` already lived.
 *
 * Resistance that is **physical only** or **magical only** has its own pair —
 * `subsize_<size>_physical` / `_magical`, summed into the same size category only when
 * the hit is of the matching type (docs/pvp.md §4).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** Strip the client's ^RRGGBB colour codes. */
const plain = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** A size-resistance line, in any of the wordings the client uses. */
const SIZE_RESIST_LINE = /Resist[êe]ncia[^\n.]*[Tt]amanho/;

const MEDALHA_RUBRA = 32248;
const MEDALHA_AZUL = 32249;

/**
 * The Einbech Mine weapons. The only size line in their descriptions is the
 * [Medalha Rubra|Azul] + [Dragona Rubra|Azul] set bonus, which already lived on the medal
 * side (`fct`, `acd`). Registering it on all 18 weapons would double it.
 */
const EINBECH_WEAPONS = [
  1867, 2058, 13346, 16099, 18190, 21054, 26162, 26215, 28045,
  28140, 28635, 28771, 28772, 32026, 32110, 32303, 32352, 550006,
];

const hasSubsize = (script: any): boolean =>
  Object.keys(script || {}).some((key) => key.startsWith('subsize_') || key.includes('__subsize_'));

const SLOT_OF: Record<string, string> = {
  weapon: 'weapon',
  armor: 'armor',
  shield: 'shield',
  garment: 'garment',
  boot: 'boot',
  headUpper: 'headUpper',
  accLeft: 'accLeft',
  accRight: 'accRight',
  shadowWeapon: 'shadowWeapon',
  shadowArmor: 'shadowArmor',
  shadowShield: 'shadowShield',
  shadowPendant: 'shadowPendant',
};

interface Worn {
  /** Item id. */
  id: number;
  /** Slot key, e.g. `armor`, `shadowWeapon`. */
  slot: keyof typeof SLOT_OF;
  refine?: number;
  /** Card in the slot. */
  card?: number;
  /** Slot enchants (positions 1..3; the Orbe takes one of them). */
  enchants?: number[];
}

/** Equip `worn` and hand back the summed equipment bonus. */
function bonusOf(worn: Worn[], tweak: (model: any) => void = () => undefined): Record<string, number> {
  const db: Record<number, any> = {};
  const add = (id?: number) => {
    if (id !== undefined) db[id] = { ...items[id] };
  };
  for (const piece of worn) {
    add(piece.id);
    add(piece.card);
    for (const enchant of piece.enchants || []) add(enchant);
  }

  const model = createMainModel();
  model.level = 200;
  for (const piece of worn) {
    const slot = SLOT_OF[piece.slot];
    model[slot] = piece.id;
    model[`${slot}Refine`] = piece.refine ?? 0;
    if (piece.card !== undefined) model[`${slot}Card`] = piece.card;
    (piece.enchants || []).forEach((enchant, index) => {
      model[`${slot}Enchant${index + 1}`] = enchant;
    });
  }
  tweak(model);

  return equipStatusOf(makeCalculator(db), model);
}

/** Just the four size keys, with 0 in place of undefined. */
function sizeOf(worn: Worn[], tweak?: (model: any) => void) {
  const bonus = bonusOf(worn, tweak);
  return {
    all: bonus['subsize_all'] || 0,
    s: bonus['subsize_s'] || 0,
    m: bonus['subsize_m'] || 0,
    l: bonus['subsize_l'] || 0,
  };
}

const AUTOPECA_CARBURADOR = 15344;
const MANOPLA_SOMBRIA_INFINITO = 24386;
const ESCUDO_SOMBRIO_INFINITO = 24733;
const MALHA_SOMBRIA_PERFEITA = 24426;
const COLAR_SOMBRIO_INFINITO = 24151;
const CHAVE_MAXI = 28138;
const MEMORIA_DE_HOWARD = 29595;
const ORBE_LUPINO_TOTAL_3 = 310581;
const CARTA_YETI_CRISTAL = 27111;
const CARTA_TITA_CRISTAL = 27112;

describe('guard: every description granting size resistance has subsize_* in its script', () => {
  const declaresSizeResist = Object.keys(latam)
    .filter((id) => items[id])
    .filter((id) => SIZE_RESIST_LINE.test(plain(latam[id].description)));

  it('matches the whole family, not a handful of items', () => {
    expect(declaresSizeResist.length).toBeGreaterThan(50);
  });

  it('leaves no item without the key', () => {
    const missing = declaresSizeResist
      .filter((id) => !EINBECH_WEAPONS.includes(Number(id)))
      .filter((id) => !hasSubsize(items[id].script))
      .map((id) => `${id} ${latam[id].name}`);

    expect(missing).toEqual([]);
  });

  it('lets the Einbech weapons keep the set on the medal, with none repeating it', () => {
    const condition = items[MEDALHA_RUBRA].script.subsize_all[0];

    for (const id of EINBECH_WEAPONS) {
      const name = String(items[id].name).replace(/ \[\d+\]$/, '');
      expect(condition, `${id} ${name}`).toContain(name);
      expect(hasSubsize(items[id].script), `${id} ${name}`).toBe(false);
    }
    expect(items[MEDALHA_AZUL].script.subsize_all).toEqual([condition]);
  });
});

describe('the build Luís reported', () => {
  /** His pieces that grant size resistance, at the refines from the screenshot. */
  const BUILD: Worn[] = [
    { id: CHAVE_MAXI, slot: 'weapon', refine: 12, enchants: [MEMORIA_DE_HOWARD] },
    { id: AUTOPECA_CARBURADOR, slot: 'armor', refine: 9 },
    { id: MANOPLA_SOMBRIA_INFINITO, slot: 'shadowWeapon', refine: 10 },
    { id: ESCUDO_SOMBRIO_INFINITO, slot: 'shadowShield', refine: 10 },
    { id: MALHA_SOMBRIA_PERFEITA, slot: 'shadowArmor', refine: 9 },
    { id: COLAR_SOMBRIO_INFINITO, slot: 'shadowPendant', refine: 10 },
    { id: 20905, slot: 'garment', refine: 11, enchants: [ORBE_LUPINO_TOTAL_3] },
    { id: 2114, slot: 'shield', refine: 0, card: CARTA_YETI_CRISTAL },
  ];

  it('sums "all sizes" across every piece that grants it', () => {
    const size = sizeOf(BUILD);

    // Chave Maxi +12 with Memória de Howard: floor(12/3) x 5 = 20
    // Manopla Sombria do Infinito +10: floor(10/3) x 1 = 3
    // Escudo Sombrio do Infinito +10: floor(10/3) x 1 = 3
    // Malha Sombria Perfeita +9: 2 + 2 + 3 = 7
    // Colar Sombrio Infinito +10: 1 + 1 + 1 = 3
    // Orbe Lupino - Total 3 on the +11 garment: 7
    expect(size.all).toBe(20 + 3 + 3 + 7 + 3 + 7);
  });

  it('sums Medium from the per-size pieces: Chave Maxi, Autopeça +9 and Carta Yeti', () => {
    // Chave Maxi 10 + Autopeça - Carburador +9 (10 + 5) + Carta Yeti (without Titã: 0)
    expect(sizeOf(BUILD).m).toBe(10 + 15);
  });

  it('only counts Carta Yeti when Carta Titã de Cristal is worn too', () => {
    const withTita: Worn[] = [
      ...BUILD.filter((piece) => piece.slot !== 'armor'),
      { id: AUTOPECA_CARBURADOR, slot: 'armor', refine: 9, card: CARTA_TITA_CRISTAL },
    ];

    expect(sizeOf(withTita).m).toBe(10 + 15 + 20);
  });

  it('fills both rows of the "Redução de dano" popover', () => {
    // The popover lists "Todos os tamanhos" and "Médio" separately and only renders a
    // non-zero row, which is why the all-sizes one never showed. See reduction-breakdown.spec.
    const bonus = bonusOf(BUILD);

    expect(bonus['subsize_all']).toBeGreaterThan(0);
    expect(bonus['subsize_m']).toBeGreaterThan(0);
  });
});

describe('refine steps, per item', () => {
  it('15344 Autopeça - Carburador: S/M +10, Large +10 at +7, another S/M +5 at +9', () => {
    const at = (refine: number) => sizeOf([{ id: AUTOPECA_CARBURADOR, slot: 'armor', refine }]);

    expect(at(0)).toEqual({ all: 0, s: 10, m: 10, l: 0 });
    expect(at(6)).toEqual({ all: 0, s: 10, m: 10, l: 0 });
    expect(at(7)).toEqual({ all: 0, s: 10, m: 10, l: 10 });
    expect(at(9)).toEqual({ all: 0, s: 15, m: 15, l: 10 });
  });

  it('15111 Autopeça - Carburador (level 100 version) has the same steps', () => {
    const at = (refine: number) => sizeOf([{ id: 15111, slot: 'armor', refine }]);

    expect(at(0).m).toBe(10);
    expect(at(9)).toEqual({ all: 0, s: 15, m: 15, l: 10 });
  });

  it('24426 Malha Sombria Perfeita: 2, plus 2 at +7, plus 3 at +9', () => {
    const at = (refine: number) => sizeOf([{ id: MALHA_SOMBRIA_PERFEITA, slot: 'shadowArmor', refine }]).all;

    expect(at(0)).toBe(2);
    expect(at(7)).toBe(4);
    expect(at(9)).toBe(7);
  });

  it('24151 Colar Sombrio Infinito: 1, plus 1 at +7, plus 1 at +9', () => {
    const at = (refine: number) => sizeOf([{ id: COLAR_SOMBRIO_INFINITO, slot: 'shadowPendant', refine }]).all;

    expect(at(6)).toBe(1);
    expect(at(7)).toBe(2);
    expect(at(10)).toBe(3);
  });

  it('24386 and 24733 Sombrios do Infinito: +1% per 3 refines', () => {
    expect(sizeOf([{ id: MANOPLA_SOMBRIA_INFINITO, slot: 'shadowWeapon', refine: 10 }]).all).toBe(3);
    expect(sizeOf([{ id: ESCUDO_SOMBRIO_INFINITO, slot: 'shadowShield', refine: 9 }]).all).toBe(3);
  });

  it('24072/24073/24074 per-size Malhas Sombrias: 2, plus 1 at +7, plus 2 at +9', () => {
    const at = (id: number, refine: number) => sizeOf([{ id, slot: 'shadowArmor', refine }]);

    expect(at(24072, 9)).toEqual({ all: 0, s: 0, m: 0, l: 5 });
    expect(at(24073, 9)).toEqual({ all: 0, s: 0, m: 5, l: 0 });
    expect(at(24074, 7)).toEqual({ all: 0, s: 3, m: 0, l: 0 });
  });

  it('2160 Escudo Gigante: Large +5, and another 5 at +9', () => {
    const at = (refine: number) => sizeOf([{ id: 2160, slot: 'shield', refine }]).l;

    expect(at(8)).toBe(5);
    expect(at(9)).toBe(10);
  });

  it('28136 Blasti-OS: Medium and Large +10, plus 15 at +7', () => {
    const at = (refine: number) => sizeOf([{ id: 28136, slot: 'weapon', refine }]);

    expect(at(6)).toEqual({ all: 0, s: 0, m: 10, l: 10 });
    expect(at(7)).toEqual({ all: 0, s: 0, m: 25, l: 25 });
  });

  it('620018 Blasti-OSAD: Medium and Large +15, plus 15 at +7', () => {
    expect(sizeOf([{ id: 620018, slot: 'weapon', refine: 7 }])).toEqual({ all: 0, s: 0, m: 30, l: 30 });
  });

  it('700049 Arco Primordial-LT: all sizes +20 at +11', () => {
    expect(sizeOf([{ id: 700049, slot: 'weapon', refine: 10 }]).all).toBe(0);
    expect(sizeOf([{ id: 700049, slot: 'weapon', refine: 11 }]).all).toBe(20);
  });

  it('600024 Bastarda Primordial-LT: all sizes +15 at +9', () => {
    expect(sizeOf([{ id: 600024, slot: 'weapon', refine: 8 }]).all).toBe(0);
    expect(sizeOf([{ id: 600024, slot: 'weapon', refine: 9 }]).all).toBe(15);
  });

  it('28953 Escudo Encouraçado: +2% per 3 refines', () => {
    expect(sizeOf([{ id: 28953, slot: 'shield', refine: 10 }]).all).toBe(6);
  });
});

describe('items with no refine step', () => {
  it('1375 Bardiche Dentilhado: Medium +13, Large +15', () => {
    expect(sizeOf([{ id: 1375, slot: 'weapon' }])).toEqual({ all: 0, s: 0, m: 13, l: 15 });
  });

  it('1377 Fúria do Furacão: Medium +10 plus 1 per refine', () => {
    expect(sizeOf([{ id: 1377, slot: 'weapon', refine: 12 }]).m).toBe(10 + 12);
  });

  it('2122 Escudo de Platina: Medium and Large +15', () => {
    expect(sizeOf([{ id: 2122, slot: 'shield' }])).toEqual({ all: 0, s: 0, m: 15, l: 15 });
  });

  it('2114 Broquel de Pedra: Large +5', () => {
    expect(sizeOf([{ id: 2114, slot: 'shield' }]).l).toBe(5);
  });

  it('28138 Chave Maxi: Small and Medium +10', () => {
    expect(sizeOf([{ id: CHAVE_MAXI, slot: 'weapon', refine: 12 }])).toEqual({ all: 0, s: 10, m: 10, l: 0 });
  });

  it('28141 Lábris Real: Medium and Large +10', () => {
    expect(sizeOf([{ id: 28141, slot: 'weapon' }])).toEqual({ all: 0, s: 0, m: 10, l: 10 });
  });

  it('2049, 2057 and 15388 only unlock the resistance at the high step', () => {
    expect(sizeOf([{ id: 2049, slot: 'weapon', refine: 11 }]).all).toBe(20);
    expect(sizeOf([{ id: 2049, slot: 'weapon', refine: 10 }]).all).toBe(0);
    expect(sizeOf([{ id: 2057, slot: 'weapon', refine: 11 }]).all).toBe(25);
    expect(sizeOf([{ id: 15388, slot: 'armor', refine: 11 }])).toEqual({ all: 0, s: 0, m: 10, l: 10 });
  });

  it('2051 Bastão Ilusional: Small and Medium +15 at +9', () => {
    expect(sizeOf([{ id: 2051, slot: 'weapon', refine: 9 }])).toEqual({ all: 0, s: 15, m: 15, l: 0 });
  });
});

describe('cards', () => {
  // 15348 Armadura Goibne Ilusional: hosts the partner card without granting any size itself.
  const onShield = (card: number, partner?: number): Worn[] => [
    { id: 2114, slot: 'shield', card },
    ...(partner === undefined ? [] : ([{ id: 15348, slot: 'armor', card: partner }] as Worn[])),
  ];

  it('4207 Mysteltainn, 4250 Executor and 4254 Tirfing: +25 on their own size', () => {
    expect(sizeOf(onShield(4207)).s).toBe(25);
    expect(sizeOf(onShield(4250)).l).toBe(5 + 25); // + the Broquel's own 5
    expect(sizeOf(onShield(4254)).m).toBe(25);
  });

  it('4413 Hodremlin: all sizes +15', () => {
    expect(sizeOf(onShield(4413)).all).toBe(15);
  });

  it('27356 Gárgula Congelada: Medium and Large +25, Small -5', () => {
    const size = sizeOf(onShield(27356));

    expect(size.s).toBe(-5);
    expect(size.m).toBe(25);
  });

  it('4609 Cavaleira Khalitzburg: +25, plus 5 with Carta Cavaleiro Branco', () => {
    expect(sizeOf(onShield(4609)).m).toBe(25);
    expect(sizeOf(onShield(4609, 4608)).m).toBe(30);
  });

  it('27385 Khalitzburg Mutante: +25, plus 5 with Carta Cavaleiro Mutante', () => {
    expect(sizeOf(onShield(27385)).l).toBe(5 + 25);
    expect(sizeOf(onShield(27385, 27384)).l).toBe(5 + 30);
  });

  it('27119 Marechal Tartaruga: +25, plus 5 with Carta General Tartaruga', () => {
    expect(sizeOf(onShield(27119)).all).toBe(25);
    expect(sizeOf(onShield(27119, 4305)).all).toBe(30);
  });
});

describe('enchants', () => {
  it('310579/310580/310581 Orbe Lupino - Total: only unlock the size part at +9', () => {
    const at = (id: number, refine: number) =>
      bonusOf([{ id: 15344, slot: 'armor', refine, enchants: [id] }]);

    expect(at(310581, 8)['subsize_all'] || 0).toBe(0);
    expect(at(310581, 9)['subsize_all']).toBe(7);
    expect(at(310580, 9)['subsize_all']).toBe(5);
    expect(at(310579, 9)['subsize_all']).toBe(3);
  });

  it('310581 Orbe Lupino - Total 3 brings the whole defensive block', () => {
    const at = (refine: number) => bonusOf([{ id: 15344, slot: 'armor', refine, enchants: [310581] }]);

    expect(at(0)['subclass_all']).toBe(7);
    expect(at(6)['subele_all'] || 0).toBe(0);
    expect(at(7)['subele_all']).toBe(7);
    expect(at(10)['subrace_all'] || 0).toBe(0);
    expect(at(11)['subrace_all']).toBe(7);
  });

  it('29542 U-Total: elements, then sizes at +7 and races at +9', () => {
    const at = (refine: number) => bonusOf([{ id: 15344, slot: 'armor', refine, enchants: [29542] }]);

    expect(at(0)['subele_all']).toBe(5);
    expect(at(6)['subsize_all'] || 0).toBe(0);
    expect(at(7)['subsize_all']).toBe(5);
    expect(at(9)['subrace_all']).toBe(5);
  });

  it('29595 Memória de Howard: all sizes +5% per 3 refines of Chave Maxi', () => {
    const at = (refine: number) =>
      bonusOf([{ id: CHAVE_MAXI, slot: 'weapon', refine, enchants: [MEMORIA_DE_HOWARD] }])['subsize_all'] || 0;

    expect(at(2)).toBe(0);
    expect(at(3)).toBe(5);
    expect(at(12)).toBe(20);
  });

  it('29595 Memória de Howard grants nothing without Chave Maxi', () => {
    const at = bonusOf([{ id: 1377, slot: 'weapon', refine: 12, enchants: [MEMORIA_DE_HOWARD] }]);

    expect(at['subsize_all'] || 0).toBe(0);
  });

  it('400075 Tiara de Astrea: elements at +9, sizes at +10, classes at +11, races at +12', () => {
    const at = (refine: number) => bonusOf([{ id: 400075, slot: 'headUpper', refine }]);

    expect(at(9)['subele_all']).toBe(5);
    expect(at(9)['subsize_all'] || 0).toBe(0);
    expect(at(10)['subsize_all']).toBe(5);
    expect(at(11)['subclass_all']).toBe(5);
    expect(at(11)['subrace_all'] || 0).toBe(0);
    expect(at(12)['subrace_all']).toBe(5);
  });
});

describe('physical-only / magical-only resistance', () => {
  it('22167 Botas de Astrea: physical Medium +10, plus 5 at base VIT 120, only at +10', () => {
    const at = (refine: number, vit: number) =>
      bonusOf([{ id: 22167, slot: 'boot', refine }], (model) => (model.vit = vit));

    expect(at(9, 120)['subsize_m_physical'] || 0).toBe(0);
    expect(at(10, 99)['subsize_m_physical'] || 0).toBe(0);
    expect(at(10, 100)['subsize_m_physical']).toBe(10);
    expect(at(10, 120)['subsize_m_physical']).toBe(15);
    // and nothing on the key that covers both damage types
    expect(at(10, 120)['subsize_m'] || 0).toBe(0);
  });

  it('20905 Capa de Astrea: physical Medium +5 with the Botas + Armadura set', () => {
    const worn: Worn[] = [
      { id: 20905, slot: 'garment' },
      { id: 22167, slot: 'boot' },
      { id: 15367, slot: 'armor' },
    ];

    expect(bonusOf(worn)['subsize_m_physical']).toBe(5);
    expect(bonusOf(worn.slice(0, 2))['subsize_m_physical'] || 0).toBe(0);
  });

  it('300246 Carta Grote: magical Small +1 at +9, plus 2 at +11', () => {
    const at = (refine: number) =>
      bonusOf([{ id: 15344, slot: 'armor', refine, card: 300246 }])['subsize_s_magical'] || 0;

    expect(at(8)).toBe(0);
    expect(at(9)).toBe(1);
    expect(at(11)).toBe(3);
  });
});

describe('set combos', () => {
  it('the Einbech Mine set grants all sizes +3%', () => {
    // [Medalha Rubra] or [Medalha Azul] and [Dragona Rubra] or [Dragona Azul], with one of
    // the mine weapons. Declared on the medal side, where the set fct/acd already live.
    const worn: Worn[] = [
      { id: 32352, slot: 'weapon', refine: 11 }, // Sabre Iluminado
      { id: 32248, slot: 'accRight' }, // Medalha Rubra
      { id: 32250, slot: 'accLeft' }, // Dragona Rubra
    ];

    expect(sizeOf(worn).all).toBe(3);
  });

  it('grants nothing without the dragona', () => {
    const worn: Worn[] = [
      { id: 32352, slot: 'weapon', refine: 11 },
      { id: 32248, slot: 'accRight' },
    ];

    expect(sizeOf(worn).all).toBe(0);
  });

  it('grants nothing with medal and dragona but no mine weapon', () => {
    const worn: Worn[] = [
      { id: 1377, slot: 'weapon', refine: 11 },
      { id: 32248, slot: 'accRight' },
      { id: 32250, slot: 'accLeft' },
    ];

    expect(sizeOf(worn).all).toBe(0);
  });

  it('490166 Cordão do Draconiano: +10% with Bastarda Primordial-LT', () => {
    expect(sizeOf([{ id: 490166, slot: 'accRight' }]).all).toBe(0);
    expect(
      sizeOf([
        { id: 490166, slot: 'accRight' },
        { id: 600024, slot: 'weapon', refine: 0 },
      ]).all,
    ).toBe(10);
  });

  it('400022 Ignis-OS: Small +3% per 2 refines of Blasti-OS', () => {
    const at = (refine: number) =>
      sizeOf([
        { id: 400022, slot: 'headUpper', refine: 0 },
        { id: 28136, slot: 'weapon', refine },
      ]);

    expect(at(0).s).toBe(0);
    expect(at(9).s).toBe(12); // floor(9/2) x 3
  });

  it('32301 Brilho Ilusional: Small and Medium +20 with Faixa Ilusional summing 18 refines', () => {
    const worn = (weaponRefine: number, headRefine: number): Worn[] => [
      { id: 32301, slot: 'weapon', refine: weaponRefine },
      { id: 19344, slot: 'headUpper', refine: headRefine },
    ];

    expect(sizeOf(worn(9, 8)).m).toBe(0);
    expect(sizeOf(worn(9, 9)).m).toBe(20);
    expect(sizeOf(worn(9, 9)).s).toBe(20);
  });

  it('15393 Cota Dracônica Ouro: Medium and Large +1% per 30 base VIT, with the set', () => {
    const worn: Worn[] = [
      { id: 15393, slot: 'armor', refine: 0 },
      { id: 22208, slot: 'boot' },
      { id: 20946, slot: 'garment' },
    ];
    const at = (vit: number) => sizeOf(worn, (model) => (model.vit = vit));

    expect(at(90).m).toBe(3);
    expect(at(120).l).toBe(4);
    // Without the full set nothing comes out.
    expect(sizeOf([{ id: 15393, slot: 'armor' }], (model) => (model.vit = 120)).m).toBe(0);
  });
});
