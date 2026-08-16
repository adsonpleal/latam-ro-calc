#!/usr/bin/env node
// Triage of the community-submitted .rrf recordings ("Ajude o simulador" dialog).
//
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list --status todas
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K --out src/app/replay/__tests__/fixtures/xx.rrf
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark aBcD3fGh7K --status backlog --note "virou fixture nw-ult"
//
// The recordings used to live in THIS project's `replay_submissions` collection.
// They now go to the shared tracker (issues.latam-tools.com.br, project
// `issues-latam-tools`), as cards of `tipo: "replay"` with the .rrf in an
// attachment and the parser's summary in the `replay` field.
//
// A card is born **archived**: off the public board, and the rules deny reading
// the attachment while it stays that way — the same privacy the old collection
// had with `allow read: if false`. Promoting it to `backlog` is what makes it
// public, and that is the decision this triage makes.
//
// Credential: uses the token `firebase login` already left on the machine, so
// `.firebase-admin.json` is no longer needed. To use a service account instead,
// point GOOGLE_APPLICATION_CREDENTIALS at the .json and it wins.
//
// No dependencies: the JWT is signed with `node:crypto` and traded for an access
// token at oauth2.googleapis.com.
//
// The field names, status values and printed text are pt-BR because they are the
// tracker's own schema and the operator's reading material, not code.

import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const PROJECT = 'issues-latam-tools';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// Public firebase-tools client id/secret — they are what turns the refresh token
// the CLI stored into a usable credential.
const CLI_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const SCOPE = 'https://www.googleapis.com/auth/datastore';

const STATUSES = ['reportado', 'backlog', 'em_progresso', 'resolvido', 'nao_sera_feito'];

let tokenCache = null;

async function token() {
  if (tokenCache) return tokenCache;
  const sa = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
  tokenCache = sa ? await tokenFromServiceAccount(sa) : await tokenFromCli();
  return tokenCache;
}

async function tokenFromServiceAccount(path) {
  const sa = JSON.parse(readFileSync(path, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const header = b64({ alg: 'RS256', typ: 'JWT' });
  const payload = b64({
    iss: sa.client_email,
    scope: SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  });
  const signature = createSign('RSA-SHA256').update(`${header}.${payload}`).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${payload}.${signature}`,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`conta de serviço: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function tokenFromCli() {
  const file = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    console.error('Sem credencial. Rode `firebase login`, ou aponte GOOGLE_APPLICATION_CREDENTIALS para uma chave .json.');
    process.exit(2);
  }
  if (!cfg?.tokens?.refresh_token) {
    console.error(`Sem refresh token em ${file} — rode \`firebase login\`.`);
    process.exit(2);
  }
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLI_ID,
      client_secret: CLI_SECRET,
      refresh_token: cfg.tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`refresh token: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function api(path, options = {}) {
  const r = await fetch(`${DOCS}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// --- REST decoding ---------------------------------------------------------

function decode(v) {
  if (!v || typeof v !== 'object') return v;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('bytesValue' in v) return Buffer.from(v.bytesValue, 'base64');
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
}

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const flagValue = (f) => {
  const i = args.indexOf(f);
  return i > -1 ? args[i + 1] : undefined;
};

// --- commands --------------------------------------------------------------

/** The triage queue. `--status reportado` (the default) is what nobody sorted yet. */
async function listCards() {
  const status = flagValue('--status') ?? 'reportado';
  const limit = Number(flagValue('--limit') ?? 50);

  // The .rrf lives in a subcollection, so the listing downloads no bytes at all —
  // there is no need to project fields the way there used to be. The status filter
  // runs in memory: there are a few dozen cards, and it saves one composite index.
  const response = await api(':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'issues' }],
        where: { fieldFilter: { field: { fieldPath: 'tipo' }, op: 'EQUAL', value: { stringValue: 'replay' } } },
        orderBy: [{ field: { fieldPath: 'criadoEm' }, direction: 'DESCENDING' }],
        limit: 500,
      },
    }),
  });

  const cards = response
    .filter((x) => x.document)
    .map((x) => ({ id: x.document.name.split('/').pop(), d: decodeFields(x.document.fields ?? {}) }))
    .filter((c) => status === 'todas' || c.d.status === status)
    .slice(0, limit);

  if (!cards.length) {
    console.log(`Nenhuma gravação com status ${status}.`);
    return;
  }

  for (const { id, d } of cards) {
    const r = d.replay ?? {};
    const board = d.arquivado ? '' : '  [no quadro público]';
    console.log(`\n${id}  ${String(d.criadoEm ?? '').slice(0, 16)}  ${r.fileName ?? ''}${board}`);
    console.log(
      `  ${r.player ?? '?'} — ${r.className ?? '?'} nv ${r.baseLevel ?? '?'}/${r.jobLevel ?? '?'}  ` +
        `${Math.round((r.durationMs ?? 0) / 1000)}s  ${r.dummyHits ?? 0} golpes em dummy  ` +
        `${r.equipChangeCount ?? 0} trocas de equip.  ${r.learnedSkillCount ?? 0} habilidades`,
    );
    if (r.traits) {
      const source = r.traitsSource === 'replay' ? 'da gravação' : 'informados por quem gravou';
      const traits = ['pow', 'sta', 'wis', 'spl', 'con', 'crt'].map((k) => `${k.toUpperCase()} ${r.traits[k]}`).join('  ');
      console.log(`  talentos (${source}): ${traits}`);
    } else {
      console.log('  talentos: (classe sem talentos)');
    }
    if (d.autor) console.log(`  por: ${d.autor}`);
    // The description is "the sender's note" + the parser's paragraph. With no
    // note only the parser's paragraph is left, and that already went out on the
    // line above — so it is only worth printing when both are there.
    const paragraphs = String(d.descricao ?? '').split('\n\n');
    if (paragraphs.length > 1 && paragraphs[0].trim()) console.log(`  obs.: ${paragraphs[0].trim()}`);
    if (r.skippedItems?.length) console.log(`  itens fora do banco: ${r.skippedItems.join(', ')}`);
  }
  console.log(`\n${cards.length} gravação(ões) com status ${status}.`);
}

