import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../app-config/equipment-slots';
import { ItemOptionNumber as N } from '../constants/item-option-number.enum';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { ItemModel } from '../models/item.model';
import { createExtraOptionList } from '../utils/create-extra-option-list';
import { toRawOptionTxtList } from '../utils/to-raw-option-txt-list';
import { deriveSlot } from './equipment-slot-derivation';

// bROWiki, Arena Noturna > Bônus aleatórios: three lines on special armor,
// capes and shields; two on the special accessories.
const items: Record<number, ItemModel> = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const equipment: [number, ItemTypeEnum, number][] = [
  [450149, ItemTypeEnum.armor, 3],
  [450150, ItemTypeEnum.armor, 3],
  [480065, ItemTypeEnum.garment, 3],
  [480066, ItemTypeEnum.garment, 3],
  [480067, ItemTypeEnum.garment, 3],
  [480068, ItemTypeEnum.garment, 3],
  [460005, ItemTypeEnum.shield, 3],
  [460006, ItemTypeEnum.shield, 3],
  [490077, ItemTypeEnum.accRight, 2],
  [490077, ItemTypeEnum.accLeft, 2],
  [490078, ItemTypeEnum.accRight, 2],
  [490078, ItemTypeEnum.accLeft, 2],
];

describe('Arena Noturna random options', () => {
  it('offers the distinctive rolls and upper bounds from the Arena Noturna pools', () => {
    const values = new Set<string>();
    const collect = (nodes: any[]) => nodes.forEach((node) => {
      if (node.children) collect(node.children);
      else values.add(node.value);
    });
    collect(createExtraOptionList());
    for (const value of [
      'hpRecovRate:65', 'spRecovRate:65', 'healReceived:10',
      'subele_fire:5', 'subrace_demon:7', 'spCostPercent:-5',
      'm_pene_race_demon:60', 'p_pene_class_boss:60', 'acd:3',
    ]) expect(values.has(value), value).toBe(true);
  });

  it.each(equipment)('%i in %s offers %i rolls', (id, slot, count) => {
    expect(items[id]?.aegisName).toMatch(/^MD_Geffen_/);
    expect(deriveSlot({ descriptor: SLOTS_BY_KEY.get(slot)!, item: items[id], mapEnchant: new Map(), refineList: [], shadowRefineList: [] }).optionSlots).toBe(count);
  });

  it('keeps the third shield and cape rolls in the calculation, then clears them when the item is removed', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.Shield_3] = 'acd:3';
    rawOptionTxts[N.Garment_3] = 'sp:300';
    const equipped = { rawOptionTxts, shield: 460006, garment: 480065 } as any;
    const worn = toRawOptionTxtList(equipped, items);
    expect([worn[N.Shield_3], worn[N.Garment_3]]).toEqual(['acd:3', 'sp:300']);

    const removed = toRawOptionTxtList({ ...equipped, shield: 2186, garment: 20944 }, items);
    expect([removed[N.Shield_3], removed[N.Garment_3]]).toEqual([null, null]);
  });
});
