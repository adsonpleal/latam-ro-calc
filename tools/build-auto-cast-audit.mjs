#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'src/assets/demo/data');
const out = process.argv[2] ?? resolve(source, 'auto-cast-audit.json');
const items = JSON.parse(readFileSync(resolve(source, 'item.json'), 'utf8'));
const latam = JSON.parse(readFileSync(resolve(source, 'latam-items.json'), 'utf8'));
const clean = (value) => (value ?? '').replace(/\^[0-9a-f]{6}/gi, '').replace(/\r/g, '');
const triggerOf = (text) => {
  if (/ao receber danos?|ao sofrer danos?/i.test(text)) return 'damage-received';
  if (/ao usar (?:a )?habilidade|ao realizar ataques? mágicos?/i.test(text)) return 'magic-or-skill';
  if (/corpo a corpo/i.test(text)) return 'melee-physical';
  if (/à distância/i.test(text)) return 'ranged-physical';
  if (/ataques? físicos?|ao atacar/i.test(text)) return 'physical';
  return 'unknown';
};
const dispositionOf = (text, trigger) => {
  if (trigger !== 'physical' && trigger !== 'melee-physical' && trigger !== 'ranged-physical') return 'wrong-trigger';
  if (!/%\s*(?:de\s*)?(?:chance|probabilidade)/i.test(text)) return 'ambiguous';
  if (/regenera|cura|aumenta|reduz|ativa um \[?efeito|status|transforma/i.test(text)) return 'non-damaging';
  return 'pending-formula';
};
const clauses = [];
for (const [id, entry] of Object.entries(latam)) {
  if (!items[id]) continue;
  const description = clean(entry.description);
  const chunks = description.split(/(?:\n\s*-{3,}\s*\n|\n(?=[A-ZÀ-Ú][^\n]{0,60}:))/);
  for (const chunk of chunks) {
    if (!/auto.?conjur/i.test(chunk)) continue;
    const trigger = triggerOf(chunk);
    clauses.push({
      key: `item-${id}-clause-${clauses.filter((x) => x.itemId === Number(id)).length + 1}`,
      itemId: Number(id), itemName: entry.name, raw: chunk.trim(), trigger,
      disposition: dispositionOf(chunk, trigger),
    });
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), clauses }, null, 2) + '\n');
console.log(`${clauses.length} clauses -> ${out}`);
