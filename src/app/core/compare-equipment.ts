import { SLOTS_BY_KEY } from '../app-config/equipment-slots';
import { ItemTypeEnum, MainItemWithRelations } from '../constants/item-type.enum';
import { DEFAULT_PET_LOYALTY } from '../constants/pet-loyalty';
import { ItemModel } from '../models/item.model';
import { MainModel } from '../models/main.model';
import { copyStatsFields } from './compare-state';
import { ensureCustomAttachment } from './custom-attachments';
import { isCustomItem } from './custom-items';

/** Rebuild the comparison's equipment and visible slots without reading UI state. */
export function prepareCompareEquipment(input: {
  source: Record<string, any>; itemNames: ItemTypeEnum[]; itemOrder: readonly string[];
  items: Record<number, ItemModel>; leftWeaponShown: boolean; compareStats: boolean;
}) {
  const { source, itemNames, itemOrder, items, leftWeaponShown, compareStats } = input;
  const model: Record<string, any> = {
    rawOptionTxts: source?.['rawOptionTxts'] || [], customAttachments: {},
    autoCastSelections: { ...(source?.['autoCastSelections'] ?? {}) },
  };
  const equipped = new Map<ItemTypeEnum, number>();
  const offered: Partial<Record<ItemTypeEnum, boolean>> = {};
  // Preserve the original ordering of the persisted selection as well as its rows.
  itemNames.sort((a, b) => itemOrder.indexOf(a) > itemOrder.indexOf(b) ? 1 : -1);
  for (const slotKey of itemNames) {
    const visible = slotKey !== ItemTypeEnum.leftWeapon || leftWeaponShown;
    offered[slotKey] = visible;
    model[slotKey] = source[slotKey] || null;
    const present = model[slotKey] != null;
    if (present && isCustomItem(items[model[slotKey]])) {
      model['customAttachments'][slotKey] = structuredClone(ensureCustomAttachment(source as MainModel, slotKey, items[model[slotKey]]));
    }
    if (present && visible) equipped.set(slotKey, model[slotKey]);
    for (const related of MainItemWithRelations[slotKey]) {
      model[related] = present ? source[related] || null : null;
      if (model[related] && visible) equipped.set(related, model[related]);
    }
    const slot = SLOTS_BY_KEY.get(slotKey);
    if (slot?.loyalty) model['petLoyalty'] = present ? source['petLoyalty'] || DEFAULT_PET_LOYALTY : null;
    if (slot?.converter) model['propertyAtk'] = present ? source['propertyAtk'] || null : null;
    if (slot?.ammo) model['ammo'] = present ? source['ammo'] || null : null;
    model[`${slotKey}Refine`] = present ? source[`${slotKey}Refine`] || 0 : null;
    model[`${slotKey}Grade`] = present ? source[`${slotKey}Grade`] || null : null;
  }
  if (compareStats) copyStatsFields(source, model);
  return { model, equipped, offered };
}
