import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EnchantTable } from 'src/app/constants/enchant_item/_enchant_table';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The Excelion equipment: the shield's LATAM effects, and the Diagrama pools of all four
 * pieces.
 *
 * Two separate faults met here. 28941 Escudo Excelion still carried the script and the base
 * numbers of the item that shares its id upstream, none of which is what the piece does in
 * LATAM; and the Diagramas were wired for the Colete and the Motor alone, leaving the shield
 * and the boot with three empty sockets.
 *
 * The shield's numbers come from its pt-BR description (CLAUDE.md). The enchant pools do
 * not ship with the client, so they are browiki's, cited where they are used.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ESCUDO_EXCELION = 28941;

const WEAPON = 1201; // Knife [3] — inert host so the calculator has something equipped

/** Equip the shield at base level `level` and hand back the summed equipment bonus. */
function shieldTotals(level: number): Record<string, number> {
  const items: any = {
    [WEAPON]: { ...db[WEAPON], itemTypeId: 1, itemSubTypeId: 256 },
    [ESCUDO_EXCELION]: { ...db[ESCUDO_EXCELION] },
  };

  const model = createMainModel();
  model.level = level;
  model.weapon = WEAPON;
  model.shield = ESCUDO_EXCELION;

  return equipStatusOf(makeCalculator(items), model);
}

const enchantsOf = (aegisName: string) => EnchantTable.find((row) => row.name === aegisName)?.enchants;

describe('Escudo Excelion (28941) — LATAM effects, not the upstream record', () => {
  it('gives variable cast -10% at any level', () => {
    expect(shieldTotals(100)['vct']).toBe(10);
  });

  it('gives after-cast delay -5% only from base level 130', () => {
    expect(shieldTotals(130)['acd']).toBe(5);
    expect(shieldTotals(129)['acd'] ?? 0).toBe(0);
  });

  it('no longer carries the upstream item\'s MDEF and HP/SP percentages', () => {
    const bonus = shieldTotals(200);
    expect(bonus['mdef'] ?? 0).toBe(0);
    expect(bonus['hpPercent'] ?? 0).toBe(0);
    expect(bonus['spPercent'] ?? 0).toBe(0);
  });

  it('carries the LATAM DEF and weight', () => {
    expect(db[ESCUDO_EXCELION].defense).toBe(50);
    expect(db[ESCUDO_EXCELION].weight).toBe(100);
  });

  // The description's "custo de SP das habilidades -1% a cada 2 refinos" is left out: the
  // calculator does not model SP cost.
});

describe('Excelion diagrams reach the shield and the boot', () => {
  // browiki, Equipamento Excelion: the four pieces take 3 diagrams each, but A-ESQV is
  // the Colete's and the Motor's alone, and A-FOR / A-INT only the Colete's.
  const shieldAndBoot = ['Reactor_A_DEF', 'Reactor_A_ATK', 'Reactor_A_MATK', 'Reactor_A_MHP', 'Reactor_A_MSP', 'Reactor_A_ASPD'];

  it.each(['Excelion_Shield', 'Excelion_Boots'])('offers three diagram slots on %s', (aegisName) => {
    const enchants = enchantsOf(aegisName);

    expect(enchants).toBeDefined();
    expect(enchants[0]).toBeNull();
    for (const slot of enchants.slice(1)) expect(slot).toEqual(shieldAndBoot);
  });

  it('keeps A-ESQV off the shield and the boot, and on the Colete and the Motor', () => {
    for (const aegisName of ['Excelion_Shield', 'Excelion_Boots']) {
      expect(enchantsOf(aegisName)[1]).not.toContain('Reactor_A_AVOI');
    }
    for (const aegisName of ['Excelion_Suit', 'Excelion_Wing']) {
      expect(enchantsOf(aegisName)[1]).toContain('Reactor_A_AVOI');
    }
  });

  it('keeps A-FOR and A-INT to the Colete', () => {
    expect(enchantsOf('Excelion_Suit')[1]).toContain('Reactor_A_STR');
    expect(enchantsOf('Excelion_Wing')[1]).not.toContain('Reactor_A_STR');
  });
});
