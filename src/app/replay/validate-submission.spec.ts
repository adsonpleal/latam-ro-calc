import { Replay } from 'rrfparser';
import { describe, expect, it } from 'vitest';
import itemJson from '../../assets/demo/data/item.json';
import { loadReplayFixture } from './__tests__/load-fixture';
import { MAX_REPLAY_BYTES, checkReplay, validateReplaySubmission } from './validate-submission';

const items = itemJson as unknown as Record<number, any>;

/** A parsed replay with only the fields the check reads. */
const makeReplay = (over: Partial<Replay> = {}): Replay =>
  ({
    sessionInfo: { player: 'Tester', map: 'prontera', job: 4307, baseLevel: 240, jobLevel: 50, durationMs: 60_000 },
    learnedSkills: new Map<number, number>([[1, 5]]),
    initialInventory: new Map(),
    damage: [],
    equipChanges: [],
    totals: { packetCount: 10, handledPackets: 10, knownPacketIds: [] },
    ...over,
  } as unknown as Replay);

describe('validateReplaySubmission', () => {
  it('accepts a real recording and reports what it read', () => {
    const result = validateReplaySubmission(loadReplayFixture('hn-magic-lv1.rrf'), items);

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({
      spriteJob: 4307,
      baseLevel: 240,
      learnedSkillCount: 51,
      damageEvents: 203,
      equipChangeCount: 60,
    });
    // 4307 is a 4th job, so the sender has to type the traits in by hand.
    expect(result.needsTraits).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('warns, but still accepts, a recording with no damage and no gear swap', () => {
    const result = validateReplaySubmission(loadReplayFixture('sn-buffs-potion.rrf'), items);

    expect(result.ok).toBe(true);
    expect(result.warnings).toContain('no-damage');
    expect(result.warnings).toContain('no-equip-change');
  });

  it('rejects a file bigger than a Firestore document can hold', () => {
    const result = validateReplaySubmission(new ArrayBuffer(MAX_REPLAY_BYTES + 1), items);

    expect(result).toMatchObject({ ok: false, blocker: 'too-big' });
  });

  it('rejects something that is not a replay', () => {
    const result = validateReplaySubmission(new TextEncoder().encode('not a replay at all').buffer, items);

    expect(result).toMatchObject({ ok: false, blocker: 'unreadable' });
  });
});

describe('checkReplay', () => {
  it('rejects a recording whose skill tree was left out of the file', () => {
    // What you get when the recorder's "Skill" option is unticked.
    const result = checkReplay(makeReplay({ learnedSkills: new Map() }), items);

    expect(result).toMatchObject({ ok: false, blocker: 'no-skill-tree' });
    expect(result.message).toContain('Skill');
  });

  it('rejects a class the calculator does not model', () => {
    const replay = makeReplay({ sessionInfo: { ...makeReplay().sessionInfo, job: 4001 } as any });

    expect(checkReplay(replay, items)).toMatchObject({ ok: false, blocker: 'unknown-class' });
  });

  it('does not ask for traits on a class that has none', () => {
    // 4190 = Sentinela Trans (3rd job): TraitBonusTable is empty for it.
    const replay = makeReplay({ sessionInfo: { ...makeReplay().sessionInfo, job: 4190 } as any });
    const result = checkReplay(replay, items);

    expect(result.ok).toBe(true);
    expect(result.needsTraits).toBe(false);
  });
});
