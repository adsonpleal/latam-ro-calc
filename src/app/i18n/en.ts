/**
 * English catalog. Loaded on demand — see `loadCatalog`.
 *
 * Game vocabulary comes from the LATAM client's own English tables
 * (`/raw/items_en.json`, the `Type:`/`Position:` lines of its item tooltips):
 * Shield, Headgear, Armor, Shoes, Garment, Accessory, Munition, Card, Costume and
 * Shadow Equipment. Those are the words the client prints, so they stay even where
 * another server's wiki says something slightly different.
 *
 * Typed against the pt-BR key set and deliberately `Partial`: a key missing here
 * falls back to Portuguese instead of showing a raw key.
 */
import type { TranslatedCatalog } from '.';

export const catalog: TranslatedCatalog = {
  'common.yes': 'Yes',
  'common.no': 'No',

  'locale.label': 'Language',

  'ui.loading': 'Loading',
  'ui.select.clearSelection': 'Clear selection',
  'ui.select.openOptions': 'Open options',
  'ui.select.closeOptions': 'Close options',
  'ui.select.selectAll': 'Select all',
  'ui.select.filterOptions': 'Filter options',
  'ui.select.clearSearch': 'Clear search',
  'ui.select.emptyFilter': 'No results found',
  'ui.select.selectedCount': '{0} selected',
  'ui.table.pagination': 'Pagination',
  'ui.table.firstPage': 'First page',
  'ui.table.previousPage': 'Previous page',
  'ui.table.nextPage': 'Next page',
  'ui.table.lastPage': 'Last page',
  'ui.table.page': 'Page {number}',
  'ui.table.currentPageReport': '{currentPage} of {totalPages}',
  'ui.dialog.close': 'Close',
  'ui.toast.close': 'Close notification',
  'ui.confirm.header': 'Confirmation',

  'topbar.settings': 'Settings',

  'itemSearch.title': 'Search items',
  'itemSearch.filters': 'Filters',
  'itemSearch.name': 'Name',
  'itemSearch.namePlaceholder': 'Item name',
  'itemSearch.type': 'Type',
  'itemSearch.typePlaceholder': 'All types',
  'itemSearch.skill': 'Skill',
  'itemSearch.skillPlaceholder': 'All skills',
  'itemSearch.server': 'Server',
  'itemSearch.onlyCurrentLevel': 'Only items for the current level ({level}) or lower',
  'itemSearch.bonuses': 'Bonuses',
  'itemSearch.bonusNumber': 'Bonus {number}',
  'itemSearch.addBonus': 'Add bonus',
  'itemSearch.removeBonus': 'Remove bonus {number}',
  'itemSearch.matchAllBonuses': 'Item must include every selected bonus',
  'itemSearch.search': 'Search',
  'itemSearch.results': 'Results',
  'itemSearch.resultCount': '{totalRecords} items',
  'itemSearch.noResults': 'No items found.',
  'itemSearch.description': 'Description',
  'itemSearch.itemDescription': 'Item description',
  'itemSearch.selectPrompt': 'Select an item from the list to see its bonuses and description.',
  'itemSearch.customItem': 'Custom item · ID {id}',
  'itemSearch.itemId': 'Item ID: {id}',
  'itemSearch.market': 'Market',
  'itemSearch.equipTarget': 'Equip on',
  'itemSearch.equip': 'Equip',
  'itemSearch.equipInComparison': 'Equip in comparison',
  'itemSearch.noCompatibleSlot': 'No compatible slot available in the current equipment.',

  'itemPosition.weaponList': 'Weapon',
  'itemPosition.ammoList': 'Munition',
  'itemPosition.weaponCardList': 'Weapon Card',
  'itemPosition.shieldList': 'Shield',
  'itemPosition.shieldCardList': 'Shield Card',
  'itemPosition.headUpperList': 'Upper',
  'itemPosition.headMiddleList': 'Middle',
  'itemPosition.headLowerList': 'Lower',
  'itemPosition.headCardList': 'Headgear Card',
  'itemPosition.enchants': 'Enchant Stone',
  'itemPosition.armorList': 'Armor',
  'itemPosition.armorCardList': 'Armor Card',
  'itemPosition.garmentList': 'Garment',
  'itemPosition.garmentCardList': 'Garment Card',
  'itemPosition.bootList': 'Shoes',
  'itemPosition.bootCardList': 'Shoes Card',
  'itemPosition.accList': 'Accessory',
  'itemPosition.accCardList': 'Accessory Card',
  'itemPosition.petList': 'Pet',
  'itemPosition.costumeList': 'Costume',
  'itemPosition.shadowWeaponList': 'Shadow Weapon',
  'itemPosition.shadowArmorList': 'Shadow Armor',
  'itemPosition.shadowShieldList': 'Shadow Shield',
  'itemPosition.shadowBootList': 'Shadow Shoes',
  'itemPosition.shadowEarringList': 'Shadow Earring',
  'itemPosition.shadowPendantList': 'Shadow Pendant',
};
