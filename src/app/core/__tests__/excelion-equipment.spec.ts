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
  const shieldAndBoot = ['Reactor_A_DEF', 'Reactor_A_ATK', 'Reactor_A_MATK', 'Reactor_A_MHP', 'Reactor_A_MSP', 'Reactor_A_ASPD',
    'Reactor_Cure_101', 'Reactor_Cure_102', 'Reactor_Cure_201', 'Reactor_Cure_202'];

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

/**
 * The diagrams outside the A- family, reported as missing from "Buscar Item":
 * https://issues.latam-tools.com.br/t/zO96XyN1eIGLqhZdIRCV
 *
 * Every number below is the client's own pt-BR description for the id (the repo's
 * latam-items.json), cross-checked against rAthena's item_db_etc ids 4970-4991, which is
 * the same upstream record item.json already carries for 4982-4991.
 *
 * `latam-items.json` gives one aegisName to a whole family (리액토_내성 for all four R-
 * diagrams) because that field is the client's resource name there, not an Aegis name.
 * calculator-session keys its enchant map by aegisName, so the duplicates would have
 * collapsed four items into one and left the search finding nothing — hence the
 * distinctness check below.
 */
describe('Excelion resistance, regen and freeze diagrams', () => {
  const byId = (id: number) => db[id];
  const scriptOf = (id: number) => byId(id).script;

  it('registers the R- family with the resistance it trades away', () => {
    // "Resistência a propriedade Fogo +25%. / Resistência a propriedade Água -25%."
    expect(scriptOf(4974)).toEqual({ subele_fire: ['25'], subele_water: ['-25'] });
    expect(scriptOf(4975)).toEqual({ subele_water: ['25'], subele_wind: ['-25'] });
    expect(scriptOf(4976)).toEqual({ subele_earth: ['25'], subele_fire: ['-25'] });
    expect(scriptOf(4977)).toEqual({ subele_wind: ['25'], subele_earth: ['-25'] });
  });

  it('stores the C- family regen per second, doubled from refine +7', () => {
    // "A cada 5 segundos: Regenera 50 de HP. / Refino +7 ou mais: Regenera 50 de HP
    // adicional." — stored divided out, as 315755 X-Salvaguarda already is.
    expect(scriptOf(4978)).toEqual({ hpRegenPerSecond: ['10', '7===10'] });
    expect(scriptOf(4979)).toEqual({ spRegenPerSecond: ['0.6', '7===0.4'] });
    // "Regeneração natural de HP +50%" and "+50% adicional" at +7 — a percentage, not a tick.
    expect(scriptOf(4980)).toEqual({ hpRecovRate: ['50', '7===50'] });
    expect(scriptOf(4981)).toEqual({ spRecovRate: ['50', '7===50'] });
  });

  it('gives I-Gelo the freeze tolerance it was registered without', () => {
    // "Tolerância a [Congelamento] +100%." The record existed with an empty script and the
    // client's resource name in `aegisName`, so no pool could reference it.
    expect(byId(4990).aegisName).toBe('Reactor_A_FROZ');
    expect(scriptOf(4990)).toEqual({ freezeResist: ['100'] });
  });

  it('keeps the R- family to the Motor and I-Gelo to the Colete', () => {
    const resist = ['Reactor_T_FIRE', 'Reactor_T_WATER', 'Reactor_T_GROUND', 'Reactor_T_WIND'];
    for (const aegisName of ['Excelion_Suit', 'Excelion_Shield', 'Excelion_Boots']) {
      expect(enchantsOf(aegisName)[1]).not.toContain('Reactor_T_FIRE');
    }
    expect(enchantsOf('Excelion_Wing')[1]).toEqual(expect.arrayContaining(resist));

    expect(enchantsOf('Excelion_Suit')[1]).toContain('Reactor_A_FROZ');
    for (const aegisName of ['Excelion_Wing', 'Excelion_Shield', 'Excelion_Boots']) {
      expect(enchantsOf(aegisName)[1]).not.toContain('Reactor_A_FROZ');
    }
  });

  it('offers the C- family on all four pieces', () => {
    const cure = ['Reactor_Cure_101', 'Reactor_Cure_102', 'Reactor_Cure_201', 'Reactor_Cure_202'];
    for (const aegisName of ['Excelion_Suit', 'Excelion_Wing', 'Excelion_Shield', 'Excelion_Boots']) {
      for (const slot of enchantsOf(aegisName).slice(1)) expect(slot).toEqual(expect.arrayContaining(cure));
    }
  });

  it('resolves every Excelion pool entry to one registered enchant, with no shared aegisName', () => {
    const pooled = [...new Set(['Excelion_Suit', 'Excelion_Wing', 'Excelion_Shield', 'Excelion_Boots']
      .flatMap((aegisName) => enchantsOf(aegisName).slice(1).flat()))];
    const enchants = Object.values(db).filter((item: any) => item.itemTypeId === 11);

    for (const aegisName of pooled) {
      expect(enchants.filter((item: any) => item.aegisName === aegisName), aegisName).toHaveLength(1);
    }
  });

  it('leaves the E- family unregistered on purpose', () => {
    // "Encanta a armadura com a propriedade Fogo": calculator.ts reads `armorElement` from
    // the armour or its card only, never from an enchant, so a record here would be inert.
    for (const id of [4970, 4971, 4972, 4973]) expect(byId(id)).toBeUndefined();
  });
});
