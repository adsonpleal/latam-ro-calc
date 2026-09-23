#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'src/assets/demo/data');
const out = process.argv[2] ?? resolve(source, 'auto-cast-audit.json');
const items = JSON.parse(readFileSync(resolve(source, 'item.json'), 'utf8'));
const latam = JSON.parse(readFileSync(resolve(source, 'latam-items.json'), 'utf8'));
const skillMeta = readFileSync(resolve(root, 'src/app/skills/skill-meta.generated.ts'), 'utf8');
const skillNamesById = new Map(
  [...skillMeta.matchAll(/"([^"]+)":\s*\{\s*id:\s*(\d+),\s*label:\s*"([^"]+)"/g)]
    .map((match) => [Number(match[2]), [match[1], match[3]]]),
);
const clean = (value) => (value ?? '').replace(/\^[0-9a-f]{6}/gi, '').replace(/\r/g, '');
const triggerOf = (text) => {
  if (/ao receber (?:danos?|ataques?)|ao sofrer danos?/i.test(text)) return 'damage-received';
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
const executableAutoCastsOf = (item) => Array.isArray(item?.script?.autoCast) ? item.script.autoCast : [];
const pendingAutoCastsOf = (item) => Array.isArray(item?.script?.autoCastPending) ? item.script.autoCastPending : [];
// Luxanima is a consumable class state, resolved by RuneKnight rather than equip scripts.
const classOwnedAutoCastItems = new Set([22540]);
// Manually reviewed against LATAM item text. These casts apply statuses, buffs,
// heals, utility skills, or skill disruption; none deals direct damage to the target.
// Keep the ids explicit so a newly introduced item stays pending for review.
const reviewedNonDamageItems = new Set([
  1138, 1176, 1187, 1268, 1269, 1270, 1271, 1295, 1297, 1310, 1376, 1382,
  1383, 1483, 1541, 1562, 1818, 1819, 1820, 1821, 1823, 1825, 1919, 1973,
  1985, 2680, 2728, 2990, 4209, 4237, 4238, 4246, 4248, 4283, 4332, 4341,
  4343, 4348, 4384, 4395, 4407, 4603, 4604, 4630, 4632, 4656, 5116, 5340,
  5498, 5671, 12796, 13028, 13039, 13042, 13106, 13190, 13195, 13293,
  15095, 15098, 18111, 18914, 19084, 19146, 19150, 19192, 25175,
  27020, 300182, 420820, 450597, 480683,
]);
const reviewedNonDamageSkills = new Set([
  'Petrificar', 'Diminuir Agilidade', 'Dedicação', 'Ferimento Mortal',
  'Terror Draconiano', 'Remoção Total', 'Sangria', 'Signum Crucis', 'Bênção',
  'Encantar com Chama', 'Encantar com Geada', 'Encantar com Ventania',
  'Encantar com Terremoto', 'Zen', 'Invocar Esfera Espiritual',
  'Toque de Insanidade', 'Som do Silêncio', 'Canto da Sereia',
  'Sentido Sobrenatural', 'Renovatio', 'Piada Infame', 'Impositio Manus',
  'Lex Aeterna', 'Manejo Perfeito', 'Remover Arma', 'Adrenalina Pura',
  'Remover Armadura', 'Desconcentrar', 'Desencantar', 'Espírito dos Amaldiçoados',
  'Sussurro de Morfeu', 'Furacão', 'Provocar', 'Angelus', 'Ferimento Crítico',
  'Concentrar', 'Conjuração Lenta', 'Lex Divina', 'Cara ou Coroa',
  'Kyrie Eleison', 'Prisão de Teia', 'Pântano dos Mortos',
  'Amplificação Mística', 'Escudo Mágico', 'Telecinesia', 'Vulcão',
  'Dilúvio', 'Drenar SP', 'Martelo de Thor', 'Vituperatum',
]);
const clauses = [];
for (const [id, entry] of Object.entries(latam)) {
  if (!items[id]) continue;
  const itemId = Number(id);
  let clauseIndex = 0;
  const executableAutoCasts = executableAutoCastsOf(items[id]);
  const pendingAutoCasts = pendingAutoCastsOf(items[id]);
  const description = clean(entry.description);
  const chunks = description.split(/(?:\n\s*-{3,}\s*\n|\n(?=[A-ZÀ-Ú][^\n]{0,60}:))/);
  for (const chunk of chunks) {
    if (!/auto.?conjur/i.test(chunk)) continue;
    const trigger = triggerOf(chunk);
    const baseDisposition = dispositionOf(chunk, trigger);
    const matchedRules = executableAutoCasts.filter((rule) => {
      const names = skillNamesById.get(rule.skillId) ?? [];
      return names.some((name) => chunk.includes(name));
    });
    const matchedPending = pendingAutoCasts.filter((rule) => chunk.includes(`[${rule.skillName}]`));
    const firstCastSkill = chunk.match(/auto.?conjur(?:ar|ação)[\s\S]*?\[([^\]]+)]/i)?.[1];
    const isConditionFragment = executableAutoCasts.length > 0
      && matchedRules.length === 0
      && !/\[[^\]]+\]/.test(chunk)
      && /chance de autoconjuração/i.test(chunk);
    clauses.push({
      key: `item-${id}-clause-${++clauseIndex}`,
      itemId, itemName: entry.name, raw: chunk.trim(), trigger,
      disposition: matchedRules.length
        ? 'verified-direct-damage'
        : classOwnedAutoCastItems.has(itemId) && chunk.includes('[Explosão Rúnica]')
          ? 'verified-class-effect'
        : matchedPending.length ? 'pending-model'
        : itemId === 1186 || itemId === 15090 ? 'reviewed-excluded'
        : itemId === 4172 ? 'reviewed-disabled'
        : reviewedNonDamageItems.has(itemId) && reviewedNonDamageSkills.has(firstCastSkill)
          ? 'reviewed-non-damaging'
        : isConditionFragment ? 'verified-condition' : baseDisposition,
      ...(matchedRules.length ? { executableRuleCount: matchedRules.length } : {}),
      ...(matchedPending.length ? { pending: matchedPending.map((rule) => ({ skillName: rule.skillName, reason: rule.reason })) } : {}),
      ...(executableAutoCasts.length ? { itemRuleCount: executableAutoCasts.length } : {}),
    });
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), clauses }, null, 2) + '\n');
console.log(`${clauses.length} clauses -> ${out}`);
