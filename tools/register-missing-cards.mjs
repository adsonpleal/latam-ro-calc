#!/usr/bin/env node
// Write an item.json record for every card the LATAM client ships and the calculator does
// not have.
//
//   node tools/register-missing-cards.mjs --check   # report, write nothing
//   node tools/register-missing-cards.mjs --audit   # every registered card vs its own text
//   node tools/register-missing-cards.mjs           # splice the records into item.json
//
// What a card is, where it goes and which of its description lines the engine can hold are
// all decided in tools/card-catalog.mjs — read that file first.
//
// ── Why every card, and not only the ones the engine can model ───────────────────────
//
// a54f32e6 registered 64 cards under the rule "every line of the description has to map,
// or the card stays out", because a card whose script silently drops half its text reads
// as modelled when it is not. That rule was right for a database whose only job was to
// feed the damage calculation, and it left 403 cards unreachable.
//
// The replay import changed what the database is for. A .rrf names the cards the character
// is actually wearing, and an id with no record is dropped with a "fora do banco de dados"
// toast — so the missing 403 are not "cards the calculator ignores", they are cards it
// cannot even show you are wearing. A card with an empty script is honest about that: the
// player sees it in the slot, the pt-BR description is right there in the tooltip (it is
// overlaid at runtime from latam-items.json, so it is complete whatever the script holds),
// and the totals do not move.
//
// The rule that survives is the narrower one: **never write a script entry that is not in
// the card's own text**. Everything the phrase table resolves goes in; everything it does
// not is left out rather than guessed at.
//
// ── What ends up in the script ──────────────────────────────────────────────────────
//
//   flat lines      Every phrase the table resolves, at the magnitude the text prints.
//   gated lines     Only the gates item.json's own grammar already writes — refine steps
//                   and thresholds, base-attribute thresholds and steps, base level, and
//                   the class lineages (GATES below). Everything else — Conjunto blocks,
//                   proc payloads, capped step gates — is left out.
//   the rest        Nothing. Procs, status tolerance, "habilita a perícia X", turning
//                   damage into HP: no key in createRawTotalBonus means no entry.
//
// ── The self-check ──────────────────────────────────────────────────────────────────
//
// Before writing anything, --check rebuilds the script of every card that is ALREADY in
// item.json and whose every line the table resolves, and requires the rebuild to be
// contained in the record that is there. 199 cards qualify and all 199 hold. That is the
// evidence that the extractor reads a card the way this database already reads one, rather
// than the way this file's author hoped it would.
//
// A record may carry MORE than its own text: three cards (27170, 27326, 300141) hold a
// combo clause that is written on the partner item's description, not on theirs. Extra
// clauses pass; a magnitude that disagrees, or a line the record simply does not have,
// fails the run.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, latam, items, plain, effectLines, mapLine, isCard, classify, assertKeysExist, assertBatchStillMaps } from './card-catalog.mjs';

const ITEM_JSON = join(DATA, 'item.json');
const args = new Set(process.argv.slice(2));

// ── the gates item.json's grammar already writes ─────────────────────────────────────

/**
 * pt-BR class lineage -> the `USED[...]` list that names it.
 *
 * Seven lineages are the class tree's own root token, because `USED[...]` matches against
 * `classNameSet`, which carries every ancestor: `USED[Mage]` reaches Arcano, Magus,
 * Feiticeiro and Elementalista without listing them.
 *
 * Two are not, and have to be spelled out. The job tree crosses the Bard and Dancer lines
 * — Wanderer (Musa, the Odalisca line) extends Bard, and Minstrel (Trovador, the Bardo
 * line) extends Dancer — so each of them inherits the OTHER lineage's token. See the same
 * note in src/app/core/asas-garuda.spec.ts. Naming the four classes directly is what makes
 * these two cards land where the client's text says they land.
 *
 * "Noviços" is Acolyte, not Novice: the client calls the Novice "Aprendiz". Reading it as
 * the Novice line is the mistranslation that once hid 56 items from the Acolyte tree.
 */
const LINEAGE = {
  'Espadachins': 'Swordman',
  'Mercadores': 'Merchant',
  'Gatunos': 'Thief',
  'Magos': 'Mage',
  'Arqueiros': 'Archer',
  'Sábios': 'Sage',
  'Noviços': 'Acolyte',
  'Bardos': 'Minstrel||Troubadour',
  'Odaliscas': 'Wanderer||Trouvere',
};

