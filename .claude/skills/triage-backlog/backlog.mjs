#!/usr/bin/env node
// The bug/suggestion side of the shared tracker (issues.latam-tools.com.br).
//
//   node .claude/skills/triage-backlog/backlog.mjs --list
//   node .claude/skills/triage-backlog/backlog.mjs --list --status reportado --limit 10
//   node .claude/skills/triage-backlog/backlog.mjs --get simulador-runa-othila-aumenta-a-aspd-de-forma-irreal
//   node .claude/skills/triage-backlog/backlog.mjs --credits            (one line per card, for the Novidades entry)
//   node .claude/skills/triage-backlog/backlog.mjs --mark <id> --status resolvido --note "..."
//   node .claude/skills/triage-backlog/backlog.mjs --new --titulo "..." --descricao "..."
//
// Sibling of triage-rrf-uploads/fetch-submissions.mjs, same project and the same
// credential; that one owns `tipo: "replay"`, this one owns everything else.
//
// The site itself renders in the browser, so fetching its HTML gives an empty
// page — the board only exists over this API.
//
// Credential: the token `firebase login` already left on the machine. Point
// GOOGLE_APPLICATION_CREDENTIALS at a service-account .json to use that instead.
// Reading the board needs no credential at all in principle, but `privado/contato`
// and every write do, so the script always authenticates.
//
// The field names, status values and printed text are pt-BR because they are the
// tracker's own schema and the operator's reading material, not code.

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
  // A missing privado/contato is the normal case, not a failure.
  if (r.status === 404) return null;
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
  if ('nullValue' in v) return null;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode);
  if ('mapValue' in v) return decodeFields(v.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
}

/**
 * The id the importer gives a card: `<projeto>-<título em slug>`, capped at 60
 * characters. Readable, and deterministic enough that the same title does not
 * produce a second card. The trailing `-` a mid-word cut can leave is stripped,
 * because it ends up in the URL.
 */
function slug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');
}

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const flagValue = (f) => {
  const i = args.indexOf(f);
  return i > -1 ? args[i + 1] : undefined;
};

/** Every card of the project that is not a recording — recordings are triage-rrf-uploads'. */
async function fetchCards() {
  const projeto = flagValue('--projeto') ?? 'simulador';
  const response = await api(':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'issues' }],
        orderBy: [{ field: { fieldPath: 'criadoEm' }, direction: 'DESCENDING' }],
        limit: 500,
      },
    }),
  });

  return response
    .filter((x) => x.document)
    .map((x) => ({ id: x.document.name.split('/').pop(), d: decodeFields(x.document.fields ?? {}) }))
    .filter((c) => c.d.projeto === projeto && c.d.tipo !== 'replay');
}

const byStatus = (cards, status) => (status === 'todas' ? cards : cards.filter((c) => c.d.status === status));

// --- commands --------------------------------------------------------------

/** The queue. `--status backlog` (the default) is what was accepted and is waiting. */
async function list() {
  const status = flagValue('--status') ?? 'backlog';
  const limit = Number(flagValue('--limit') ?? 50);
  const cards = byStatus(await fetchCards(), status).slice(0, limit);

  if (!cards.length) {
    console.log(`Nenhuma ficha com status ${status}.`);
    return;
  }

  for (const { id, d } of cards) {
    console.log(`\n${id}`);
    console.log(`  ${d.titulo}`);
    console.log(
      `  ${d.tipo}  ▲${d.upvotes ?? 0}  ${d.comentarios ?? 0} comentário(s)  ` +
        `criada em ${String(d.criadoEm ?? '').slice(0, 10)}${d.arquivado ? '  [arquivada]' : ''}`,
    );
    const firstLine = String(d.descricao ?? '').split('\n').find((l) => l.trim());
    if (firstLine) console.log(`  ${firstLine.trim().slice(0, 150)}`);
  }
  console.log(`\n${cards.length} ficha(s) com status ${status}.`);
}

