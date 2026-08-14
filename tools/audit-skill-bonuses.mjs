// Triage: items whose pt-BR description names a skill-damage, cooldown or cast bonus
// whose key is absent from their own `script`.
//
//   node tools/audit-skill-bonuses.mjs            every item
//   node tools/audit-skill-bonuses.mjs --combo    only those with a Conjunto block
//
// This is a candidate list, not a verdict. Two expected kinds of false positive:
//  - the bonus is declared on the partner's side of a set (docs/item-json.md §6 says to
//    register a combo only where the description declares it);
//  - the bracketed name is an autocast ("chance de autoconjurar [X]"), which the engine
//    models as a proc rather than a damage key.
// Read the description before acting on a row.
//
// Written for the 13/08/2026 sweep of the "de Cinzas" helm family, where every helm had
// its flat set leg registered and its "A cada N refinos da arma: Dano de [X] +Y%" steps
// missing. Those eight are fixed; the rest of the list is untriaged.
import fs from 'fs';

const items = JSON.parse(fs.readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(fs.readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const meta = fs.readFileSync('src/app/skills/skill-meta.generated.ts', 'utf8');

// "Counter Slash": { id: 2029, label: "Retaliação", ...
const idByLabel = new Map();
const enByLabel = new Map();
for (const m of meta.matchAll(/"([^"]+)":\s*\{\s*id:\s*(\d+),\s*label:\s*"([^"]+)"/g)) {
  idByLabel.set(m[3], m[2]);
  enByLabel.set(m[3], m[1]);
}

const plain = (d) => (d || '').replace(/\^[0-9a-fA-F]{6}/g, '');

// Every key the script mentions, including prefixed ones (cd__2449 -> 2449).
const keysOf = (script) => {
  const out = new Set();
  for (const k of Object.keys(script || {})) {
    out.add(k);
    const tail = k.split('__').pop();
    if (tail) out.add(tail);
  }
  return out;
};

const rows = [];
for (const [id, entry] of Object.entries(latam)) {
  const item = items[id];
  if (!item) continue;
  const desc = plain(entry.description);
  if (!desc) continue;

  const keys = keysOf(item.script);
  const missing = new Map(); // label -> kind

  // "Dano de [Onda Psíquica] e [Pó de Diamante] +5%"  /  "Recarga de [X] -1,5 segundos"
  for (const m of desc.matchAll(/(Dano|Recarga|Conjuração variável|Pós-conjuração) de ((?:\[[^\]]+\](?:\s*(?:,|e|ou)\s*)?)+)/g)) {
    const kind = m[1];
    for (const s of m[2].matchAll(/\[([^\]]+)\]/g)) {
      const label = s[1].trim();
      const skillId = idByLabel.get(label);
      if (!skillId) continue; // not a skill we model, or an item name in brackets
      // The engine still resolves legacy keys by the English skill name, so a script
      // keyed that way is registered even though the id is absent.
      if (keys.has(skillId) || keys.has(enByLabel.get(label))) continue;
      missing.set(label, `${kind} de [${label}] -> ${skillId}`);
    }
  }

  if (missing.size) {
    rows.push({
      id,
      name: entry.name,
      hasCombo: /Conjunto/.test(desc),
      perRefine: /A cada \d+ refinos? da arma/.test(desc),
      missing: [...missing.values()],
    });
  }
}

const arg = process.argv[2];
const filtered = arg === '--combo' ? rows.filter((r) => r.hasCombo) : rows;
console.log(`items with at least one unregistered skill bonus: ${filtered.length}\n`);
for (const r of filtered) {
  console.log(`${r.id}\t${r.name}${r.perRefine ? '  [per-weapon-refine]' : ''}`);
  for (const m of r.missing) console.log(`    ${m}`);
}
