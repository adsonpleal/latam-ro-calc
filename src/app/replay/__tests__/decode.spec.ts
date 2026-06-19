import { beforeAll, describe, expect, it } from 'vitest';
import { decodeReplay } from '../rrf/decode';
import { Replay } from '../rrf/types';
import { loadReplayFixture } from './load-fixture';

// Ground truth: a real `.rrf` recording of a Windhawk ("Preá") on tra_fild.
// These assertions exercise the binary parser end-to-end against known values.
describe('decodeReplay (Mergulho test.rrf)', () => {
  let replay: Replay;

  beforeAll(() => {
    replay = decodeReplay(loadReplayFixture('mergulho-test.rrf'));
  });

  it('reads the session header, including a UTF-8 player name', () => {
    const s = replay.sessionInfo;
    expect(s.player).toBe('Preá');
    expect(s.map).toBe('tra_fild');
    expect(s.aid).toBe(1031076);
    expect(s.job).toBe(4257); // Windhawk
    expect(s.baseLevel).toBe(230);
    expect(s.jobLevel).toBe(47);
    // Sex now comes from chunk 1095 (flipped), not the old constant-1 chunk 1098.
    // Preá is male, so the 1095=0 flag maps to sex 1.
    expect(s.sex).toBe(1);
  });

  it("reads the recording character's look from the session snapshot", () => {
    const s = replay.sessionInfo;
    expect(s.hairStyle).toBe(1);
    expect(s.hairColor).toBe(0);
    expect(s.clothesColor).toBe(0);
  });

  it('reads the allocated base stats from the session snapshot', () => {
    const s = replay.sessionInfo;
    expect(s).toMatchObject({ str: 4, agi: 100, vit: 100, int: 120, dex: 130, luk: 73 });
  });

  it('parses the expected event/entity counts', () => {
    expect(replay.entities.size).toBe(9);
    expect(replay.damage).toHaveLength(4);
    expect(replay.initialInventory.size).toBe(71);
    expect(replay.learnedSkills.size).toBe(48);
  });

  it('reports packet totals (handled <= seen)', () => {
    expect(replay.totals.packetCount).toBe(26);
    expect(replay.totals.handledPackets).toBe(21);
    expect(replay.totals.handledPackets).toBeLessThanOrEqual(replay.totals.packetCount);
  });

  it('decodes the worn equipment with refine and socketed cards', () => {
    const equipped = [...replay.initialInventory.values()].filter((r) => r.equipped);
    expect(equipped).toHaveLength(20);

    // The garment record: refine +10 with four socket ids (card + 3 enchants).
    const garment = equipped.find((r) => r.itemId === 480063);
    expect(garment).toBeDefined();
    expect(garment!.refine).toBe(10);
    expect(garment!.cards).toEqual([300732, 29537, 29539, 29539]);
  });

  it('parses a random-options array on every item record (empty here, Preá ran no BA)', () => {
    for (const rec of replay.initialInventory.values()) {
      expect(Array.isArray(rec.options)).toBe(true);
    }
    // This recording carries no random options, so every parsed list is empty.
    const withOptions = [...replay.initialInventory.values()].filter((r) => r.options.length);
    expect(withOptions).toHaveLength(0);
  });

  it('decodes player damage events with skill id, hit count and hit type', () => {
    const first = replay.damage[0];
    expect(first).toMatchObject({
      source: 1031076,
      target: 4399,
      skillId: 5326,
      skillLevel: 5,
      damage: 573584,
      hits: 2,
      hitType: 'double',
      source_packet: 'skill',
    });
  });

  it('decodes the learned skill tree (client skill id -> level, level > 0)', () => {
    expect(replay.learnedSkills.get(1)).toBe(9);
    expect(replay.learnedSkills.get(43)).toBe(10);
    for (const level of replay.learnedSkills.values()) expect(level).toBeGreaterThan(0);
  });
});
