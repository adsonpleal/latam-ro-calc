#!/usr/bin/env node
// Sweeps EVERY RagnaRecap recording and keeps the ones belonging to a class.
//
//   node .agents/skills/review-rrf-class/scan-recaps.mjs --job 4254,4065
//   node .agents/skills/review-rrf-class/scan-recaps.mjs --job 4254 --out .scratch/executor --skill 2022
//
// The Firestore of project `ragreplaystats` (collection `replays`) is publicly readable, so
// the production apiKey is enough — the same one as fetch-recap.mjs. **The class is not in
// the document fields**: the summary carries only player/map/duration/damage, so finding out
// whose each recording is means downloading the `bytes` and decoding it. That is ~1,000
// documents and ~170 MB in total; the sweep takes a few minutes. The id list is cached in
// `--index` for the next runs.
//
// Class ids as the .rrf reports them (sessionInfo.job): 4065 Sicário, 4254 Executor,
// 4252 Cavaleiro Rúnico… — read one off a known fixture if unsure.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decodeReplay } from 'rrfparser';

const API_KEY = 'AIzaSyBqceBTU2JscflNsx8L0pNJJpNhJMgqOSE';
const PROJECT = 'ragreplaystats';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/replays`;

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};

const jobs = new Set((opt('job', '') || '').split(',').filter(Boolean).map(Number));
if (!jobs.size) {
  console.error('usage: scan-recaps.mjs --job 4254[,4065] [--out .scratch/recap] [--index .scratch/recap-index.json] [--skill 2022]');
  process.exit(2);
}
const outDir = opt('out', '.scratch/recap');
const indexPath = opt('index', '.scratch/recap-index.json');
const skillFilter = Number(opt('skill', '0')) || 0;
mkdirSync(outDir, { recursive: true });

/** Lists the ids (the summary does not carry the class, so it only serves to paginate). */
async function listIds() {
  if (existsSync(indexPath)) return JSON.parse(readFileSync(indexPath, 'utf8'));
  const fields = ['player', 'map', 'recordedAt', 'durationMs', 'damageEvents'].map((f) => `mask.fieldPaths=${f}`).join('&');
  const all = [];
  let token = '';
  for (;;) {
    const url = `${BASE}?pageSize=300&${fields}${token ? `&pageToken=${token}` : ''}&key=${API_KEY}`;
    const j = await fetch(url).then((r) => r.json());
    if (j.error) throw new Error(`${j.error.status}: ${j.error.message}`);
    for (const d of j.documents ?? []) {
      const f = d.fields ?? {};
      const v = (k) => (f[k] ? Object.values(f[k])[0] : undefined);
      all.push({ id: d.name.split('/').pop(), player: v('player'), map: v('map'), at: v('recordedAt') });
    }
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  writeFileSync(indexPath, JSON.stringify(all, null, 1));
  return all;
}

const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
/** Bookkeeping ids that are not buffs — the same list as the skill's §2c. */
const NOISE = new Set([46, 622, 673, 695, 802, 942, 983, 984, 987, 993, 994, 1084, 1085, 1312]);

function summarize(rec, r, size) {
  const me = r.sessionInfo.aid;
  const on = new Set((r.statusEvents ?? []).filter((s) => s.aid === me && s.isOn && !NOISE.has(s.statusId)).map((s) => s.statusId));
  const mine = (r.damage ?? []).filter((d) => d.source === me && Number(d.damage) > 0 && (!skillFilter || d.skillId === skillFilter));
  const targets = new Map();
  for (const d of mine) {
    const view = r.entities?.get?.(d.target)?.view;
    if (view) targets.set(view, (targets.get(view) ?? 0) + 1);
  }
  const statusWindow = new Set((r.paramChanges ?? []).map((p) => p.type));
  return {
    id: rec.id, player: r.sessionInfo.player, map: r.sessionInfo.map, job: r.sessionInfo.job,
    level: r.sessionInfo.baseLevel, jobLevel: r.sessionInfo.jobLevel, recordedAt: r.sessionInfo.recordedAt,
    // Traits: a session that never changes map comes without ZC_COUPLESTATUS and this stays null.
    traits: r.traits?.pow != null ? r.traits : null,
    buffs: [...on].length, statusIds: [...on],
    // The status window: without 41/42 the build cannot be validated (§3).
    hasWindow: statusWindow.has(41) && statusWindow.has(42),
    equipChanges: (r.equipChanges ?? []).length,
    packets: mine.length,
    targets: [...targets].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([view, n]) => ({
      view, n, name: monsters[view]?.name ?? '?', element: monsters[view]?.stats?.elementName ?? '?',
    })),
    bytes: size,
  };
}

const ids = await listIds();
console.error(`${ids.length} recordings in the database; downloading to find the ones of classes ${[...jobs].join(', ')}…`);

const found = [];
let read = 0;
let mb = 0;
const BATCH = 10;
for (let i = 0; i < ids.length; i += BATCH) {
  await Promise.all(ids.slice(i, i + BATCH).map(async (rec) => {
    let j;
    try {
      j = await fetch(`${BASE}/${rec.id}?mask.fieldPaths=bytes&key=${API_KEY}`).then((r) => r.json());
    } catch {
      return;
    }
    const b64 = j?.fields?.bytes?.bytesValue ?? j?.fields?.bytes?.stringValue;
    if (!b64) return;
    const buf = Buffer.from(b64, 'base64');
    mb += buf.length / 1e6;
    let r;
    try {
      r = decodeReplay(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    } catch {
      return; // truncated file, or one from another client
    }
    if (!jobs.has(r.sessionInfo?.job)) return;
    writeFileSync(`${outDir}/${rec.id}.rrf`, buf);
    found.push(summarize(rec, r, buf.length));
  }));
  read += Math.min(BATCH, ids.length - i);
  if (read % 100 < BATCH) console.error(`  ${read}/${ids.length} — ${mb.toFixed(0)} MB — ${found.length} of the class`);
}

found.sort((a, b) => a.buffs - b.buffs);
writeFileSync(`${outDir}/_found.json`, JSON.stringify(found, null, 1));
console.log(`${found.length} recordings in ${outDir}/ (summary in ${outDir}/_found.json)`);
for (const a of found.slice(0, 20)) {
  console.log([
    a.id, a.job, (a.player ?? '').slice(0, 14).padEnd(14), (a.map ?? '').padEnd(12), `lv${a.level}`,
    a.traits ? `POD${a.traits.pow}/CRV${a.traits.crt}` : 'no traits',
    `${a.buffs} buffs`, a.hasWindow ? 'window' : 'no window', `${a.packets} packets`,
    a.targets.map((t) => `${t.name.slice(0, 18)}[${t.element}]x${t.n}`).join(' '),
  ].join(' '));
}
