import { Replay } from 'rrfparser';

/** The six trait fields, in the order the game's status window lists them. */
export const TRAIT_KEYS = ['pow', 'sta', 'wis', 'spl', 'con', 'crt'] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];

/** The six trait stats, as the *invested* value (0-100) the calculator stores. */
export type ReplayTraits = Record<TraitKey, number>;

/** Whether a set of traits was read off the recording or typed in by the sender. */
export type ReplayTraitsSource = 'replay' | 'form';

/** pt-BR labels, as the status window prints them. */
export const TRAIT_LABELS: Record<TraitKey, string> = {
  pow: 'POD',
  sta: 'STA',
  wis: 'SAB',
  spl: 'FEI',
  con: 'CON',
  crt: 'CRV',
};

/**
 * The traits a recording carried, or `null` when it cannot say.
 *
 * The traits live in no container of the `.rrf`: `ZC_COUPLESTATUS` (0x0141) is
 * their only carrier, and the server sends the full set from `clif_initialstatus`
 * — at login (before the recorder starts, so never captured) and on **every map
 * load** (captured). So a recording that teleported or warped has all six, and one
 * that never changed map has none, or only the ones a buff happened to move
 * mid-recording. Credit for finding this goes to Kiulg, who maintains rocalc.
 *
 * **All six or nothing.** A partial set is not a partial answer, it is a trap: the
 * missing fields would silently default to 0 and read as real values. Our own
 * `hn-magic-matrix.rrf` fixture is the case in point — the stream carries only
 * `spl: 100`, while the player's status window says `sta 31, wis 31` as well.
 * Importing the partial set would have quietly zeroed 62 invested points.
 */
export function readReplayTraits(replay: Replay): ReplayTraits | null {
  const traits = replay?.traits;
  if (!traits) return null;
  if (TRAIT_KEYS.some((k) => typeof traits[k] !== 'number')) return null;
  return TRAIT_KEYS.reduce((out, k) => ({ ...out, [k]: traits[k] }), {} as ReplayTraits);
}
