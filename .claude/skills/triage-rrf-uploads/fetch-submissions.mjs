#!/usr/bin/env node
// Triagem das gravações .rrf enviadas pela comunidade (modal "Ajude o simulador").
//
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --list --status todas
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --get aBcD3fGh7K --out src/app/replay/__tests__/fixtures/xx.rrf
//   node .claude/skills/triage-rrf-uploads/fetch-submissions.mjs --mark aBcD3fGh7K --status backlog --note "virou fixture nw-ult"
//
// As gravações moravam na coleção `replay_submissions` DESTE projeto. Agora vão
// para o rastreador compartilhado (issues.latam-tools.com.br, projeto
// `issues-latam-tools`), como fichas de `tipo: "replay"` com o .rrf num anexo e
// o resumo do parser no campo `replay`.
//
// A ficha nasce **arquivada**: fora do quadro público, e as regras negam a
// leitura do anexo enquanto ela estiver assim — a mesma privacidade que a
// coleção antiga tinha com `allow read: if false`. Promover para `backlog` é o
// que a torna pública, e é a decisão que esta triagem toma.
//
// Credencial: usa o token que o `firebase login` já deixou na máquina, então
// não precisa mais de `.firebase-admin.json`. Se preferir uma conta de serviço,
// aponte GOOGLE_APPLICATION_CREDENTIALS para o .json e ela tem preferência.
//
// Sem dependências: o JWT é assinado com o `node:crypto` e trocado por um access
// token no oauth2.googleapis.com.

import { createSign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

const PROJETO = 'issues-latam-tools';
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents`;

// Client id/secret públicos do firebase-tools — é com eles que o refresh token
// guardado pelo CLI vira credencial utilizável.
const CLI_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLI_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const ESCOPO = 'https://www.googleapis.com/auth/datastore';

const STATUSES = ['reportado', 'backlog', 'em_progresso', 'resolvido', 'nao_sera_feito'];

let tokenCache = null;

async function token() {
  if (tokenCache) return tokenCache;
  const sa = process.env['GOOGLE_APPLICATION_CREDENTIALS'];
  tokenCache = sa ? await tokenPorServiceAccount(sa) : await tokenPorCLI();
  return tokenCache;
}

async function tokenPorServiceAccount(caminho) {
  const sa = JSON.parse(readFileSync(caminho, 'utf8'));
  const agora = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const cabecalho = b64({ alg: 'RS256', typ: 'JWT' });
  const corpo = b64({
    iss: sa.client_email,
    scope: ESCOPO,
    aud: 'https://oauth2.googleapis.com/token',
    iat: agora,
    exp: agora + 3600,
  });
  const assinatura = createSign('RSA-SHA256').update(`${cabecalho}.${corpo}`).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${cabecalho}.${corpo}.${assinatura}`,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`conta de serviço: ${JSON.stringify(j)}`);
  return j.access_token;
}

