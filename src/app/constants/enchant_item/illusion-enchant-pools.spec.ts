import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';
import { isEquipmentEnchant } from './equipment_enchants';

/**
 * Encantos Ilusión — the enchant pool of every Ilusión piece, held against the Módulo
 * table on browiki's Equipamentos Ilusión page, column by column. The comment above the
 * `illusion*` pools in `_enchant_table.ts` says why the Encanto column is the one that
 * belongs in those lists and the "Módulo de ..." items are not.
 *
 * The gaps this pins: the N- column (N-DEF, N-DEFM) reached none of the three armour
 * pieces, S-SPMax reached no Perna, S-HPR/S-SPR and U-Vida/U-Alma were missing from
 * item.json altogether, and U-Mental/U-Mana were offered by both accessories instead of
 * one each.
 *
 * Each "Módulo de ..." (25670-25705) also names its pieces in its own client description, and
 * for the six N- attribute modules the two sources disagree. `the client decides which
 * accessory takes a módulo` below holds the pools against the client text and says why that
 * is the source to follow.
 *
 * @see https://browiki.org/wiki/Equipamentos_Ilusi%C3%B3n
 */

type Item = { id: number; aegisName?: string; name: string; itemTypeId: number; script?: object };
const read = <T,>(file: string) => JSON.parse(readFileSync(`src/assets/demo/data/${file}`, 'utf8')) as T;
const items = read<Record<string, Item>>('item.json');
const latam = read<Record<string, { name?: string; description?: string }>>('latam-items.json');

/** Exactly how the app builds its enchant dropdowns: aegisName -> item, pt-BR label. */
const LABEL_BY_AEGIS = new Map<string, string>();
for (const [id, item] of Object.entries(items)) {
  if (!isEquipmentEnchant(item) || !item.aegisName) continue;
  if (!LABEL_BY_AEGIS.has(item.aegisName)) LABEL_BY_AEGIS.set(item.aegisName, latam[id]?.name ?? item.name);
}

const labels = (aegisNames: string[]) => aegisNames.map((a) => LABEL_BY_AEGIS.get(a) ?? `<${a} missing from item.json>`);

/** The four encantos both accessories share, as the client names them. */
const ACC_SHARED = ['Mira Apurada 5', 'Pedra de Encantamento 5', 'Anti-Atraso 4', 'Fatal 4'];

/** The N- column, which Colete, Motor and Perna all take. */
const N_DEF = ['N-DEF', 'N-DEFM'];

/** The six N- attribute encantos, which both accessories take. */
const N_STATS = ['FOR +3', 'AGI +3', 'VIT +3', 'INT +3', 'DES +3', 'SOR +3'];

/** One entry per column of the table: the pieces that share it and the encantos it takes. */
const COLUMNS: [string, string[], string[]][] = [
  [
    'Colete',
    ['Illusion_Armor_A', 'Illusion_Armor_B', 'E_Illusion_Armor_A'],
    [...N_DEF, 'S-ATQ', 'S-ATQM', 'S-Tiro', 'U-Pós'],
  ],
  [
    'Motor',
    ['Illusion_Engine_A', 'Illusion_Engine_B', 'E_Illusion_Engine_B'],
    [...N_DEF, 'S-Rapidez', 'S-Magia', 'S-CRIT', 'U-Total'],
  ],
  [
    'Perna',
    ['Illusion_Leg_A', 'Illusion_Leg_B', 'E_Illusion_Leg_A'],
    [...N_DEF, 'S-HPMax', 'S-SPMax', 'S-Cura', 'U-Fixa',
      'L-Superpoder', 'L-Lampejo', 'L-Eternidade', 'L-Sortilégio', 'L-Astúcia', 'L-Fortuna'],
  ],
  [
    'Acessório direito (Soquete A / Turbina A)',
    ['Illusion_B_R', 'Illusion_BC_R', 'E_Illusion_B_R'],
    [...ACC_SHARED, ...N_STATS, 'S-HPR', 'U-Vida', 'U-Mental'],
  ],
  [
    'Acessório esquerdo (Soquete B / Turbina B)',
    ['Illusion_B_L', 'Illusion_BC_L', 'E_Illusion_B_L'],
    [...ACC_SHARED, ...N_STATS, 'S-SPR', 'U-Alma', 'U-Mana'],
  ],
];

describe.each(COLUMNS)('%s', (_column, aegisNames, expected) => {
  const sorted = [...expected].sort();

  describe.each(aegisNames)('%s', (aegisName) => {
    // enchants is [_, slot2, slot3, slot4] — game socket numbering, descending.
    const [, ...sockets] = getEnchants(aegisName) || [];

    it('offers the three sockets the NPC can fill', () => {
      expect(sockets).toHaveLength(3);
    });

    it.each([0, 1, 2])('socket %i takes the whole column and nothing else', (index) => {
      expect(labels(sockets[index] as string[]).sort()).toEqual(sorted);
    });
  });
});

