export const AllowedCompareItemTypes = [
  'weapon',
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