const STAT = { FOR: 'str', AGI: 'agi', VIT: 'vit', INT: 'int', DES: 'dex', SOR: 'luk' };

/**
 * gate line -> the entry a value under it becomes, per docs/item-json.md §4 and §5.
 *
 * A gate with no rule here leaves its lines out of the script entirely. That is the whole
 * list of what the grammar expresses, deliberately: "A cada 10 de FOR base até o 50:" is a
 * step gate with a cap and `str:10---N` has no cap, so it is absent rather than wrong, and
 * a Conjunto block needs the partner's id, which the description does not give.
 *
 * The refine a card reads is the refine of the equipment it is compounded into:
 * `getRefineLevelByItemType` resolves "armorCard" through "armor". Same as in the game.
 */
/**
 * Gates that shape the VALUE — the "X===Y" and "X---Y" forms. An entry holds exactly one
 * value, so it can carry at most one of these; a line under two of them is left out.
 */
const VALUE_GATES = [
  [/^Refino \+(\d+) ou mais:$/i, (m, value) => `${m[1]}===${value}`],
  [/^A cada refino:$/i, (_m, value) => `1---${value}`],
  [/^A cada (\d+) refinos:$/i, (m, value) => `${m[1]}---${value}`],
  [/^(FOR|AGI|VIT|INT|DES|SOR) base (\d+) ou mais:$/i, (m, value) => `${STAT[m[1].toUpperCase()]}:${m[2]}===${value}`],
  [/^A cada (\d+) de (FOR|AGI|VIT|INT|DES|SOR) base:$/i, (m, value) => `${STAT[m[2].toUpperCase()]}:${m[1]}---${value}`],
  [/^Nv\. base (\d+) ou maior:$/i, (m, value) => `level:${m[1]}===${value}`],
];

/** Gates that become a CONDITION prefix. Any number of these can chain onto one entry. */
const CONDITION_GATES = [
  [
    /^(.+?) e evoluções:$/i,
    (m) => {
      const names = m[1].split(/\s*,\s*/).map((name) => LINEAGE[name.trim()]);
      return names.every(Boolean) ? `USED[${names.join('||')}]` : null;
    },
  ],
];

/** The gate the refine-band pair below is written against, e.g. "Nos refinos entre 0 e +14:". */
const REFINE_BAND = /^Nos refinos entre 0 e \+(\d+):$/i;

/**
 * The entry a value under `gates` becomes, or null when any of them is a condition the
 * grammar does not write.
 *
 * All of them, not the innermost: the client nests gates and the inner one does not cancel
 * the outer, so "A cada refino: ATQ +3" sitting inside "Bônus para Chicotes, …:" is per
 * refine AND weapon-restricted. Writing the refine step alone would pay on every weapon in
 * the game, so a gate this cannot express takes the whole entry out.
 */
function entryFor(gates, value) {
  let written = String(value);
  let valueGateUsed = false;
  const conditions = [];

  for (const gate of gates) {
    const valueGate = VALUE_GATES.find(([re]) => re.test(gate));
    if (valueGate) {
      // Two of them on one line would need two values in one entry — "a cada refino" inside
      // "FOR base 80 ou mais" has no spelling. Out, rather than half of it.
      if (valueGateUsed) return null;
      written = valueGate[1](valueGate[0].exec(gate), written);
      valueGateUsed = true;
      continue;
    }

    const conditionGate = CONDITION_GATES.find(([re]) => re.test(gate));
    const condition = conditionGate?.[1](conditionGate[0].exec(gate));
    if (!condition) return null;
    conditions.push(condition);
  }

  return conditions.join('') + written;
}

// ── description -> script ────────────────────────────────────────────────────────────

/**
 * The two-band refine wording, folded into the one entry pair that reproduces it.
 *
 * The seven Selada cards (27213-27219) print their bonus twice:
 *
 *   Nos refinos entre 0 e +14:   Esquiva +10.
 *   Refino +15 ou mais:          Esquiva +15.
 *
 * "+15 or more" is a threshold the grammar writes, but "0 to +14" is a ceiling it does
 * not. Written as `["10", "15===5"]` the two entries sum to exactly what the card says at
 * every refine — 10 below +15, 15 at or above it — because the lower band starts at 0 and
 * is therefore always true. Registering the "+15 ou mais" half alone would be wrong at
 * every refine under 15, which is most of them.
 *
 * Only an exact pair on the same key folds: a low band that is not "entre 0 e +N", or a
 * high threshold that is not N+1, leaves both lines out.
 */
