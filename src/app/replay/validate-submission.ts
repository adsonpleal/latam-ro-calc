import { decodeReplay, Replay } from 'rrfparser';
import { ClassIdBySpriteJob, getClassDropdownList } from '../jobs';
import { replayToModel } from './replay-to-model';

/**
 * Decides whether a community `.rrf` recording is worth sending us, before it
 * leaves the browser. Framework-free so it can be unit-tested against the
 * fixtures in `__tests__/fixtures/`.
 *
 * The bar is what the `review-rrf-class` skill actually needs: a class the
 * calculator models, and the skill tree (which the in-game recorder only writes
 * when the "Skill" box is ticked in its Opções panel).
 */

/** A Firestore document caps at 1 MiB; leave headroom for the metadata. */
export const MAX_REPLAY_BYTES = 900 * 1024;

/** The six trait stats, as the *invested* value (0-100) the calculator stores. */
export interface ReplayTraits {
  pow: number;
  sta: number;
  wis: number;
  spl: number;
  con: number;
  crt: number;
}

/**
 * What the parser read out of the recording. Shown to the sender for a sanity
 * check, and denormalized into the Firestore document so triage can list
 * submissions without downloading the blobs.
 */
export interface ReplaySubmissionSummary {
  player: string;
  className: string;
  /** Calculator class id (already translated from the sprite job id). */
  classId: number;
  spriteJob: number;
  baseLevel: number;
  jobLevel: number;
  map: string;
  durationMs: number;
  damageEvents: number;
  learnedSkillCount: number;
  equippedCount: number;
  equipChangeCount: number;
  packetCount: number;
  /** Item ids outside the LATAM item DB, so they can be triaged with add-ro-item. */
  skippedItems: number[];
}

export type SubmissionBlockerCode = 'too-big' | 'unreadable' | 'unknown-class' | 'no-skill-tree';

export type SubmissionWarningCode = 'no-damage' | 'many-unknown-items' | 'no-equip-change';

/**
 * Deliberately one flat shape rather than a discriminated union: this project
 * compiles with `strict: false`, where TypeScript does not narrow a union by its
 * discriminant, so a union would only force casts at every use.
 * `blocker`/`message` carry the rejection; the rest is only meaningful when `ok`.
 */
export interface SubmissionCheck {
  ok: boolean;
  blocker: SubmissionBlockerCode | null;
  message: string;
  summary: ReplaySubmissionSummary | null;
  /** True when the class has trait stats, so the sender must type them in. */
  needsTraits: boolean;
  warnings: SubmissionWarningCode[];
}

function reject(blocker: SubmissionBlockerCode, message: string): SubmissionCheck {
  return { ok: false, blocker, message, summary: null, needsTraits: false, warnings: [] };
}

export function validateReplaySubmission(buf: ArrayBuffer, itemMap: Record<number, any>): SubmissionCheck {
  if (buf.byteLength > MAX_REPLAY_BYTES) {
    return reject(
      'too-big',
      `A gravação tem ${formatKb(buf.byteLength)}, e o limite é ${formatKb(MAX_REPLAY_BYTES)}. Grave uma sessão mais curta.`,
    );
  }

  let replay: Replay;
  try {
    replay = decodeReplay(buf);
  } catch (e) {
    // Unlike the build importer, show the parser's own message — an unsupported version
    // and a truncated file call for different fixes.
    return reject('unreadable', `Não foi possível ler o arquivo .rrf (${(e as Error).message}).`);
  }

  return checkReplay(replay, itemMap);
}

/** The decision itself, on an already-parsed replay. Split out so it can be
 *  exercised against hand-built replays as well as real recordings. */
export function checkReplay(replay: Replay, itemMap: Record<number, any>): SubmissionCheck {
  const session = replay.sessionInfo;
  const classId = ClassIdBySpriteJob[session.job] ?? session.job;
  const klass = getClassDropdownList().find((c) => c.value === classId);
  if (!klass) {
    return reject(
      'unknown-class',
      `A classe deste replay (${session.player || 'personagem'}, job ${session.job}) não existe na calculadora. ` +
        `Se a gravação não for do RO LATAM, ela não serve para a conferência.`,
    );
  }

  if (replay.learnedSkills.size === 0) {
    return reject(
      'no-skill-tree',
      'A gravação não tem a árvore de habilidades, e sem ela não dá para conferir as fórmulas. ' +
        'Isso acontece quando a caixa "Skill" fica desmarcada nas Opções do gravador — é preciso gravar de novo.',
    );
  }

  const { summary: importSummary } = replayToModel(replay, itemMap);

  const warnings: SubmissionWarningCode[] = [];
  if (replay.damage.length === 0) warnings.push('no-damage');
  if (replay.equipChanges.length === 0) warnings.push('no-equip-change');
  // A recording from another server lights this up: its gear simply isn't in
  // the LATAM item DB. Not a hard block — a LATAM player can be wearing one
  // piece we haven't catalogued yet.
  if (importSummary.skippedItems.length >= 5) warnings.push('many-unknown-items');

  return {
    ok: true,
    blocker: null,
    message: '',
    needsTraits: klass['instant'].isAllowTraitStat(),
    warnings,
    summary: {
      player: session.player || '',
      className: klass.label,
      classId,
      spriteJob: session.job,
      baseLevel: session.baseLevel,
      jobLevel: session.jobLevel,
      map: session.map || '',
      durationMs: Math.round(session.durationMs),
      damageEvents: replay.damage.length,
      learnedSkillCount: importSummary.learnedSkillCount,
      equippedCount: importSummary.equippedCount,
      equipChangeCount: replay.equipChanges.length,
      packetCount: replay.totals.packetCount,
      skippedItems: importSummary.skippedItems.map((s) => s.itemId),
    },
  };
}

function formatKb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}
