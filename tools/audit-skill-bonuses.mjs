// Triage: items with a Conjunto block whose pt-BR description names a skill-damage,
// cooldown or cast bonus that is absent from their own `script`.
//
//   node tools/audit-skill-bonuses.mjs
//
// Every row is one (item, skill) pair, split two ways:
//
//  COVERED  another item already registers that skill under a condition naming this one,
//           so the set fires from the partner's side and adding it here would double it.
//           docs/item-json.md §6 says to declare a combo once; which side owns it is not
//           consistent across the file, hence this check.
//  MISSING  nobody registers it — a real gap.
//
// Only "Dano/Recarga/Conjuração variável/Pós-conjuração de [X]" count as claims. Lines
// like "Habilita [X] nv.N" and "chance de autoconjurar [X]" are deliberately not matched:
// the first grants a skill and the second is a proc, neither being a damage key.
//
// Written for the 13/08/2026 sweep. Everything it reported that was self-contained (no
// partner needed) has been fixed; what is left needs a partner id resolved by hand.
import fs from 'fs';

const items = JSON.parse(fs.readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(fs.readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const meta = fs.readFileSync('src/app/skills/skill-meta.generated.ts', 'utf8');

const idByLabel = new Map(), enByLabel = new Map();
for (const m of meta.matchAll(/"([^"]+)":\s*\{\s*id:\s*(\d+),\s*label:\s*"([^"]+)"/g)) {
  idByLabel.set(m[3], m[2]); enByLabel.set(m[3], m[1]);
}
const plain = (d) => (d || '').replace(/\^[0-9a-fA-F]{6}/g, '');
const keysOf = (s) => { const o = new Set(); for (const k of Object.keys(s || {})) { o.add(k); o.add(k.split('__').pop()); } return o; };

// skillId -> [{ownerId, entries}] for every item that registers it (any prefix).
const registrars = new Map();
for (const [id, it] of Object.entries(items)) {
  for (const [k, v] of Object.entries(it.script || {})) {
    const tail = k.split('__').pop();
    if (!/^\d+$/.test(tail)) continue;
    if (!registrars.has(tail)) registrars.set(tail, []);
    registrars.get(tail).push({ ownerId: id, entries: (v || []).join(' | ') });
  }
}

/** Does some other item register `skillId` under a condition naming this one? */
function coveredByPartner(id, skillId) {
  const me = items[id];
  // calculator.ts matches EQUIP[] on the name with the slot suffix stripped.
  const enName = String(me.name || '').replace(/\[\d]$/, '').trim();
  for (const r of registrars.get(skillId) || []) {
    if (r.ownerId === id) continue;
    if (r.entries.includes(`EQUIP_ID[`) && new RegExp(`EQUIP_ID\\[[^\\]]*\\b${id}\\b`).test(r.entries)) {
      return `${r.ownerId} ${latam[r.ownerId]?.name ?? ''}`;
    }
    if (enName && r.entries.includes(`EQUIP[`) && r.entries.includes(enName)) {
      return `${r.ownerId} ${latam[r.ownerId]?.name ?? ''}`;
    }
  }
  return null;
}

const rows = [];
for (const [id, entry] of Object.entries(latam)) {
  const it = items[id];
  if (!it) continue;
  const desc = plain(entry.description);
  if (!desc || !/Conjunto/.test(desc)) continue;
  const keys = keysOf(it.script);

  for (const m of desc.matchAll(/(Dano|Recarga|Conjuração variável|Pós-conjuração) de ((?:\[[^\]]+\](?:\s*(?:,|e|ou)\s*)?)+)/g)) {
    for (const s of m[2].matchAll(/\[([^\]]+)\]/g)) {
      const label = s[1].trim();
      const skillId = idByLabel.get(label);
      if (!skillId) continue;
      if (keys.has(skillId) || keys.has(enByLabel.get(label))) continue;

      const partner = coveredByPartner(id, skillId);
      rows.push({
        id, name: entry.name, label, skillId, kind: m[1],
        verdict: partner ? 'COVERED' : 'MISSING',
        note: partner || '',
      });
    }
  }
}

const byVerdict = { COVERED: [], MISSING: [] };
for (const r of rows) byVerdict[r.verdict].push(r);

for (const v of ['COVERED', 'MISSING']) {
  console.log(`\n===== ${v} (${byVerdict[v].length} bonuses, ${new Set(byVerdict[v].map(r => r.id)).size} items) =====`);
  let last = '';
  for (const r of byVerdict[v]) {
    if (r.id !== last) { console.log(`${r.id}\t${r.name}`); last = r.id; }
    console.log(`    ${r.kind} de [${r.label}] -> ${r.skillId}${r.note ? '   <= ' + r.note : ''}`);
  }
}
