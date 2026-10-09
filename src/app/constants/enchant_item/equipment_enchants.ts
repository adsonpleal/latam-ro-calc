import { ItemModel } from '../../models/item.model';

/**
 * ATQM 1 (4883) and Mortal 1 (29047) serve as both costume stones and equipment
 * enchants in Túmulo do Monarca. Keep their costume classification and combos,
 * while making them available to equipment enchant pickers too.
 * https://browiki.org/wiki/T%C3%BAmulo_do_Monarca#Encantamento
 */
export const isEquipmentEnchant = (item: Pick<ItemModel, 'id' | 'itemTypeId'>): boolean =>
  item.itemTypeId === 11 || item.id === 4883 || item.id === 29047;
