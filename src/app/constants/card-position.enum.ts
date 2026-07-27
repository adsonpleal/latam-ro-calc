export enum CardPosition {
  Weapon = 0,
  Head = 769,
  Shield = 32,
  Armor = 16,
  Garment = 4,
  Boot = 64,
  Acc = 136,
  AccL = 128,
  AccR = 8,
  // Sentinel (not a real equip bitmask): items that fit ANY slot's card socket,
  // e.g. the Essências de Morroc. Routed into every card picker.
  All = -1,
}

/**
 * Tag prepended to a side-locked accessory card in the card pickers, so a card that only
 * fits one hand is recognisable in the list it is offered in. The client calls the slots
 * "Aces. Direito" / "Aces. Esquerdo"; these used to read "[Right]" / "[Left]", the only
 * untranslated strings left in those dropdowns.
 */
export const ACC_SIDE_PREFIX = {
  right: '[Direito]',
  left: '[Esquerdo]',
} as const;
