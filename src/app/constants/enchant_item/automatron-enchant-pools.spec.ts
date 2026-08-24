import { describe, expect, it } from 'vitest';
import itemDb from '../../../assets/demo/data/item.json';
import latamDb from '../../../assets/demo/data/latam-items.json';
import { getEnchants } from './_enchant_table';

/**
 * Automódulos — the enchant pool of every Automatron piece, held against the Automódulo
 * table on browiki's Equipamentos Automatron page, column by column.
 *
 * Each piece takes 3 automódulos and every socket offers that piece's whole column (the
 * "x1/x2/x3" repeat cap on the wiki is a rule of the NPC, not of the list). The two
 * shields were the first gap found here — they had no row at all, so their sockets
 * offered nothing; F-Eternidade on the Perna and H-Maré on the Colete were the next two,
 * both reported from the game.
 *
 * @see https://browiki.org/wiki/Equipamentos_Automatron
 */

const items = itemDb as Record<string, any>;
const latam = latamDb as Record<string, { name?: string }>;

/** The 51 class modules of the H- table, in the order the wiki lists them. */
const H_MODULES = [
  'H-Dragão', 'H-Rúnico', 'H-Lança', // Cavaleiros Rúnicos
  'H-Escudo', 'H-Hoplita', 'H-Domini', // Guardiões Reais
  'H-Canhão', 'H-Robô', 'H-Machado', // Mecânicos
  'H-Carrinho', 'H-Planta', 'H-Química', // Bioquímicos
  'H-Lâminas', 'H-Loki', 'H-Duelista', // Sicários
  'H-Ofensiva', 'H-Desejo', 'H-Triplo', // Renegados
  'H-Místico', 'H-Arcanista', 'H-Neutral', // Arcanos
  'H-Elemental', 'H-Psíquico', 'H-Feitiço', // Feiticeiros
  'H-Exorcismo', 'H-Sagrado', 'H-Santo', // Arcebispos
  'H-Lutador', 'H-Corporal', 'H-Combo', // Shuras
  'H-Bomba', 'H-Atirador', 'H-Flecha', // Sentinelas
  'H-Canção', 'H-Musical', 'H-Temporal', // Musas e Trovadores
  'H-Solar', 'H-Lunar', 'H-Estelar', // Mestres Estelares
  'H-Almas', 'H-Espírito', 'H-Necro', // Ceifadores de Almas
  'H-Revólver', 'H-Granada', 'H-Espingarda', // Insurgentes
  'H-Ninpou', 'H-Taijutsu', 'H-Mahou', // Kagerou e Oboro
  'H-Maré', 'H-Selva', 'H-Fauna', // Invocadores
];

/**
 * One entry per column of the table: the pieces that share it, and the modules that
 * column takes minus the ten the calculator cannot model (listed in NOT_MODELLED).
 */
const COLUMNS: [string, string[], string[]][] = [
  [
    'Colete',
    ['Auto_Armor_A', 'Auto_Armor_B'],
    // P-Espelho is the Colete's own omission.
    ['B-DEF', 'B-DEFM', 'M-ATQ', 'M-ATQM', 'M-Tiro', 'P-Mágico', 'P-Bárbaro', 'P-Artilheiro',
      'P-Crítico', 'P-Curandeiro', 'P-Pós', 'P-Híbrido', ...H_MODULES],
  ],
  [
    'Motor',
    ['Auto_Engine_A', 'Auto_Engine_B'],
    ['B-DEF', 'B-DEFM', 'M-Rapidez', 'M-Magia', 'M-CRIT', 'P-Dano'],
  ],
  [
    'Perna',
    ['Auto_Leg_A', 'Auto_Leg_B'],
    ['B-DEF', 'B-DEFM', 'M-HPMax', 'M-SPMax', 'P-Fixa', 'P-Robusto',
      'F-Superpoder', 'F-Lampejo', 'F-Eternidade', 'F-Sortilégio', 'F-Astúcia', 'F-Fortuna'],
  ],
  [
    'Acessório direito',
    ['Auto_B_R', 'Auto_BC_R'],
    ['B-FOR', 'B-AGI', 'B-VIT', 'B-SOR', 'M-Encanto', 'M-Atraso', 'M-Fatal', 'M-Mira', 'P-Geral'],
  ],
  [
    'Acessório esquerdo',
    ['Auto_B_L', 'Auto_BC_L'],
    ['B-VIT', 'B-INT', 'B-DES', 'B-SOR', 'M-Encanto', 'M-Atraso', 'M-Fatal', 'M-Mira', 'P-Geral'],
  ],
  [
    'Escudo',
    ['Auto_Shield_A_LT', 'Auto_Shield_B_LT'],
    ['B-DEF', 'B-DEFM', 'M-HPMax', 'M-SPMax', 'M-Rapidez', 'P-Robusto', 'P-Dano'],
  ],
];

