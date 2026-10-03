import { EquipmentSlotDescriptor, SLOTS_BY_KEY } from '../app-config/equipment-slots';
import { ItemModel } from '../models/item.model';
import { getHeadGearSlots } from '../utils/head-gear-slots';

/** Put every occupied position's stone picker on the card holding the costume. */
export function costumeSlotDescriptor(slot: EquipmentSlotDescriptor, item: ItemModel | undefined): EquipmentSlotDescriptor {
  if (slot.group !== 'costume' || !slot.headSlot) return slot;
  const positions = getHeadGearSlots(item);
  if (positions.length < 2) return slot;
  return {
    ...slot,
    subItemSlots: positions.flatMap((key) => SLOTS_BY_KEY.get(key)?.subItemSlots ?? []),
  };
}
