import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../../app-config/equipment-slots';
import { ItemTypeEnum } from '../item-type.enum';
import { deriveSlot } from '../../core/equipment-slot-derivation';
import { equipStatusOf, makeCalculator } from '../../core/__tests__/make-calculator';
import { createMainModel } from '../../utils';
import { getEnchants } from './_enchant_table';

// Reported by Luís.
// Pool: https://browiki.org/wiki/Malangdo#Encantamento_Arcanjo
// Effects: the client descriptions in latam-items.json.
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const poolIds = [
  4853, 4854, 4855, 4856, 4857, 4858,
  4700, 4701, 4710, 4711, 4720, 4721, 4730, 4731, 4740, 4741, 4750, 4751,
  4814, 4813, 4810, 4809, 4850, 4851, 4852, 4833, 4834, 4817, 4816,
  4760, 4761, 4849, 4848,
];
const bonuses = (id: number, refine = 0) => {
  const model = createMainModel();
  model.garment = 2573;
  model.garmentRefine = refine;
  model.garmentEnchant3 = id;
  return equipStatusOf(makeCalculator(items), model);
};

describe('Asas de Arcanjo enchants', () => {
  it('offers exactly the 33 client items in slot 4 and keeps its card socket', () => {
    const mapEnchant = new Map<string, any>(Object.values(items)
      .filter((item: any) => item.itemTypeId === 11)
      .map((item: any) => [item.aegisName, { ...item, name: latam[item.id]?.name ?? item.name }]));
    const slot = deriveSlot({ descriptor: SLOTS_BY_KEY.get(ItemTypeEnum.garment)!,
      item: items[2573], mapEnchant, refineList: [], shadowRefineList: [] });
    expect(slot.cardSlots).toBe(1);
    expect(getEnchants('Archangel_Wing')!.slice(0, 3)).toEqual([null, null, null]);
    const options = slot.enchantLists[3]!;
    expect(options).toHaveLength(33);
    expect(options.map(option => option.value).sort((a, b) => a - b)).toEqual([...poolIds].sort((a, b) => a - b));
    expect(options.find(option => option.value === 4849)?.label).toBe('Redução Humanoide 1');
  });

  it('applies 5% resistance to both humanoids and human players', () => {
    const result = bonuses(4849);
    expect(result.subrace_demihuman).toBe(5);
    expect(result.subrace_player_human).toBe(5);
    expect(result.subele_neutral).toBe(0);
    expect(bonuses(4848).subele_neutral).toBe(5);
    expect(bonuses(4848).subrace_demihuman).toBe(0);
  });

  it.each([[4850, 6, 5], [4851, 12, 10], [4852, 20, 15]])(
    'applies healing and SP cost for enchant %i', (id, heal, cost) => {
      expect(bonuses(id).healPower).toBe(heal);
      expect(bonuses(id).spCostPercent).toBe(cost);
    });

  it.each([4760, 4761])('applies fixed cast reduction for %i', id => {
    expect(bonuses(id).fctPercent).toBe(1);
    expect(bonuses(id).vct).toBe(0);
    expect(bonuses(id).matkPercent).toBe(id === 4760 ? 1 : 2);
  });

  it.each([4853, 4854, 4855, 4856, 4857, 4858])(
    'uses the garment refine for the Super enchant %i', id => {
      expect(bonuses(id, 11).fctPercent).toBe(0);
      expect(bonuses(id, 12).fctPercent).toBe(7);
      expect(bonuses(id, 11).aspd).toBe(0);
      expect(bonuses(id, 12).aspd).toBe(1);
    });
});