/**
 * The ten modules the table lists that no column here offers. Every one of them is a
 * defensive or utility effect the damage engine has no key for, and none is in item.json.
 * If a key is ever added for one, it belongs in every column the wiki gives it.
 */
const NOT_MODELLED: [string, number, string][] = [
  ['M-HPR', 310090, 'Regen. natural de HP +30%'],
  ['M-SPR', 310091, 'Regen. natural de SP +30%'],
  ['M-Cura', 310098, 'Efetividade de cura'],
  ['P-Total', 310112, 'Resistência a Normais e Chefes'],
  ['P-Vida', 310113, 'converter 3% do dano físico causado em HP'],
  ['P-Alma', 310114, 'converter 2% do dano físico causado em SP'],
  ['P-Mental', 310115, 'Cura Mágica'],
  ['P-Mana', 310116, 'Cura Espiritual'],
  ['P-Espelho', 310178, 'Resistência a danos refletidos'],
  ['P-Refletor', 310179, 'Resistência a danos refletidos'],
];

/** aegisName -> the pt-BR name shown in the dropdown, so failures read like the wiki. */
const NAME_BY_AEGIS = new Map<string, string>(
  Object.entries(items)
    .filter(([, item]) => /^Automatic_Orb\d+$/.test(String(item.aegisName)))
    .map(([id, item]) => [item.aegisName as string, latam[id]?.name ?? item.name]),
);

const optionNames = (aegisNames: string[]) =>
  aegisNames.map((a) => NAME_BY_AEGIS.get(a) ?? `<${a} missing from item.json>`);

describe.each(COLUMNS)('%s', (_column, aegisNames, expected) => {
  describe.each(aegisNames)('%s', (aegisName) => {
    // enchants is [_, slot2, slot3, slot4] — game socket numbering, descending.
    const [, ...sockets] = getEnchants(aegisName) || [];

    it('offers the three sockets the NPC can fill', () => {
      expect(sockets).toHaveLength(3);
      for (const socket of sockets) expect(socket?.length).toBeGreaterThan(0);
    });

    it.each([0, 1, 2])('socket %i takes the whole column and nothing else', (index) => {
      expect(optionNames(sockets[index] as string[]).sort()).toEqual([...expected].sort());
    });
  });
});

describe('automódulos the game gives but the calculator cannot model', () => {
  it.each(NOT_MODELLED)('%s (%i) is absent from item.json — "%s"', (name, id, effect) => {
    expect(latam[id]?.name).toBe(name);
    expect(latam[id]?.description).toContain(effect);
    expect(items[id]).toBeUndefined();
  });

  it('is offered by no column, so the omission stays consistent', () => {
    const offered = new Set(COLUMNS.flatMap(([, aegisNames]) =>
      aegisNames.flatMap((a) => optionNames((getEnchants(a) as string[][]).slice(1).flat()))));

    for (const [name] of NOT_MODELLED) expect(offered.has(name)).toBe(false);
  });
});
