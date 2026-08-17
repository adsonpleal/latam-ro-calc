import { describe, expect, it } from 'vitest';
import { Replay } from 'rrfparser';
import { PetLoyalty } from '../constants/pet-loyalty';
import { replayToModel } from './replay-to-model';

// rAthena e_equip_pos bits used by the importer.
const EQP = { WEAPON: 0x2, ACC_L: 0x8, ARMOR: 0x10, HAND_L: 0x20, SHOES: 0x40, ACC_R: 0x80 };

const rec = (over: Partial<any> = {}) => ({ itemId: 0, qty: 1, equipped: 0, refine: 0, cards: [0, 0, 0, 0], options: [], ...over });

const ba = (id: number, value: number, param = 0) => ({ id, value, param });

const makeReplay = (records: any[], over: Partial<any> = {}): Replay =>
  ({
    sessionInfo: { player: 'Tester', job: 4257, baseLevel: 200, jobLevel: 50, str: 1, agi: 90, vit: 80, int: 70, dex: 120, luk: 60 },
    learnedSkills: new Map<number, number>(),
    initialInventory: new Map(records.map((r, i) => [i, r])),
    ...over,
  } as any);

// A small calculator item DB. 9999 is intentionally absent (unknown id). 1101 is
// the generic weapon; it carries 2 card slots so its socketed cards import as
// cards (a weapon holding cards necessarily has that many slots).
const itemMap = { 1101: { id: 1101, slots: 2 }, 2301: { id: 2301 }, 4001: { id: 4001 }, 4002: { id: 4002 } };

