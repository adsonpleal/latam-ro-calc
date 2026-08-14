import { describe, expect, it } from 'vitest';
import itemDb from '../../../assets/demo/data/item.json';
import latamDb from '../../../assets/demo/data/latam-items.json';
import { getEnchants } from './_enchant_table';

/**
 * Automódulos on the Automatron shields — 460157 Escudo Automatron A and 460158 Escudo
 * Automatron B. Every other Automatron piece (Colete, Motor, Perna, Soquete, Turbina)
 * had its enchant pool wired; the two shields never did, so their sockets offered
 * nothing even though the game enchants them the same way, up to 3 times.
 *
 * The list below is the Escudo column of browiki's Automódulo table.
 *
 * @see https://browiki.org/wiki/Equipamentos_Automatron
 */

const items = itemDb as Record<string, any>;
const latam = latamDb as Record<string, { name?: string }>;

/** The Escudo column, in the order the wiki lists it. */
const SHIELD_MODULES = ['B-DEF', 'B-DEFM', 'M-HPMax', 'M-SPMax', 'M-Rapidez', 'P-Robusto', 'P-Dano'];

/**
 * The two the wiki lists for the Escudo that stay out: the calculator models neither
 * heal effectiveness nor reflect resistance, and neither is in item.json. Every other
 * Automatron piece omits them too — if one is ever added, it belongs on the Perna and
 * Motor pools as well, not only here.
 */
const NOT_MODELLED: [string, number][] = [
  ['M-Cura', 310098],
  ['P-Refletor', 310179],
];

/** aegisName -> the pt-BR name shown in the dropdown, so failures read like the wiki. */
const NAME_BY_AEGIS = new Map<string, string>(
  Object.entries(items)
    .filter(([, item]) => /^Automatic_Orb\d+$/.test(String(item.aegisName)))
    .map(([id, item]) => [item.aegisName as string, latam[id]?.name ?? item.name]),
);

const optionNames = (aegisNames: string[]) =>
  aegisNames.map((a) => NAME_BY_AEGIS.get(a) ?? `<${a} missing from item.json>`);

describe.each([
  ['460157 Escudo Automatron A', 'Auto_Shield_A_LT'],
  ['460158 Escudo Automatron B', 'Auto_Shield_B_LT'],
])('%s automódulos', (_label, aegisName) => {
  // enchants is [_, slot2, slot3, slot4] — game socket numbering, descending.
  const [, ...sockets] = getEnchants(aegisName) || [];

  it('offers the three sockets the NPC can fill', () => {
    expect(sockets).toHaveLength(3);
    for (const socket of sockets) expect(socket?.length).toBeGreaterThan(0);
  });

  it.each([0, 1, 2])('socket %i takes the Escudo column', (index) => {
    expect(optionNames(sockets[index] as string[])).toEqual(SHIELD_MODULES);
  });
});

describe('automódulos the shield takes in game but the calculator cannot model', () => {
  it.each(NOT_MODELLED)('%s (%i) is absent from item.json', (name, id) => {
    expect(latam[id]?.name).toBe(name);
    expect(items[id]).toBeUndefined();
  });

  it('is absent from the Perna pool too, so the omission stays consistent', () => {
    const [, perna] = getEnchants('Auto_Leg_A') as string[][];
    const shieldOnly = new Set(optionNames(perna));

    for (const [name] of NOT_MODELLED) expect(shieldOnly.has(name)).toBe(false);
  });
});
