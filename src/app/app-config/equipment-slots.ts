import { AllowedCompareItemTypes } from './allowed-compare-item-types';
import { ItemOptionNumber } from '../constants/item-option-number.enum';
import { ItemSlotLabelPtBr } from '../constants/item-slot-i18n';
import { ItemTypeEnum } from '../constants/item-type.enum';

/**
 * The equipment picker, as data.
 *
 * Every slot used to be a hand-written `<app-equipment>` tag with ~20 explicit bindings,
 * repeated once for the main build and once for the comparison. This table says the same
 * thing once, and `<app-equipment-grid>` renders it. Adding a slot — or an enchant
 * position to a slot — is an entry here, not two blocks of markup.
 *
 * `equipment-slots.spec.ts` holds every field to the enums it mirrors, so a drift between
 * this table and `ItemTypeEnum` / `MainItemWithRelations` / `AllowedCompareItemTypes` /
 * `ItemOptionNumber` fails the suite rather than the screen.
 */

/** Which heading a card sits under. */
export type SlotGroup = 'equip' | 'costume' | 'shadow' | 'pet';

/**
 * Where a slot's refine list comes from. `accessory` is the odd one: an accessory is
 * refinable only when the chosen item says so, which is why it cannot be a static list.
 */
export type RefineRule = 'none' | 'equip' | 'shadow' | 'accessory';

/** How many Bônus Aleatório slots the item offers. */
export type OptionSlotSource = 'weapon' | 'table' | 'none';

/** What gates the whole card. Mirrors the `[hidden]` expressions the old markup carried. */
export type SlotVisibility = 'always' | 'leftWeapon' | 'shield';

/**
 * A picker that lives inside another slot's card but is a slot of its own in the model —
 * the costume enchants. They are ordinary items chosen from their own list (not
 * enchant-table positions), and each is separately comparable.
 */
export interface SubItemSlot {
  key: ItemTypeEnum;
  /** Chip placeholder, e.g. "Encant. Topo". */
  label: string;
  /** Name of the RoCalculatorComponent field holding the option list. */
  itemListKey: string;
  comparable: boolean;
}

export interface EquipmentSlotDescriptor {
  /** Model field holding the item id. Also the name the update buses speak. */
  key: ItemTypeEnum;
  /** pt-BR card heading. */
  label: string;
  group: SlotGroup;
  /** Name of the RoCalculatorComponent field holding the item list. */
  itemListKey: string;
  /** Name of the RoCalculatorComponent field holding the card list, when the slot sockets cards. */
  cardListKey?: string;
  /** Card model fields, in order. Empty when the slot has no socket at all. */
  cardFields: ItemTypeEnum[];
  /**
   * Model fields for enchant-table positions 0-3, in that order. `null` marks a position
   * the slot does not expose: only weapons reach position 0, and shadow gear only 2-3.
   */
  enchantFields: (ItemTypeEnum | null)[];
  refine: RefineRule;
  /** Whether an Enchant Grade can be picked (still gated at runtime by `item.canGrade`). */
  grade: boolean;
  /** `rawOptionTxts` indexes, in display order. */
  optionIndexes: ItemOptionNumber[];
  optionSlotSource: OptionSlotSource;
  /** Element converter chip — the main weapon only. */
  converter?: true;
  /** Ammo chip — the main weapon only. */
  ammo?: true;
  /** Pet loyalty chip. */
  loyalty?: true;
  /** Takes part in the multi-slot head gear occupancy rule. */
  headSlot?: true;
  /** Whether `key` itself may be compared. Sub slots carry their own flag. */
  comparable: boolean;
  visibility: SlotVisibility;
  /** Pickers rendered inside this card that are separate slots in the model. */
  subItemSlots?: SubItemSlot[];
}

const labelOf = (key: ItemTypeEnum) => ItemSlotLabelPtBr[key] ?? key;
const canCompare = (key: ItemTypeEnum) => (AllowedCompareItemTypes as readonly string[]).includes(key);

/** weapon / leftWeapon: 4 cards, all four enchant positions. */
const weaponLike = (
  key: ItemTypeEnum.weapon | ItemTypeEnum.leftWeapon,
  itemListKey: string,
  optionIndexes: ItemOptionNumber[],
  visibility: SlotVisibility,
): EquipmentSlotDescriptor => ({
  key,
  label: labelOf(key),
  group: 'equip',
  itemListKey,
  cardListKey: 'weaponCardList',
  cardFields: [1, 2, 3, 4].map((n) => `${key}Card${n}` as ItemTypeEnum),
  enchantFields: [0, 1, 2, 3].map((n) => `${key}Enchant${n}` as ItemTypeEnum),
  refine: 'equip',
  grade: true,
  optionIndexes,
  optionSlotSource: 'weapon',
  comparable: canCompare(key),
  visibility,
});

