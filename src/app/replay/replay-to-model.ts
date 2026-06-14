import { MainModel } from '../models/main.model';
import { createMainModel } from '../utils/create-main-model';
import { decodeReplay } from './rrf/decode';
import { InventoryRecord, Replay } from './rrf/types';

/**
 * rAthena `e_equip_pos` bits — the `equipped` bitmask each inventory record
 * carries (the slot the item is actually worn at, single-bit except two-handed
 * weapons and multi-slot costume headgear).
 */
const EQP = {
  HEAD_LOW: 0x1,
  HAND_R: 0x2, // weapon
  GARMENT: 0x4,
  ACC_L: 0x8,
  ARMOR: 0x10,
  HAND_L: 0x20, // shield
  SHOES: 0x40,
  ACC_R: 0x80,
  HEAD_TOP: 0x100,
  HEAD_MID: 0x200,
  COSTUME_TOP: 0x400,
  COSTUME_MID: 0x800,
  COSTUME_LOW: 0x1000,
  COSTUME_GARMENT: 0x2000,
  AMMO: 0x8000,
  SHADOW_ARMOR: 0x10000,
  SHADOW_WEAPON: 0x20000,
  SHADOW_SHIELD: 0x40000,
  SHADOW_SHOES: 0x80000,
  SHADOW_ACC_R: 0x100000,
  SHADOW_ACC_L: 0x200000,
} as const;

/**
 * Per-slot target field names in the calculator's MainModel.
 *   item   — the equipment id field
 *   refine — refine field (omitted for slots the model can't refine, e.g. mid/low headgear, costumes)
 *   cards  — the item's up-to-4 socket positions, mapped POSITIONALLY from the
 *            replay `cards[]` array. The client stores cards AND socket-enchants
 *            in the same 4-slot array, so position 0 → the card field and the
 *            rest → the enchant fields; the calculator applies each id's script
 *            regardless of which field it lands in.
 */
type SlotKey =
  | 'weapon' | 'shield' | 'armor' | 'garment' | 'boot'
  | 'accLeft' | 'accRight' | 'headUpper' | 'headMiddle' | 'headLower' | 'ammo'
  | 'costumeUpper' | 'costumeMiddle' | 'costumeLower' | 'costumeGarment'
  | 'shadowWeapon' | 'shadowArmor' | 'shadowShield' | 'shadowBoot'
  | 'shadowEarring' | 'shadowPendant';

