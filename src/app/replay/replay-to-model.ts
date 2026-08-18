import { ItemOptionMap } from '../constants/item-options-table';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { ItemTypeId } from '../constants/item.const';
import { PetLoyalty, petLoyaltyFromIntimacy } from '../constants/pet-loyalty';
import { MainModel } from '../models/main.model';
import { createMainModel } from '../utils/create-main-model';
import { PET_EGG_BY_VIEW } from './pet-egg-map';
import { randomOptionToScript } from './random-option-map';
import { resolveAspdPotionFromStatus, resolveBuffsFromStatus } from './replay-buffs';
import { ReplayTraits, TRAIT_KEYS, readReplayTraits } from './replay-traits';
import { decodeReplay } from 'rrfparser';
import { InventoryRecord, RandomOption, Replay } from 'rrfparser';

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
 *   grade  — Enchant Grade field (omitted for the slots the model can't grade: ammo,
 *            costumes and shadow gear)
 *   cards  — the item's up-to-4 socket positions, mapped POSITIONALLY from the
 *            replay `cards[]` array. The client stores cards AND socket-enchants
 *            in the same 4-slot array, so position 0 → the card field and the
 *            rest → the enchant fields; the calculator applies each id's script
 *            regardless of which field it lands in.
 */
type SlotKey =
  | 'weapon' | 'leftWeapon' | 'shield' | 'armor' | 'garment' | 'boot'
  | 'accLeft' | 'accRight' | 'headUpper' | 'headMiddle' | 'headLower' | 'ammo'
  | 'costumeUpper' | 'costumeMiddle' | 'costumeLower' | 'costumeGarment'
  | 'shadowWeapon' | 'shadowArmor' | 'shadowShield' | 'shadowBoot'
  | 'shadowEarring' | 'shadowPendant';