describe('the encanto Ilusión family', () => {
  /** The LATAM-only encantos of this family, by the ids the wiki's columns resolve to. */
  const FAMILY_IDS = [
    29527, 29528, // N-DEF, N-DEFM
    29529, 29530, 29531, 29532, 29533, 29534, 29535, 29536, 29537, 29538, 29539, // S-
    29540, 29541, 29542, 29543, 29544, 29545, 29546, // U-
    29547, 29548, 29549, 29550, 29551, 29552, // L-
  ];

  it('is in item.json', () => {
    expect(FAMILY_IDS.filter((id) => !items[String(id)])).toEqual([]);
  });

  it('leaves no encanto with an empty script', () => {
    // S-HPR/S-SPR, U-Vida/U-Alma and U-Mental/U-Mana are regeneration, drain and
    // [Cura Mágica] effects — display-only keys, but they are keys, so the sockets the
    // player filled still name a number. A future encanto with no key fails here and
    // gets the decision made deliberately rather than shipping inert.
    const empty = FAMILY_IDS
      .map((id) => items[String(id)])
      .filter((item) => item && Object.keys(item.script ?? {}).length === 0)
      .map((item) => `${latam[String(item.id)]?.name ?? item.name} (${item.id})`);

    expect(empty).toEqual([]);
  });
});

describe('the client decides which accessory takes a módulo', () => {
  /** The four pieces as a módulo's [Itens] block names them: A is the right side, B the left. */
  const PIECE_BY_CLIENT_NAME: Record<string, string> = {
    'Turbina Ilusión A': 'Illusion_B_R',
    'Soquete Ilusión A': 'Illusion_BC_R',
    'Turbina Ilusión B': 'Illusion_B_L',
    'Soquete Ilusión B': 'Illusion_BC_L',
  };

  /** Every módulo whose [Itens] block names an accessory, and the encanto it grants. */
  const ACCESSORY_MODULES: [number, string][] = [
    [25674, 'FOR +3'], [25675, 'AGI +3'], [25672, 'VIT +3'],
    [25676, 'INT +3'], [25677, 'DES +3'], [25673, 'SOR +3'],
    [25678, 'S-HPR'], [25679, 'S-SPR'],
    [25680, 'Pedra de Encantamento 5'], [25681, 'Anti-Atraso 4'],
    [25682, 'Fatal 4'], [25683, 'Mira Apurada 5'],
    [25696, 'U-Vida'], [25697, 'U-Alma'], [25698, 'U-Mental'], [25699, 'U-Mana'],
  ];

  /** The pieces a módulo's own client description names, as aegisNames. */
  const piecesOf = (id: number) => {
    // Client descriptions carry ^RRGGBB colour codes, which land inside the item names.
    const description = (latam[String(id)]?.description ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');
    const block = /\[Itens\]([\s\S]*?)(?:-{4,}|$)/.exec(description)?.[1] ?? '';
    return Object.entries(PIECE_BY_CLIENT_NAME)
      .filter(([piece]) => block.includes(piece))
      .map(([, aegisName]) => aegisName);
  };

  it.each(ACCESSORY_MODULES)('%d names the pieces its encanto is offered on', (id, encanto) => {
    const named = piecesOf(id);

    // A módulo whose [Itens] block stopped parsing would make the comparison vacuous.
    expect(named.length).toBeGreaterThan(0);

    const offering = Object.values(PIECE_BY_CLIENT_NAME).filter((aegisName) => {
      const [, socket] = getEnchants(aegisName) || [];
      return labels(socket as string[]).includes(encanto);
    });

    expect(offering.sort()).toEqual(named.sort());
  });
});

describe('Escudo Ilusión', () => {
  it('keeps the unsourced union it has always had', () => {
    // The wiki has no Escudo column — it is not one of Elyumina's five pieces — so
    // completing the five real columns must not widen this one. If the Escudo ever gets
    // a table of its own, this is the test to replace.
    const [, ...sockets] = getEnchants('Illusion_Shield_A') || [];
    expect(labels(sockets[0] as string[]).sort()).toEqual([
      'AGI +3', 'DES +3', 'FOR +3', 'INT +3', 'SOR +3', 'VIT +3',
      'Anti-Atraso 4', 'Fatal 4', 'Mira Apurada 5', 'Pedra de Encantamento 5',
      'L-Astúcia', 'L-Eternidade', 'L-Fortuna', 'L-Lampejo', 'L-Sortilégio', 'L-Superpoder',
      'S-ATQ', 'S-ATQM', 'S-CRIT', 'S-Cura', 'S-HPMax', 'S-Magia', 'S-Rapidez', 'S-Tiro',
      'U-Pós',
    ].sort());
  });
});