describe('replayToModel', () => {
  it('maps session info -> model class, levels and base stats', () => {
    const { model } = replayToModel(makeReplay([]), itemMap);
    expect(model.class).toBe(4257);
    expect(model.level).toBe(200);
    expect(model.jobLevel).toBe(50);
    expect(model).toMatchObject({ str: 1, agi: 90, vit: 80, int: 70, dex: 120, luk: 60 });
  });

  it('writes an equipped weapon with refine and socketed cards by position', () => {
    const replay = makeReplay([rec({ itemId: 1101, equipped: EQP.WEAPON, refine: 7, cards: [4001, 4002, 0, 0] })]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.weapon).toBe(1101);
    expect(model.weaponRefine).toBe(7);
    expect(model.weaponCard1).toBe(4001);
    expect(model.weaponCard2).toBe(4002);
    expect(summary.equippedCount).toBe(1);
  });

  it('skips items whose id is not in the calculator DB and reports them', () => {
    const replay = makeReplay([rec({ itemId: 9999, equipped: EQP.SHOES, refine: 5 })]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.boot).toBeUndefined();
    expect(summary.equippedCount).toBe(0);
    expect(summary.skippedItems).toEqual([{ slot: 'boot', itemId: 9999 }]);
  });

  it('drops unknown card ids while keeping the known equipment', () => {
    const replay = makeReplay([rec({ itemId: 2301, equipped: EQP.ARMOR, refine: 4, cards: [9999, 0, 0, 0] })]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.armor).toBe(2301);
    expect(model.armorRefine).toBe(4);
    expect(model.armorCard).toBeUndefined();
    expect(summary.skippedCards).toBe(1);
  });

  it('inverts the rAthena accessory bits to the in-game R/L sides', () => {
    // ACC_L bit (0x8) is the in-game *Right* accessory; ACC_R bit (0x80) the *Left*.
    const replay = makeReplay([
      rec({ itemId: 4001, equipped: EQP.ACC_L }),
      rec({ itemId: 4002, equipped: EQP.ACC_R }),
    ]);
    const { model } = replayToModel(replay, itemMap);
    expect(model.accRight).toBe(4001);
    expect(model.accLeft).toBe(4002);
  });

  it('passes the learned skill tree through and counts it', () => {
    const replay = makeReplay([], { learnedSkills: new Map([[5, 10], [7, 3]]) });
    const { learnedSkills, summary } = replayToModel(replay, itemMap);
    expect(learnedSkills).toEqual({ 5: 10, 7: 3 });
    expect(summary.learnedSkillCount).toBe(2);
  });

  it('writes a weapon\'s random options into its option slots (W_Left_1..3 = 0,1,2)', () => {
    const replay = makeReplay([
      rec({ itemId: 1101, equipped: EQP.WEAPON, options: [ba(17, 65), ba(19, 7), ba(164, 12)] }),
    ]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.rawOptionTxts[0]).toBe('atk:65');
    expect(model.rawOptionTxts[1]).toBe('matk:7');
    expect(model.rawOptionTxts[2]).toBe('criDmg:12');
    expect(summary.appliedOptions).toBe(3);
    expect(summary.skippedOptions).toBe(0);
  });

  it('writes armor options at the armor option slots and skips unsupported rolls', () => {
    // id 11 (natural HP regen) has no calc field -> skipped; the str roll applies.
    const replay = makeReplay([
      rec({ itemId: 2301, equipped: EQP.ARMOR, options: [ba(3, 9), ba(11, 5)] }),
    ]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.rawOptionTxts[12]).toBe('str:9'); // Armor_1
    expect(summary.appliedOptions).toBe(1);
    expect(summary.skippedOptions).toBe(1);
  });

  it('skips options on a slot that has no option positions (boots)', () => {
    const replay = makeReplay([rec({ itemId: 4001, equipped: EQP.SHOES, options: [ba(17, 10)] })]);
    const { summary } = replayToModel(replay, itemMap);
    expect(summary.appliedOptions).toBe(0);
    expect(summary.skippedOptions).toBe(1);
  });

  it('writes both BAs of a two-slot shadow weapon (SD_Wp_1=20, SD_Wp_2=30)', () => {
    // Mirrors the "Magical Spell Shadow Weapon" replay: Precisão +9 + TEN +10.
    const SHADOW_WEAPON = 0x20000;
    const replay = makeReplay([
      rec({ itemId: 1101, equipped: SHADOW_WEAPON, options: [ba(18, 9), ba(251, 10)] }),
    ]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.shadowWeapon).toBe(1101);
    expect(model.rawOptionTxts[20]).toBe('hit:9'); // SD_Wp_1
    expect(model.rawOptionTxts[30]).toBe('res:10'); // SD_Wp_2 (TEN -> res)
    expect(summary.appliedOptions).toBe(2);
    expect(summary.skippedOptions).toBe(0);
  });

  it('carries the character look (sex/hair/clothes) onto the model', () => {
    const replay = makeReplay([], {
      sessionInfo: { player: 'P', job: 4257, baseLevel: 200, jobLevel: 50, str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1, sex: 0, hairStyle: 12, hairColor: 3, clothesColor: 5 },
    });
    const { model } = replayToModel(replay, itemMap);
    expect(model).toMatchObject({ sex: 0, hairStyle: 12, hairColor: 3, clothesColor: 5 });
  });

  it('splits a weapon\'s sockets into cards then enchants by the weapon\'s slot count', () => {
    // A 2-slot weapon carried as [card, card, enchant, enchant] (mirrors the Sharp
    // Star [2] replay: 2x White Knight Card, then Cecil's Memory + Sharp 2Lv). The
    // first `slots` positions fill weaponCard1..N; the rest are weapon enchants and
    // must land in weaponEnchant<pos>, not the card fields (which the picker can't
    // display and the calc would double-count).
    const WEAPON = 0x2;
    const dbWithSlots = { ...itemMap, 5001: { id: 5001, slots: 2 } } as any;
    const replay = makeReplay([rec({ itemId: 5001, equipped: WEAPON, cards: [4001, 4002, 1101, 2301] })]);
    const { model } = replayToModel(replay, dbWithSlots) as any;
    expect(model.weaponCard1).toBe(4001);
    expect(model.weaponCard2).toBe(4002);
    expect(model.weaponEnchant2).toBe(1101); // socket 2 -> weaponEnchant2
    expect(model.weaponEnchant3).toBe(2301); // socket 3 -> weaponEnchant3
    expect(model.weaponCard3).toBeUndefined();
    expect(model.weaponCard4).toBeUndefined();
  });

  it('reads a costume-head enchant from its fixed slot position (mid=cards[1], low=cards[2])', () => {
    // A mid-only and a low-only costume each carry their visual enchant at the
    // card index that matches the head slot, not packed from 0. Verified against
    // real replays: a mid costume's enchant sits at cards[1], a low at cards[2].
    const COSTUME_MID = 0x800;
    const COSTUME_LOW = 0x1000;
    const replay = makeReplay([
      rec({ itemId: 4001, equipped: COSTUME_MID, cards: [0, 4002, 0, 0] }),
      rec({ itemId: 2301, equipped: COSTUME_LOW, cards: [0, 0, 1101, 0] }),
    ]);
    const { model } = replayToModel(replay, itemMap) as any;
    expect(model.costumeMiddle).toBe(4001);
    expect(model.costumeEnchantMiddle).toBe(4002);
    expect(model.costumeLower).toBe(2301);
    expect(model.costumeEnchantLower).toBe(1101);
  });

  it('ignores non-equipped inventory records', () => {
    const replay = makeReplay([rec({ itemId: 1101, equipped: 0, refine: 7 })]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.weapon).toBeUndefined();
    expect(summary.equippedCount).toBe(0);
  });
});

