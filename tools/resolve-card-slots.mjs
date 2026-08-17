#!/usr/bin/env node
// Resolve which equipment slot each card belongs to, from the RagnaPlace Public API,
// and prove the source against the cards the calculator already has registered.
//
//   node tools/resolve-card-slots.mjs                 # validate + resolve, write the JSON
//   node tools/resolve-card-slots.mjs --validate      # only the registered cards, write nothing
//   node tools/resolve-card-slots.mjs --only 4158,4009
//
// ── Why this exists ──────────────────────────────────────────────────────────────────
//
// tools/classify-missing-cards.mjs routes a card to a slot by reading the "Equipa em:"
// line out of its pt-BR description. 51 of the 470 unregistered cards print no such line,
// so nothing places them — the `noSlot` group. The API answers that question without
// depending on how the client happened to word the footer: every item carries a
// `subcategories` array, and for a card it holds exactly the slot.
//
// ── The endpoint ─────────────────────────────────────────────────────────────────────
//
//   GET https://api.ragnaplace.com/v1/<gateway>/item/<id>
//   gateway   "bro" — the LATAM client. (`laro-pt` is the same publisher's other slug;
//             the ids in latam-items.json resolve under bro.)
//   auth      the `x-api-key` header. The key comes from RAGNAPLACE_API_KEY in the
//             environment, or from the sibling ragassets checkout's .env (gitignored
//             there). It is never written to disk here and never logged.
//   spec      https://ro.ragnaplace.com/v1/openapi.json
//
// Rate limits are per-key and advertised on every response as X-RateLimit-Limit /
// -Remaining / -Reset (observed: 400 per window, reset in seconds). The run throttles
// itself off those headers rather than a hardcoded rate, and parks until the window rolls
// over when the remaining quota gets close to zero, so a full pass never earns a 429.
//
// Every fetched record is appended to a resumable cache (.scratch/, gitignored), so a
// second run costs zero requests and an interrupted one picks up where it stopped.
//
// ── subcategory -> CardPosition ──────────────────────────────────────────────────────
//
// The API's vocabulary for a card, and the CardPosition it means:
//
//   weapon     -> CardPosition.Weapon
//   armor      -> CardPosition.Armor
//   shield     -> CardPosition.Shield
//   garment    -> CardPosition.Garment
//   shoes      -> CardPosition.Boot
//   headgear   -> CardPosition.Head
//   accessory  -> CardPosition.Acc   ** see below **
//
// The member names are resolved out of src/app/constants/card-position.enum.ts at
// startup rather than copied, so this table cannot drift from the enum the app routes
// with. A subcategory outside this table is reported, never guessed at.
//
// **The accessory caveat, which is the one thing the API cannot answer.** The calculator
// splits accessories three ways — Acc (either hand), AccR (right only), AccL (left only)
// — and RagnaPlace publishes the single tag "accessory" for all three. So for an
// accessory card the API settles the *family* and the description's "Aces. Direito" /
// "Aces. Esquerdo" line remains the only source for the side. Agreement is therefore
// scored twice below: exact, and family-level (8/128/136 collapsed to one bucket).
//
// ── What is compared ─────────────────────────────────────────────────────────────────
//
// A source that is wrong about a card we know is no use on a card we don't, so before
// any of the 51 are resolved the API is run against the whole registered population:
// the `compositionPos` already in item.json versus what `subcategories` says. Every
// divergence is listed card by card in the output. The 419 unregistered cards that DO
// print an "Equipa em:" line are a second, independent cohort: description versus API.
//
// Cards excluded from the comparison, with the reason recorded in the output:
//   * `categories` is not ["card"] — item.json's itemTypeId 6 also holds enchants
//     (compositionPos 65535), which are not cards and carry no slot.
//   * compositionPos is null in item.json — nothing to compare against.
//   * CardPosition.All (-1), the Essências de Morroc sentinel: the calculator routes
//     them into every picker on purpose, so a single-slot answer is not a disagreement.

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/assets/demo/data');
const CLASSIFIED = join(ROOT, 'tools/data/missing-cards-2026-08.json');
const OUT = join(ROOT, 'tools/data/card-slots-ragnaplace-2026-08.json');
const CACHE = join(ROOT, '.scratch/ragnaplace-cards.jsonl');