/** Everything from the shield down to the accessories: 1 card, enchant positions 1-3. */
const gearLike = (
  key: ItemTypeEnum,
  itemListKey: string,
  cardListKey: string,
  refine: RefineRule,
  optionIndexes: ItemOptionNumber[],
  extra: Partial<EquipmentSlotDescriptor> = {},
): EquipmentSlotDescriptor => ({
  key,
  label: labelOf(key),
  group: 'equip',
  itemListKey,
  cardListKey,
  cardFields: [`${key}Card` as ItemTypeEnum],
  enchantFields: [null, ...[1, 2, 3].map((n) => `${key}Enchant${n}` as ItemTypeEnum)],
  refine,
  grade: true,
  optionIndexes,
  optionSlotSource: 'table',
  comparable: canCompare(key),
  visibility: 'always',
  ...extra,
});

/** Shadow gear: no cards, no grade, enchant positions 2-3 only, two option slots. */
const shadowLike = (key: ItemTypeEnum, itemListKey: string, optionIndexes: ItemOptionNumber[]): EquipmentSlotDescriptor => ({
  key,
  label: labelOf(key),
  group: 'shadow',
  itemListKey,
  cardFields: [],
  enchantFields: [null, null, `${key}Enchant2` as ItemTypeEnum, `${key}Enchant3` as ItemTypeEnum],
  refine: 'shadow',
  grade: false,
  optionIndexes,
  optionSlotSource: 'table',
  comparable: canCompare(key),
  visibility: 'always',
});

/** A costume visual and the enchants that ride on it, drawn as one card. */
const costumeLike = (
  key: ItemTypeEnum,
  itemListKey: string,
  subItemSlots: SubItemSlot[],
  headSlot?: true,
): EquipmentSlotDescriptor => ({
  key,
  label: labelOf(key),
  group: 'costume',
  itemListKey,
  cardFields: [],
  enchantFields: [],
  refine: 'none',
  grade: false,
  optionIndexes: [],
  optionSlotSource: 'none',
  comparable: canCompare(key),
  visibility: 'always',
  subItemSlots,
  ...(headSlot ? { headSlot } : {}),
});

const costumeEnchant = (key: ItemTypeEnum, label: string, itemListKey: string): SubItemSlot => ({
  key,
  label,
  itemListKey,
  comparable: canCompare(key),
});

