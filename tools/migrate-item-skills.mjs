// ONE-TIME migration: rewrite item.json skill-reference keys from skill NAME to
// skill ID using the Skill Catalog. Done as a targeted text replacement so the
// file's key order and formatting are preserved (item.json is in build order, not
// numeric, so a JSON round-trip would reorder ~all 6.5k items).
//
//   "cd__Holy Light": [...]  ->  "cd__156": [...]
//   "Storm Gust": [...]      ->  "89": [...]
//
//   node tools/migrate-item-skills.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const itemPath = resolve(root, 'src/assets/demo/data/item.json');
const raw = readFileSync(itemPath, 'utf8');

// name -> id from the catalog (entries emit `id` first).
const metaSrc = readFileSync(resolve(root, 'src/app/skills/skill-meta.generated.ts'), 'utf8');
const nameToId = {};
for (const m of metaSrc.matchAll(/^\s*"((?:[^"\\]|\\.)*)":\s*\{\s*id:\s*(\d+)/gm)) {
  nameToId[JSON.parse(`"${m[1]}"`)] = Number(m[2]);
}

const prefixes = ['fix_vct__', 'vct__', 'chance__', 'fctPercent__', 'fct__', 'acd__', 'cd__'];

// Replace only JSON keys (a string immediately followed by `:`). Stat/field/item-id
// keys aren't catalog skill names, so they're left untouched.
let converted = 0;
const out = raw.replace(/"((?:[^"\\]|\\.)*)":/g, (full, key) => {
  // strip any stack of prefixes (e.g. chance__cd__<skill>), keeping them to reassemble
  let prefix = '';
  let base = key;
  for (let again = true; again; ) {
    again = false;
    for (const p of prefixes) {
      if (base.startsWith(p)) { prefix += p; base = base.slice(p.length); again = true; break; }
    }
  }
  const id = nameToId[base];
  if (id === undefined) return full;
  converted++;
  return `"${prefix}${id}":`;
});

// Safety checks before writing.
const before = JSON.parse(raw);
const after = JSON.parse(out); // throws if the replacement produced invalid JSON
const beforeCount = Object.keys(before).length;
const afterCount = Object.keys(after).length;
if (beforeCount !== afterCount) {
  console.error(`ABORT: item count changed ${beforeCount} -> ${afterCount} (duplicate-key collision?)`);
  process.exit(1);
}
// no remaining skill-NAME keys anywhere in any script
let leftover = 0;
for (const it of Object.values(after)) {
  if (!it.script) continue;
  for (const k of Object.keys(it.script)) {
    if (k === 'autoCast') continue;
    let base = k;
    for (const p of prefixes) if (k.startsWith(p)) { base = k.slice(p.length); break; }
    if (nameToId[base] !== undefined) leftover++;
  }
}
if (leftover > 0) {
  console.error(`ABORT: ${leftover} skill-name keys still present after migration`);
  process.exit(1);
}

writeFileSync(itemPath, out);
console.log(`keys converted: ${converted}`);
console.log(`items: ${afterCount} (unchanged), leftover skill-name keys: ${leftover}`);
