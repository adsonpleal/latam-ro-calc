import { describe, expect, it } from 'vitest';
import { EnchantTable } from 'src/app/constants/enchant_item/_enchant_table';

/**
 * The Encantamentos Ilusionais of the Cavernas Ilusionais equipment.
 *
 * The two slots were wired as if they rolled off different tables — the first offering stats
 * and max HP, the second only the Runas. In game both roll off one pool, so the fix is that
 * the two slots of a piece are the same list.
 *
 * The pool does not ship with the client; it is browiki's, cited where it is used.
 */

const enchantsOf = (aegisName: string) => EnchantTable.find((row) => row.name === aegisName)?.enchants;

describe('Illusion Caverns equipment enchants', () => {
  // browiki, Cavernas Ilusionais § Encantamentos Ilusionais: both slots roll off one table,
  // and equipment rolls FOR/VIT/INT/SOR — AGI and DES are the accessory table's.
  const ilEquipment = [
    'Headband_Of_Power_IL', 'Apple_Of_Archer_IL', 'Fancy_Flower_IL', 'Goibne_Helmet_IL',
    'Herald_Of_GOD_IL', 'Morpheus_Hood_IL', 'Boots_IL', 'Shoes_IL', 'Muffler_IL',
    'Siver_Guard_IL', 'Sprint_Mail_IL', 'Sprint_Shoes_IL',
  ];

  it.each(ilEquipment)('rolls both slots of %s off the same pool', (aegisName) => {
    const enchants = enchantsOf(aegisName);

    expect(enchants).toBeDefined();
    expect(enchants[2]).toBe(enchants[3]);
  });

  it.each(ilEquipment)('offers FOR, VIT, INT and SOR in both slots of %s — but not AGI or DES', (aegisName) => {
    for (const slot of enchantsOf(aegisName).slice(2)) {
      expect(slot).toEqual(expect.arrayContaining(['Strength1', 'Strength4', 'Vitality1', 'Inteligence1', 'Luck1']));
      expect(slot).not.toContain('Agility1');
      expect(slot).not.toContain('Dexterity1');
    }
  });

  it('leaves the accessories rolling the accessory table, AGI and DES included', () => {
    for (const aegisName of ['Sprint_Glove_IL', 'Sprint_Ring_IL']) {
      expect(enchantsOf(aegisName)[2]).toContain('Agility1');
      expect(enchantsOf(aegisName)[2]).toContain('Dexterity1');
    }
  });
});
