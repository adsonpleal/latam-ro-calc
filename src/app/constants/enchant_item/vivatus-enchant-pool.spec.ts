import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getEnchants } from './_enchant_table';

/**
 * Ziki's enchant pools for the Elmos da Fé.
 *
 * Reported on the tracker (card 9qckxs4SYvqNVHsFgwBR, by Ted) as "faltando as pedras de
 * CRIT" on the Elmo da Fé Celestial. The Pedra de Crítico family was indeed absent, and
 * so was most of the rest of the table: the pool had been shaped like the Good & Evil
 * boots one (see good-evil-boots.spec.ts), which shares no family with this NPC.
 *
 * Two traps this file exists to keep shut:
 *
 * - "E. Lutador" on the wiki is *Espírito do Lutador* (`Fighting_Spirit`), not Expert
 *   Fighter. The abbreviation is what put `Expert_Fighter`/`Expert_Magician` here, and
 *   neither is obtainable on these helms.
 * - the tier a family starts at is not always 1 — Espírito do Lutador rolls at 3 — and
 *   Ziki upgrades exactly twice, so anything beyond the third tier is unreachable.
 *
 * The reference is the id each cell of the wiki table links to, not the printed name.
 *
 * https://browiki.org/wiki/Encantamento (Ziki > Elmos da Fé)
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const ITEM_TYPE_ID_ENCHANT = 11;

const byAegisName = new Map<string, any>(Object.values(items).map((a: any) => [a.aegisName, a]));

/** Slot 3 in the UI (the wiki's "Slot 4"): aegisName, item id, pt-BR name. */
const POOL_3: [string, number, string][] = [
  ['Fighting_Spirit3', 4809, 'Espírito do Lutador 3'],
  ['Fighting_Spirit4', 4808, 'Espírito do Lutador 4'],
  ['Fighting_Spirit5', 4820, 'Espírito do Lutador 5'],
  ['Spell1', 4815, 'Pedra de Encantamento 1'],
  ['Spell2', 4814, 'Pedra de Encantamento 2'],
  ['Spell3', 4813, 'Pedra de Encantamento 3'],
  ['Sharp1', 4818, 'Pedra de Crítico 1'],
  ['Sharp2', 4817, 'Pedra de Crítico 2'],
  ['Sharp3', 4816, 'Pedra de Crítico 3'],
  ['Attack_Delay_1', 4869, 'Anti-Atraso 1'],
  ['Attack_Delay_2', 4872, 'Anti-Atraso 2'],
  ['Attack_Delay_3', 4873, 'Anti-Atraso 3'],
  ['Expert_Archer1', 4832, 'Mira Apurada 1'],
  ['Expert_Archer2', 4833, 'Mira Apurada 2'],
  ['Expert_Archer3', 4834, 'Mira Apurada 3'],
  ['Skill_Delay1', 4948, 'Anti-Horário 1'],
  ['Skill_Delay2', 4949, 'Anti-Horário 2'],
  ['Skill_Delay3', 4950, 'Anti-Horário 3'],
];

/** Slot 4 in the UI (the wiki's "Slot 3"): the seven Insígnias, tiers 1-3. */
const POOL_4: [string, number, string][] = [
  ['MagicEessence1', 29071, 'Insígnia da Virtude 1'],
  ['MagicEessence2', 29072, 'Insígnia da Virtude 2'],
  ['MagicEessence3', 29073, 'Insígnia da Virtude 3'],
  ['MasterArcher1', 29091, 'Insígnia da Maestria 1'],
  ['MasterArcher2', 29092, 'Insígnia da Maestria 2'],
  ['MasterArcher3', 29093, 'Insígnia da Maestria 3'],
  ['Adamatine1', 29101, 'Insígnia da Resiliência 1'],
  ['Adamatine2', 29102, 'Insígnia da Resiliência 2'],
  ['Adamatine3', 29103, 'Insígnia da Resiliência 3'],
  ['Tenacity1', 29706, 'Insígnia da Dedicação 1'],
  ['Tenacity2', 29707, 'Insígnia da Dedicação 2'],
  ['Tenacity3', 29708, 'Insígnia da Dedicação 3'],
  ['Mettle1', 29061, 'Insígnia da Potência 1'],
  ['Mettle2', 29062, 'Insígnia da Potência 2'],
  ['Mettle3', 29063, 'Insígnia da Potência 3'],
  ['Acute1', 29081, 'Insígnia do Talento 1'],
  ['Acute2', 29082, 'Insígnia do Talento 2'],
  ['Acute3', 29083, 'Insígnia do Talento 3'],
  ['Affection1', 29111, 'Insígnia da Afeição 1'],
  ['Affection2', 29112, 'Insígnia da Afeição 2'],
  ['Affection3', 29113, 'Insígnia da Afeição 3'],
];

