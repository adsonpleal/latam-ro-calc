import { describe, expect, it } from 'vitest';
import { SLOTS_BY_KEY } from '../app-config/equipment-slots';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { ItemModel } from '../models/item.model';
import { createNumberDropdownList } from '../utils/create-number-dropdown-list';
import { cardsToClear, deriveSlot, reconcileEnchants } from './equipment-slot-derivation';

/**
 * These rules used to live inside EquipmentComponent, where nothing could reach them.
 * The one that matters most is the hydration branch in reconcileEnchants: it is what
 * keeps a replay-imported enchant the kRO-derived table does not know about.
 */

const slotOf = (key: ItemTypeEnum) => SLOTS_BY_KEY.get(key)!;
const refineList = createNumberDropdownList({ from: 0, to: 18 });
const shadowRefineList = createNumberDropdownList({ from: 0, to: 10 });

const item = (overrides: Partial<ItemModel>): ItemModel =>
  ({ id: 1, aegisName: 'Test_Item', name: 'Item de Teste', slots: 0, ...overrides }) as ItemModel;

const enchantItem = (id: number, aegisName: string, name: string): ItemModel => item({ id, aegisName, name });

/** Just enough of the enchant map for the positions the real tables reference. */
const mapEnchantOf = (...enchants: ItemModel[]) => new Map(enchants.map((e) => [e.aegisName, e]));

/**
 * Stands in for the real enchant map: mints an entry for any aegisName the tables name.
 * These tests are about which positions get a list, not about the enchant catalogue —
 * pinning them to real enchant names would make them fail on every data sync.
 */
class AnyEnchantMap extends Map<string, ItemModel> {
  private minted = 0;

  override get(aegisName: string): ItemModel {
    this.minted += 1;
    return enchantItem(90000 + this.minted, aegisName, aegisName);
  }
}

const derive = (key: ItemTypeEnum, equipped: ItemModel | undefined, mapEnchant: Map<string, ItemModel> = new AnyEnchantMap()) =>
  deriveSlot({ descriptor: slotOf(key), item: equipped, mapEnchant, refineList, shadowRefineList });

describe('deriveSlot', () => {
  it('clamps card sockets to the fields the slot actually has', () => {
    // A 4-slot weapon fills all four; the same socket count on a shield still has one field.
    expect(derive(ItemTypeEnum.weapon, item({ slots: 4 })).cardSlots).toBe(4);
    expect(derive(ItemTypeEnum.shield, item({ slots: 4 })).cardSlots).toBe(1);
    expect(derive(ItemTypeEnum.weapon, item({ slots: 0 })).cardSlots).toBe(0);
    expect(derive(ItemTypeEnum.weapon, undefined).cardSlots).toBe(0);
  });

  it('lets the aegisName table beat the Malangdo fallback', () => {
    // 13031 is a Malangdo weapon (3 slots -> a single enchant in the last position), but
    // an item the named table already covers must keep that table's positions.
    const table = derive(ItemTypeEnum.boot, item({ id: 13031, aegisName: 'Temporal_Dex_Boots', slots: 3 }));
    expect(table.enchantLists.map((list) => list !== null)).toEqual([false, true, true, true]);
    expect(table.enchantLists[1]).toEqual([]);
    expect(table.enchantLists[2].length).toBeGreaterThan(0);
  });

  it('falls back to Malangdo by id, and a 3-slot weapon gets exactly one enchant', () => {
    const three = derive(ItemTypeEnum.weapon, item({ id: 13031, aegisName: 'Nao_Esta_Na_Tabela', slots: 3 }));
    const filled = three.enchantLists.map((list) => (list ?? []).length > 0);
    expect(filled).toEqual([false, false, false, true]);

    const fewer = derive(ItemTypeEnum.weapon, item({ id: 13031, aegisName: 'Nao_Esta_Na_Tabela', slots: 0 }));
    expect(fewer.enchantLists.map((list) => (list ?? []).length > 0)).toEqual([false, false, true, true]);
  });

  it('leaves a position null when the slot does not expose it', () => {
    // Only weapons reach enchant position 0; shadow gear reaches 2-3 alone.
    expect(derive(ItemTypeEnum.weapon, item({})).enchantLists[0]).not.toBeNull();
    expect(derive(ItemTypeEnum.armor, item({})).enchantLists[0]).toBeNull();
    expect(derive(ItemTypeEnum.shadowArmor, item({})).enchantLists.map((l) => l === null)).toEqual([true, true, false, false]);
    expect(derive(ItemTypeEnum.pet, item({})).enchantLists).toEqual([]);
  });

  it('offers a grade only when the item can take one', () => {
    // Four grades and no "Sem Grau" sentinel: the picker panel writes the empty value from
    // its own "Nenhum" row, so carrying it here would offer the same choice twice.
    expect(derive(ItemTypeEnum.armor, item({ canGrade: true })).gradeList.length).toBe(4);
    expect(derive(ItemTypeEnum.armor, item({ canGrade: true })).gradeList.some((g) => g.value === '')).toBe(false);
    expect(derive(ItemTypeEnum.armor, item({ canGrade: false })).gradeList).toEqual([]);
    // No shadow piece has a grade field at all, whatever the item says.
    expect(derive(ItemTypeEnum.shadowArmor, item({ canGrade: true })).gradeList).toEqual([]);
  });

  it('picks the refine list per slot, and drops it on a non-refinable accessory', () => {
    expect(derive(ItemTypeEnum.armor, item({})).refineList).toBe(refineList);
    expect(derive(ItemTypeEnum.shadowArmor, item({})).refineList).toBe(shadowRefineList);
    expect(derive(ItemTypeEnum.headMiddle, item({})).refineList).toEqual([]);

    expect(derive(ItemTypeEnum.accLeft, item({ isRefinable: true })).refineList).toHaveLength(19);
    expect(derive(ItemTypeEnum.accLeft, item({ isRefinable: false })).refineList).toEqual([]);
    expect(derive(ItemTypeEnum.accLeft, item({})).refineList).toEqual([]);
  });

  it('gives a weapon three option slots and reads the table for everything else', () => {
    expect(derive(ItemTypeEnum.weapon, item({ aegisName: 'Qualquer_Arma' })).optionSlots).toBe(3);
    expect(derive(ItemTypeEnum.armor, item({ aegisName: 'Temporal_Armor_TW' })).optionSlots).toBe(2);
    expect(derive(ItemTypeEnum.armor, item({ aegisName: 'Nao_Esta_Na_Tabela' })).optionSlots).toBe(0);
  });

  it('always offers shadow gear both of its option slots, table or no table', () => {
    // Shadow pieces roll their Bônus Aleatórios by piece, not by item: the old picker
    // rendered both pickers unconditionally and never consulted ExtraOptionTable.
    expect(derive(ItemTypeEnum.shadowWeapon, item({ aegisName: 'Nao_Esta_Na_Tabela' })).optionSlots).toBe(2);
    expect(derive(ItemTypeEnum.shadowPendant, item({ aegisName: 'S_Sigrun_Shield' })).optionSlots).toBe(2);
  });

  it('never offers a boot a random option, whatever the table says', () => {
    // Temporal boots are in ExtraOptionTable, but ItemOptionNumber has no Boot_* index.
    expect(derive(ItemTypeEnum.boot, item({ aegisName: 'Temporal_Boots_TW' })).optionSlots).toBe(0);
  });
});

