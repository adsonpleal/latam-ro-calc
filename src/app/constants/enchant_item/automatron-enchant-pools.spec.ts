import { describe, expect, it } from 'vitest';
import itemDb from '../../../assets/demo/data/item.json';
import latamDb from '../../../assets/demo/data/latam-items.json';
import { getEnchants } from './_enchant_table';

/**
 * Automódulos — the enchant pool of every Automatron piece, held against the Automódulo
 * table on browiki's Equipamentos Automatron page, column by column.
 *
 * Each piece takes 3 automódulos and every socket offers that piece's whole column, in
 * full. Every one of them now scores: the eight that used to carry an empty script were
 * the regeneration, drain and reflected-damage effects, and they got keys of their own
 * when the sustain family was added (healing-stats.spec.ts). (The "x1/x2/x3" repeat cap
 * on the wiki is a rule of the NPC, not of the list.) The two shields were the first gap
 * found here — they had no row at all, so their sockets offered nothing; F-Eternidade on
 * the Perna and H-Maré on the Colete were the next two, both reported from the game.
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
    ['B-DEF', 'B-DEFM', 'M-ATQ', 'M-ATQM', 'M-Tiro', 'P-Mágico', 'P-Bárbaro', 'P-Artilheiro',
      'P-Crítico', 'P-Curandeiro', 'P-Pós', 'P-Híbrido', 'P-Espelho', ...H_MODULES],
  ],
  [
    'Motor',
    ['Auto_Engine_A', 'Auto_Engine_B'],
    ['B-DEF', 'B-DEFM', 'M-Rapidez', 'M-Magia', 'M-CRIT', 'P-Total', 'P-Dano', 'P-Refletor'],
  ],
  [
    'Perna',
    ['Auto_Leg_A', 'Auto_Leg_B'],
    ['B-DEF', 'B-DEFM', 'M-HPMax', 'M-SPMax', 'M-Cura', 'P-Fixa', 'P-Robusto',
      'F-Superpoder', 'F-Lampejo', 'F-Eternidade', 'F-Sortilégio', 'F-Astúcia', 'F-Fortuna'],
  ],
  [
    'Acessório direito',
    ['Auto_B_R', 'Auto_BC_R'],
    ['B-FOR', 'B-AGI', 'B-VIT', 'B-SOR', 'M-HPR', 'M-Encanto', 'M-Atraso', 'M-Fatal', 'M-Mira',
      'P-Vida', 'P-Mental', 'P-Geral'],
  ],
  [
    'Acessório esquerdo',
    ['Auto_B_L', 'Auto_BC_L'],
    ['B-VIT', 'B-INT', 'B-DES', 'B-SOR', 'M-SPR', 'M-Encanto', 'M-Atraso', 'M-Fatal', 'M-Mira',
      'P-Alma', 'P-Mana', 'P-Geral'],
  ],
  [
    'Escudo',
    ['Auto_Shield_A_LT', 'Auto_Shield_B_LT'],
    ['B-DEF', 'B-DEFM', 'M-HPMax', 'M-SPMax', 'M-Cura', 'M-Rapidez', 'P-Robusto', 'P-Dano', 'P-Refletor'],
  ],
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

describe('every automódulo scores something', () => {
  it('no Automatron module is left with an empty script', () => {
    // The list this replaced held nine modules the engine could not measure, then eight
    // (P-Total went when the PVP section gave it a defender side, M-Cura when healPower
    // arrived), and is now empty: the last of them — regeneration, drain, [Cura Mágica]
    // and reflected damage — are display-only keys, but they are keys. If a future module
    // arrives with no key, this fails and the decision gets made deliberately.
    const empty = Object.values(items)
      .filter((i: any) => /^Automatic_Orb\d+$/.test(String(i.aegisName)))
      .filter((i: any) => Object.keys(i.script ?? {}).length === 0)
      .map((i: any) => `${latam[i.id]?.name ?? i.name} (${i.id})`);

    expect(empty).toEqual([]);
  });
});
