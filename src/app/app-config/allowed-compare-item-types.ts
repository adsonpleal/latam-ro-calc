export const AllowedCompareItemTypes = [
  'weapon',

  // The off-hand weapon shares its hand with the shield, and a two-handed weapon takes
  // that hand for itself. Only one of the three can be worn, so the compare pass evicts
  // the losers instead of stacking them (see prepare() in ro-calculator.component.ts).
  'leftWeapon',

  'shield',
  'headUpper',
  'headMiddle',
  'headLower',
  'armor',
  'garment',
  'boot',
  'accRight',
  'accLeft',

  // The pet is not worn, but it is a bonus source chosen one at a time like any slot, so
  // "which egg is worth more here" is the same question every other row answers. Its
  // loyalty tier travels with it (see the compare loop in ro-calculator.component.ts):
  // the tiers replace one another rather than stacking, so an egg without its tier is a
  // different bonus, not a smaller one.
  'pet',

  'costumeEnchantUpper',
  'costumeEnchantMiddle',
  'costumeEnchantLower',
  'costumeEnchantGarment',
  'costumeEnchantGarment2',
  'costumeEnchantGarment4',

  'shadowWeapon',
  'shadowShield',
  'shadowArmor',
  'shadowBoot',
  'shadowEarring',
  'shadowPendant',
] as const;