describe('reconcileEnchants', () => {
  const known = enchantItem(100, 'Known_Enchant', 'Encantamento Conhecido');
  const offTable = enchantItem(200, 'Off_Table_Enchant', 'U-Mental');
  const notAnEnchant = enchantItem(300, 'Nao_Encantamento', 'Poção');

  const lists = () => [null, [{ label: known.name, value: known.id }], null, null];
  const run = (value: number | undefined, isHydration: boolean, mapEnchant = mapEnchantOf(known, offTable)) =>
    reconcileEnchants({
      enchantLists: lists(),
      current: [undefined, value, undefined, undefined],
      hasItem: true,
      items: { [known.id]: known, [offTable.id]: offTable, [notAnEnchant.id]: notAnEnchant },
      mapEnchant,
      isHydration,
    });

  it('leaves a value the list already offers alone', () => {
    const { lists: out, clear } = run(known.id, false);
    expect(clear).toEqual([]);
    expect(out[1]).toHaveLength(1);
  });

  it('rescues an off-table enchant on hydration', () => {
    // The kRO-derived table omits enchants a LATAM item legitimately carries. A replay
    // import must not lose one.
    const { lists: out, clear } = run(offTable.id, true);
    expect(clear).toEqual([]);
    expect(out[1]).toEqual([
      { label: known.name, value: known.id },
      { label: offTable.name, value: offTable.id },
    ]);
  });

  it('clears the same value when the player swapped the item by hand', () => {
    expect(run(offTable.id, false).clear).toEqual([1]);
  });

  it('clears a value that is not a real enchant even on hydration', () => {
    expect(run(notAnEnchant.id, true).clear).toEqual([1]);
  });

  it('does nothing on an empty slot or an empty position', () => {
    expect(run(undefined, true).clear).toEqual([]);
    expect(
      reconcileEnchants({
        enchantLists: lists(),
        current: [undefined, offTable.id, undefined, undefined],
        hasItem: false,
        items: {},
        mapEnchant: mapEnchantOf(),
        isHydration: true,
      }).clear,
    ).toEqual([]);
  });
});

describe('cardsToClear', () => {
  it('empties the sockets the new item does not have, highest first', () => {
    expect(cardsToClear(2, [11, 22, 33, 44])).toEqual([3, 2]);
    expect(cardsToClear(4, [11, 22, 33, 44])).toEqual([]);
    expect(cardsToClear(0, [11, undefined, 33, undefined])).toEqual([2, 0]);
  });
});