function foldRefineBands(byKey) {
  const only = (entry, re) => entry.gates.length === 1 && re.test(entry.gates[0]);

  for (const [key, entries] of Object.entries(byKey)) {
    const low = entries.find((e) => only(e, REFINE_BAND));
    if (!low) continue;
    const bandTop = Number(REFINE_BAND.exec(low.gates[0])[1]);
    const threshold = new RegExp(`^Refino \\+${bandTop + 1} ou mais:$`, 'i');
    const high = entries.find((e) => only(e, threshold));
    if (!high) continue;

    byKey[key] = entries
      .filter((e) => e !== low && e !== high)
      .concat([
        { value: low.value, gates: [] },
        { value: high.value - low.value, gates: [`Refino +${bandTop + 1} ou mais:`] },
      ]);
  }
  return byKey;
}

/** Every entry a card's pt-BR description yields, keyed by bonus key, in reading order. */
function scriptOf(id) {
  const byKey = {};
  for (const { text, gates } of effectLines(latam[id].description)) {
    if (/:$/.test(text)) continue; // the gate's own header line
    const entries = mapLine(text);
    if (!entries) continue;
    for (const { key, value } of entries) (byKey[key] ||= []).push({ value, gates });
  }

  const script = {};
  for (const [key, entries] of Object.entries(foldRefineBands(byKey))) {
    const written = entries.map((e) => entryFor(e.gates, e.value)).filter((e) => e !== null);
    if (written.length) script[key] = written;
  }
  return script;
}

// ── the self-check: reproduce what is already in the database ────────────────────────

/**
 * Every registered card whose every line the table resolves, rebuilt and compared. The
 * rebuild has to be CONTAINED in the record — see the header on the three cards that carry
 * a partner's combo clause.
 */
/** What a registered card's record does NOT carry, of everything its own text yields. */
function shortfallOf(id) {
  const actual = items[id].script || {};
  return Object.entries(scriptOf(id)).flatMap(([key, values]) => {
    const carried = actual[key] || [];
    const missing = values.filter((value) => !carried.includes(value));
    return missing.length ? [`${key} should carry ${missing.join(', ')}, record has [${carried.join(', ')}]`] : [];
  });
}

function assertReproducesRegistered() {
  let checked = 0;
  const wrong = [];

  for (const id of Object.keys(latam)) {
    if (!isCard(latam[id], id) || !items[id]) continue;
    const lines = effectLines(latam[id].description);
    if (!lines.length) continue;
    if (lines.some(({ text, gated }) => gated || /:$/.test(text) || !mapLine(text))) continue;

    checked++;
    for (const problem of shortfallOf(id)) wrong.push(`${id} ${latam[id].name}: ${problem}`);
  }

  if (wrong.length) {
    console.error(`${wrong.length} registered card(s) disagree with their own pt-BR text:`);
    for (const w of wrong) console.error('  ' + w);
    process.exit(1);
  }
  return checked;
}

/**
 * --audit: the same comparison over EVERY registered card, reported and never enforced.
 *
 * Outside the flat cards above it cannot be an assertion, because a record is allowed to
 * differ for two honest reasons: it can hold a partner's combo clause, which is written on
 * the other item's text and not on this one, and it can spell a condition another equally
 * valid way — `SUM[luk==18]---1` where this file writes `luk:18---1`.
 *
 * What is left over is worth reading: it found the six cards whose record disagreed with
 * their pt-BR line outright (4060, 4130, 27198, 27314, 300280, 300297), all corrected.
 */
function auditRegistered() {
  const rows = [];
  for (const id of Object.keys(latam)) {
    if (!isCard(latam[id], id) || !items[id]) continue;
    for (const problem of shortfallOf(id)) rows.push(`  ${id} ${latam[id].name}: ${problem}`);
  }

  console.log(`${rows.length} line(s) a registered card's pt-BR text yields and its record does not hold:\n`);
  for (const row of rows) console.log(row);
}

