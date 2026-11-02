#!/usr/bin/env node
// Downloads the recording behind a RagnaRecap link and writes the .rrf.
//
//   node .agents/skills/review-rrf-class/fetch-recap.mjs "https://recap.latam-tools.com.br/?r=HdHAKyBShW"
//   node .agents/skills/review-rrf-class/fetch-recap.mjs HdHAKyBShW --out src/app/replay/__tests__/fixtures/ted-em.rrf
//
// The `?r=<id>` **is the document id** in the Firestore of project `ragreplaystats`,
// collection `replays`. Reads are public, so the production apiKey is enough — no login
// and no browser needed (the page is client-rendered, WebFetch returns nothing useful).
// The `bytes` field is the RRF in base64.

import { writeFileSync } from 'node:fs';

/** Public production apiKey (the same one as ../ragreplaystats/src/firebase.ts). */
const API_KEY = 'AIzaSyBqceBTU2JscflNsx8L0pNJJpNhJMgqOSE';
const PROJECT = 'ragreplaystats';

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith('--'));
const outIdx = args.indexOf('--out');
if (!input) {
  console.error('usage: fetch-recap.mjs <url-or-id> [--out file.rrf]');
  process.exit(2);
}

const id = input.includes('?') || input.includes('/') ? new URL(input).searchParams.get('r') : input;
if (!id) {
  console.error('no ?r=<id> found in the link');
  process.exit(2);
}

const url = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/replays/${id}?key=${API_KEY}`;
const doc = await fetch(url).then((r) => r.json());
if (doc.error) {
  console.error(`Firestore ${doc.error.status}: ${doc.error.message}`);
  process.exit(1);
}

const f = doc.fields ?? {};
const b64 = f.bytes?.bytesValue ?? f.bytes?.stringValue;
if (!b64) {
  console.error('the document has no `bytes` field');
  process.exit(1);
}

const out = outIdx >= 0 ? args[outIdx + 1] : `.scratch/${id}.rrf`;
writeFileSync(out, Buffer.from(b64, 'base64'));

const v = (k) => Object.values(f[k] ?? {})[0];
console.log(`${out}  (${Buffer.from(b64, 'base64').length} bytes)`);
console.log(`character: ${v('player')}  map: ${v('map')}  recorded at: ${v('recordedAt') ?? v('uploadedAt')}`);
console.log(`duration: ${v('durationMs')} ms  damage packets: ${v('damageEvents')}  total damage: ${v('totalDamage')}`);
