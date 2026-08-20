#!/usr/bin/env node
// Rewrite every card's `EQUIP[<nome>]` combo condition as `EQUIP_ID[<id>]`.
//
//   node tools/migrate-card-combos.mjs --check   # report, write nothing
//   node tools/migrate-card-combos.mjs           # rewrite item.json in place
//
// ── Why ─────────────────────────────────────────────────────────────────────────────
//
// `EQUIP[<nome>]` matches a combo partner by its English display name (docs/item-json.md
// §5, "⚠️ Legado"). It breaks two ways: a pt-BR rename or an `[Apoio]`-style suffix stops
// the bonus paying, and the client re-issues items under new ids KEEPING the old English
// name, so one clause silently fires for every generation of that item.
//
// The second half is why this is a rewrite and not a search-and-replace. A name that
// answers for two ids has to become `EQUIP_ID[a||b]`; converting it to a single id drops
// the other generation, and nothing errors — the set just stops paying for whoever holds
// it. In this family that is exactly one name, "Wolf Lugenburg Card" (27390 and 300128),
// on two records.
//
// ── The rewrite ─────────────────────────────────────────────────────────────────────
//
// Purely mechanical, and only the partner token changes:
//
//   EQUIP[A&&B||C]<rest>  ->  EQUIP_ID[<ids of A>&&<ids of B>||<ids of C>]<rest>
//
// Each name becomes every id whose `matchName` equals it — `enName ?? name` with a trailing
// "[N]" stripped, which is what calculator.ts matches on, and which over the raw item.json
// is the same string the app sees (the LATAM overlay sets `enName` to the `name` it
// replaces). The `&&`/`||` structure, the conditions after the token and the value are
// carried through byte for byte.
//
// A name that resolves to nothing aborts the run rather than being dropped: a clause whose
// partner the database does not hold is a bug to look at, not something to migrate. There
// are none as this is written.
//
// ── The evidence ────────────────────────────────────────────────────────────────────
//
// src/app/core/__tests__/card-set-migration.spec.ts holds the before/after: 251 cards, 540
// measurements of what each card grants alone and with each line-up that satisfies a
// clause, plus a structural check that every clause still names the same ids under the same
// bonus key with the same tail. It was recorded on the name form, before this ran.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DATA, latam, items } from './card-catalog.mjs';

const ITEM_JSON = join(DATA, 'item.json');
const args = new Set(process.argv.slice(2));

/** calculator.matchName: the name a script condition matches an item by. */
const matchName = (item) => String(item.enName ?? item.name).replace(/\[\d]$/, '').trim();

const idsByName = new Map();
for (const [id, item] of Object.entries(items)) {
  const name = matchName(item);
  if (!idsByName.has(name)) idsByName.set(name, []);
  idsByName.get(name).push(Number(id));
}

const isCardRecord = (item) => item.itemTypeId === 6 && item.itemSubTypeId === 0;

/** `EQUIP[A&&B]` -> `EQUIP_ID[<a>&&<b>]`, or null with a reason when a name resolves to nothing. */
function rewriteToken(condition) {
  const groups = [];
  for (const group of condition.split('&&')) {
    const ids = [];
    for (const name of group.split('||')) {
      const found = idsByName.get(name.trim());
      if (!found) return { error: `"${name.trim()}" matches no item.json record` };
      ids.push(...found);
    }
    groups.push([...new Set(ids)].sort((a, b) => a - b).join('||'));
  }
  return { token: `EQUIP_ID[${groups.join('&&')}]` };
}

const rewrites = [];
const errors = [];
const generations = [];

for (const [id, item] of Object.entries(items)) {
  if (!isCardRecord(item)) continue;

  for (const [key, values] of Object.entries(item.script ?? {})) {
    values.forEach((entry, index) => {
      const match = /EQUIP\[([^\]]+)]/.exec(entry);
      if (!match) return;

      const { token, error } = rewriteToken(match[1]);
      if (error) { errors.push(`${id} ${latam[id]?.name ?? item.name} ${key}: ${error}`); return; }

      const after = entry.replace(match[0], token);
      if (token.includes('||')) generations.push(`${id} ${latam[id]?.name ?? item.name} ${key}: ${entry} -> ${after}`);
      rewrites.push({ id, key, index, before: entry, after });
    });
  }
}

if (errors.length) {
  console.error(`${errors.length} clause(s) name a partner the database does not hold:`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}

const records = new Set(rewrites.map((r) => r.id));
console.log(`${rewrites.length} clause(s) on ${records.size} card record(s) to rewrite.`);
console.log(`\n${generations.length} of them name a partner the client re-issued, and keep every generation:`);
for (const g of generations) console.log('  ' + g);

if (args.has('--check')) process.exit(0);

/**
 * Rewrite by byte span, never by re-serialising: item.json's keys are not in numeric order
 * and JSON.parse/stringify reorders every integer-like one, which would bury 400-odd
 * one-token changes in a diff of 10427 records.
 *
 * Each entry is a `"<value>"` line of its own inside the script object, so the splice is
 * the quoted string — found within the record it belongs to, so an identical entry on
 * another card cannot be hit by accident.
 */
let text = readFileSync(ITEM_JSON, 'utf8');
const NL = text.includes('\r\n') ? '\r\n' : '\n';
let done = 0;

for (const id of records) {
  const start = text.indexOf(`${NL}  "${id}": {`);
  if (start < 0) throw new Error(`${id} is not in item.json under its own key`);
  const end = text.indexOf(`${NL}  },`, start);
  let record = text.slice(start, end < 0 ? undefined : end);

  for (const { before, after } of rewrites.filter((r) => r.id === id)) {
    const quoted = JSON.stringify(before);
    if (!record.includes(quoted)) throw new Error(`${id}: could not find ${quoted} in its record`);
    record = record.replace(quoted, JSON.stringify(after));
    done++;
  }

  text = text.slice(0, start) + record + text.slice(end < 0 ? text.length : end);
}

writeFileSync(ITEM_JSON, text);
console.log(`\nrewrote ${done} clause(s) in src/assets/demo/data/item.json`);