const SLOTS: Record<SlotKey, { item: string; refine?: string; grade?: string; cards: string[] }> = {
  weapon: { item: 'weapon', refine: 'weaponRefine', grade: 'weaponGrade', cards: ['weaponCard1', 'weaponCard2', 'weaponCard3', 'weaponCard4'] },
  leftWeapon: { item: 'leftWeapon', refine: 'leftWeaponRefine', grade: 'leftWeaponGrade', cards: ['leftWeaponCard1', 'leftWeaponCard2', 'leftWeaponCard3', 'leftWeaponCard4'] },
  shield: { item: 'shield', refine: 'shieldRefine', grade: 'shieldGrade', cards: ['shieldCard', 'shieldEnchant1', 'shieldEnchant2', 'shieldEnchant3'] },
  armor: { item: 'armor', refine: 'armorRefine', grade: 'armorGrade', cards: ['armorCard', 'armorEnchant1', 'armorEnchant2', 'armorEnchant3'] },
  garment: { item: 'garment', refine: 'garmentRefine', grade: 'garmentGrade', cards: ['garmentCard', 'garmentEnchant1', 'garmentEnchant2', 'garmentEnchant3'] },
  boot: { item: 'boot', refine: 'bootRefine', grade: 'bootGrade', cards: ['bootCard', 'bootEnchant1', 'bootEnchant2', 'bootEnchant3'] },
  accLeft: { item: 'accLeft', refine: 'accLeftRefine', grade: 'accLeftGrade', cards: ['accLeftCard', 'accLeftEnchant1', 'accLeftEnchant2', 'accLeftEnchant3'] },
  accRight: { item: 'accRight', refine: 'accRightRefine', grade: 'accRightGrade', cards: ['accRightCard', 'accRightEnchant1', 'accRightEnchant2', 'accRightEnchant3'] },
  headUpper: { item: 'headUpper', refine: 'headUpperRefine', grade: 'headUpperGrade', cards: ['headUpperCard', 'headUpperEnchant1', 'headUpperEnchant2', 'headUpperEnchant3'] },
  headMiddle: { item: 'headMiddle', grade: 'headMiddleGrade', cards: ['headMiddleCard', 'headMiddleEnchant1', 'headMiddleEnchant2', 'headMiddleEnchant3'] },
  headLower: { item: 'headLower', grade: 'headLowerGrade', cards: ['headLowerCard', 'headLowerEnchant1', 'headLowerEnchant2', 'headLowerEnchant3'] },
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

/**
 * A worn slot plus the position in the inventory record's shared `cards[]`
 * array where this slot's enchant(s) begin. `cardOffset` is 0 for every normal
 * slot; it only matters for a single item that spans multiple costume-head
 * slots (see `resolveSlots`).
 *
 * `packed` drops the positional reading altogether and takes the record's
 * non-zero cards in order — for slots whose card array is filled from 0 rather
 * than keyed by position (see `resolveSlots`).
 */
type ResolvedSlot = { key: SlotKey; cardOffset: number; packed?: boolean };

/**
 * Field names for a weapon's 4 socket positions, split by the weapon's real card
 * slot count. Unlike other gear (one card + dedicated enchant fields), a weapon
 * can carry up to 4 *cards* AND stores its enchants in the same `cards[]` array:
 * the first `slots` positions are cards, the rest are enchants. The calculator
 * models those as separate fields — `weaponCard1..4` (socket pickers, only shown
 * up to the weapon's slot count) and `weaponEnchant0..3` (enchant pickers, indexed
 * by socket position, matching the kRO enchant table). So position `p` maps to
 * `weaponCard{p+1}` when it's a card slot, else `weaponEnchant{p}`.
 *
 * This is why a replay-imported weapon enchant (e.g. Cecil's Memory on a 2-slot
 * Sharp Star, at position 2) must land in `weaponEnchant2`, not `weaponCard3`: the
 * card slot picker doesn't list enchants (so it can't show the value, and the
 * calc double-counts it if the user re-adds it through the enchant picker), while
 * the enchant picker lists it in the right pool.
 */
function weaponFields(slots: number, prefix: 'weapon' | 'leftWeapon' = 'weapon'): string[] {
  const cardCount = Math.min(Math.max(slots, 0), 4);
  return [0, 1, 2, 3].map((p) => (p < cardCount ? `${prefix}Card${p + 1}` : `${prefix}Enchant${p}`));
}

/**
 * Resolve the worn slot(s) for an item's `equipped` bitmask.
 *
 * @param isWeapon whether the record is a weapon (`itemTypeId === WEAPON`). It decides
 *   what the bare HAND_L bit means, and nothing else — see below.
 */
function resolveSlots(loc: number, isWeapon = false): ResolvedSlot[] {
  const slots: ResolvedSlot[] = [];
  const push = (key: SlotKey, cardOffset = 0, packed = false) => slots.push({ key, cardOffset, packed });
  // A two-handed weapon sets HAND_R | HAND_L on the SAME item — keep it as the
  // weapon, don't duplicate it into the shield slot.
  //
  // HAND_L on its own is the off hand, and the protocol does not say what is in it: the
  // bit is the same whether the player is holding a shield or dual-wielding. The item
  // itself is what tells them apart, so a weapon there goes to `leftWeapon` and anything
  // else to `shield`. Sending every off-hand item to `shield` — as this did until
  // 17/08/2026 — hid the second weapon twice over: the shield dropdown lists no daggers,
  // so it rendered blank, and a filled `model.shield` is precisely what hides the
  // left-weapon picker (ro-calculator.component.html, `!!model.shield`). Reported for an
  // Oboro, but it applied to every dual-wielding class (tracker card gmp3jNDKQrna1N1G338f).
  if (loc & EQP.HAND_R) push('weapon');
  else if (loc & EQP.HAND_L) push(isWeapon ? 'leftWeapon' : 'shield');
  if (loc & EQP.ARMOR) push('armor');
  if (loc & EQP.GARMENT) push('garment');
  if (loc & EQP.SHOES) push('boot');
  // rAthena names the accessory bits ACC_L=0x8 / ACC_R=0x80, but that naming is
  // inverted relative to the in-game "Right/Left accessory" type and the
  // calculator's slots: the item the game calls a *Right* accessory is worn at
  // the ACC_L bit, and a *Left* accessory at the ACC_R bit. (Verified against
  // replays — every "Aces. Direito" item, e.g. Illusion Booster R / Sinful Ruby
  // Ring, carries 0x8; every "Aces. Esquerdo", e.g. Illusion Booster L, carries
  // 0x80.) Map each bit to the matching side so a side-locked accessory lands in
  // a slot whose dropdown actually lists it (a "both sides" accessory is in both
  // lists, so it showed regardless — but on the wrong side — before this fix).
  if (loc & EQP.ACC_L) push('accRight');
  if (loc & EQP.ACC_R) push('accLeft');
  if (loc & EQP.HEAD_TOP) push('headUpper');
  if (loc & EQP.HEAD_MID) push('headMiddle');
  if (loc & EQP.HEAD_LOW) push('headLower');
  if (loc & EQP.AMMO) push('ammo');
  // A costume headgear can occupy several costume-head slots at once (e.g. a
  // top+mid+low "hood" costume). It's ONE physical inventory record, but the
  // calculator models each costume-head position separately, each with its own
  // "visual enchant" stone — so the shared `cards[]` array has to say which
  // enchant belongs to which head slot.
  //
  // **Where it says so depends on the packet the record came from**, which is
  // why reading it positionally is only safe when there is more than one slot to
  // tell apart:
  //   - the inventory snapshot keys each enchant to a FIXED index — upper→cards[0],
  //     mid→cards[1], low→cards[2] — so a low-only costume there reads
  //     [0, 0, enchant] with cards[0] empty;
  //   - an equip event packs them from 0 instead, so the same costume reads
  //     [enchant]. Both layouts are in the fixtures, for the same item in the same
  //     recording (hn-magic-lv1.rrf, Cachecol do Eremes).
  // A costume worn in exactly ONE head slot therefore takes whichever card the
  // record carries, at whatever index — position carries no information there.
  // Only a hood spanning several slots needs the fixed index, and that is the
  // snapshot's layout by construction (an equip event for it would be ambiguous).
  const costumeHeads = [EQP.COSTUME_TOP, EQP.COSTUME_MID, EQP.COSTUME_LOW].filter((bit) => loc & bit).length;
  const single = costumeHeads === 1;
  if (loc & EQP.COSTUME_TOP) push('costumeUpper', 0, single);
  if (loc & EQP.COSTUME_MID) push('costumeMiddle', 1, single);
  if (loc & EQP.COSTUME_LOW) push('costumeLower', 2, single);
  if (loc & EQP.COSTUME_GARMENT) push('costumeGarment');
  if (loc & EQP.SHADOW_WEAPON) push('shadowWeapon');
  if (loc & EQP.SHADOW_ARMOR) push('shadowArmor');
  if (loc & EQP.SHADOW_SHIELD) push('shadowShield');
  if (loc & EQP.SHADOW_SHOES) push('shadowBoot');
  if (loc & EQP.SHADOW_ACC_R) push('shadowEarring');
  if (loc & EQP.SHADOW_ACC_L) push('shadowPendant');
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
  /** Random options ("Bônus Aleatórios") written into the model's option slots. */
  appliedOptions: number;
  /** Random options dropped — unsupported by the calc or with no free option slot. */
  skippedOptions: number;
  /** Number of learned skills (level > 0) read from the skill-tree snapshot. */
  learnedSkillCount: number;
  /**
   * The six traits, when the recording carried all of them, else `null` — see
   * `readReplayTraits`. `null` is "the file cannot say", not "all zero", so the
   * caller has to tell the player to fill them in by hand.
   */
  traits: ReplayTraits | null;
  /**
   * The egg of the pet that was out, when the replay has one. **Intimacy comes in the
   * file** (container 9, chunk 5308) and becomes the model's loyalty tier, so
   * `loyaltyKnown` is true whenever the block exists. Absent when there was no pet, or
   * when the egg is not in item.json.
   */
  pet?: { itemId: number; view: number; loyaltyKnown: boolean; intimacy?: number; loyalty?: PetLoyalty };
};

export type ReplayImportResult = {
  model: MainModel;
  summary: ReplayImportSummary;
  /** Learned skill tree from the replay — client skill id → level (level > 0).
   *  Mapped onto the model's skill panels by the importer. */
  learnedSkills: Record<number, number>;
  /** EFST status ids that were active on the recording player at any point (buffs
   *  that actually turned on). Used to gate the import of buff skills so that
   *  merely *learning* an endow/self-buff doesn't switch it on — only a buff that
   *  was really up during the recording is imported. */
  activeStatuses: number[];
};

/**
 * rAthena's `enchantgrade` (what `rec.grade` carries) → the letter the calculator's
 * `GRADE[...]` conditions read. 0 is "no grade" and maps to the empty string, the same
 * value the "Sem Grau" option uses.
 */
const GRADE_LETTER: Record<number, string> = { 1: 'D', 2: 'C', 3: 'B', 4: 'A' };

/** A minimal view of the calculator's item map (`item.json` keyed by id). */
type ItemMap = Record<number, { id: number } & Record<string, any>>;

/**
 * Build a calculator MainModel from a parsed replay + the calculator's item map.
 * Sets class, levels, allocated base stats and every equipped piece (refine +
 * cards + socket-enchants + random options). Items absent from the LATAM DB are
 * skipped and reported. The 4th-job traits are set only when the recording
 * carried all six (see `readReplayTraits`); otherwise they stay at their
 * defaults and `summary.traits` is null so the caller can say so.
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
  // The traits, when the stream carried them. A 0 here is a real allocation the
  // server reported, so it is written like any other value.
  const traits = readReplayTraits(replay);
  if (traits) for (const k of TRAIT_KEYS) model[k] = traits[k];
  // Character appearance, for the saved-sim paper-doll (undefined = use defaults).
  model.sex = s.sex === 0 || s.sex === 1 ? s.sex : undefined;
  model.hairStyle = s.hairStyle || undefined;
  model.hairColor = s.hairColor || undefined;
  model.clothesColor = s.clothesColor || undefined;

  const known = (id: number) => id > 0 && !!itemMap[id];
  const skippedItems: ReplayImportSummary['skippedItems'] = [];
  let skippedCards = 0;
  let equippedCount = 0;
  let appliedOptions = 0;
  let skippedOptions = 0;

  // The game allows one item per position, but a recording's snapshot does not always
  // agree: `nw-supressao-gear-states.rrf` flags **two** ammo stacks as equipped, and
  // `wh-ilimitar.rrf` flags **four**. Only one of each was really loaded, and the snapshot
  // does not say which — so the first record to claim a position keeps it, and the order
  // below is what decides "first".
  //
  // **The stack the recording spends is the one that was loaded.** Firing consumes
  // ammunition, so the worn stack loses quantity and the idle ones do not; `itemDeletes`
  // carries exactly that, per inventory slot. It is decisive on both fixtures and it
  // checks out against the skills' own costs: the Night Watch recording spends 210 rounds
  // from slot 83, which is its 30 casts of Fogo de Supressão at 5 each plus 10 of
  // Artilharia Pesada at 6. Slot order cannot stand in for this — the right answer is the
  // lowest slot in one recording (83 of 83/103) and the highest in the other (106 of
  // 82/96/97/106), so it carries no signal at all; it is only the tie-break of last resort,
  // for a dispute the recording never spends its way out of.
  //
  // A position claimed by an item missing from the DB stays claimed: it is still occupied
  // in game, and importing the runner-up would quietly gear the build with something the
  // character was not wearing.
  const spentSlots = new Set((replay.itemDeletes ?? []).map((d) => d.slot));
  // The map is keyed by inventory slot, which is the same number `itemDeletes` reports.
  const equippedRecords = [...replay.initialInventory.entries()]
    .filter(([, rec]) => rec.equipped)
    .sort(([a], [b]) => (Number(spentSlots.has(b)) - Number(spentSlots.has(a))) || a - b)
    .map(([, rec]) => rec);
  const takenSlots = new Set<SlotKey>();

  for (const rec of equippedRecords) {
    const itemKnown = known(rec.itemId);
    const isWeapon = itemMap[rec.itemId]?.['itemTypeId'] === ItemTypeId.WEAPON;
    for (const { key, cardOffset, packed } of resolveSlots(rec.equipped, isWeapon)) {
      if (takenSlots.has(key)) continue;
      takenSlots.add(key);
      const def = SLOTS[key];
      if (!itemKnown) {
        skippedItems.push({ slot: key, itemId: rec.itemId });
        continue;
      }
      (model as any)[def.item] = rec.itemId;
      if (def.refine) (model as any)[def.refine] = rec.refine || 0;
      if (def.grade) (model as any)[def.grade] = GRADE_LETTER[rec.grade] ?? '';
      // Both hands split their sockets into cards-then-enchants by the weapon's real
      // slot count; every other slot has fixed card/enchant fields.
      const fields = key === 'weapon' || key === 'leftWeapon' ? weaponFields(itemMap[rec.itemId]?.['slots'] ?? 0, key) : def.cards;
      writeCards(model, fields, rec, cardOffset, () => skippedCards++, packed);
      equippedCount++;
    }
    // Random options live on the item, not a card slot — apply them once per
    // known item (an unknown item is already wholly skipped above).
    if (itemKnown && rec.options.length) {
      const r = applyOptions(model, rec.equipped, rec.options, isWeapon);
      appliedOptions += r.applied;
      skippedOptions += r.skipped;
    }
  }

  // The recording player's pet is the one in the **pet block** (container 9), exposed as
  // `replay.pet` — and only that one. Its `view` is the animal's job id, which the client
  // table maps to the egg (see PET_EGG_BY_VIEW), and its **intimacy** comes from no packet
  // at all: it is what decides the loyalty tier, and therefore the egg's bonus.
  //
  // Do *not* go looking through `replay.entities`. In the protocol a pet is an entity on
  // screen rather than a piece of equipment, so the entity list holds every pet in view —
  // including the ones belonging to the other players standing around — and `Entity` has no
  // owner field to tell them apart. Reading it imported a stranger's animal: a recording
  // whose own player had no pet, taken on a map with 23 other players, picked up the first
  // pet entity it saw and equipped the build with an Ovo de Abelha-Rainha it never had, at
  // DEFAULT_PET_LOYALTY (the top tier) because no intimacy came with it.
  //
  // The block's `view` is -1 when the animal was never on screen; the entity carrying the
  // block's own `aid` is then the fallback, which is still the player's pet and no one
  // else's. When neither has it the species is simply not in the file (the block stores
  // 0xffffffff in chunk 5305) and the pet is left out rather than guessed at.
  let pet: ReplayImportSummary['pet'];
  const snapshot = replay.pet;
  if (snapshot) {
    const view = snapshot.view >= 0 ? snapshot.view : replay.entities?.get(snapshot.aid)?.view ?? -1;
    const eggId = PET_EGG_BY_VIEW[view];
    if (known(eggId)) {
      const loyalty = petLoyaltyFromIntimacy(snapshot.intimacy);
      model.pet = eggId;
      model.petLoyalty = loyalty;
      pet = { itemId: eggId, view, loyaltyKnown: true, intimacy: snapshot.intimacy, loyalty };
    }
  }

  const learnedSkills: Record<number, number> = {};
  for (const [id, lvl] of replay.learnedSkills) learnedSkills[id] = lvl;

  // Buffs that were actually up on the recording player (isOn), keyed by EFST id.
  const activeStatuses = [
    ...new Set((replay.statusEvents ?? []).filter((e) => e.aid === s.aid && e.isOn).map((e) => e.statusId)),
  ];

  // Turn the active-status snapshot into model fields: ASPD potion (single-select
  // + stackable) and job/party buffs (Bênção, Aumentar Agilidade, …) that a player
  // receives without learning them, so they can't come from the learned tree.
  const potion = resolveAspdPotionFromStatus(activeStatuses);
  if (potion.aspdPotion) model.aspdPotion = potion.aspdPotion;
  if (potion.aspdPotions.length) model.aspdPotions = [...(model.aspdPotions ?? []), ...potion.aspdPotions];
  model.skillBuffMap = { ...model.skillBuffMap, ...resolveBuffsFromStatus(activeStatuses) };

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
      appliedOptions,
      skippedOptions,
      learnedSkillCount: Object.keys(learnedSkills).length,
      traits,
      pet,
    },
    learnedSkills,
    activeStatuses,
  };

  /**
   * Write an item's random options into the model's `rawOptionTxts`, indexed by
   * the calculator's per-slot option numbers (see item-options-table.ts). The
   * options belong to whichever worn slot carries option numbers (weapons,
   * armor, garment, shield, accessories, headgear, shadow gear); slots without
   * any (boots, lower headgear, costumes) can't hold them. Each option is mapped
   * to a calc option-script and dropped (counted) when unsupported or when the
   * slot has no remaining option positions.
   */
  function applyOptions(m: MainModel, equippedMask: number, options: RandomOption[], isWeapon: boolean) {
    let slotNumbers: number[] | undefined;
    for (const { key } of resolveSlots(equippedMask, isWeapon)) {
      const sn = ItemOptionMap.get(key as unknown as ItemTypeEnum);
      if (sn && sn.length) {
        slotNumbers = sn;
        break;
      }
    }

    let applied = 0;
    let skipped = 0;
    let pos = 0;
    for (const opt of options) {
      const script = randomOptionToScript(opt);
      if (!script || !slotNumbers || pos >= slotNumbers.length) {
        skipped++;
        continue;
      }
      m.rawOptionTxts[slotNumbers[pos]] = script;
      pos++;
      applied++;
    }
    return { applied, skipped };
  }

  function writeCards(
    m: MainModel,
    fields: string[],
    rec: InventoryRecord,
    cardOffset: number,
    onSkip: () => void,
    packed = false,
  ) {
    // Map the replay's socket positions onto this slot's card/enchant fields
    // positionally, starting at `cardOffset` (non-zero only for the later slots
    // of a multi-slot costume head sharing one `cards[]` array). Ids not in the
    // LATAM DB can't be applied, so they're dropped.
    //
    // `packed` slots carry no positional information, so the non-zero cards are
    // taken in order instead — see `resolveSlots` on costume heads.
    const ids = packed ? rec.cards.filter(Boolean) : rec.cards.slice(cardOffset);
    for (let i = 0; i < fields.length && i < ids.length; i++) {
      const id = ids[i];
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