// ── the records ──────────────────────────────────────────────────────────────────────

/** "Peso: 1" off the card's own footer. Every card weighs 1; the parse keeps it honest. */
function weightOf(id) {
  const printed = /Peso\s*:\s*(\d+)/.exec(plain(latam[id].description))?.[1];
  return printed ? Number(printed) : 1;
}

/**
 * The record, shaped like the cards a54f32e6 registered.
 *
 * `name` is the pt-BR one and `description` stays empty: RoService overlays both from
 * latam-items.json at runtime, which is also what puts the card's full text in the tooltip
 * whatever this script holds. `presentInLatam` is not written either — build-web-data
 * recomputes it from the LATAM key set, and every id here is in it by construction.
 */
function recordFor(id, compositionPos) {
  return {
    id: Number(id),
    aegisName: latam[id].aegisName ?? '',
    name: latam[id].name,
    unidName: latam[id].name,
    resName: '',
    description: '',
    slots: 0,
    itemTypeId: 6,
    itemSubTypeId: 0,
    itemLevel: null,
    attack: null,
    defense: null,
    weight: weightOf(id),
    requiredLevel: null,
    location: null,
    compositionPos,
    usableClass: ['all'],
    script: scriptOf(id),
  };
}

// ── writing into item.json ───────────────────────────────────────────────────────────

/**
 * Append the records by splicing text before the file's last "}", never by re-serialising.
 *
 * item.json's keys are not in numeric order, and JSON.parse/stringify reorders every
 * integer-like key by spec — a round-trip rewrites all 10025 records and buries the change
 * in a diff nobody can read. The splice touches only the bytes it adds, which is checked
 * below by re-reading the file and comparing the prefix.
 */
function append(records) {
  const before = readFileSync(ITEM_JSON, 'utf8');
  // The file is CRLF. Writing "\n" here would leave the 402 new records as the only
  // LF-terminated lines in it, which every later diff of the file would then carry.
  const NL = before.includes('\r\n') ? '\r\n' : '\n';
  const end = before.lastIndexOf('}');
  const head = before.slice(0, end).replace(/\s+$/, '');
  const body = records
    .map(([id, rec]) => `  ${JSON.stringify(String(id))}: ${JSON.stringify(rec, null, 2).replace(/\n/g, `${NL}  `)}`)
    .join(`,${NL}`);

  writeFileSync(ITEM_JSON, `${head},${NL}${body}${NL}}${NL}`);

  const after = readFileSync(ITEM_JSON, 'utf8');
  if (!after.startsWith(head)) throw new Error('the splice rewrote bytes it should not have — item.json was NOT preserved');
}

// ── main ─────────────────────────────────────────────────────────────────────────────

assertKeysExist();
assertBatchStillMaps();

if (args.has('--audit')) { auditRegistered(); process.exit(0); }

console.log(`self-check: ${assertReproducesRegistered()} registered cards reproduce from their own pt-BR text.\n`);

const missing = Object.keys(latam)
  .filter((id) => isCard(latam[id], id) && !items[id])
  .sort((a, b) => a - b);

const records = [];
const unplaceable = [];
for (const id of missing) {
  // The slot comes from `classify`, which reads all four spellings the client uses plus a
  // divine-pride lookup for the two cards whose text names none.
  const { compositionPos } = classify(id);
  if (compositionPos === undefined) { unplaceable.push(id); continue; }
  records.push([id, recordFor(id, compositionPos)]);
}

if (unplaceable.length) {
  console.error(`${unplaceable.length} card(s) name no slot this can route — see resolveSlot in card-catalog.mjs:`);
  for (const id of unplaceable) console.error(`  ${id} ${latam[id].name}`);
  process.exit(1);
}

const withScript = records.filter(([, r]) => Object.keys(r.script).length);
console.log(`${records.length} cards to register: ${withScript.length} carry a bonus the engine reads, ${records.length - withScript.length} are proc/utility only.`);

if (args.has('--check')) {
  for (const [id, rec] of withScript) console.log(`  ${id} ${rec.name}  ${JSON.stringify(rec.script)}`);
  process.exit(0);
}

append(records);
console.log(`\nwrote ${records.length} records into src/assets/demo/data/item.json`);
