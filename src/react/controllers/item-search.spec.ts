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