/** Downloads the .rrf from the attachment. */
async function download() {
  const id = flagValue('--get');
  const card = decodeFields((await api(`/issues/${id}`)).fields ?? {});
  const attachments = await api(`/issues/${id}/anexos`);
  const attachment = (attachments.documents ?? []).map((x) => decodeFields(x.fields ?? {})).find((a) => a.tipo === 'rrf');
  if (!attachment) {
    console.error(`${id} não tem gravação anexada.`);
    process.exit(1);
  }

  const target = flagValue('--out') ?? join('.scratch', `${id}.rrf`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, attachment.bytes);

  const r = card.replay ?? {};
  console.log(`${target}  (${attachment.bytes.length} bytes)`);
  console.log(`PERSONAGEM: ${r.player ?? '?'} — ${r.className ?? '?'} nv ${r.baseLevel ?? '?'}/${r.jobLevel ?? '?'}`);
  console.log(`GOLPES: ${r.dummyHits ?? 0} em dummy, ${r.damageEvents ?? 0} no total, ${r.equipChangeCount ?? 0} trocas de equip.`);
  if (r.skippedItems?.length) console.log(`ITENS FORA DO BANCO: ${r.skippedItems.join(', ')}`);
  console.log(
    r.traits
      ? `TALENTOS (${r.traitsSource === 'replay' ? 'lidos da própria gravação' : 'informados por quem gravou'}): ` +
          ['pow', 'sta', 'wis', 'spl', 'con', 'crt'].map((k) => `${k.toUpperCase()} ${r.traits[k]}`).join('  ')
      : 'TALENTOS: classe sem talentos.',
  );
}

/**
 * Closes the loop. `--status backlog` takes the recording out of the archive and
 * onto the public board — only do that when it is worth it, because from then on
 * anyone can download the .rrf. Every other status leaves it archived.
 */
async function mark() {
  const id = flagValue('--mark');
  const status = flagValue('--status');
  if (!STATUSES.includes(status ?? '')) {
    console.error(`use --status ${STATUSES.join('|')}`);
    process.exit(2);
  }
  const note = flagValue('--note');
  const publish = status === 'backlog' || hasFlag('--publicar');

  const mask = ['status', 'arquivado', 'atualizadoEm'].map((f) => `updateMask.fieldPaths=${f}`).join('&');
  await api(`/issues/${id}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        arquivado: { booleanValue: !publish },
        atualizadoEm: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (note) {
    // A comment on the card — visible along with it, which means public from the
    // moment the recording is promoted.
    await api(`/issues/${id}/comentarios`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          texto: { stringValue: note },
          autor: { stringValue: 'Triagem' },
          autorUid: { stringValue: 'triagem' },
          tipo: { stringValue: 'mudanca' },
          criadoEm: { timestampValue: new Date().toISOString() },
        },
      }),
    });
  }

  console.log(`${id} → ${status}${publish ? ' (no quadro público)' : ' (arquivada)'}${note ? ` — ${note}` : ''}`);
}

if (hasFlag('--list')) await listCards();
else if (flagValue('--get')) await download();
else if (flagValue('--mark')) await mark();
else {
  console.error(`uso:
  --list [--status ${STATUSES.join('|')}|todas] [--limit N]
  --get <id> [--out caminho.rrf]
  --mark <id> --status <status> [--note "..."] [--publicar]`);
  process.exit(2);
}
