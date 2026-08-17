#!/usr/bin/env node
// Triage of the community-submitted .rrf recordings ("Ajude o simulador" dialog).
//
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list --estado todas
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K --out src/app/replay/__tests__/fixtures/xx.rrf
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --marcar aBcD3fGh7K --estado conferida --nota "virou fixture nw-ult"
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --promover aBcD3fGh7K --nota "achou o buraco na maestria"
//
// The recordings used to live in THIS project's `replay_submissions` collection,
// and then, for a while, on the tracker's board as cards born `arquivado`. They
// now sit in the tracker's `gravacoes` collection (issues.latam-tools.com.br,
// project `issues-latam-tools`) — an inbox only the admin reads, with the file
// in `gravacoes/<id>/arquivo/rrf`.
//
// **Nothing in there is public.** Promoting is what creates the card: a normal
// public ticket with the .rrf attached. That is the one step of this triage that
// puts something in front of people, and it is the same button the tracker's
// /admin/gravacoes page has.
//
// Credential: uses the token `firebase login` already left on the machine, so
// `.firebase-admin.json` is no longer needed. To use a service account instead,
// point GOOGLE_APPLICATION_CREDENTIALS at the .json and it wins. Either way this
// talks to Firestore as an IAM principal, so the security rules do not apply —
// which is why it can date the card back to the day of the upload.
//
// No dependencies: the JWT is signed with `node:crypto` and traded for an access
// token at oauth2.googleapis.com.
//
// The field names, state values and printed text are pt-BR because they are the
// tracker's own schema and the operator's reading material, not code.

import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const PROJECT = 'issues-latam-tools';
const ROOT = `projects/${PROJECT}/databases/(default)/documents`;
const DOCS = `https://firestore.googleapis.com/v1/${ROOT}`;

// Public firebase-tools client id/secret — they are what turns the refresh token
// the CLI stored into a usable credential.
const CLI_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const SCOPE = 'https://www.googleapis.com/auth/datastore';

/** `promovida` is not settable by hand — it is what --promover leaves behind. */
const ESTADOS = ['fila', 'conferida', 'descartada'];

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

// --- REST codec ------------------------------------------------------------

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

function encode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (Buffer.isBuffer(v)) return { bytesValue: v.toString('base64') };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  switch (typeof v) {
    case 'string':
      return { stringValue: v };
    case 'boolean':
      return { booleanValue: v };
    case 'number':
      return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    default:
      return { mapValue: { fields: encodeFields(v) } };
  }
}

function encodeFields(obj) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, encode(v)]));
}

// --- arguments -------------------------------------------------------------

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const flagValue = (f) => {
  const i = args.indexOf(f);
  return i > -1 ? args[i + 1] : undefined;
};

const fetchGravacao = async (id) => decodeFields((await api(`/gravacoes/${id}`)).fields ?? {});
const fetchArquivo = async (id) => decodeFields((await api(`/gravacoes/${id}/arquivo/rrf`)).fields ?? {});

// --- commands --------------------------------------------------------------

/** The queue. `--estado fila` (the default) is what nobody has sorted yet. */
async function listRecordings() {
  const estado = flagValue('--estado') ?? 'fila';
  const limit = Number(flagValue('--limit') ?? 50);

  // The .rrf lives in a subcollection, so this listing downloads no bytes at
  // all. The state filter runs in memory: there are a few dozen documents, and
  // doing it here saves a composite index.
  const response = await api(':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'gravacoes' }],
        orderBy: [{ field: { fieldPath: 'criadoEm' }, direction: 'DESCENDING' }],
        limit: 500,
      },
    }),
  });

  const recordings = response
    .filter((x) => x.document)
    .map((x) => ({ id: x.document.name.split('/').pop(), d: decodeFields(x.document.fields ?? {}) }))
    .filter((c) => estado === 'todas' || (c.d.estado ?? 'fila') === estado)
    .slice(0, limit);

  if (!recordings.length) {
    console.log(`Nenhuma gravação com estado ${estado}.`);
    return;
  }

  for (const { id, d } of recordings) {
    const r = d.resumo ?? {};
    const card = d.issueId ? `  [card ${d.issueId}]` : '';
    console.log(
      `\n${id}  ${String(d.criadoEm ?? '').slice(0, 16)}  ${r.fileName ?? ''}  ${d.estado ?? 'fila'}${card}`,
    );
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
    if (d.nick) console.log(`  por: ${d.nick}`);
    if (d.notas) console.log(`  obs.: ${String(d.notas).trim()}`);
    if (d.notaTriagem) console.log(`  nota da triagem: ${String(d.notaTriagem).trim()}`);
    if (r.skippedItems?.length) console.log(`  itens fora do banco: ${r.skippedItems.join(', ')}`);
  }
  console.log(`\n${recordings.length} gravação(ões) com estado ${estado}.`);
}

/** Downloads the .rrf from the subdocument. */
async function download() {
  const id = flagValue('--get');
  const gravacao = await fetchGravacao(id);
  const file = await fetchArquivo(id).catch(() => ({}));
  if (!file.bytes) {
    console.error(`${id} não tem arquivo.`);
    process.exit(1);
  }

  const target = flagValue('--out') ?? join('.scratch', `${id}.rrf`);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, file.bytes);

  const r = gravacao.resumo ?? {};
  console.log(`${target}  (${file.bytes.length} bytes)`);
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
 * Stamps what was decided, without publishing anything. `--nota` stays private
 * here: it is an annotation on the inbox entry, not a comment on a card.
 */