/**
 * The pet comes from the pet block (container 9) and from nowhere else.
 *
 * A pet is an entity on screen, so `replay.entities` holds every pet in view — the other
 * players' included — and `Entity` carries no owner. Resolving the egg from that list
 * imported animals the recording player never owned: in the community queue 2 of 11
 * submissions were affected, one of them a character with no pet at all who came out with
 * an Ovo de Abelha-Rainha at the top loyalty tier, on a map with 23 players around.
 */
describe('replayToModel — pet', () => {
  const ANGELING_VIEW = 1096;
  const OVO_ANGELING = 9088;
  const ABELHA_VIEW = 22405;
  const OVO_ABELHA = 9193;
  const eggMap = { ...itemMap, [OVO_ANGELING]: { id: OVO_ANGELING }, [OVO_ABELHA]: { id: OVO_ABELHA } };

  const petEntity = (aid: number, view: number) => [aid, { aid, kind: 'pet', view, name: 'x' }] as const;
  /** Pet block for the local player, as container 9 fills it. */
  const block = (over: Partial<any> = {}) => ({ aid: 500, name: 'Abelha-Rainha', view: ABELHA_VIEW, level: 78, hunger: 90, intimacy: 962, ...over });

  it('takes the species from the block, not from whichever pet stands nearest', () => {
    const replay = makeReplay([], {
      pet: block(),
      entities: new Map([petEntity(999, ANGELING_VIEW), petEntity(500, ABELHA_VIEW)]),
    });
    const { model, summary } = replayToModel(replay, eggMap) as any;
    expect(model.pet).toBe(OVO_ABELHA);
    expect(summary.pet).toEqual({ itemId: OVO_ABELHA, view: ABELHA_VIEW, loyaltyKnown: true, intimacy: 962, loyalty: PetLoyalty.Alta });
  });

  it('imports no pet when the player had none, however many are on screen', () => {
    const replay = makeReplay([], {
      pet: undefined,
      entities: new Map([petEntity(999, ANGELING_VIEW), petEntity(998, ABELHA_VIEW)]),
    });
    const { model, summary } = replayToModel(replay, eggMap) as any;
    expect(model.pet).toBeUndefined();
    expect(summary.pet).toBeUndefined();
    // `petLoyalty` keeps the model default here — with no pet equipped no script reads it.
  });

  it('falls back to the entity carrying the block aid when the block has no view', () => {
    const replay = makeReplay([], {
      pet: block({ view: -1 }),
      entities: new Map([petEntity(999, ANGELING_VIEW), petEntity(500, ABELHA_VIEW)]),
    });
    const { model } = replayToModel(replay, eggMap) as any;
    expect(model.pet).toBe(OVO_ABELHA);
  });

  /**
   * `view` is -1 in the file itself (chunk 5305 holds 0xffffffff) whenever the animal was
   * never on screen — one real submission has exactly this. The species is then simply not
   * recorded, and leaving the pet out is the only honest answer; the old code would reach
   * for a bystander's animal instead.
   */
  it('leaves the pet out when the species is in neither the block nor the entities', () => {
    const replay = makeReplay([], {
      pet: block({ view: -1 }),
      entities: new Map([petEntity(999, ANGELING_VIEW)]),
    });
    const { model, summary } = replayToModel(replay, eggMap) as any;
    expect(model.pet).toBeUndefined();
    expect(summary.pet).toBeUndefined();
  });

  it('turns the block intimacy into the loyalty tier', () => {
    const replay = makeReplay([], { pet: block({ intimacy: 560 }), entities: new Map() });
    const { model } = replayToModel(replay, eggMap) as any;
    expect(model.petLoyalty).toBe(PetLoyalty.Nenhuma);
  });
});

