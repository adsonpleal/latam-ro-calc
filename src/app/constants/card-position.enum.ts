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
