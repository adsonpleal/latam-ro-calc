import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ExtraOptionTable } from './extra-option-table';
import { ItemOptionNumber as N } from './item-option-number.enum';
import { ItemTypeEnum } from './item-type.enum';
import { ItemOptionTable } from './item-options-table';

/**
 * Luís: "Os escudos Purificado, Sanguinário Maldito e Sanguinário não estão podendo
 * receber bônus aleatórios."
 *
 * How many random-option dropdowns a slot renders comes from ExtraOptionTable, keyed by
 * aegisName. Only the "Maldito" was listed, so the other two Bloody Knight shields showed
 * none — the equipment component hides the pickers when the count is 0.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

const SHIELDS: [number, string, string][] = [
  [28942, 'Bloody_Knight_Shield', 'Escudo Sanguinário'],
  [28945, 'Bloody_Knight_Shield_', 'Sanguinário Maldito'],
  [28946, 'Bloody_Knight_Shield__', 'Sanguinário Purificado'],
];

describe('Bloody Knight shields — random options', () => {
  it.each(SHIELDS)('%s is the shield we think it is', (id, aegisName, ptName) => {
    expect(db[id]?.aegisName).toBe(aegisName);
    expect(db[id]?.itemSubTypeId).toBe(514); // shield
    expect(latam[id]?.name).toBe(ptName);
  });

  it.each(SHIELDS)('%s offers two Bônus Aleatórios', (_id, aegisName) => {
    expect(ExtraOptionTable[aegisName]).toBe(2);
  });

  it('has the shield option positions wired for those two slots', () => {
    // A table entry alone is not enough — the slot needs option positions to bind to.
    const shield = ItemOptionTable.find(([slot]) => slot === ItemTypeEnum.shield);
    expect(shield?.[1]).toEqual([N.Shield_1, N.Shield_2]);
  });
});
