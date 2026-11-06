import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../../app-config/equipment-slots';
import { deriveSlot } from '../../core/equipment-slot-derivation';
import { ItemTypeEnum } from '../item-type.enum';

// https://issues.latam-tools.com.br/t/cSMdQEOMT56d7iiCMagi
const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const mapEnchant = new Map<string, any>(Object.values(items)
  .filter((item: any) => item.itemTypeId === 11)
  .map((item: any) => [item.aegisName, item]));
const derive = (id: number, slot: ItemTypeEnum) => deriveSlot({
  descriptor: SLOTS_BY_KEY.get(slot)!, item: items[id], mapEnchant,
  refineList: [], shadowRefineList: [],
});

describe('Apoio Turbina Ilusión enchants', () => {
  it.each([
    // The side-only encantos: S-HPR, U-Vida and U-Mental on the right; S-SPR, U-Alma and
    // U-Mana on the left. This test used to expect 29545 AND 29546 on both sides, which
    // is how they were wired before the Módulo table on browiki's Equipamentos Ilusión
    // page was read column by column (illusion-enchant-pools.spec.ts). The pair is one
    // per side, and the two accessories do not share them.
    [490072, 32207, ItemTypeEnum.accRight, [29529, 29543, 29545], [29532, 29544, 29546]],
    [490073, 32208, ItemTypeEnum.accLeft, [29532, 29544, 29546], [29529, 29543, 29545]],
  ])('offers the regular accessory pools for support item %i', (supportId, regularId, slot, own, other) => {
    const support = derive(supportId, slot);
    expect(support.cardSlots).toBe(1);
    expect(support.enchantLists).toEqual(derive(regularId, slot).enchantLists);
    expect(support.enchantLists[0]).toBeNull();
    for (const options of support.enchantLists.slice(1)) {
      expect(options).toHaveLength(13);
      const values = options!.map(option => option.value);
      expect(values).toEqual(expect.arrayContaining(own));
      for (const id of other) expect(values).not.toContain(id);
    }
  });

  it('shares every attribute encanto between the two sides', () => {
    // The side split is the S-/U- pairs above, not the N- attribute módulos — see the
    // comment on the `illusionAcc*` pools in `_enchant_table.ts`.
    const names = (id: number, slot: ItemTypeEnum) => derive(id, slot).enchantLists[1]!
      .map(option => items[option.value].aegisName);
    const attributes = ['Strength3', 'Agility3', 'Vitality3', 'Inteligence3', 'Dexterity3', 'Luck3'];

    expect(names(490072, ItemTypeEnum.accRight)).toEqual(expect.arrayContaining(attributes));
    expect(names(490073, ItemTypeEnum.accLeft)).toEqual(expect.arrayContaining(attributes));
  });
});
