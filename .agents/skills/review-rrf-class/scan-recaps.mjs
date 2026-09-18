#!/usr/bin/env node
// Varre TODAS as gravações do RagnaRecap e separa as de uma classe.
//
//   node .agents/skills/review-rrf-class/scan-recaps.mjs --job 4254,4065
//   node .agents/skills/review-rrf-class/scan-recaps.mjs --job 4254 --out .scratch/executor --skill 2022
//
// O Firestore do projeto `ragreplaystats` (coleção `replays`) é de leitura pública, então a
// apiKey de produção basta — mesma de fetch-recap.mjs. **A classe não está nos campos do
// documento**: o resumo só tem player/map/duração/dano, então descobrir de quem é cada
// gravação exige baixar o `bytes` e decodificar. São ~1.000 documentos e ~170 MB no total;
// a varredura leva alguns minutos. O índice fica em `--index` para as próximas rodadas.
//
// Ids de classe como o .rrf informa (sessionInfo.job): 4065 Sicário, 4254 Executor,
// 4252 Cavaleiro Rúnico... — pegue o de uma fixture conhecida se estiver em dúvida.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { decodeReplay } from 'rrfparser';

const API_KEY = 'AIzaSyBqceBTU2JscflNsx8L0pNJJpNhJMgqOSE';
const PROJETO = 'ragreplaystats';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJETO}/databases/(default)/documents/replays`;

const args = process.argv.slice(2);
const opt = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 ? args[i + 1] : padrao;
};

const jobs = new Set((opt('job', '') || '').split(',').filter(Boolean).map(Number));
if (!jobs.size) {
  console.error('uso: scan-recaps.mjs --job 4254[,4065] [--out .scratch/recap] [--index .scratch/recap-index.json] [--skill 2022]');
  process.exit(2);
}
const dirSaida = opt('out', '.scratch/recap');
const caminhoIndice = opt('index', '.scratch/recap-index.json');
const skillFiltro = Number(opt('skill', '0')) || 0;
mkdirSync(dirSaida, { recursive: true });

/** Lista os ids (o resumo não traz a classe, então só serve para paginar). */
async function listarIds() {
  if (existsSync(caminhoIndice)) return JSON.parse(readFileSync(caminhoIndice, 'utf8'));
  const campos = ['player', 'map', 'recordedAt', 'durationMs', 'damageEvents'].map((f) => `mask.fieldPaths=${f}`).join('&');
  const todos = [];
  let token = '';
  for (;;) {
    const url = `${BASE}?pageSize=300&${campos}${token ? `&pageToken=${token}` : ''}&key=${API_KEY}`;
    const j = await fetch(url).then((r) => r.json());
    if (j.error) throw new Error(`${j.error.status}: ${j.error.message}`);
    for (const d of j.documents ?? []) {
      const f = d.fields ?? {};
      const v = (k) => (f[k] ? Object.values(f[k])[0] : undefined);
      todos.push({ id: d.name.split('/').pop(), player: v('player'), map: v('map'), at: v('recordedAt') });
    }
    if (!j.nextPageToken) break;
    token = j.nextPageToken;
  }
  writeFileSync(caminhoIndice, JSON.stringify(todos, null, 1));
  return todos;
}

const monstros = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
/** Ids de bookkeeping que não são buff — mesma lista da §2c da skill. */
const RUIDO = new Set([46, 622, 673, 695, 802, 942, 983, 984, 987, 993, 994, 1084, 1085, 1312]);

function resumir(rec, r, tamanho) {
  const me = r.sessionInfo.aid;
  const ligados = new Set((r.statusEvents ?? []).filter((s) => s.aid === me && s.isOn && !RUIDO.has(s.statusId)).map((s) => s.statusId));
  const meus = (r.damage ?? []).filter((d) => d.source === me && Number(d.damage) > 0 && (!skillFiltro || d.skillId === skillFiltro));
  const alvos = new Map();
  for (const d of meus) {
    const view = r.entities?.get?.(d.target)?.view;
    if (view) alvos.set(view, (alvos.get(view) ?? 0) + 1);
  }
  const janela = new Set((r.paramChanges ?? []).map((p) => p.type));
  return {
    id: rec.id, player: r.sessionInfo.player, map: r.sessionInfo.map, job: r.sessionInfo.job,
    level: r.sessionInfo.baseLevel, jobLevel: r.sessionInfo.jobLevel, recordedAt: r.sessionInfo.recordedAt,
    // Talentos: uma sessão que nunca troca de mapa vem sem ZC_COUPLESTATUS e isto fica null.
    traits: r.traits?.pow != null ? r.traits : null,
    buffs: [...ligados].length, statusIds: [...ligados],
    // A janela de status: sem 41/42 não dá para validar a build (§3).
    hasWindow: janela.has(41) && janela.has(42),
    equipChanges: (r.equipChanges ?? []).length,
    packets: meus.length,
    targets: [...alvos].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([view, n]) => ({
      view, n, name: monstros[view]?.name ?? '?', element: monstros[view]?.stats?.elementName ?? '?',
    })),
    bytes: tamanho,
  };
}

const ids = await listarIds();
console.error(`${ids.length} gravações no banco; baixando para achar as das classes ${[...jobs].join(', ')}…`);

const achados = [];
let lidos = 0;
let mb = 0;
const LOTE = 10;
for (let i = 0; i < ids.length; i += LOTE) {
  await Promise.all(ids.slice(i, i + LOTE).map(async (rec) => {
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
      return; // arquivo truncado ou de outro cliente
    }
    if (!jobs.has(r.sessionInfo?.job)) return;
    writeFileSync(`${dirSaida}/${rec.id}.rrf`, buf);
    achados.push(resumir(rec, r, buf.length));
  }));
  lidos += Math.min(LOTE, ids.length - i);
  if (lidos % 100 < LOTE) console.error(`  ${lidos}/${ids.length} — ${mb.toFixed(0)} MB — ${achados.length} da classe`);
}

achados.sort((a, b) => a.buffs - b.buffs);
writeFileSync(`${dirSaida}/_achados.json`, JSON.stringify(achados, null, 1));
console.log(`${achados.length} gravações em ${dirSaida}/ (resumo em ${dirSaida}/_achados.json)`);
for (const a of achados.slice(0, 20)) {
  console.log([
    a.id, a.job, (a.player ?? '').slice(0, 14).padEnd(14), (a.map ?? '').padEnd(12), `nv${a.level}`,
    a.traits ? `POD${a.traits.pow}/CRV${a.traits.crt}` : 'sem talentos',
    `${a.buffs} buffs`, a.hasWindow ? 'janela' : 'sem janela', `${a.packets} pacotes`,
    a.targets.map((t) => `${t.name.slice(0, 18)}[${t.element}]x${t.n}`).join(' '),
  ].join(' '));
}
