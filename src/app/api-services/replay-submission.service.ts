import { Injectable } from '@angular/core';
import { ReplayTraits, ReplayTraitsSource } from 'src/app/replay/replay-traits';
import { MAX_REPLAY_BYTES, ReplaySubmissionSummary } from 'src/app/replay/validate-submission';
import { environment } from 'src/environments/environment';

/**
 * Sends a community `.rrf` recording to the shared issue tracker
 * (issues.latam-tools.com.br), as a card of `tipo: 'replay'` with the recording
 * attached and the parser's summary denormalised alongside it.
 *
 * It used to write to this project's own `replay_submissions` collection. The
 * tracker replaced it so every product's queue lives in one place — but the
 * privacy posture of the old collection is preserved: the card is created
 * **archived**, which the tracker's rules translate into "not on the public
 * board, and the attachment is unreadable". Triage is what makes one public,
 * by moving it to backlog once the recording proves useful.
 *
 * Deliberately talks to the REST API with `fetch` instead of pulling in the
 * Firebase SDK: the whole feature is a single write, and the SDK would cost
 * ~90 KB gzip in the main bundle for it. The security rules apply to REST calls
 * the same way — the API key only identifies the project.
 */
export interface ReplaySubmission {
  bytes: Uint8Array;
  fileName: string;
  appVersion: string;
  summary: ReplaySubmissionSummary;
  /** Null for classes without traits (pre-4th job). */
  traits: ReplayTraits | null;
  /**
   * Where `traits` came from — `'replay'` when the recording carried them,
   * `'form'` when the sender typed them in. Triage needs the difference: numbers
   * off the wire are the server's own, numbers off the form are somebody reading
   * their status window, which is where a wrong trait comes from. Null whenever
   * `traits` is.
   */
  traitsSource: ReplayTraitsSource | null;
  nick: string;
  discord: string;
  notes: string;
}

@Injectable({ providedIn: 'root' })
export class ReplaySubmissionService {
  /**
   * Writes one submission and returns its id. Throws with the server's message
   * on rejection so the dialog can show something more useful than "deu erro".
   */
  async submit(submission: ReplaySubmission): Promise<string> {
    if (submission.bytes.byteLength > MAX_REPLAY_BYTES) {
      throw new Error('Arquivo grande demais.');
    }

    const id = generateSubmissionId();
    const raiz = `projects/${environment.issuesProjectId}/databases/(default)`;
    const doc = (caminho: string) => `${raiz}/documents/${caminho}`;

    const nick = submission.nick.trim().slice(0, 40);
    const discord = submission.discord.trim().slice(0, 60);
    const notes = submission.notes.trim().slice(0, 1000);

    // O resumo do parser vai desnormalizado no card para a triagem ranquear sem
    // baixar o .rrf, que tem centenas de kB.
    const replay: Record<string, unknown> = {
      ...submission.summary,
      // Capped so a replay full of foreign items can't bloat the document.
      skippedItems: submission.summary.skippedItems.slice(0, 100),
      appVersion: submission.appVersion.slice(0, 20),
      fileName: submission.fileName.slice(0, 200),
    };
    if (submission.traits) {
      replay['traits'] = submission.traits;
      replay['traitsSource'] = submission.traitsSource ?? 'form';
    }

    const card: Record<string, unknown> = {
      projeto: 'simulador',
      titulo: tituloDaGravacao(submission.summary),
      descricao: descricaoDaGravacao(submission.summary, notes),
      tipo: 'replay',
      status: 'reportado',
      // Chega escondida do quadro público. Ver o comentário no topo.
      arquivado: true,
      upvotes: 0,
      comentarios: 0,
      anexos: 1,
      replay,
    };
    // O nick foi pedido como crédito ("como você quer ser citado"), então é o
    // único dado de identificação que pode aparecer no card. O Discord é
    // contato: vai para um subdocumento que só o admin lê.
    if (nick) card['autor'] = nick;

    // Uma escrita só, atômica: ou entram o card, o anexo e o contato, ou não
    // entra nada. Três POSTs soltos poderiam deixar um card sem a gravação.
    //
    // `:commit` com `setToServerValue` também é a única forma de satisfazer as
    // regras do rastreador, que exigem `criadoEm == request.time` — um POST
    // comum só consegue mandar o relógio de quem envia.
    const writes: unknown[] = [
      {
        update: { name: doc(`issues/${id}`), fields: encodeFields(card) },
        updateTransforms: [
          { fieldPath: 'criadoEm', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'atualizadoEm', setToServerValue: 'REQUEST_TIME' },
        ],
        currentDocument: { exists: false },
      },
      {
        update: {
          name: doc(`issues/${id}/anexos/gravacao`),
          fields: encodeFields({
            nome: submission.fileName.slice(0, 200),
            tipo: 'rrf',
            tamanho: submission.bytes.byteLength,
            bytes: submission.bytes,
          }),
        },
        updateTransforms: [{ fieldPath: 'criadoEm', setToServerValue: 'REQUEST_TIME' }],
      },
    ];
    if (discord) {
      writes.push({
        update: {
          name: doc(`issues/${id}/privado/contato`),
          fields: encodeFields({ contato: discord }),
        },
        updateTransforms: [{ fieldPath: 'criadoEm', setToServerValue: 'REQUEST_TIME' }],
      });
    }

    const res = await fetch(
      `https://firestore.googleapis.com/v1/${raiz}/documents:commit?key=${environment.issuesApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writes }),
      },
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Firestore respondeu ${res.status}: ${body.slice(0, 200)}`);
    }

    return id;
  }
}

/** "Gravação: Executor nv 240/50 — Erin_J" — o que a triagem lê na listagem. */
export function tituloDaGravacao(s: ReplaySubmissionSummary): string {
  const classe = s.className || 'Classe desconhecida';
  const nivel = s.baseLevel ? ` nv ${s.baseLevel}/${s.jobLevel ?? '?'}` : '';
  const quem = s.player ? ` — ${s.player}` : '';
  return `Gravação: ${classe}${nivel}${quem}`.slice(0, 120);
}

/** A observação de quem gravou primeiro; o que o parser leu, depois. */
export function descricaoDaGravacao(s: ReplaySubmissionSummary, notes: string): string {
  const partes: string[] = [];
  if (notes) partes.push(notes);
  const duracao = s.durationMs ? `${Math.round(s.durationMs / 1000)}s` : '?';
  partes.push(
    `Gravação de ${duracao} com ${s.dummyHits} golpes em dummy ` +
      `(${s.damageEvents} eventos de dano no total), ` +
      `${s.equipChangeCount} trocas de equipamento e ` +
      `${s.learnedSkillCount} habilidades aprendidas. ` +
      `Mapa ${s.map}.`,
  );
  return partes.join('\n\n').slice(0, 4000);
}

/**
 * 10 chars from a 56-symbol alphabet without look-alikes (no I/l/1, O/0).
 * Same scheme as the RagnaRecap share ids, so the two products' ids read alike.
 */
export function generateSubmissionId(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let id = '';
  for (const b of bytes) id += alphabet[b % alphabet.length];
  return id;
}

/** Maps a plain object onto the Firestore REST `fields` shape. */
export function encodeFields(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) out[key] = encodeValue(value);
  return out;
}

function encodeValue(value: unknown): unknown {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Uint8Array) return { bytesValue: toBase64(value) };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      // integerValue travels as a string in the REST encoding.
      return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
    default:
      return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
  }
}

/**
 * btoa() needs a binary string, and spreading ~900 KB into String.fromCharCode
 * overflows the argument stack — so walk it in 32 KB chunks.
 */
function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
