import { Replay, decodeReplay } from 'rrfparser';
import { describe, expect, it } from 'vitest';
import { loadReplayFixture } from './__tests__/load-fixture';
import { readReplayTraits } from './replay-traits';

const withTraits = (traits: any): Replay => ({ traits } as unknown as Replay);

describe('readReplayTraits', () => {
  it('reads the six traits when the recording carried all of them', () => {
    const replay = withTraits({ pow: 100, sta: 0, wis: 0, spl: 0, con: 59, crt: 0 });

    expect(readReplayTraits(replay)).toEqual({ pow: 100, sta: 0, wis: 0, spl: 0, con: 59, crt: 0 });
  });

  it('keeps a real zero — the server reporting 0 is an answer, not a gap', () => {
    const replay = withTraits({ pow: 0, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 });

    expect(readReplayTraits(replay)).toEqual({ pow: 0, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 });
  });

  /**
   * The trap this rule exists for. A partial set arrives when a buff moved one
   * trait mid-recording without a map load ever sending the full block; the five
   * missing fields are unknown, and letting them default to 0 would read as an
   * allocation the player never made.
   */
  it('refuses a partial set rather than defaulting the rest to zero', () => {
    expect(readReplayTraits(withTraits({ spl: 100 }))).toBeNull();
    expect(readReplayTraits(withTraits({ pow: 100, sta: 31, wis: 31, spl: 100, con: 0 }))).toBeNull();
  });

  it('returns null for a recording that carried none', () => {
    expect(readReplayTraits(withTraits({}))).toBeNull();
    expect(readReplayTraits(withTraits(undefined))).toBeNull();
    expect(readReplayTraits(undefined as unknown as Replay)).toBeNull();
  });
});

/**
 * Against the real corpus. These three fixtures are the whole picture: one that
 * changed map and carries the full block, one that only ever had a buff touch a
 * single trait, and one that never carried the packet at all.
 */
describe('readReplayTraits — real recordings', () => {
  const traitsOf = (fixture: string) => readReplayTraits(decodeReplay(loadReplayFixture(fixture)));

  /**
   * Ground truth: `hn-physical-matrix.rrf` is the recording whose traits the
   * sender reported by hand on upload, and HyperNovice.physical-replay.spec.ts
   * has been running against exactly these numbers since. The packet stream
   * agrees with the status window the player read, field for field.
   */
  it('recovers the traits the sender of hn-physical-matrix.rrf reported by hand', () => {
    expect(traitsOf('hn-physical-matrix.rrf')).toEqual({ pow: 100, sta: 0, wis: 0, spl: 0, con: 59, crt: 0 });
  });

  /**
   * The same character, a different session: the stream carries only `spl`, while
   * the status window that spec uses says `sta 31, wis 31` too. Importing what is
   * there would have quietly zeroed 62 invested points — which is why a partial
   * set is refused outright.
   */
  it('refuses hn-magic-matrix.rrf, whose stream carries spl alone', () => {
    expect(traitsOf('hn-magic-matrix.rrf')).toBeNull();
  });

  it('refuses a recording that never changed map', () => {
    expect(traitsOf('wh-ilimitar.rrf')).toBeNull();
    expect(traitsOf('nw-ult.rrf')).toBeNull();
  });
});