const SLOTS: Record<SlotKey, { item: string; refine?: string; cards: string[] }> = {
  weapon: { item: 'weapon', refine: 'weaponRefine', cards: ['weaponCard1', 'weaponCard2', 'weaponCard3', 'weaponCard4'] },
  shield: { item: 'shield', refine: 'shieldRefine', cards: ['shieldCard', 'shieldEnchant1', 'shieldEnchant2', 'shieldEnchant3'] },
  armor: { item: 'armor', refine: 'armorRefine', cards: ['armorCard', 'armorEnchant1', 'armorEnchant2', 'armorEnchant3'] },
  garment: { item: 'garment', refine: 'garmentRefine', cards: ['garmentCard', 'garmentEnchant1', 'garmentEnchant2', 'garmentEnchant3'] },
  boot: { item: 'boot', refine: 'bootRefine', cards: ['bootCard', 'bootEnchant1', 'bootEnchant2', 'bootEnchant3'] },
  accLeft: { item: 'accLeft', refine: 'accLeftRefine', cards: ['accLeftCard', 'accLeftEnchant1', 'accLeftEnchant2', 'accLeftEnchant3'] },
  accRight: { item: 'accRight', refine: 'accRightRefine', cards: ['accRightCard', 'accRightEnchant1', 'accRightEnchant2', 'accRightEnchant3'] },
  headUpper: { item: 'headUpper', refine: 'headUpperRefine', cards: ['headUpperCard', 'headUpperEnchant1', 'headUpperEnchant2', 'headUpperEnchant3'] },
  headMiddle: { item: 'headMiddle', cards: ['headMiddleCard', 'headMiddleEnchant1', 'headMiddleEnchant2', 'headMiddleEnchant3'] },
  headLower: { item: 'headLower', cards: ['headLowerEnchant1', 'headLowerEnchant2', 'headLowerEnchant3'] },
  ammo: { item: 'ammo', cards: [] },
  costumeUpper: { item: 'costumeUpper', cards: ['costumeEnchantUpper'] },
  costumeMiddle: { item: 'costumeMiddle', cards: ['costumeEnchantMiddle'] },
  costumeLower: { item: 'costumeLower', cards: ['costumeEnchantLower'] },
  costumeGarment: { item: 'costumeGarment', cards: ['costumeEnchantGarment', 'costumeEnchantGarment2', 'costumeEnchantGarment4'] },
  shadowWeapon: { item: 'shadowWeapon', refine: 'shadowWeaponRefine', cards: ['shadowWeaponEnchant2', 'shadowWeaponEnchant3'] },
  shadowArmor: { item: 'shadowArmor', refine: 'shadowArmorRefine', cards: ['shadowArmorEnchant2', 'shadowArmorEnchant3'] },
  shadowShield: { item: 'shadowShield', refine: 'shadowShieldRefine', cards: ['shadowShieldEnchant2', 'shadowShieldEnchant3'] },
  shadowBoot: { item: 'shadowBoot', refine: 'shadowBootRefine', cards: ['shadowBootEnchant2', 'shadowBootEnchant3'] },
  shadowEarring: { item: 'shadowEarring', refine: 'shadowEarringRefine', cards: ['shadowEarringEnchant2', 'shadowEarringEnchant3'] },
  shadowPendant: { item: 'shadowPendant', refine: 'shadowPendantRefine', cards: ['shadowPendantEnchant2', 'shadowPendantEnchant3'] },
};

/** Resolve the worn slot(s) for an item's `equipped` bitmask. */
function resolveSlots(loc: number): SlotKey[] {
  const slots: SlotKey[] = [];
  // A two-handed weapon sets HAND_R | HAND_L on the SAME item — keep it as the
  // weapon, don't duplicate it into the shield slot.
  if (loc & EQP.HAND_R) slots.push('weapon');
  else if (loc & EQP.HAND_L) slots.push('shield');
  if (loc & EQP.ARMOR) slots.push('armor');
  if (loc & EQP.GARMENT) slots.push('garment');
  if (loc & EQP.SHOES) slots.push('boot');
  if (loc & EQP.ACC_L) slots.push('accLeft');
  if (loc & EQP.ACC_R) slots.push('accRight');
  if (loc & EQP.HEAD_TOP) slots.push('headUpper');
  if (loc & EQP.HEAD_MID) slots.push('headMiddle');
  if (loc & EQP.HEAD_LOW) slots.push('headLower');
  if (loc & EQP.AMMO) slots.push('ammo');
  // A costume headgear can span several costume-head bits; one model slot is enough.
  if (loc & EQP.COSTUME_TOP) slots.push('costumeUpper');
  else if (loc & EQP.COSTUME_MID) slots.push('costumeMiddle');
  else if (loc & EQP.COSTUME_LOW) slots.push('costumeLower');
  if (loc & EQP.COSTUME_GARMENT) slots.push('costumeGarment');
  if (loc & EQP.SHADOW_WEAPON) slots.push('shadowWeapon');
  if (loc & EQP.SHADOW_ARMOR) slots.push('shadowArmor');
  if (loc & EQP.SHADOW_SHIELD) slots.push('shadowShield');
  if (loc & EQP.SHADOW_SHOES) slots.push('shadowBoot');
  if (loc & EQP.SHADOW_ACC_R) slots.push('shadowEarring');
  if (loc & EQP.SHADOW_ACC_L) slots.push('shadowPendant');
  return slots;
}