async function mark() {
  const id = flagValue('--marcar');
  const estado = flagValue('--estado');
  if (!ESTADOS.includes(estado ?? '')) {
    console.error(`use --estado ${ESTADOS.join('|')} — publicar é --promover`);
    process.exit(2);
  }
  const nota = flagValue('--nota');

  const fields = {
    estado: { stringValue: estado },
    decididaEm: estado === 'fila' ? { nullValue: null } : { timestampValue: new Date().toISOString() },
  };
  const paths = ['estado', 'decididaEm'];
  if (nota) {
    fields.notaTriagem = { stringValue: nota.slice(0, 4000) };
    paths.push('notaTriagem');
  }

  await api(`/gravacoes/${id}?${paths.map((f) => `updateMask.fieldPaths=${f}`).join('&')}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });

  console.log(`${id} → ${estado}${nota ? ` — ${nota}` : ''} (nada publicado)`);
}

/**
 * Turns the recording into a public card: a ticket in backlog with the .rrf
 * attached, the sender's Discord in the private subdocument, and the inbox entry
 * stamped with the card's id.
 *
 * The card takes the recording's id and its upload date — the credit belongs to
 * the day it was recorded, not to the day triage got round to it.
 *
 * This is the step that publishes. Do it for a recording that is genuinely going
 * to be used: from here on anyone can download the file.
 */
async function promote() {
  const id = flagValue('--promover');
  const nota = flagValue('--nota');
  const gravacao = await fetchGravacao(id);
  if (gravacao.estado === 'promovida') {
    console.error(`${id} já virou o card ${gravacao.issueId ?? '?'}.`);
    process.exit(1);
  }
  const file = await fetchArquivo(id).catch(() => ({}));
  const now = new Date().toISOString();
  const r = gravacao.resumo ?? {};

  const duration = r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '?';
  const paragraphs = [];
  if (gravacao.notas) paragraphs.push(String(gravacao.notas));
  paragraphs.push(
    `Gravação de ${duration} com ${r.dummyHits ?? 0} golpes em dummy ` +
      `(${r.damageEvents ?? 0} eventos de dano no total), ` +
      `${r.equipChangeCount ?? 0} trocas de equipamento e ` +
      `${r.learnedSkillCount ?? 0} habilidades aprendidas. ` +
      `Mapa ${r.map ?? '?'}. Arquivo ${gravacao.nome ?? '?'}.`,
  );

  const card = {
    projeto: 'simulador',
    titulo: String(gravacao.titulo ?? '').slice(0, 120),
    descricao: paragraphs.join('\n\n').slice(0, 4000),
    tipo: 'replay',
    status: 'backlog',
    arquivado: false,
    upvotes: 0,
    comentarios: nota ? 1 : 0,
    anexos: file.bytes ? 1 : 0,
    replay: r,
    ...(gravacao.nick ? { autor: String(gravacao.nick) } : {}),
  };

  const writes = [
    {
      update: {
        name: `${ROOT}/issues/${id}`,
        fields: {
          ...encodeFields(card),
          criadoEm: { timestampValue: gravacao.criadoEm ?? now },
          atualizadoEm: { timestampValue: now },
        },
      },
      currentDocument: { exists: false },
    },
    {
      update: {
        name: `${ROOT}/gravacoes/${id}`,
        fields: {
          estado: { stringValue: 'promovida' },
          issueId: { stringValue: id },
          decididaEm: { timestampValue: now },
        },
      },
      updateMask: { fieldPaths: ['estado', 'issueId', 'decididaEm'] },
    },
  ];

  if (file.bytes) {
    writes.push({
      update: {
        name: `${ROOT}/issues/${id}/anexos/gravacao`,
        fields: {
          nome: { stringValue: String(file.nome ?? `${id}.rrf`).slice(0, 200) },
          tipo: { stringValue: 'rrf' },
          tamanho: { integerValue: String(file.bytes.length) },
          bytes: { bytesValue: file.bytes.toString('base64') },
          criadoEm: { timestampValue: now },
        },
      },
    });
  }

  if (gravacao.contato) {
    writes.push({
      update: {
        name: `${ROOT}/issues/${id}/privado/contato`,
        fields: {
          contato: { stringValue: String(gravacao.contato).slice(0, 120) },
          criadoEm: { timestampValue: now },
        },
      },
    });
  }

  if (nota) {
    writes.push({
      update: {
        // Fixed id so a retry does not leave two identical comments behind.
        name: `${ROOT}/issues/${id}/comentarios/triagem`,
        fields: {
          texto: { stringValue: nota.slice(0, 4000) },
          autor: { stringValue: 'Triagem' },
          autorUid: { stringValue: 'triagem' },
          tipo: { stringValue: 'mudanca' },
          criadoEm: { timestampValue: now },
        },
      },
    });
  }

  // One commit: a published ticket missing the recording it exists for would be
  // pointless, and an entry stamped as promoted pointing at a card that does not
  // exist would be worse.
  await api(':commit', { method: 'POST', body: JSON.stringify({ writes }) });

  console.log(`${id} → card público em backlog: https://issues.latam-tools.com.br/t/${id}`);
  if (nota) console.log(`comentário: ${nota}`);
}

if (hasFlag('--list')) await listRecordings();
else if (flagValue('--get')) await download();
else if (flagValue('--marcar')) await mark();
else if (flagValue('--promover')) await promote();
else {
  console.error(`uso:
  --list [--estado ${ESTADOS.join('|')}|promovida|todas] [--limit N]
  --get <id> [--out caminho.rrf]
  --marcar <id> --estado <${ESTADOS.join('|')}> [--nota "..."]   (não publica nada)
  --promover <id> [--nota "..."]                                 (cria o card público)`);
  process.exit(2);
}
