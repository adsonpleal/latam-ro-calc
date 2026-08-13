import { Injectable } from '@angular/core';
import { MAX_REPLAY_BYTES, ReplaySubmissionSummary, ReplayTraits } from 'src/app/replay/validate-submission';
import { environment } from 'src/environments/environment';

/**
 * Sends a community `.rrf` recording to Firestore.
 *
 * Deliberately talks to the REST API with `fetch` instead of pulling in the
 * Firebase SDK: the whole feature is a single write, and the SDK would cost
 * ~90 KB gzip in the main bundle for it. The security rules apply to REST calls
 * the same way (see firestore.rules) — the API key only identifies the project.
 */
export interface ReplaySubmission {
  bytes: Uint8Array;
  fileName: string;
  appVersion: string;
  summary: ReplaySubmissionSummary;
  /** Null for classes without traits (pre-4th job). */
  traits: ReplayTraits | null;
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
    const url =
      `https://firestore.googleapis.com/v1/projects/${environment.firebaseProjectId}` +
      `/databases/(default)/documents/replay_submissions` +
      `?documentId=${id}&key=${environment.firebaseApiKey}`;

    const fields: Record<string, unknown> = {
      bytes: submission.bytes,
      fileName: submission.fileName.slice(0, 200),
      uploadedAt: new Date(),
      status: 'new',
      appVersion: submission.appVersion.slice(0, 20),
      latamConfirmed: true,
      summary: {
        ...submission.summary,
        // Capped so a replay full of foreign items can't bloat the document.
        skippedItems: submission.summary.skippedItems.slice(0, 100),
      },
    };
    // Optional fields are omitted rather than sent empty — the rules accept
    // either, and an absent key reads better than an empty string in triage.
    if (submission.traits) fields['traits'] = submission.traits;
    if (submission.nick.trim()) fields['nick'] = submission.nick.trim().slice(0, 40);
    if (submission.discord.trim()) fields['discord'] = submission.discord.trim().slice(0, 60);
    if (submission.notes.trim()) fields['notes'] = submission.notes.trim().slice(0, 1000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: encodeFields(fields) }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Firestore respondeu ${res.status}: ${body.slice(0, 200)}`);
    }

    return id;
  }
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
