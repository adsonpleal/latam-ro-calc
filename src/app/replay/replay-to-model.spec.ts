import { describe, expect, it } from 'vitest';
import { Replay } from './rrf/types';
import { replayToModel } from './replay-to-model';

// rAthena e_equip_pos bits used by the importer.
const EQP = { WEAPON: 0x2, ACC_L: 0x8, ARMOR: 0x10, SHOES: 0x40, ACC_R: 0x80 };

const rec = (over: Partial<any> = {}) => ({ itemId: 0, qty: 1, equipped: 0, refine: 0, cards: [0, 0, 0, 0], options: [], ...over });

const ba = (id: number, value: number, param = 0) => ({ id, value, param });

const makeReplay = (records: any[], over: Partial<any> = {}): Replay =>
  ({
    sessionInfo: { player: 'Tester', job: 4257, baseLevel: 200, jobLevel: 50, str: 1, agi: 90, vit: 80, int: 70, dex: 120, luk: 60 },
    learnedSkills: new Map<number, number>(),
    initialInventory: new Map(records.map((r, i) => [i, r])),
    ...over,
  } as any);

// A small calculator item DB. 9999 is intentionally absent (unknown id).
const itemMap = { 1101: { id: 1101 }, 2301: { id: 2301 }, 4001: { id: 4001 }, 4002: { id: 4002 } };

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

  it('ignores non-equipped inventory records', () => {
    const replay = makeReplay([rec({ itemId: 1101, equipped: 0, refine: 7 })]);
    const { model, summary } = replayToModel(replay, itemMap);
    expect(model.weapon).toBeUndefined();
    expect(summary.equippedCount).toBe(0);
  });
});