/**
 * The traits reach the model only when the recording carried all six. They ride on
 * ZC_COUPLESTATUS, which the server sends on every map load, so a session that
 * changed map has them and one that stayed put does not — see replay-traits.ts.
 */
describe('replayToModel — traits', () => {
  const traited = (traits: any) => makeReplay([], { traits });

  it('writes the six traits the recording carried', () => {
    const allSix = { pow: 100, sta: 0, wis: 0, spl: 0, con: 59, crt: 0 };
    const { model, summary } = replayToModel(traited(allSix), itemMap);

    expect(model).toMatchObject(allSix);
    expect(summary.traits).toEqual(allSix);
  });

  it('leaves the model defaults alone on a partial set, and reports nothing', () => {
    const { model, summary } = replayToModel(traited({ spl: 100 }), itemMap);

    // Not 100: a partial set is refused whole, so the untouched default stands.
    expect(model.spl).toBe(0);
    expect(summary.traits).toBeNull();
  });

  it('reports no traits for a recording that carried none', () => {
    expect(replayToModel(makeReplay([]), itemMap).summary.traits).toBeNull();
  });
});

/**
 * The off hand. `HAND_L` on its own is the same bit whether the player is holding a
 * shield or dual-wielding, so only the item says which it is — and until 17/08/2026 the
 * importer always read it as a shield. Reported for an Oboro whose second weapon never
 * turned up (tracker card gmp3jNDKQrna1N1G338f); the item landed in `model.shield`, where
 * the shield dropdown does not list it AND a filled `shield` is exactly what hides the
 * left-weapon picker, so it disappeared twice over.
 */
describe('replayToModel — off-hand weapon vs shield', () => {
  // itemTypeId 1 = WEAPON, 2 = ARMOR (see constants/item.const ItemTypeId).
  const dualMap = {
    ...itemMap,
    1250: { id: 1250, slots: 3, itemTypeId: 1 }, // a katar-shaped 3-slot weapon
    2101: { id: 2101, itemTypeId: 2 }, // a shield
  } as any;

  it('sends a weapon in the off hand to leftWeapon, with its refine, grade and cards', () => {
    const replay = makeReplay([
      rec({ itemId: 1250, equipped: EQP.HAND_L, refine: 9, grade: 1, cards: [4001, 4002, 0, 1101] }),
    ]);
    const { model, summary } = replayToModel(replay, dualMap) as any;

    expect(model.leftWeapon).toBe(1250);
    expect(model.leftWeaponRefine).toBe(9);
    expect(model.leftWeaponCard1).toBe(4001);
    expect(model.leftWeaponCard2).toBe(4002);
    // Position 3 is past the weapon's 3 card slots, so it is an enchant, not a 4th card.
    expect(model.leftWeaponEnchant3).toBe(1101);
    expect(model.leftWeaponCard4).toBeUndefined();
    // and nothing leaked into the shield slot
    expect(model.shield).toBeUndefined();
    expect(summary.equippedCount).toBe(1);
  });

  it('still sends a shield in the off hand to shield', () => {
    const { model } = replayToModel(makeReplay([rec({ itemId: 2101, equipped: EQP.HAND_L, refine: 4 })]), dualMap) as any;

    expect(model.shield).toBe(2101);
    expect(model.shieldRefine).toBe(4);
    expect(model.leftWeapon).toBeUndefined();
  });

  /*
   * A two-handed weapon sets HAND_R | HAND_L on the one record. The HAND_R branch wins
   * before the off-hand question is even asked, so it must not also fill leftWeapon —
   * which would have the calculator hold three weapons.
   */
  it('keeps a two-handed weapon in the main hand only', () => {
    const replay = makeReplay([rec({ itemId: 1250, equipped: EQP.WEAPON | EQP.HAND_L, refine: 10 })]);
    const { model } = replayToModel(replay, dualMap) as any;

    expect(model.weapon).toBe(1250);
    expect(model.leftWeapon).toBeUndefined();
    expect(model.shield).toBeUndefined();
  });

  it('gives the off-hand weapon its own random-option positions, not the shield\'s', () => {
    const replay = makeReplay([rec({ itemId: 1250, equipped: EQP.HAND_L, options: [ba(17, 65)] })]);
    const { summary } = replayToModel(replay, dualMap);

    expect(summary.appliedOptions).toBe(1);
    expect(summary.skippedOptions).toBe(0);
  });
});