const API_BASE = 'https://api.ragnaplace.com';
const DEFAULT_GATEWAY = 'bro';
// Leave this much of the window's quota unspent before parking, so the in-flight
// requests cannot overshoot into a 429.
const RATE_FLOOR = 12;
const MAX_ATTEMPTS = 4;
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TTL_DAYS = 30;

// ── args ─────────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--gateway') out.gateway = argv[++i];
    else if (a === '--only') out.only = argv[++i];
    else if (a === '--sample') out.sample = Number(argv[++i]);
    else if (a === '--concurrency') out.concurrency = Number(argv[++i]);
    else if (a === '--ttl') out.ttl = Number(argv[++i]);
    else if (a === '--cache') out.cache = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--validate') out.validateOnly = true;
    else if (a === '--fresh') out.fresh = true;
    else if (a === '-h' || a === '--help') out.help = true;
    else {
      console.error(`unknown argument: ${a}`);
      out.bad = true;
    }
  }
  return out;
}

function usage() {
  console.error(
    [
      'Resolve card equipment slots from the RagnaPlace Public API.',
      '',
      '  node tools/resolve-card-slots.mjs [--gateway bro] [--sample N] [--only ids]',
      '                                    [--validate] [--fresh] [--concurrency 4]',
      '',
      '  --validate   only cross-check the already-registered cards; write no output',
      '  --sample N   validate against N registered cards instead of all 613',
      '  --only       fetch just these ids (comma separated) and print what they say',
      '  --fresh      ignore the cache and refetch every id',
      '  --ttl        reuse cached records younger than this many days (default 30)',
      '  --cache      cache file (default .scratch/ragnaplace-cards.jsonl, gitignored)',
      '',
      '  Needs RAGNAPLACE_API_KEY in the environment, or in ../ragassets/.env',
    ].join('\n'),
  );
}

// ── the key ──────────────────────────────────────────────────────────────────────────

/**
 * Minimal .env reader, same shape as ragassets' tools/scrape-mobs.mjs. The key lives in
 * the sibling checkout and is deliberately NOT copied into this repo: nothing here ever
 * writes it anywhere, and no error message or log line ever carries it.
 */