/** One card in full: description, comments, and who to credit. */
async function get() {
  const id = flagValue('--get');
  const doc = await api(`/issues/${id}`);
  if (!doc) {
    console.error(`${id} não existe.`);
    process.exit(1);
  }
  const d = decodeFields(doc.fields ?? {});
  const comments = await api(`/issues/${id}/comentarios`);
  const contact = await api(`/issues/${id}/privado/contato`);

  console.log(`${id}`);
  console.log(`${d.titulo}`);
  console.log(`${d.projeto} · ${d.tipo} · ${d.status} · ▲${d.upvotes ?? 0} · criada em ${String(d.criadoEm ?? '').slice(0, 10)}\n`);
  console.log(d.descricao ?? '');

  for (const c of (comments?.documents ?? []).map((x) => decodeFields(x.fields ?? {}))) {
    console.log(`\n--- comentário de ${c.autor ?? '?'} em ${String(c.criadoEm ?? '').slice(0, 10)}`);
    console.log(c.texto ?? '');
  }

  console.log('\n--- crédito');
  console.log(`autor (público, pode ir para as Novidades): ${d.autor ?? '— não informado, crédito é "usuário anônimo"'}`);
  if (contact) {
    const value = decodeFields(contact.fields ?? {}).contato;
    console.log(`contato (PRIVADO, NUNCA publicar): ${value}`);
    console.log('    O formulário promete "Não aparece no site — só eu vejo". Não é crédito, é canal de contato.');
  }
}

/**
 * One line per card, ready for writing the release entry: which cards may name a
 * person and which must say "usuário anônimo". Prints no contact at all — the
 * private field has no business in a file that feeds Novidades.
 */
async function credits() {
  const status = flagValue('--status') ?? 'resolvido';
  const cards = byStatus(await fetchCards(), status);

  for (const { id, d } of cards) {
    const credit = d.autor ? `Reportado por ${d.autor}.` : 'Reportado por usuário anônimo.';
    console.log(`${credit.padEnd(38)} ${d.titulo}`);
    console.log(`${''.padEnd(38)} ${id}`);
  }
  console.log(`\n${cards.length} ficha(s) com status ${status}.`);
}

/** Moves a card between columns. `--note` becomes a public comment on it. */
async function mark() {
  const id = flagValue('--mark');
  const status = flagValue('--status');
  if (!STATUSES.includes(status ?? '')) {
    console.error(`use --status ${STATUSES.join('|')}`);
    process.exit(2);
  }
  const note = flagValue('--note');

  const mask = ['status', 'atualizadoEm'].map((f) => `updateMask.fieldPaths=${f}`).join('&');
  await api(`/issues/${id}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        atualizadoEm: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (note) {
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

  console.log(`${id} → ${status}${note ? ` — ${note}` : ''}`);
}

/**
 * Opens a card in `reportado`, for the part of a report that turned out to be a
 * separate problem. It goes on the public board immediately, so write the
 * description for a stranger.
 */
async function create() {
  const titulo = flagValue('--titulo');
  const descricao = flagValue('--descricao');
  if (!titulo || !descricao) {
    console.error('use --new --titulo "..." --descricao "..." [--tipo bug|feature] [--projeto simulador]');
    process.exit(2);
  }
  const projeto = flagValue('--projeto') ?? 'simulador';
  const tipo = flagValue('--tipo') ?? 'bug';
  const id = `${projeto}-${slug(titulo)}`;
  const now = new Date().toISOString();

  if (await api(`/issues/${id}`)) {
    console.error(`${id} já existe — mude o título ou comente na ficha que já está lá.`);
    process.exit(1);
  }

  await api(`/issues?documentId=${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({
      fields: {
        projeto: { stringValue: projeto },
        tipo: { stringValue: tipo },
        titulo: { stringValue: titulo },
        descricao: { stringValue: descricao },
        status: { stringValue: 'reportado' },
        arquivado: { booleanValue: false },
        upvotes: { integerValue: '0' },
        comentarios: { integerValue: '0' },
        anexos: { integerValue: '0' },
        criadoEm: { timestampValue: now },
        atualizadoEm: { timestampValue: now },
      },
    }),
  });

  console.log(`${id} criada em reportado`);
  console.log(`https://issues.latam-tools.com.br/t/${id}`);
}

if (hasFlag('--list')) await list();
else if (flagValue('--get')) await get();
else if (hasFlag('--credits')) await credits();
else if (flagValue('--mark')) await mark();
else if (hasFlag('--new')) await create();
else {
  console.error(`uso:
  --list [--status ${STATUSES.join('|')}|todas] [--limit N] [--projeto simulador]
  --get <id>
  --credits [--status resolvido]
  --mark <id> --status <status> [--note "..."]
  --new --titulo "..." --descricao "..." [--tipo bug|feature]`);
  process.exit(2);
}
