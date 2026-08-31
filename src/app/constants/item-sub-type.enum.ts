export enum ItemSubTypeId {
  Gatling_Gun = 275,
  Arrow = 1024,
  Cannonball = 1025,
  Kunai = 1026,
  Bullet = 1027,
  /**
   * Throwing daggers — rAthena's `SubType: Dagger` under `Type: Ammo`. Only the Faca
   * Envenenada (1771) is one, and only the Sicário line can carry it.
   *
   * The 1024+ block is this project's own numbering for the ammo families, assigned in the
   * order they were added rather than copied from any client table, so 1028 is simply the
   * next free value. Nothing outside this enum and `item.json` reads these.
   */
  ThrowingDagger = 1028,
  Upper = 512,
  Shield = 514,
  Armor = 513,
  Garment = 515,
  Boot = 516,
  Acc = 517,
  Acc_R = 510,
  Acc_L = 511,
  Special = 768,
  Pet = 518,
  Enchant = 0,

  CostumeUpper = 519,
  CostumeMiddle = 520,
  CostumeLower = 521,
  CostumeGarment = 522,

  CostumeEnhUpper = 71,
  CostumeEnhMiddle = 72,
  CostumeEnhLower = 73,
  CostumeEnhGarment = 74,
  CostumeEnhGarment2 = 76,
  CostumeEnhGarment4 = 75,

  ShadowWeapon = 280,
  ShadowArmor = 526,
  ShadowShield = 527,
  ShadowBoot = 528,
  ShadowEarring = 529,
  ShadowPendant = 530,
}
