import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ExtraOptionTable } from './extra-option-table';
import { ItemOptionNumber as N } from './item-option-number.enum';
import { ItemTypeEnum } from './item-type.enum';
import { ItemOptionTable } from './item-options-table';

/**
 * Lobbo: "some items have missing BA options ... specially fones danificados. They should
 * have the same options as Fones Amplificadores."
 *
 * The "Elmo - Meio" section of bROWiki's Bônus Aleatórios page lists one combiner per
 * middle headgear. Each grants two bonuses (Pano para Lentes grants one), and only the
 * slotted "(1)" variant takes them — hence the `_` suffix on most aegisNames. Half the
 * family was never added to ExtraOptionTable, so the pickers never rendered.
 *
 * @see https://browiki.org/wiki/B%C3%B4nus_Aleat%C3%B3rios#Elmo_-_Meio
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** [id, aegisName, pt-BR name, bonus count, combiner]. */
const MIDDLE_HEADGEAR: [number, string, string, number, string][] = [
  [19118, 'Poring_Sunglasses_K_', 'Super Óculos Poring', 1, 'Pano para Lentes'],
  [410013, 'EXP_Processor_', 'Comunicador Avançado', 2, 'Processador Avançado'],
  [400002, 'Victory_Wing_Ear_', 'Asas Vitoriosas', 2, 'Coração Vitorioso'],
  [410017, 'Battle_Processor_', 'Chip de Batalha', 2, 'Bateria JET-01'],
  [410080, 'Deepblue_Sunglasses_', 'Óculos Neon', 2, 'Joia Neon'],
  [19241, 'Magical_Booster_K', 'Fones Amplificadores', 2, 'Amplificador de Fone'],
  [19245, 'Crimson_Booster', 'Fones Danificados', 2, 'Amplificador de Fone'],
];

describe('middle headgear — Bônus Aleatórios', () => {
  it.each(MIDDLE_HEADGEAR)('%s is the middle headgear we think it is', (id, aegisName, ptName) => {
    expect(db[id]?.aegisName).toBe(aegisName);
    expect(db[id]?.itemSubTypeId).toBe(512);
    expect(db[id]?.location).toBe('Middle');
    expect(latam[id]?.name).toBe(ptName);
  });

  it('only the slotted variant takes the bonuses', () => {
    // The unslotted twin sits one id below and must stay out of the table, or the
    // pickers would show on a piece the combiner cannot touch. The boosters ship in a
    // single slotted version, so they have no twin.
    for (const [id, aegisName] of MIDDLE_HEADGEAR) {
      expect(db[id].slots, aegisName).toBe(1);
    }

    for (const [id, aegisName] of MIDDLE_HEADGEAR.filter(([, name]) => name.endsWith('_'))) {
      const unslotted = db[id - 1];
      expect(unslotted.slots, aegisName).toBe(0);
      expect(ExtraOptionTable[unslotted.aegisName], unslotted.aegisName).toBeUndefined();
    }
  });

  it.each(MIDDLE_HEADGEAR)('%s offers its combiner\'s bonus count', (_id, aegisName, _pt, count) => {
    expect(ExtraOptionTable[aegisName]).toBe(count);
  });

  it('gives the damaged boosters the same count as the intact pair', () => {
    // The Amplificador de Fone has a 4,7619% chance of turning the Fones Amplificadores
    // into Fones Danificados. It cannot be used on the damaged pair afterwards, but the
    // pair keeps the two bonuses it was rolled with.
    expect(ExtraOptionTable['Crimson_Booster']).toBe(ExtraOptionTable['Magical_Booster_K']);
  });

  it('has the middle-headgear option positions wired', () => {
    // A table entry alone is not enough — the slot needs option positions to bind to.
    const middle = ItemOptionTable.find(([slot]) => slot === ItemTypeEnum.headMiddle);
    expect(middle?.[1]).toEqual([N.H_Mid_1, N.H_Mid_2, N.H_Mid_3]);
  });
});