function readApiKey() {
  if (process.env.RAGNAPLACE_API_KEY) return process.env.RAGNAPLACE_API_KEY.trim();
  const candidates = [
    process.env.RAGASSETS_ENV,
    resolve(ROOT, '../ragassets/.env'),
  ].filter(Boolean);
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?RAGNAPLACE_API_KEY\s*=\s*(.*)$/.exec(line);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

// ── CardPosition, read from the app's own enum ───────────────────────────────────────

/** `Weapon = 0` -> { Weapon: 0 }. Read, not copied, so this file cannot drift from it. */
function readCardPositions() {
  const src = readFileSync(join(ROOT, 'src/app/constants/card-position.enum.ts'), 'utf8');
  const body = /export enum CardPosition\s*{([\s\S]*?)}/.exec(src);
  if (!body) throw new Error('could not find `export enum CardPosition` — has it moved?');
  const out = {};
  for (const m of body[1].matchAll(/^\s*(\w+)\s*=\s*(-?\d+)\s*,/gm)) out[m[1]] = Number(m[2]);
  if (!Object.keys(out).length) throw new Error('CardPosition parsed empty');
  return out;
}

const POS = readCardPositions();

/**
 * Cards where the two databases disagree about the slot and the pt-BR description wins.
 *
 * A ruling, not a heuristic — it lives here rather than in the generated JSON so that
 * regenerating cannot quietly drop it. The API's answer is kept alongside as
 * `apiCompositionPos`, so the disagreement stays visible instead of being erased.
 */
const CLIENT_WINS = {
  300127: 'Carta Autógrafo de Wolf: client says "Aces. Esquerdo", RagnaPlace says weapon.',
  300129: 'Carta Autógrafo de Po: client says "Aces. Esquerdo", RagnaPlace says weapon.',
};

/** RagnaPlace subcategory -> CardPosition member. Anything else is reported, not guessed. */
const SUBCATEGORY_TO_POSITION = {
  weapon: 'Weapon',
  armor: 'Armor',
  shield: 'Shield',
  garment: 'Garment',
  shoes: 'Boot',
  headgear: 'Head',
  // Family only: the API has no right/left distinction. See the header.
  accessory: 'Acc',
};

/**
 * A deliberately looser read of the slot footer than the one classify-missing-cards.mjs
 * routes with. It exists for one card: 300277 Carta Rancor de Thanatos prints
 * "Equipa em : Escudo" — a space before the colon — so the strict /Equipa em:/ misses it
 * and the API has no record of the id at all. Used only to *report* a slot the client
 * clearly states, never to overrule the API where the API answers.
 */
const TOLERANT_SLOT = /(?:Equipa em|Equipado em|Utiliza[cç][aã]o|Localiza[cç][aã]o)\s*:\s*([^\n]*)/i;

/** The description's slot label -> CardPosition member, as card-bonus-registration.spec.ts asserts it. */
const LABEL_TO_POSITION = {
  'Arma': 'Weapon',
  'Armadura': 'Armor',
  'Escudo': 'Shield',
  'Capa': 'Garment',
  'Calçado': 'Boot',
  'Acessório': 'Acc',
  'Aces. Direito': 'AccR',
  'Aces. Esquerdo': 'AccL',
  'Equip. para Cabeça': 'Head',
  'Equipamento para Cabeça': 'Head',
};

/** Acc/AccR/AccL are one family to the API; collapse them before scoring agreement. */
const ACCESSORY_POS = new Set([POS.Acc, POS.AccR, POS.AccL]);
const family = (pos) => (ACCESSORY_POS.has(pos) ? 'accessory' : pos);

const posName = (v) => Object.keys(POS).find((k) => POS[k] === v) ?? null;

// ── rate limiting ────────────────────────────────────────────────────────────────────

/**
 * One shared budget for every worker: each response republishes the window's remaining
 * quota, and when it runs low everyone parks until the window resets. Reading the
 * headers is the point — hammering until a 429 comes back would be the rude version.
 */
class RateGate {
  constructor() {
    this.until = 0; // epoch ms to wait for; 0 = go
    this.limit = null;
    this.minRemaining = Infinity;
    this.parked = 0;
  }
  observe(res) {
    const limit = Number(res.headers.get('x-ratelimit-limit'));
    const remaining = Number(res.headers.get('x-ratelimit-remaining'));
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    if (Number.isFinite(limit)) this.limit = limit;
    if (Number.isFinite(remaining)) this.minRemaining = Math.min(this.minRemaining, remaining);
    if (Number.isFinite(remaining) && Number.isFinite(reset) && remaining <= RATE_FLOOR) {
      // `reset` is seconds until the window rolls over; +1s of slack for clock skew.
      this.until = Math.max(this.until, Date.now() + (reset + 1) * 1000);
      this.parked++;
    }
  }
  backoff(res, attempt) {
    const retryAfter = Number(res.headers.get('retry-after'));
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    const secs = Number.isFinite(retryAfter) ? retryAfter : Number.isFinite(reset) ? reset : 2 ** attempt;
    this.until = Math.max(this.until, Date.now() + (secs + 1) * 1000);
  }
  async wait() {
    while (this.until > Date.now()) await new Promise((r) => setTimeout(r, this.until - Date.now()));
  }
}

const stats = { requests: 0, http404: 0, retries: 0 };

/** The Item object, or null when the id is not in the LATAM catalogue (404). */
async function fetchItem(gateway, id, key, gate) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    await gate.wait();
    let res;
    try {
      stats.requests++;
      res = await fetch(`${API_BASE}/v1/${gateway}/item/${id}`, {
        headers: { 'x-api-key': key, accept: 'application/json' },
      });
    } catch (err) {
      if (attempt === MAX_ATTEMPTS - 1) throw err;
      stats.retries++;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
      continue;
    }
    gate.observe(res);

    if (res.status === 200) return res.json();
    if (res.status === 404) {
      stats.http404++;
      return null;
    }
    if (res.status === 429 || res.status >= 500) {
      stats.retries++;
      gate.backoff(res, attempt);
      continue;
    }
    // 401/403 are terminal: a bad or unapproved key will not fix itself. The status and
    // the body are printed; the key never is.
    throw new Error(`GET /v1/${gateway}/item/${id} -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
  throw new Error(`GET /v1/${gateway}/item/${id} failed after ${MAX_ATTEMPTS} attempts`);
}

/** The projection the cache keeps: everything this script reads, and nothing else. */
const project = (id, item) =>
  item === null
    ? { id, at: Date.now(), missing: true }
    : {
        id,
        at: Date.now(),
        name: item.identifiedDisplayName ?? null,
        aegis: item.name ?? null,
        categories: item.categories ?? [],
        subcategories: item.subcategories ?? [],
      };

// ── the resumable cache ──────────────────────────────────────────────────────────────

function loadCache(path, fresh) {
  mkdirSync(dirname(path), { recursive: true });
  if (fresh) rmSync(path, { force: true });
  const cache = new Map();
  if (!existsSync(path)) return cache;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (Number.isFinite(e?.id)) cache.set(e.id, e); // append-only: the last line per id wins
    } catch {
      /* a torn last line from an interrupted run */
    }
  }
  return cache;
}

async function fetchAll(ids, { gateway, key, cache, cachePath, concurrency, ttlMs }) {
  const gate = new RateGate();
  const cutoff = Date.now() - ttlMs;
  const todo = ids.filter((id) => !(cache.get(id)?.at > cutoff));
  console.log(`${ids.length} ids, ${ids.length - todo.length} already cached, ${todo.length} to fetch`);
  if (!todo.length) return gate;

  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < todo.length) {
      const id = todo[next++];
      const entry = project(id, await fetchItem(gateway, id, key, gate));
      cache.set(id, entry);
      appendFileSync(cachePath, `${JSON.stringify(entry)}\n`);
      if (++done % 100 === 0 || done === todo.length) {
        process.stdout.write(`  ${done}/${todo.length}\r`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  process.stdout.write('\n');
  return gate;
}

// ── reading one cached record ────────────────────────────────────────────────────────

/**
 * What the API says about a card's slot.
 *   { kind: 'missing' }              the id 404s upstream
 *   { kind: 'notACard', categories } categories is not ["card"] — an enchant, a quest
 *                                    letter, an etc item. Has no equip slot at all.
 *   { kind: 'noSubcategory' }        a card, but with an empty subcategories array
 *   { kind: 'unmapped', sub }        a subcategory outside SUBCATEGORY_TO_POSITION
 *   { kind: 'ok', sub, pos, name }   resolved
 */
function readSlot(entry) {
  if (!entry) return { kind: 'unfetched' };
  if (entry.missing) return { kind: 'missing' };
  const cats = entry.categories ?? [];
  const subs = entry.subcategories ?? [];
  if (!cats.includes('card')) return { kind: 'notACard', categories: cats, subcategories: subs };
  if (!subs.length) return { kind: 'noSubcategory' };
  const known = subs.filter((s) => s in SUBCATEGORY_TO_POSITION);
  if (!known.length) return { kind: 'unmapped', subcategories: subs };
  if (known.length > 1) return { kind: 'ambiguous', subcategories: subs };
  const member = SUBCATEGORY_TO_POSITION[known[0]];
  return { kind: 'ok', sub: known[0], pos: POS[member], posName: member };
}

// ── main ─────────────────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));
if (args.help || args.bad) {
  usage();
  process.exit(args.bad ? 1 : 0);
}

const key = readApiKey();
if (!key) {
  console.error(
    '! no RAGNAPLACE_API_KEY.\n' +
      '  Set it in the environment, or leave it in ../ragassets/.env (gitignored there).\n' +
      '  Never commit it into this repo.',
  );
  process.exit(1);
}

const gateway = args.gateway || DEFAULT_GATEWAY;
const cachePath = resolve(args.cache || CACHE);
const outPath = resolve(args.out || OUT);
const concurrency = Number.isFinite(args.concurrency) ? args.concurrency : DEFAULT_CONCURRENCY;
const ttlMs = (Number.isFinite(args.ttl) ? args.ttl : DEFAULT_TTL_DAYS) * 86400_000;

const items = JSON.parse(readFileSync(join(DATA, 'item.json'), 'utf8'));
const latam = JSON.parse(readFileSync(join(DATA, 'latam-items.json'), 'utf8'));
const classified = JSON.parse(readFileSync(CLASSIFIED, 'utf8'));
const cache = loadCache(cachePath, args.fresh);

// --only: a spot check, printed and nothing else.
if (args.only) {
  const ids = args.only.split(',').map((s) => Number(s.trim())).filter(Number.isFinite);
  await fetchAll(ids, { gateway, key, cache, cachePath, concurrency, ttlMs });
  for (const id of ids) {
    const e = cache.get(id);
    const slot = readSlot(e);
    console.log(
      `${String(id).padStart(7)}  ${(e?.name ?? '?').padEnd(34)} ` +
        `${JSON.stringify(e?.categories ?? [])} ${JSON.stringify(e?.subcategories ?? [])} ` +
        `-> ${slot.kind === 'ok' ? `CardPosition.${slot.posName} (${slot.pos})` : slot.kind}`,
    );
  }
  console.log(`\n${stats.requests} requests spent.`);
  process.exit(0);
}

const registered = classified.ids.registered;
const validationIds = Number.isFinite(args.sample) ? registered.slice(0, args.sample) : registered;
const missingIds = args.validateOnly
  ? []
  : ['ready', 'mixed', 'proc', 'noSlot', 'undefined'].flatMap((g) => classified.ids[g] ?? []);

const gate = await fetchAll([...validationIds, ...missingIds], {
  gateway, key, cache, cachePath, concurrency, ttlMs,
});

// ── validation: the API against the cards item.json already routes ───────────────────

const validation = {
  sampled: validationIds.length,
  compared: 0,
  agreed: 0,
  agreedExact: 0,
  agreementRate: null,
  exactAgreementRate: null,
  divergences: [],
  excluded: { notACard: [], noCompositionPos: [], sentinelAll: [], missingUpstream: [], noSubcategory: [], unmapped: [] },
};

for (const id of validationIds) {
  const entry = cache.get(id);
  const slot = readSlot(entry);
  const pos = items[id]?.compositionPos ?? null;
  const row = { id, name: entry?.name ?? items[id]?.name ?? null };

  if (slot.kind === 'missing') { validation.excluded.missingUpstream.push(row); continue; }
  if (slot.kind === 'notACard') { validation.excluded.notACard.push({ ...row, categories: slot.categories, compositionPos: pos }); continue; }
  if (pos == null) { validation.excluded.noCompositionPos.push({ ...row, subcategories: entry?.subcategories ?? [] }); continue; }
  if (pos === POS.All) { validation.excluded.sentinelAll.push({ ...row, subcategories: entry?.subcategories ?? [] }); continue; }
  if (slot.kind === 'noSubcategory') { validation.excluded.noSubcategory.push({ ...row, compositionPos: pos }); continue; }
  if (slot.kind === 'unmapped' || slot.kind === 'ambiguous') {
    validation.excluded.unmapped.push({ ...row, compositionPos: pos, subcategories: slot.subcategories });
    continue;
  }

  validation.compared++;
  const sameFamily = family(slot.pos) === family(pos);
  const exact = slot.pos === pos;
  if (sameFamily) validation.agreed++;
  if (exact) validation.agreedExact++;
  if (!sameFamily) {
    validation.divergences.push({
      id,
      name: row.name,
      itemJson: { compositionPos: pos, cardPosition: posName(pos) },
      ragnaplace: { subcategory: slot.sub, compositionPos: slot.pos, cardPosition: slot.posName },
    });
  }
}
validation.agreementRate = validation.compared ? validation.agreed / validation.compared : null;
validation.exactAgreementRate = validation.compared ? validation.agreedExact / validation.compared : null;
// Accessories are the only place exact and family-level scores can differ, and they do so
// because the API has no side, not because it is wrong. Counted so the gap is explainable.
validation.accessoryFamilyOnly = validation.agreed - validation.agreedExact;

// ── resolution: the cards that are not registered yet ────────────────────────────────

const unmappedSubcategories = new Map();

function resolveCard(id) {
  const rec = classified.cards[id] ?? {};
  const entry = cache.get(id);
  const slot = readSlot(entry);
  const out = {
    name: rec.name ?? entry?.name ?? null,
    group: rec.group ?? null,
    subcategories: entry?.subcategories ?? [],
  };
  if (slot.kind === 'ok') {
    out.subcategory = slot.sub;
    out.compositionPos = slot.pos;
    out.cardPosition = slot.posName;
  } else {
    out.subcategory = null;
    out.compositionPos = null;
    out.unresolved = slot.kind;
    if (slot.kind === 'notACard') out.categories = slot.categories;
    if (slot.kind === 'unmapped' || slot.kind === 'ambiguous') {
      for (const s of slot.subcategories) unmappedSubcategories.set(s, (unmappedSubcategories.get(s) ?? 0) + 1);
    }
  }
  // What the description said, so the two can be read side by side.
  if (rec.slotLabel) {
    out.slotLabel = rec.slotLabel;
    out.slotLabelPos = POS[LABEL_TO_POSITION[rec.slotLabel]] ?? null;
  }
  if (rec.altSlotLabel) {
    out.altSlotLabel = rec.altSlotLabel;
    out.altSlotLabelPos = POS[LABEL_TO_POSITION[rec.altSlotLabel]] ?? null;
  }
  // Only where neither footer spelling the classifier knows produced a label: the last
  // resort read, reported as coming from the client text rather than from the API.
  if (!rec.slotLabel && !rec.altSlotLabel) {
    const desc = (latam[id]?.description ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');
    const label = TOLERANT_SLOT.exec(desc)?.[1].trim();
    if (label && label in LABEL_TO_POSITION) {
      out.clientSlotLabel = label;
      out.clientSlotLabelPos = POS[LABEL_TO_POSITION[label]];
      out.clientSlotLabelSource = 'latam-items.json description, tolerant footer regex';
    }
  }
  const claimed = out.slotLabelPos ?? out.altSlotLabelPos ?? out.clientSlotLabelPos ?? null;
  if (claimed != null && out.compositionPos != null) {
    out.agreesWithDescription = family(claimed) === family(out.compositionPos);
  }
  if (claimed != null && id in CLIENT_WINS) {
    out.ruledInFavourOf = 'client';
    out.ruledReason = CLIENT_WINS[id];
    out.apiCompositionPos = out.compositionPos;
    out.compositionPos = claimed;
  }
  return out;
}

const cards = {};
for (const id of missingIds) cards[id] = resolveCard(id);

// The "Equipa em:" cohort is a second, independent check of the same source.
const described = missingIds.filter((id) => cards[id].agreesWithDescription !== undefined && classified.cards[id]?.slotLabel);
const describedAgree = described.filter((id) => cards[id].agreesWithDescription);
// And the 29 noSlot cards that name a slot under the older "Utilização:" spelling.
const alt = missingIds.filter((id) => classified.cards[id]?.altSlotLabel && cards[id].agreesWithDescription !== undefined);
const altAgree = alt.filter((id) => cards[id].agreesWithDescription);

const noSlotIds = classified.ids.noSlot ?? [];
const resolvedNoSlot = noSlotIds.filter((id) => cards[id]?.compositionPos != null);

function readPreviousRateLimit() {
  try {
    return JSON.parse(readFileSync(outPath, 'utf8')).source?.rateLimit ?? null;
  } catch {
    return null;
  }
}

const payload = {
  $comment:
    'Generated by tools/resolve-card-slots.mjs — do not hand-edit. Equipment slot of ' +
    'every card missing from item.json, taken from the RagnaPlace Public API ' +
    '(GET /v1/bro/item/<id>, field `subcategories`) and cross-checked against the ' +
    'compositionPos of the cards item.json already carries. `accessory` is a family: ' +
    'the API does not distinguish Acc / AccR / AccL, so the side still comes from the ' +
    "description's \"Aces. Direito\" / \"Aces. Esquerdo\" line.",
  generatedBy: 'tools/resolve-card-slots.mjs',
  generatedAt: new Date().toISOString(),
  source: {
    api: `${API_BASE}/v1/${gateway}/item/{id}`,
    gateway,
    spec: 'https://ro.ragnaplace.com/v1/openapi.json',
    field: 'subcategories',
    // A fully cached re-run makes no request and so observes no header; the previously
    // recorded limit is carried rather than overwritten with null.
    rateLimit: gate.limit ?? readPreviousRateLimit(),
    requestsThisRun: stats.requests,
  },
  subcategoryMap: Object.fromEntries(
    Object.entries(SUBCATEGORY_TO_POSITION).map(([sub, member]) => [sub, { cardPosition: member, compositionPos: POS[member] }]),
  ),
  validation,
  descriptionCrossCheck: {
    $comment:
      'The 419 unregistered cards that DO print an "Equipa em:" line: the label versus ' +
      'what the API says. A second, independent cohort — none of these is in item.json.',
    compared: described.length,
    agreed: describedAgree.length,
    divergences: described
      .filter((id) => !cards[id].agreesWithDescription)
      .map((id) => ({ id, name: cards[id].name, slotLabel: cards[id].slotLabel, ragnaplace: cards[id].subcategory })),
  },
  altLabelCrossCheck: {
    $comment:
      'The noSlot cards that name a slot under the older "Utilização:" / "Equipado em:" ' +
      'spelling, which classify-missing-cards.mjs records as altSlotLabel. This is the ' +
      'check that says whether that older label can be trusted.',
    compared: alt.length,
    agreed: altAgree.length,
    divergences: alt
      .filter((id) => !cards[id].agreesWithDescription)
      .map((id) => ({ id, name: cards[id].name, altSlotLabel: cards[id].altSlotLabel, ragnaplace: cards[id].subcategory })),
  },
  noSlot: {
    $comment:
      'The 51 cards with no "Equipa em:" line — the group this run exists for. ' +
      '`unresolved: "notACard"` is not a failure of the API: those ids are quest letters ' +
      'and etc items whose pt-BR name merely starts with "Carta ", so they have no ' +
      'equipment slot to find and do not belong in item.json at all.',
    total: noSlotIds.length,
    resolved: resolvedNoSlot.length,
    resolvedFromClientText: noSlotIds.filter((id) => cards[id]?.compositionPos == null && cards[id]?.clientSlotLabelPos != null).length,
    notAnEquipmentCard: noSlotIds.filter((id) => cards[id]?.unresolved === 'notACard').length,
    ids: noSlotIds,
  },
  unmappedSubcategories: Object.fromEntries(unmappedSubcategories),
  cards,
};

// ── report ───────────────────────────────────────────────────────────────────────────

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(2)}%` : 'n/a');

console.log('\n── validation against the registered cards ──');
console.log(`sampled            ${validation.sampled}`);
console.log(`compared           ${validation.compared}`);
console.log(`agreed (family)    ${validation.agreed}  ${pct(validation.agreed, validation.compared)}`);
console.log(`agreed (exact)     ${validation.agreedExact}  ${pct(validation.agreedExact, validation.compared)}`);
console.log(`accessory side only ${validation.accessoryFamilyOnly}`);
console.log(`divergences        ${validation.divergences.length}`);
for (const d of validation.divergences) {
  console.log(
    `  ${String(d.id).padStart(7)} ${(d.name ?? '').padEnd(34)} ` +
      `item.json ${d.itemJson.cardPosition ?? d.itemJson.compositionPos} vs ragnaplace ${d.ragnaplace.subcategory}`,
  );
}
for (const [k, v] of Object.entries(validation.excluded)) if (v.length) console.log(`excluded ${k}: ${v.length}`);

if (!args.validateOnly) {
  console.log('\n── the noSlot group ──');
  console.log(`${resolvedNoSlot.length}/${noSlotIds.length} resolved to a CardPosition`);
  for (const id of noSlotIds) {
    const c = cards[id];
    console.log(
      `  ${String(id).padStart(7)} ${(c.name ?? '').padEnd(30)} ` +
        `${(c.subcategory ?? `— (${c.unresolved})`).padEnd(14)} ` +
        `${c.compositionPos == null ? '' : `CardPosition.${c.cardPosition} (${c.compositionPos})`}` +
        `${c.altSlotLabel ? `   alt "${c.altSlotLabel}" ${c.agreesWithDescription === false ? 'MISMATCH' : c.agreesWithDescription ? 'ok' : ''}` : ''}` +
        `${c.clientSlotLabel ? `   client text "${c.clientSlotLabel}" -> CardPosition.${posName(c.clientSlotLabelPos)} (${c.clientSlotLabelPos})` : ''}`,
    );
  }
  console.log('\n── cross-checks ──');
  console.log(`"Equipa em:" label vs API   ${describedAgree.length}/${described.length}  ${pct(describedAgree.length, described.length)}`);
  console.log(`older alt label vs API      ${altAgree.length}/${alt.length}  ${pct(altAgree.length, alt.length)}`);
  if (unmappedSubcategories.size) {
    console.log('\n! subcategories with no CardPosition (reported, not guessed):');
    for (const [s, n] of unmappedSubcategories) console.log(`  ${s}  ${n}`);
  }

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(payload, null, 1) + '\n');
  console.log(`\nwrote ${outPath.replace(ROOT + '\\', '').replace(/\\/g, '/')}`);
}

console.log(
  `\n${stats.requests} requests spent (${stats.http404} 404, ${stats.retries} retries), ` +
    `rate limit ${gate.limit ?? '?'}/window, lowest remaining ${Number.isFinite(gate.minRemaining) ? gate.minRemaining : '?'}` +
    `${gate.parked ? `, parked ${gate.parked}x for the window to roll over` : ''}.`,
);