/** The helm the card was filed against, and its Elmo da Fé II sibling. */
const CELESTIAL: [number, string][] = [
  [400241, 'Viva_Adul_Hat_SJ1'],
  [400242, 'Viva_Adul_Hat_SJ2'],
];

describe('Elmos da Fé — pools de encanto do Ziki', () => {
  it.each(CELESTIAL)('%i (%s) is the Elmo da Fé Celestial and takes enchants', (id, aegisName) => {
    expect(items[id].aegisName).toBe(aegisName);
    expect(latam[id].name).toContain('Elmo da Fé Celestial');
    expect(getEnchants(aegisName), `${aegisName} has no EnchantTable entry`).toBeDefined();
  });

  it.each(CELESTIAL)('%i (%s) offers nothing in the first two slots', (_id, aegisName) => {
    const [slot1, slot2] = getEnchants(aegisName)!;

    expect(slot1).toBeNull();
    expect(slot2).toBeNull();
  });

  it.each(CELESTIAL)('%i (%s) offers the six families in slot 3', (_id, aegisName) => {
    const [, , slot3] = getEnchants(aegisName)!;

    expect(slot3).toEqual(POOL_3.map(([aegis]) => aegis));
  });

  it.each(CELESTIAL)('%i (%s) offers the seven Insígnias in slot 4', (_id, aegisName) => {
    const [, , , slot4] = getEnchants(aegisName)!;

    expect(slot4).toEqual(POOL_4.map(([aegis]) => aegis));
  });

  // The dropdown is built by looking each pool entry up by aegisName in the merged item
  // table and reading `.name` off it, so an entry that resolves to nothing is a crash,
  // not an empty row.
  it.each([...POOL_3, ...POOL_4])('%s is the enchant item %i (%s)', (aegisName, id, name) => {
    const item = byAegisName.get(aegisName);

    expect(item, `${aegisName} is not in item.json`).toBeDefined();
    expect(item.id).toBe(id);
    expect(item.itemTypeId).toBe(ITEM_TYPE_ID_ENCHANT);
    expect(latam[id]?.name).toBe(name);
  });

  it('offers the Pedra de Crítico line, which is what the card reported missing', () => {
    const [, , slot3] = getEnchants('Viva_Adul_Hat_SJ1')!;

    expect(slot3).toContain('Sharp1');
    expect(slot3).toContain('Sharp2');
    expect(slot3).toContain('Sharp3');
  });

  // "E. Lutador" is Espírito do Lutador; Expert Fighter/Magician belong to other NPCs'
  // pools and were never obtainable here.
  it('does not offer Expert Fighter or Expert Magician', () => {
    const [, , slot3, slot4] = getEnchants('Viva_Adul_Hat_SJ1')!;

    for (const aegisName of [...slot3, ...slot4]) {
      expect(aegisName).not.toMatch(/^Expert_(Fighter|Magician)/);
    }
  });

  // Ziki upgrades a line twice and no further.
  it('does not offer tiers past the third upgrade', () => {
    const [, , slot3, slot4] = getEnchants('Viva_Adul_Hat_SJ1')!;
    const unreachable = ['Expert_Archer4', 'Expert_Archer5', 'Spell4', 'Spell5', 'Sharp4', 'Sharp5', 'Attack_Delay_4', 'Attack_Delay_5', 'Acute4', 'Acute5', 'Mettle4', 'Mettle5', 'Adamatine4', 'Adamatine5', 'Tenacity4', 'Tenacity5', 'MasterArcher4', 'MasterArcher5', 'MagicEessence4', 'MagicEessence5'];

    for (const aegisName of unreachable) {
      expect([...slot3, ...slot4]).not.toContain(aegisName);
    }
  });

  // One shared pair of pools, so the fix reaches the whole line and not just the class
  // the card happened to name.
  it('gives every Elmo da Fé the same two pools', () => {
    const helms = Object.values(items).filter((a: any) => /^Viva_Adul_Hat_(?!Box)/.test(a.aegisName ?? ''));
    const [, , slot3, slot4] = getEnchants('Viva_Adul_Hat_SJ1')!;

    expect(helms.length).toBe(34);
    for (const helm of helms as any[]) {
      expect(getEnchants(helm.aegisName), `${helm.aegisName} has no EnchantTable entry`).toEqual([null, null, slot3, slot4]);
    }
  });
});
