#!/usr/bin/env node
// Lê as gravações .rrf enviadas pela comunidade (modal "Ajude o simulador").
//
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list --status reviewed
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K --out src/app/replay/__tests__/fixtures/xx.rrf
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark aBcD3fGh7K --status reviewed --note "virou fixture nw-ult"
//
// As regras do Firestore (firestore.rules) **negam toda leitura pelo cliente**: quem
// envia não consegue ler de volta o que mandou, e ninguém descobre os envios pela URL.
// Por isso aqui a autenticação é de administrador, com uma chave de conta de serviço em
// `.firebase-admin.json` na raiz do repositório (git-ignorado). Para gerá-la:
//   Console do Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave.
//
// Sem dependências: o JWT é assinado com o `node:crypto` e trocado por um access token
// no oauth2.googleapis.com. (O `gcloud` não está instalado, e o CLI do firebase não tem
// comando para ler um documento.)

import { createSign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const PROJETO = 'simulador-latam-ro';
const COLECAO = 'replay_submissions';
const CHAVE = '.firebase-admin.json';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

const args = process.argv.slice(2);
const flag = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] ?? '' : null;
};
const tem = (nome) => args.includes(nome);

// --- autenticação ------------------------------------------------------------

let tokenCache = null;

async function token() {
  if (tokenCache) return tokenCache;
  if (!existsSync(CHAVE)) {
    console.error(
      `não achei ${CHAVE}.\n` +
        'Gere em: Console do Firebase → Configurações do projeto → Contas de serviço → Gerar nova chave,\n' +
        `e salve como ${CHAVE} na raiz do repositório (já está no .gitignore).`,
    );
    process.exit(2);
  }
  const conta = JSON.parse(readFileSync(CHAVE, 'utf8'));
  const agora = Math.floor(Date.now() / 1000);
  const claims = {
    iss: conta.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3600,
  };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const corpo = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(conta.private_key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${corpo}.${assinatura}`,
    }),
  });
  const json = await res.json();
  if (!json.access_token) {
    console.error(`falha ao autenticar: ${JSON.stringify(json)}`);
    process.exit(1);
  }
  tokenCache = json.access_token;
  return tokenCache;
}

async function api(caminho, init = {}) {
  const res = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const json = await res.json();
  if (json.error) {
    console.error(`Firestore ${json.error.status}: ${json.error.message}`);
    process.exit(1);
  }
  return json;
}

// --- leitura dos valores tipados do REST -------------------------------------

/** Desembrulha um `{stringValue|integerValue|...}` para um valor de JS. */
function valor(v) {
  if (!v || typeof v !== 'object') return v;
  if ('nullValue' in v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('bytesValue' in v) return Buffer.from(v.bytesValue, 'base64');
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(valor);
  if ('mapValue' in v) return campos(v.mapValue.fields ?? {});
  return v;
}

function campos(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, valor(v)]));
}

const idDe = (doc) => doc.name.split('/').pop();

// --- comandos ----------------------------------------------------------------

async function listar() {
  const status = flag('--status') ?? 'new';
  const limite = Number(flag('--limit') ?? 50);
  // `select` sem `bytes`: sem isso, listar 50 envios baixaria dezenas de MB.
  const campos_ = [
    'status',
    'uploadedAt',
    'fileName',
    'nick',
    'discord',
    'notes',
    'appVersion',
    'summary',
    'traits',
    'triageNote',
  ];
  const resposta = await api(':runQuery', {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: COLECAO }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: status } } },
        orderBy: [{ field: { fieldPath: 'uploadedAt' }, direction: 'DESCENDING' }],
        select: { fields: campos_.map((f) => ({ fieldPath: f })) },
        limit: limite,
      },
    }),
  });

  const docs = resposta.filter((r) => r.document).map((r) => ({ id: idDe(r.document), ...campos(r.document.fields ?? {}) }));
  if (!docs.length) {
    console.log(`nenhum envio com status "${status}".`);
    return;
  }
  console.log(`${docs.length} envio(s) com status "${status}":\n`);
  for (const d of docs) {
    const s = d.summary ?? {};
    console.log(`${d.id}  ${(d.uploadedAt ?? '').slice(0, 16).replace('T', ' ')}  ${d.fileName ?? ''}`);
    console.log(
      `   ${s.player ?? '?'} — ${s.className ?? '?'} nv ${s.baseLevel ?? '?'}/${s.jobLevel ?? '?'}` +
        `  ${Math.round((s.durationMs ?? 0) / 1000)}s  ${s.damageEvents ?? 0} golpes` +
        `  ${s.equipChangeCount ?? 0} trocas de equip.  ${s.learnedSkillCount ?? 0} habilidades`,
    );
    if (d.traits) console.log(`   talentos: ${['pow', 'sta', 'wis', 'spl', 'con', 'crt'].map((k) => `${k} ${d.traits[k]}`).join('  ')}`);
    else console.log('   talentos: (classe sem talentos)');
    if (d.nick || d.discord) console.log(`   por: ${d.nick ?? '—'}${d.discord ? `  (discord: ${d.discord})` : ''}`);
    if (d.notes) console.log(`   obs.: ${d.notes}`);
    if (s.skippedItems?.length) console.log(`   itens fora do banco: ${s.skippedItems.join(', ')}`);
    console.log('');
  }
}

async function baixar() {
  const id = flag('--get');
  const doc = await api(`/${COLECAO}/${id}`);
  const d = campos(doc.fields ?? {});
  if (!Buffer.isBuffer(d.bytes)) {
    console.error('o documento não tem o campo `bytes`');
    process.exit(1);
  }
  const saida = flag('--out') ?? `.scratch/${id}.rrf`;
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, d.bytes);

  const s = d.summary ?? {};
  console.log(`${saida}  (${d.bytes.length} bytes)`);
  console.log(`personagem: ${s.player}  classe: ${s.className} (id ${s.classId}, job ${s.spriteJob})`);
  console.log(`nível: ${s.baseLevel}/${s.jobLevel}  mapa: ${s.map}  duração: ${Math.round((s.durationMs ?? 0) / 1000)}s`);
  console.log(`golpes: ${s.damageEvents}  trocas de equipamento: ${s.equipChangeCount}  equipamentos: ${s.equippedCount}`);
  console.log(
    d.traits
      ? `TALENTOS (informados por quem gravou): ${['pow', 'sta', 'wis', 'spl', 'con', 'crt']
          .map((k) => `${k.toUpperCase()} ${d.traits[k]}`)
          .join('  ')}`
      : 'TALENTOS: classe sem talentos.',
  );
  if (d.nick || d.discord) console.log(`por: ${d.nick ?? '—'}${d.discord ? `  (discord: ${d.discord})` : ''}`);
  if (d.notes) console.log(`obs. de quem gravou: ${d.notes}`);
  if (s.skippedItems?.length) console.log(`itens fora do banco: ${s.skippedItems.join(', ')}`);
  console.log(`versão do simulador no envio: ${d.appVersion}`);
}

async function marcar() {
  const id = flag('--mark');
  const status = flag('--status');
  if (!['reviewed', 'rejected', 'new'].includes(status ?? '')) {
    console.error('use --status reviewed|rejected|new');
    process.exit(2);
  }
  const nota = flag('--note');
  const fields = {
    status: { stringValue: status },
    triagedAt: { timestampValue: new Date().toISOString() },
  };
  const mask = ['status', 'triagedAt'];
  if (nota) {
    fields.triageNote = { stringValue: nota };
    mask.push('triageNote');
  }
  const query = mask.map((f) => `updateMask.fieldPaths=${f}`).join('&');
  await api(`/${COLECAO}/${id}?${query}`, { method: 'PATCH', body: JSON.stringify({ fields }) });
  console.log(`${id} → ${status}${nota ? ` (${nota})` : ''}`);
}

if (tem('--list')) await listar();
else if (flag('--get')) await baixar();
else if (flag('--mark')) await marcar();
else {
  console.error(
    'uso:\n' +
      '  --list [--status new|reviewed|rejected] [--limit N]\n' +
      '  --get <id> [--out arquivo.rrf]\n' +
      '  --mark <id> --status reviewed|rejected [--note "..."]',
  );
  process.exit(2);
}
