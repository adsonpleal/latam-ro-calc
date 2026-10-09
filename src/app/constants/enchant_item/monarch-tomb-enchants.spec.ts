import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../../app-config/equipment-slots';
import { deriveSlot } from '../../core/equipment-slot-derivation';
import { equipStatusOf, makeCalculator } from '../../core/__tests__/make-calculator';
import { ItemModel } from '../../models/item.model';
import { createMainModel } from '../../utils';
import { ItemTypeEnum } from '../item-type.enum';
import { getMonarchTombEnchants } from './monarch_tomb';
import { isEquipmentEnchant } from './equipment_enchants';

// https://issues.latam-tools.com.br/?card=aFYCOaWVT5xep4prM67W
// https://browiki.org/wiki/T%C3%BAmulo_do_Monarca#Acess%C3%B3rios_encant%C3%A1veis
const db: Record<number, ItemModel> = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const enchantMap = new Map(Object.values(db).filter(isEquipmentEnchant).map(item => [item.aegisName, item]));
const accessoryIds = [
  2601, 2602, 2605, 2603, 2789, 2788, 2790, 2607, 2665, 2604, 2652, 2627,
  2853, 2701, 2881, 2654, 2729, 2619, 2745, 2650, 2616, 2749, 2787, 2651,
  2620, 2617, 2718, 2608, 2703, 2667, 2736, 2737, 2772, 2716, 2747, 2746,
  2774, 2854, 2727, 2726, 2773, 2664, 2719, 2635, 2648, 2649, 2658, 2618,
  2610, 2628, 2656, 2614, 2611, 2732, 2728, 2700,
];
// Numeric enchant IDs independently transcribed from the published labels.
// The wiki's generic stat links contain copy/paste errors; use the stated tiers.
const commonIds = [
  4701, 4702, 4703, 4731, 4732, 4733, 4741, 4742, 4743, 4721, 4722, 4723,
  4711, 4713, 4715, 4809, 4808, 4820, 4813, 4812, 4826, 4817, 4816, 4843,
  4832, 29047, 4863, 4864, 4805, 4850, 4819, 4760, 4883,
  4796, 4798, 4861, 4862, 4800, 4801, 4929, 4792, 4794, 4786, 4787,
];
const monarchIds = [
  // All six base attributes +3 through +7.
  ...[4702, 4712, 4722, 4732, 4742, 4752].flatMap(start => [start, start + 1, start + 2, start + 3, start + 4]),
  4809, 4808, 4820, 4821, 4822, // Espírito do Lutador 3–7
  4818, 4817, 4816, 4843, 4844, // Pedra de Crítico 1–5
  4819, 4766, 4767, 4807, 4842, // ATQ 1–3%, ASPD 1–2
  4805, 4850, 4851, 4852,       // Fator de Cura 1–4
  4813, 4812, 4826, 4827, 4828, // Pedra de Encantamento 3–7
  4883, 4896, 4897, 4760, 4761, 4929,
  29047, 4863, 4864, 4865, 4866, 4832, 4833, 4834,
];
const sorted = (ids: number[]) => [...ids].sort((a, b) => a - b);
const derive = (id: number, side: ItemTypeEnum) => deriveSlot({
  descriptor: SLOTS_BY_KEY.get(side)!, item: db[id], mapEnchant: enchantMap,
  refineList: [], shadowRefineList: [],
});
const optionIds = (names: string[]) => names.map(name => {
  expect(enchantMap.has(name), `Missing enchant ${name}`).toBe(true);
  return enchantMap.get(name)!.id;
});

describe('Túmulo do Monarca accessory enchants', () => {
  it.each(accessoryIds)('%i has exactly the common pool in its last socket', id => {
    const positions = getMonarchTombEnchants(id)!;
    expect(positions.slice(0, 3)).toEqual([null, null, null]);
    expect(sorted(optionIds(positions[3]!))).toEqual(sorted(commonIds));
  });

  it.each(accessoryIds.filter(id => !!db[id]).flatMap(id => [ItemTypeEnum.accRight, ItemTypeEnum.accLeft].map(side => [id, side] as const)))
  ('offers all 44 enchants for %i on %s without changing card sockets', (id, side) => {
    const result = derive(id, side);
    expect(result.cardSlots).toBe(db[id].slots);
    expect(result.enchantLists.slice(0, 3)).toEqual([null, [], []]);
    expect(sorted(result.enchantLists[3]!.map(option => option.value))).toEqual(sorted(commonIds));
  });

  it.each([ItemTypeEnum.accRight, ItemTypeEnum.accLeft])('offers the three Monarca categories in both enchant sockets on %s', side => {
    const result = derive(28483, side);
    expect(result.cardSlots).toBe(1);
    expect(result.enchantLists.slice(0, 2)).toEqual([null, []]);
    for (const list of result.enchantLists.slice(2)) {
      expect(sorted(list!.map(option => option.value))).toEqual(sorted(monarchIds));
      expect(list).toHaveLength(68);
    }
  });

  it('does not enchant accessories absent from the list, even with the same sprite', () => {
    for (const id of [2621, 2622, 2623, 2624, 2625, 2626, 2634, 2606, 999999]) {
      expect(getMonarchTombEnchants(id)).toBeUndefined();
    }
    expect(db[2601].aegisName).toBe(db[2621].aegisName);
    expect(derive(2621, ItemTypeEnum.accRight).enchantLists).toEqual([null, [], [], []]);
  });

  it('registers the two absent-in-LATAM accessories without fabricating item records', () => {
    for (const id of [2736, 2737]) {
      expect(getMonarchTombEnchants(id)).toBeDefined();
    }
  });
});

describe('Túmulo do Monarca enchant bonuses', () => {
  it.each([
    [4883, 'matkPercent', 1], [4896, 'matkPercent', 2],
    [4929, 'spPercent', 1], [29047, 'criDmg', 3],
  ] as const)('%i applies %s +%i only when equipped', (id, key, value) => {
    const model = createMainModel();
    model.accRight = 28483;
    const baseline = equipStatusOf(makeCalculator(db), model)[key];
    model.accRightEnchant3 = id;
    expect(equipStatusOf(makeCalculator(db), model)[key] - baseline).toBe(value);
    model.accRightEnchant3 = undefined;
    expect(equipStatusOf(makeCalculator(db), model)[key]).toBe(baseline);
    expect(isEquipmentEnchant(db[id])).toBe(true);
  });

  it('sums the two independent Monarca sockets', () => {
    const model = createMainModel();
    model.accRight = 28483;
    const baseline = equipStatusOf(makeCalculator(db), model).matkPercent;
    model.accRightEnchant2 = 4896;
    model.accRightEnchant3 = 4896;
    expect(equipStatusOf(makeCalculator(db), model).matkPercent - baseline).toBe(4);
  });

  it('preserves the shared stones as costume enchants as well', () => {
    for (const id of [4883, 29047]) {
      expect(db[id].itemTypeId).toBe(6);
      expect(db[id].itemSubTypeId).toBe(72);
    }
  });
});
