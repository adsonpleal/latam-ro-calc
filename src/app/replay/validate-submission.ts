import { decodeReplay, Replay } from 'rrfparser';
import { ClassIdBySpriteJob, getClassDropdownList } from '../jobs';
import { BUFF_EFST } from './replay-buffs';
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

/**
 * The training field. This is the only map a submission is accepted from in the current
 * pass, because it is the only place the comparison is clean: the dummies stand still,
 * have 0 DEF and 0 RES, and do not fight back.
 *
 * Instances prefix the map with `N@`, so the party number is stripped before comparing.
 */
export const TRAINING_MAP = 'tra_fild';

/** Mob ids of the training dummies — a contiguous block, Small through Undead Lv1. */
export const DUMMY_ID_RANGE = { first: 21064, last: 21086 } as const;

export const isTrainingDummy = (mobId: number): boolean =>
  mobId >= DUMMY_ID_RANGE.first && mobId <= DUMMY_ID_RANGE.last;

/** `0eo1@advs` and `1@advs` are the same map; the prefix is the instance's party id. */
export const normalizeMap = (map: string): string => (map || '').replace(/^[^@]*@/, '');

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
  /** Damage packets landed on a training dummy — what the conference actually reads. */
  dummyHits: number;
  /** Item ids outside the LATAM item DB, so they can be triaged with add-ro-item. */
  skippedItems: number[];
}

export type SubmissionBlockerCode =
  | 'too-big'
  | 'unreadable'
  | 'unknown-class'
  | 'no-skill-tree'
  | 'wrong-map'
  | 'no-dummy-damage';

export type SubmissionWarningCode = 'many-unknown-items' | 'no-equip-change' | 'external-buffs';

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

  // The two rules that make this pass worth running at all. A recording taken anywhere
  // else, or against anything that fights back, cannot separate a wrong item from a wrong
  // formula: the target's own DEF/RES and the damage it deals back are unknowns we would
  // be solving for at the same time as the thing being measured.
  if (normalizeMap(session.map) !== TRAINING_MAP) {
    return reject(
      'wrong-map',
      `Esta gravação é no mapa "${session.map || 'desconhecido'}", e nesta etapa só servem gravações no ` +
        `campo de treinamento (${TRAINING_MAP}), batendo nos bonecos. Fora dali o alvo tem DEF e RES próprias ` +
        `e revida, e aí não dá para saber se a diferença veio de um item errado ou de uma fórmula errada.`,
    );
  }

  const dummyHits = countDummyHits(replay);
  if (dummyHits === 0) {
    return reject(
      'no-dummy-damage',
      'Não há nenhum golpe seu em um boneco de treino nesta gravação. É o dano nos bonecos que a conferência ' +
        'compara pacote a pacote — sem ele não há o que medir. Vá até os bonecos e use cada habilidade umas 10 vezes.',
    );
  }

  const { summary: importSummary } = replayToModel(replay, itemMap);

  const warnings: SubmissionWarningCode[] = [];
  if (replay.equipChanges.length === 0) warnings.push('no-equip-change');
  if (hasExternalBuffs(replay)) warnings.push('external-buffs');
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
      dummyHits,
      skippedItems: importSummary.skippedItems.map((s) => s.itemId),
    },
  };
}

/**
 * Damage packets the recording player landed on a training dummy.
 *
 * The target is an entity id, so the mob id comes from the entity snapshot; a packet
 * whose target was never seen spawning cannot be attributed and is not counted.
 */
export function countDummyHits(replay: Replay): number {
  const aid = replay.sessionInfo?.aid;
  let n = 0;
  for (const d of replay.damage ?? []) {
    if (aid !== undefined && d.source !== aid) continue;
    const view = replay.entities?.get(d.target)?.view;
    if (view !== undefined && isTrainingDummy(view)) n++;
  }
  return n;
}

/**
 * Whether someone else's buffs were running on the player. Not a blocker — a Bênção left
 * over from town is not worth throwing a recording away for — but it is the single
 * biggest source of noise, so the sender is told before sending.
 */
export function hasExternalBuffs(replay: Replay): boolean {
  const aid = replay.sessionInfo?.aid;
  for (const s of replay.statusEvents ?? []) {
    if (aid !== undefined && s.aid !== aid) continue;
    if (s.isOn && BUFF_EFST[s.statusId]) return true;
  }
  return false;
}

function formatKb(bytes: number): string {
  return `${Math.round(bytes / 1024)} KB`;
}
