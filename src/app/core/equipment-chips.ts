import { EquipmentSlotDescriptor } from '../app-config/equipment-slots';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { SlotDerivation } from './equipment-slot-derivation';

/**
 * How a slot card lays its pickers out: which chips exist, in which row, in which order.
 *
 * Structure only — a chip says what it writes and what to show when it is empty. Turning
 * one into a label, an icon and a colour needs the item map and the option lists, so that
 * stays in the card component; this part is pure so the layout rules can be tested.
 */

export type ChipKind = 'item' | 'subItem' | 'refine' | 'grade' | 'loyalty' | 'converter' | 'ammo' | 'card' | 'enchant' | 'option';

export interface Chip {
  kind: ChipKind;
  /** Slot key this chip belongs to — the card's own, or one of its sub slots. */
  slotKey: ItemTypeEnum;
  /** Model field the chip writes. Absent on `option`, which writes into rawOptionTxts. */
  field?: string;
  /** rawOptionTxts index — `option` only. */
  optionIndex?: number;
  /** Position within its own kind: card socket, enchant position, option number. */
  index: number;
  /** Shown when the chip is empty. */
  placeholder: string;
  /** The item chip, drawn larger than the rest. */
  primary?: boolean;
}

export interface ChipContext {
  variant: 'main' | 'compare';
  /** Compare only: the slot keys actually in the comparison. */
  comparing?: ReadonlySet<string>;
  /** Weapon only: false when the class or the weapon takes no ammo (hiddenMap.ammu). */
  showAmmo?: boolean;
}

const cardPlaceholder = (slot: EquipmentSlotDescriptor, index: number) =>
  slot.cardFields.length > 1 ? `Carta ${index + 1}` : 'Carta';

/**
 * Enchant chips keep the position number the old dropdowns showed ("Encantamento 2" for
 * the first one an armour offers), so a build people know still reads the same.
 */
const enchantPlaceholder = (index: number) => `Encant. ${index + 1}`;

export function buildChipRows(
  descriptor: EquipmentSlotDescriptor,
  model: Record<string, any>,
  derivation: SlotDerivation,
  ctx: ChipContext,
): Chip[][] {
  const isCompare = ctx.variant === 'compare';
  // In the comparison a card draws only what is actually being compared. A costume card
  // owns no comparable item of its own — just its enchants — so this is what collapses it
  // to the enchant chips alone.
  const showsOwnItem = !isCompare || !!ctx.comparing?.has(descriptor.key);
  const hasItem = !!model[descriptor.key];

  const row1: Chip[] = [];
  const row2: Chip[] = [];
  const row3: Chip[] = [];

  const chip = (kind: ChipKind, field: string | undefined, index: number, placeholder: string, slotKey = descriptor.key): Chip => ({
    kind,
    slotKey,
    field,
    index,
    placeholder,
  });

  if (showsOwnItem) {
    if (hasItem && derivation.refineList.length) row1.push(chip('refine', `${descriptor.key}Refine`, 0, '+ 0'));
    if (hasItem && derivation.gradeList.length) row1.push(chip('grade', `${descriptor.key}Grade`, 0, 'Grau'));

    row1.push({ ...chip('item', descriptor.key, 0, descriptor.label), primary: true });

    if (hasItem) {
      if (descriptor.loyalty) row1.push(chip('loyalty', 'petLoyalty', 0, 'Lealdade'));
      // Neither the converter nor the ammo has a model2 field: they belong to the build,
      // not to the slot being compared, which is why the old compare row never had them.
      if (descriptor.converter && !isCompare) row1.push(chip('converter', 'propertyAtk', 0, 'Conversor'));
      if (descriptor.ammo && !isCompare && ctx.showAmmo) row1.push(chip('ammo', ItemTypeEnum.ammo, 0, 'Munição'));

      descriptor.cardFields.slice(0, derivation.cardSlots).forEach((field, index) => {
        row2.push(chip('card', field, index, cardPlaceholder(descriptor, index)));
      });

      derivation.enchantLists.forEach((list, index) => {
        const field = descriptor.enchantFields[index];
        if (!field || !list?.length) return;
        row2.push(chip('enchant', field, index, enchantPlaceholder(index)));
      });

      descriptor.optionIndexes.slice(0, derivation.optionSlots).forEach((optionIndex, index) => {
        row3.push({ ...chip('option', undefined, index, `Bônus ${index + 1}`), optionIndex });
      });
    }
  }

  for (const sub of descriptor.subItemSlots ?? []) {
    if (isCompare && !ctx.comparing?.has(sub.key)) continue;
    row2.push(chip('subItem', sub.key, 0, sub.label, sub.key));
  }

  // The third row exists to keep the random options off the cards-and-enchants line. With
  // no enchants there is nothing to keep them off, so they move up.
  const hasEnchantChips = row2.some((c) => c.kind === 'enchant');
  const rows = hasEnchantChips ? [row1, row2, row3] : [row1, [...row2, ...row3], []];

  return rows.filter((row) => row.length > 0);
}