async function tokenPorCLI() {
  const arquivo = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  let cfg;
  try {
    cfg = JSON.parse(readFileSync(arquivo, 'utf8'));
  } catch {
    console.error('Sem credencial. Rode `firebase login`, ou aponte GOOGLE_APPLICATION_CREDENTIALS para uma chave .json.');
    process.exit(2);
  }
  if (!cfg?.tokens?.refresh_token) {
    console.error(`Sem refresh token em ${arquivo} — rode \`firebase login\`.`);
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

async function api(caminho, opcoes = {}) {
  const r = await fetch(`${DOCS}${caminho}`, {
    ...opcoes,
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// --- decodificação REST ----------------------------------------------------

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
  if ('mapValue' in v) return campos(v.mapValue.fields ?? {});
  return null;
}

function campos(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decode(v)]));
}

// --- argumentos ------------------------------------------------------------

const args = process.argv.slice(2);
const tem = (f) => args.includes(f);
const valor = (f) => {
  const i = args.indexOf(f);
  return i > -1 ? args[i + 1] : undefined;
};

// --- comandos --------------------------------------------------------------

/** A fila de conferência. `--status reportado` (padrão) é o que ainda não foi triado. */
async function listar() {
  const status = valor('--status') ?? 'reportado';
  const limite = Number(valor('--limit') ?? 50);

  // O .rrf mora numa subcoleção, então a listagem já não baixa bytes nenhum —
  // não é preciso projetar campos como antes. O filtro de status é aplicado em
  // memória: são poucas dezenas de fichas, e evita mais um índice composto.
  const resposta = await api(':runQuery', {
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

  const fichas = resposta
    .filter((x) => x.document)
    .map((x) => ({ id: x.document.name.split('/').pop(), d: campos(x.document.fields ?? {}) }))
    .filter((f) => status === 'todas' || f.d.status === status)
    .slice(0, limite);

  if (!fichas.length) {
    console.log(`Nenhuma gravação com status ${status}.`);
    return;
  }

  for (const { id, d } of fichas) {
    const r = d.replay ?? {};
    const onde = d.arquivado ? '' : '  [no quadro público]';
    console.log(`\n${id}  ${String(d.criadoEm ?? '').slice(0, 16)}  ${r.fileName ?? ''}${onde}`);
    console.log(
      `  ${r.player ?? '?'} — ${r.className ?? '?'} nv ${r.baseLevel ?? '?'}/${r.jobLevel ?? '?'}  ` +
        `${Math.round((r.durationMs ?? 0) / 1000)}s  ${r.dummyHits ?? 0} golpes em dummy  ` +
        `${r.equipChangeCount ?? 0} trocas de equip.  ${r.learnedSkillCount ?? 0} habilidades`,
    );
    if (r.traits) {
      const origem = r.traitsSource === 'replay' ? 'da gravação' : 'informados por quem gravou';
      const lista = ['pow', 'sta', 'wis', 'spl', 'con', 'crt'].map((k) => `${k.toUpperCase()} ${r.traits[k]}`).join('  ');
      console.log(`  talentos (${origem}): ${lista}`);
    } else {
      console.log('  talentos: (classe sem talentos)');
    }
    if (d.autor) console.log(`  por: ${d.autor}`);
    // A descrição é "observação de quem gravou" + parágrafo do parser. Sem
    // observação sobra só o parágrafo do parser, que já saiu na linha acima —
    // então só vale imprimir quando existem os dois.
    const paragrafos = String(d.descricao ?? '').split('\n\n');
    if (paragrafos.length > 1 && paragrafos[0].trim()) console.log(`  obs.: ${paragrafos[0].trim()}`);
    if (r.skippedItems?.length) console.log(`  itens fora do banco: ${r.skippedItems.join(', ')}`);
  }
  console.log(`\n${fichas.length} gravação(ões) com status ${status}.`);
}

/** Baixa o .rrf do anexo. */
async function baixar() {
  const id = valor('--get');
  const ficha = campos((await api(`/issues/${id}`)).fields ?? {});
  const anexos = await api(`/issues/${id}/anexos`);
  const anexo = (anexos.documents ?? []).map((x) => campos(x.fields ?? {})).find((a) => a.tipo === 'rrf');
  if (!anexo) {
    console.error(`${id} não tem gravação anexada.`);
    process.exit(1);
  }

  const destino = valor('--out') ?? join('.scratch', `${id}.rrf`);
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, anexo.bytes);

  const r = ficha.replay ?? {};
  console.log(`${destino}  (${anexo.bytes.length} bytes)`);
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
 * Fecha o ciclo. `--status backlog` tira a gravação do arquivo e a põe no quadro
 * público — só faça isso quando ela prestar, porque a partir daí o .rrf fica
 * baixável por qualquer pessoa. Qualquer outro status a mantém arquivada.
 */
async function marcar() {
  const id = valor('--mark');
  const status = valor('--status');
  if (!STATUSES.includes(status ?? '')) {
    console.error(`use --status ${STATUSES.join('|')}`);
    process.exit(2);
  }
  const nota = valor('--note');
  const publicar = status === 'backlog' || tem('--publicar');

  const mascara = ['status', 'arquivado', 'atualizadoEm'].map((f) => `updateMask.fieldPaths=${f}`).join('&');
  await api(`/issues/${id}?${mascara}`, {
    method: 'PATCH',
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        arquivado: { booleanValue: !publicar },
        atualizadoEm: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (nota) {
    // Comentário na ficha — visível junto com ela, ou seja, público a partir do
    // momento em que a gravação for promovida.
    await api(`/issues/${id}/comentarios`, {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          texto: { stringValue: nota },
          autor: { stringValue: 'Triagem' },
          autorUid: { stringValue: 'triagem' },
          tipo: { stringValue: 'mudanca' },
          criadoEm: { timestampValue: new Date().toISOString() },
        },
      }),
    });
  }

  console.log(`${id} → ${status}${publicar ? ' (no quadro público)' : ' (arquivada)'}${nota ? ` — ${nota}` : ''}`);
}

if (tem('--list')) await listar();
else if (valor('--get')) await baixar();
else if (valor('--mark')) await marcar();
else {
  console.error(`uso:
  --list [--status ${STATUSES.join('|')}|todas] [--limit N]
  --get <id> [--out caminho.rrf]
  --mark <id> --status <status> [--note "..."] [--publicar]`);
  process.exit(2);
}