export type ReplayImportSummary = {
  player: string;
  job: number;
  baseLevel: number;
  jobLevel: number;
  /** Equipped pieces (main gear) written into the model. */
  equippedCount: number;
  /** Main items whose id isn't in the LATAM item DB (cannot be represented). */
  skippedItems: { slot: SlotKey; itemId: number }[];
  /** Card/enchant ids dropped because they aren't in the LATAM item DB. */
  skippedCards: number;
  /** Number of learned skills (level > 0) read from the skill-tree snapshot. */
  learnedSkillCount: number;
};

export type ReplayImportResult = {
  model: MainModel;
  summary: ReplayImportSummary;
  /** Learned skill tree from the replay — client skill id → level (level > 0).
   *  Mapped onto the model's skill panels by the importer. */
  learnedSkills: Record<number, number>;
};

/** A minimal view of the calculator's item map (`item.json` keyed by id). */
type ItemMap = Record<number, { id: number } & Record<string, any>>;

/**
 * Build a calculator MainModel from a parsed replay + the calculator's item map.
 * Sets class, levels, allocated base stats and every equipped piece (refine +
 * cards + socket-enchants). Items absent from the LATAM DB are skipped and
 * reported. Random options and 4th-job traits are not present in the replay and
 * are left at their defaults.
 */
export function replayToModel(replay: Replay, itemMap: ItemMap): ReplayImportResult {
  const s = replay.sessionInfo;
  const model = createMainModel();
  model.class = s.job;
  model.level = s.baseLevel || model.level;
  model.jobLevel = s.jobLevel || model.jobLevel;
  model.str = s.str || 0;
  model.agi = s.agi || 0;
  model.vit = s.vit || 0;
  model.int = s.int || 0;
  model.dex = s.dex || 0;
  model.luk = s.luk || 0;

  const known = (id: number) => id > 0 && !!itemMap[id];
  const skippedItems: ReplayImportSummary['skippedItems'] = [];
  let skippedCards = 0;
  let equippedCount = 0;

  for (const rec of replay.initialInventory.values()) {
    if (!rec.equipped) continue;
    for (const slotKey of resolveSlots(rec.equipped)) {
      const def = SLOTS[slotKey];
      if (!known(rec.itemId)) {
        skippedItems.push({ slot: slotKey, itemId: rec.itemId });
        continue;
      }
      (model as any)[def.item] = rec.itemId;
      if (def.refine) (model as any)[def.refine] = rec.refine || 0;
      writeCards(model, def.cards, rec, () => skippedCards++);
      equippedCount++;
    }
  }

  const learnedSkills: Record<number, number> = {};
  for (const [id, lvl] of replay.learnedSkills) learnedSkills[id] = lvl;

  return {
    model,
    summary: {
      player: s.player,
      job: s.job,
      baseLevel: s.baseLevel,
      jobLevel: s.jobLevel,
      equippedCount,
      skippedItems,
      skippedCards,
      learnedSkillCount: Object.keys(learnedSkills).length,
    },
    learnedSkills,
  };

  function writeCards(m: MainModel, fields: string[], rec: InventoryRecord, onSkip: () => void) {
    // Map the replay's 4 socket positions onto this slot's card/enchant fields
    // positionally. Ids not in the LATAM DB can't be applied, so they're dropped.
    for (let i = 0; i < fields.length && i < rec.cards.length; i++) {
      const id = rec.cards[i];
      if (!id) continue;
      if (known(id)) (m as any)[fields[i]] = id;
      else onSkip();
    }
  }
}

/** Convenience: parse raw replay bytes straight into a calculator model. */
export function importReplayBuffer(buf: ArrayBuffer, itemMap: ItemMap): ReplayImportResult {
  return replayToModel(decodeReplay(buf), itemMap);
}