export const EQUIPMENT_SLOTS: readonly EquipmentSlotDescriptor[] = [
  {
    ...weaponLike(
      ItemTypeEnum.weapon,
      'weaponList',
      [ItemOptionNumber.W_Left_1, ItemOptionNumber.W_Left_2, ItemOptionNumber.W_Left_3],
      'always',
    ),
    converter: true,
    ammo: true,
  },
  weaponLike(
    ItemTypeEnum.leftWeapon,
    'leftWeaponList',
    [ItemOptionNumber.W_Right_1, ItemOptionNumber.W_Right_2, ItemOptionNumber.W_Right_3],
    'leftWeapon',
  ),
  gearLike(ItemTypeEnum.shield, 'shieldList', 'shieldCardList', 'equip', [ItemOptionNumber.Shield_1, ItemOptionNumber.Shield_2], {
    visibility: 'shield',
  }),
  gearLike(ItemTypeEnum.headUpper, 'headUpperList', 'headCardList', 'equip', [ItemOptionNumber.H_Upper_1, ItemOptionNumber.H_Upper_2], {
    headSlot: true,
  }),
  // No refine on the middle and lower positions: neither binds a refine list today, and
  // neither has a `*Refine` model field the calculator reads.
  gearLike(
    ItemTypeEnum.headMiddle,
    'headMiddleList',
    'headCardList',
    'none',
    [ItemOptionNumber.H_Mid_1, ItemOptionNumber.H_Mid_2, ItemOptionNumber.H_Mid_3],
    { headSlot: true },
  ),
  gearLike(ItemTypeEnum.headLower, 'headLowerList', 'headCardList', 'none', [ItemOptionNumber.H_Low_1, ItemOptionNumber.H_Low_2], {
    headSlot: true,
  }),
  gearLike(ItemTypeEnum.armor, 'armorList', 'armorCardList', 'equip', [
    ItemOptionNumber.Armor_1,
    ItemOptionNumber.Armor_2,
    ItemOptionNumber.Armor_3,
  ]),
  gearLike(ItemTypeEnum.garment, 'garmentList', 'garmentCardList', 'equip', [ItemOptionNumber.Garment_1, ItemOptionNumber.Garment_2]),
  // Boots take no random options at all: ItemOptionNumber has no Boot_* slot number, so
  // there is nowhere in rawOptionTxts to put one. The old picker drew the dropdowns anyway.
  gearLike(ItemTypeEnum.boot, 'bootList', 'bootCardList', 'equip', []),
  gearLike(ItemTypeEnum.accRight, 'accRightList', 'accRightCardList', 'accessory', [
    ItemOptionNumber.A_Right_1,
    ItemOptionNumber.A_Right_2,
  ]),
  gearLike(ItemTypeEnum.accLeft, 'accLeftList', 'accLeftCardList', 'accessory', [ItemOptionNumber.A_Left_1, ItemOptionNumber.A_Left_2]),

  costumeLike(
    ItemTypeEnum.costumeUpper,
    'costumeUpperList',
    [costumeEnchant(ItemTypeEnum.costumeEnchantUpper, 'Encant. Topo', 'costumeEnhUpperList')],
    true,
  ),
  costumeLike(
    ItemTypeEnum.costumeMiddle,
    'costumeMiddleList',
    [costumeEnchant(ItemTypeEnum.costumeEnchantMiddle, 'Encant. Meio', 'costumeEnhMiddleList')],
    true,
  ),
  costumeLike(
    ItemTypeEnum.costumeLower,
    'costumeLowerList',
    [costumeEnchant(ItemTypeEnum.costumeEnchantLower, 'Encant. Baixo', 'costumeEnhLowerList')],
    true,
  ),
  costumeLike(ItemTypeEnum.costumeGarment, 'costumeGarmentList', [
    costumeEnchant(ItemTypeEnum.costumeEnchantGarment, 'Encant. 1', 'costumeEnhGarmentList'),
    costumeEnchant(ItemTypeEnum.costumeEnchantGarment2, 'Encant. 2', 'costumeEnhGarment2List'),
    costumeEnchant(ItemTypeEnum.costumeEnchantGarment4, 'Encant. 4', 'costumeEnhGarment4List'),
  ]),

  shadowLike(ItemTypeEnum.shadowWeapon, 'shadowWeaponList', [ItemOptionNumber.SD_Wp_1, ItemOptionNumber.SD_Wp_2]),
  shadowLike(ItemTypeEnum.shadowShield, 'shadowShieldList', [ItemOptionNumber.SD_Sh_1, ItemOptionNumber.SD_Sh_2]),
  shadowLike(ItemTypeEnum.shadowArmor, 'shadowArmorList', [ItemOptionNumber.SD_Ar_1, ItemOptionNumber.SD_Ar_2]),
  shadowLike(ItemTypeEnum.shadowBoot, 'shadowBootList', [ItemOptionNumber.SD_B_1, ItemOptionNumber.SD_B_2]),
  shadowLike(ItemTypeEnum.shadowEarring, 'shadowEarringList', [ItemOptionNumber.SD_Ear_1, ItemOptionNumber.SD_Ear_2]),
  shadowLike(ItemTypeEnum.shadowPendant, 'shadowPendantList', [ItemOptionNumber.SD_Pan_1, ItemOptionNumber.SD_Pan_2]),

  {
    key: ItemTypeEnum.pet,
    label: labelOf(ItemTypeEnum.pet),
    group: 'pet',
    itemListKey: 'petList',
    cardFields: [],
    enchantFields: [],
    refine: 'none',
    grade: false,
    optionIndexes: [],
    optionSlotSource: 'none',
    loyalty: true,
    comparable: canCompare(ItemTypeEnum.pet),
    visibility: 'always',
  },
];

export const SLOTS_BY_KEY: ReadonlyMap<ItemTypeEnum, EquipmentSlotDescriptor> = new Map(
  EQUIPMENT_SLOTS.map((slot) => [slot.key, slot]),
);

export const SLOT_GROUP_LABELS: Record<SlotGroup, string> = {
  equip: 'Equipamento',
  costume: 'Visuais',
  shadow: 'Equipamentos Sombrios',
  pet: 'Pet',
};

/** Group order on screen, top to bottom within a column. */
export const SLOT_GROUP_ORDER: readonly SlotGroup[] = ['equip', 'costume', 'shadow', 'pet'];

/**
 * Every slot key a card can put into the comparison — its own plus its sub slots. A
 * costume card carries no comparable item of its own (visuals are cosmetic), only its
 * enchants, which is why the two are kept apart.
 */
export const comparableKeysOf = (slot: EquipmentSlotDescriptor): ItemTypeEnum[] => [
  ...(slot.comparable ? [slot.key] : []),
  ...(slot.subItemSlots ?? []).filter((sub) => sub.comparable).map((sub) => sub.key),
];
