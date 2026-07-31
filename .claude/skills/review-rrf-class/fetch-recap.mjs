#!/usr/bin/env node
// Baixa a gravação por trás de um link do RagnaRecap e grava o .rrf.
//
//   node .claude/skills/review-rrf-class/fetch-recap.mjs "https://recap.latam-tools.com.br/?r=HdHAKyBShW"
//   node .claude/skills/review-rrf-class/fetch-recap.mjs HdHAKyBShW --out src/app/replay/__tests__/fixtures/ted-em.rrf
//
// O `?r=<id>` é o **id do documento** no Firestore do projeto `ragreplaystats`, coleção
// `replays`. A leitura é pública, então basta a apiKey de produção — não precisa de login
// nem de navegador (a página é renderizada no cliente, WebFetch não devolve nada útil).
// O campo `bytes` é o RRF em base64.

import { writeFileSync } from 'node:fs';

/** apiKey pública de produção (mesma de ../ragreplaystats/src/firebase.ts). */
const API_KEY = 'AIzaSyBqceBTU2JscflNsx8L0pNJJpNhJMgqOSE';
const PROJETO = 'ragreplaystats';

const args = process.argv.slice(2);
const entrada = args.find((a) => !a.startsWith('--'));
const saidaIdx = args.indexOf('--out');
if (!entrada) {
  console.error('uso: fetch-recap.mjs <url-ou-id> [--out arquivo.rrf]');
  process.exit(2);
}

const id = entrada.includes('?') || entrada.includes('/') ? new URL(entrada).searchParams.get('r') : entrada;
if (!id) {
  console.error('não achei o ?r=<id> no link');
  process.exit(2);
}

const url = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents/replays/${id}?key=${API_KEY}`;
const doc = await fetch(url).then((r) => r.json());
if (doc.error) {
  console.error(`Firestore ${doc.error.status}: ${doc.error.message}`);
  process.exit(1);
}

const f = doc.fields ?? {};
const b64 = f.bytes?.bytesValue ?? f.bytes?.stringValue;
if (!b64) {
  console.error('o documento não tem o campo `bytes`');
  process.exit(1);
}

const saida = saidaIdx >= 0 ? args[saidaIdx + 1] : `.scratch/${id}.rrf`;
writeFileSync(saida, Buffer.from(b64, 'base64'));

const v = (k) => Object.values(f[k] ?? {})[0];
console.log(`${saida}  (${Buffer.from(b64, 'base64').length} bytes)`);
console.log(`personagem: ${v('player')}  mapa: ${v('map')}  gravado em: ${v('recordedAt') ?? v('uploadedAt')}`);
console.log(`duração: ${v('durationMs')} ms  pacotes de dano: ${v('damageEvents')}  dano total: ${v('totalDamage')}`);
