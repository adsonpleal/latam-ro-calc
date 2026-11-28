import { describe, expect, it } from 'vitest';
import { ItemSearchComponent } from './item-search';
import { CalculatorLayout, ItemShop } from '../services/calculator-services';
import { DescriptionStore } from '../services/data-client';
import { Events } from '../services/events';
import { ItemModel } from '../../app/models/item.model';

function setup() {
  const descriptions = new DescriptionStore();
  const layout = new CalculatorLayout();
  const shop = { server: 'FREYA', serverOptions: [], divinePrideItemUrl: () => '', marketItemUrl: () => '' } as unknown as ItemShop;
  const vm = new ItemSearchComponent(layout, shop, descriptions);
  vm.onClassChanged = new Events<boolean>();
  vm.items = { 1: { id: 1, name: 'Chapéu', script: {} } as ItemModel };
  vm.equipableItems = [{ id: 1, value: 1, label: 'Chapéu', position: 'headUpperList' }];
  vm.ngOnInit();
  return { vm, descriptions, layout };
}

describe('item search state', () => {
  it('uses the selected base level and refreshes the enabled filter when reopened after a level change', () => {
    const { vm, layout } = setup();
    vm.currentLevel = 100;
    vm.items = { 1: { ...vm.items[1], requiredLevel: 100 }, 2: { ...vm.items[1], id: 2, requiredLevel: 101 } };
    vm.equipableItems = [1, 2].map(id => ({ id, value: id, label: 'Chapéu', position: 'headUpperList' }));
    vm.onItemSearchFilterChange();
    expect(vm.filteredItems.map(item => item.id)).toEqual([1, 2]);
    vm.onlyCurrentLevel = true;
    vm.onItemSearchFilterChange();
    expect(vm.filteredItems.map(item => item.id)).toEqual([1]);
    vm.isShowSearchDialog = false;
    vm.currentLevel = 101;
    layout.openItemSearch();
    expect(vm.onlyCurrentLevel).toBe(true);
    expect(vm.filteredItems.map(item => item.id)).toEqual([1, 2]);
    vm.currentLevel = 99;
    layout.openItemSearch();
    expect(vm.filteredItems).toEqual([]);
    vm.onlyCurrentLevel = false;
    vm.onItemSearchFilterChange();
    expect(vm.filteredItems.map(item => item.id)).toEqual([1, 2]);
    vm.ngOnDestroy();
  });
  it('starts with one picker and keeps a minimum of one without a maximum', () => {
    const { vm } = setup();
    expect(vm.bonusPickers).toEqual([{ id: 0, value: null }]);
    expect(vm.matchAllBonuses).toBe(true);
    for (let n = 0; n < 25; n++) vm.addBonusPicker();
    expect(vm.bonusPickers).toHaveLength(26);
    expect(new Set(vm.bonusPickers.map(picker => picker.id)).size).toBe(26);
    for (const picker of [...vm.bonusPickers]) vm.removeBonusPicker(picker.id);
    expect(vm.bonusPickers).toHaveLength(1);
    vm.ngOnDestroy();
  });
  it('opens on a bonus alone, dropping the slot a previous search left behind', () => {
    const { vm, layout } = setup();
    vm.items = {
      1: { id: 1, name: 'Chapéu', script: {} } as ItemModel,
      2: { id: 2, name: 'Poção', script: { healReceived: ['10'] } } as ItemModel,
    };
    vm.equipableItems = [
      { id: 1, value: 1, label: 'Chapéu', position: 'headUpperList' },
      { id: 2, value: 2, label: 'Poção', position: 'armorList' },
    ];
    // Where the Cura panel's "buscar itens" link comes in: it knows the bonus and nothing
    // about slots, so a headgear filter left over from the last search must not survive.
    vm.selectedItemPositions = ['headUpperList'];
    layout.openItemSearch({ compare: false, bonuses: ['healReceived'] });
    expect(vm.isShowSearchDialog).toBe(true);
    expect(vm.selectedItemPositions).toEqual([]);
    expect(vm.bonusPickers.map(picker => picker.value)).toEqual(['healReceived']);
    expect(vm.filteredItems.map(item => item.id)).toEqual([2]);
    vm.ngOnDestroy();
  });
  it('reads descriptions loaded after selection, and never keeps another item’s preview', () => {
    const { vm, descriptions } = setup();
    vm.onItemSearchFilterChange();
    vm.activeFilteredItem = vm.filteredItems[0];
    expect(vm.activeFilteredItemDesc).toBe('');
    descriptions.setDescriptions({ 1: 'Bônus\n^FF0000ATQ +10' });
    expect(vm.activeFilteredItemDesc).toBe('Bônus<br><font color="#FF0000">ATQ +10');
    descriptions.upsert(1, 'Descrição atualizada');
    expect(vm.activeFilteredItemDesc).toBe('Descrição atualizada');
    vm.activeFilteredItem = null;
    expect(vm.activeFilteredItemDesc).toBe('');
    vm.activeFilteredItem = vm.filteredItems[0];
    vm.itemSearchFirst = 14;
    vm.onItemSearchFilterChange();
    expect(vm.activeFilteredItem).toBeNull();
    expect(vm.itemSearchFirst).toBe(0);
    vm.ngOnDestroy();
  });
  it('preserves filters on reopening and clears class-specific state on class changes', () => {
    const { vm, layout } = setup();
    vm.searchName = 'Chapéu';
    vm.selectedItemPositions = ['headUpperList'];
    vm.bonusPickers[0].value = 'atk';
    vm.matchAllBonuses = false;
    layout.openItemSearch();
    vm.isShowSearchDialog = false;
    layout.openItemSearch();
    expect(vm.searchName).toBe('Chapéu');
    expect(vm.bonusPickers[0].value).toBe('atk');
    vm.selectedOffensiveSkills = ['Double Strafe'];
    vm.filteredItems = vm.equipableItems;
    vm.activeFilteredItem = vm.equipableItems[0];
    vm.onClassChanged.next(true);
    expect(vm.selectedOffensiveSkills).toEqual([]);
    expect(vm.filteredItems).toEqual([]);
    expect(vm.activeFilteredItem).toBeNull();
    expect(vm.selectedItemPositions).toEqual(['headUpperList']);
    expect(vm.bonusPickers[0].value).toBe('atk');
    expect(vm.matchAllBonuses).toBe(false);
    vm.ngOnDestroy();
    vm.isShowSearchDialog = false;
    layout.openItemSearch();
    expect(vm.isShowSearchDialog).toBe(false);
  });
});
