#!/usr/bin/env node
// Re-scan every LATAM description. Only complete, understood clauses are mapped;
// unknown gates and unresolved set partners stay in the report, never unconditional.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const clean = text => String(text ?? '').replace(/\^[a-f\d]{6}/gi, '').trim();
const norm = text => clean(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
const ELEMENT = { neutro: 'neutral', agua: 'water', terra: 'earth', fogo: 'fire', vento: 'wind', veneno: 'poison', sagrado: 'holy', sombrio: 'dark', fantasma: 'ghost', maldito: 'undead' };
const RACE = { amorfo: 'formless', 'morto-vivo': 'undead', bruto: 'brute', planta: 'plant', inseto: 'insect', peixe: 'fish', demonio: 'demon', humanoide: 'demihuman', anjo: 'angel', dragao: 'dragon', humano: 'player_human', doram: 'player_doram' };
const SIZE = { pequeno: 's', medio: 'm', grande: 'l' };
const CLASS = { normais: 'normal', normal: 'normal', chefes: 'boss', chefe: 'boss' };
const SLOT = { escudo: 'shield', capa: 'garment', armadura: 'armor', vestimenta: 'armor', calcado: 'boot', bota: 'boot', botas: 'boot', elmo: 'headUpper', arma: 'weapon' };
const STAT = { for: 'str', agi: 'agi', vit: 'vit', int: 'int', des: 'dex', sor: 'luk' };
const candidate = line => /(?:resistencia|reduz\w*.*dano|aumenta.*dano recebido)/.test(norm(line)) && !/reflet|efeitos negativos/.test(norm(line));
const number = text => Number(text.replace(/\./g, '').replace(',', '.').replace(/\s/g, ''));

function members(text, table) {
  return text.split(/,\s*|\s+e\s+/).map(part => table[part.trim()]);
}

/** Returns the complete bonus keys and signed magnitude for an effect line. */
export function mapDefenderLine(line, excludedRaces = []) {
  const text = norm(line).replace(/\s*\(total:[^)]+\)\.?$/, '').replace(/\.+$/, '').replace(/ adicional$/, '').trim();
  const signed = /([+-]\s*\d[\d.,]*)%/.exec(text);
  let value = signed ? number(signed[1]) : null;
  let keys;
  const suffix = /^resistencia fisica\b|resistencia a danos fisicos de/.test(text) ? '_physical'
    : /^resistencia magica\b/.test(text) ? '_magical' : '';
  const base = text.replace(/^resistencia (?:fisica|magica)\b/, 'resistencia')
    .replace(/a (?:ataques de )?(?:monstros|oponentes) (?:da raca|das racas) /, 'a raca ')
    .replace('a dano de propriedade ', 'a propriedade ')
    .replace('oponentes da propriedade ', 'oponentes de propriedade ')
    .replace('oponenes de propriedade ', 'oponentes de propriedade ');
  let m;
  if (/^resistencia a danos? fisicos? (?:a|à) distancia\b/.test(text)) keys = ['dmg_taken_range'];
  else if (/^resistencia (?:a danos fisicos|fisica) [+-]/.test(text)) keys = ['dmg_taken_physical'];
  else if (/^resistencia (?:a danos magicos|magica) [+-]/.test(text)) keys = ['dmg_taken_magical'];
  else if (/^resistencia fisica e magica [+-]/.test(text)) keys = ['dmg_taken_all'];
  else if ((m = /^resistencia (?:a |as |aos |ao |a ataques de )?(?:monstros (?:da raca |das racas )?|oponentes (?:da raca |das racas )?)?(?:raca |racas )(.+?) [+-]/.exec(base))) {
    keys = members(m[1], RACE).map(race => race && `subrace_${race}${suffix}`);
  } else if (/^resistencia a (?:todas as racas(?: de monstros)?|monstros de todas as racas) [+-]/.test(base)) keys = [`subrace_all${suffix}`];
  else if (/^resistencia a (?:todas as )?outras racas [+-]/.test(base) && excludedRaces.length) {
    keys = Object.values(RACE).filter(race => !excludedRaces.includes(race)).map(race => `subrace_${race}${suffix}`);
  }
  else if ((m = /^resistencia (?:a |as |aos )?(?:oponentes de |danos fisicos de )?(?:propriedade |propriedades )(.+?) [+-]/.exec(base))) {
    keys = members(m[1], ELEMENT).map(element => element && `subele_${element}${suffix}`);
  } else if ((m = /^resistencia a (?:oponentes de |danos fisicos de )?todas as propriedades(?:, exceto (\w+))? [+-]/.exec(base))) {
    keys = m[1] ? Object.values(ELEMENT).filter(element => element !== ELEMENT[m[1]]).map(element => `subele_${element}${suffix}`) : [`subele_all${suffix}`];
    if (m[1] && !ELEMENT[m[1]]) return null;
  } else if ((m = /^resistencia (?:a |ao |aos )?(?:oponentes de )?(?:tamanho |tamanhos )(.+?) [+-]/.exec(base))) {
    keys = members(m[1], SIZE).map(size => size && `subsize_${size}${suffix}`);
  } else if (/^resistencia a (?:oponentes de )?todos os tamanhos [+-]/.test(base)) keys = [`subsize_all${suffix}`];
  else if ((m = /^resistencia a (?:(?:monstros|oponentes) )?(normais(?: e chefes)?|chefes) [+-]/.exec(base))) {
    keys = m[1] === 'normais e chefes' ? ['subclass_all'] : members(m[1], CLASS).map(type => type && `subclass_${type}`);
  } else if ((m = /^reduz em (\d[\d.,]*)% o dano (?:causado|casado|recebido) por monstros (?:da raca|do tipo) ([\w-]+)$/.exec(base))) {
    value = number(m[1]); keys = [`subrace_${RACE[m[2]]}`];
  } else if ((m = /^aumenta em (\d[\d.,]*)% o dano recebido por ataques de propriedade (\w+)$/.exec(base))) {
    value = -number(m[1]); keys = [`subele_${ELEMENT[m[2]]}`];
  }
  if (value == null || !keys?.length || keys.some(key => !key || /undefined/.test(key))) return null;
  // Nothing after the numeric effect may secretly gate it on a proc/refine/map.
  if (signed && !/^[.\s]*$/.test(text.slice(signed.index + signed[0].length))) return null;
  return { keys, value };
}

export function armorElementOf(description) {
  let conditional = false;
  for (const line of clean(description).split('\n')) {
    if (/^-{3,}/.test(line)) { conditional = false; continue; }
    const text = norm(line);
    const match = /^propriedade:\s*([\w-]+)/.exec(text) ?? (!conditional
      ? /^encanta (?:a armadura|a vestimenta) com (?:a )?propriedade ([\w-]+)/.exec(text) : null);
    if (match && ELEMENT[match[1]]) {
      const element = ELEMENT[match[1]];
      return element[0].toUpperCase() + element.slice(1);
    }
    if (text.endsWith(':') || /^conjunto\b|^ao |^quando |^durante /.test(text)) conditional = true;
  }
  return null;
}

function gate(line, previous) {
  const text = norm(line);
  let m;
  if ((m = /^refino \+(\d+) ou mais:$/.exec(text))) return { threshold: Number(m[1]) };
  if ((m = /^a cada (?:(\d+) )?refinos?(?: (?:da|do) (\w+))?:$/.exec(text))) {
    if (m[2] && !SLOT[m[2]]) return null;
    return { step: Number(m[1] ?? 1), slot: m[2] && SLOT[m[2]] };
  }
  if ((m = /^(\w+) com refino \+(\d+)(?: ou mais)?:$/.exec(text)) && SLOT[m[1]]) return { threshold: Number(m[2]), slot: SLOT[m[1]] };
  if ((m = /^(for|agi|vit|int|des|sor) base (\d+) ou mais:$/.exec(text))) return { ...previous, stat: `${STAT[m[1]]}:${m[2]}` };
  if ((m = /^a cada (\d+) de (for|agi|vit|int|des|sor) base:$/.exec(text))) return { statStep: `${STAT[m[2]]}:${m[1]}` };
  return null;
}

const canonical = entry => entry.replace(/EQUIP_ID\[([\d&]+)\]/, (_, ids) => `EQUIP_ID[${ids.split('&&').sort((a, b) => Number(a) - Number(b)).join('&&')}]`)
  .replace(/XREFINEX\[(\w+==\d+)\]/g, 'REFINE[$1]')
  .replace(/(EQUIP_ID\[[^\]]+\])===(?=[+-]?\d)/, '$1');
const sorted = entries => entries.map(canonical).sort();

export function auditDefenderBonuses(items, descriptions) {
  const names = new Map();
  for (const [id, item] of Object.entries(descriptions)) {
    const key = norm(item.name).replace(/\s*\[\d+\]$/, '');
    const ids = names.get(key) ?? []; ids.push(Number(id)); names.set(key, ids);
  }
  const partnerId = name => {
    const ids = names.get(norm(name).replace(/\s*\[\d+\]$/, '')) ?? [];
    const registered = ids.filter(id => items[id]);
    return registered.length === 1 ? registered[0] : ids.length === 1 ? ids[0] : null;
  };
  const report = { descriptionsScanned: Object.keys(descriptions).length, itemsScanned: Object.keys(items).length,
    candidates: [], changes: [], armorChanges: [], unresolved: [], conflicts: [] };
  for (const [id, localized] of Object.entries(descriptions)) {
    const armorElement = armorElementOf(localized.description);
    if (items[id] && armorElement && (items[id].itemSubTypeId === 513 || items[id].compositionPos === 16) && items[id].armorElement !== armorElement) {
      report.armorChanges.push({ id: Number(id), name: localized.name, armorElement });
    }
    const lines = clean(localized.description).split('\n').map(line => line.trim());
    if (!lines.some(candidate)) continue;
    const excludedRaces = [...new Set(lines.flatMap(line => {
      const effect = mapDefenderLine(line);
      return effect?.keys.filter(key => key.startsWith('subrace_')).map(key => key.slice(8).replace(/_(physical|magical)$/, '')) ?? [];
    }))].filter(race => race !== 'all');
    const expected = {};
    let condition = {}, setPartners = [], inSet = false, blocked = '', unsupported = false;
    const unresolved = (line, reason) => { unsupported = true; report.unresolved.push({ id: Number(id), name: localized.name, line, reason }); };
    for (const line of lines) {
      if (/^-{3,}/.test(line)) { condition = {}; setPartners = []; inSet = false; blocked = ''; continue; }
      if (/^Conjunto\b/i.test(line)) { condition = {}; setPartners = []; inSet = true; blocked = ''; continue; }
      if (/^(Tipo|Equipa em|Classes|Peso|DEF|Nivel necessario):/i.test(norm(line))) break;
      if (inSet && !candidate(line) && !line.endsWith(':') && !/[+%-]\s*\d/.test(line) && line &&
        !/^(habilita|torna|a conjuracao|exibe|permite|indestrutivel)/.test(norm(line))) {
        const name = line.replace(/^\[|\]$/g, '');
        const partner = partnerId(name);
        if (!partner || /\bou\b/.test(norm(name))) blocked = `Parceiro de conjunto não resolvido: ${name}`;
        else setPartners.push(partner);
        continue;
      }
      if (line.endsWith(':')) { condition = gate(line, condition); if (!condition) blocked = `Condição não mapeada: ${line}`; continue; }
      if (!candidate(line)) continue;
      report.candidates.push({ id: Number(id), name: localized.name, line });
      if (!items[id]) { unresolved(line, 'Item fora do banco de cálculo'); continue; }
      if (blocked || !condition || (inSet && !setPartners.length)) { unresolved(line, blocked || 'Conjunto sem parceiros resolvidos'); continue; }
      const effect = mapDefenderLine(line, excludedRaces);
      if (!effect) { unresolved(line, 'Cláusula não mapeada (inclui efeitos negativos, grupos específicos e condições inline)'); continue; }
      const set = inSet ? `EQUIP_ID[${setPartners.join('&&')}]` : '';
      const conditional = condition.statStep ? `${condition.statStep}---`
        : condition.slot ? condition.step ? `REFINE[${condition.slot}==${condition.step}]---` : `XREFINEX[${condition.slot}==${condition.threshold}]===`
        : condition.step ? `${condition.step}---` : condition.threshold ? `${condition.threshold}===` : set || condition.stat ? '===' : '';
      const stat = condition.stat ? `${condition.stat}${condition.threshold || condition.step || condition.slot ? '&&' : ''}` : '';
      for (const key of effect.keys) (expected[key] ??= []).push(`${stat}${set}${conditional}${effect.value}`);
    }
    if (!items[id]) continue;
    const script = items[id].script ?? {};
    for (const [key, entries] of Object.entries(expected)) {
      const current = script[key];
      if (current && JSON.stringify(sorted(current)) === JSON.stringify(sorted(entries))) continue;
      // Complete descriptions can replace only their defensive keys. With an unknown
      // clause, never delete manually mapped contributions or add to an existing key.
      if (current && (unsupported || !sorted(current).every(entry => sorted(entries).includes(entry)))) {
        report.conflicts.push({ id: Number(id), key, current, expected: entries }); continue;
      }
      report.changes.push({ id: Number(id), name: localized.name, key, previous: current ?? [], entries });
    }
    // A channel-qualified clause replaces the legacy unqualified copy, rather
    // than applying twice physically and incorrectly reducing magical damage.
    for (const [key, entries] of Object.entries(expected)) {
      if (!/_(physical|magical)$/.test(key)) continue;
      const general = key.replace(/_(physical|magical)$/, '');
      if (expected[general] || !script[general]) continue;
      const remaining = script[general].filter(entry => !sorted(entries).includes(canonical(entry)));
      if (remaining.length !== script[general].length) report.changes.push({ id: Number(id), name: localized.name,
        key: general, previous: script[general], entries: remaining });
    }
  }
  return report;
}

/** Preserve database order and every unmodified record byte-for-byte. Numeric object
 * keys get sorted by JSON.stringify, which otherwise makes a whole-file diff. */
export function applyDefenderAudit(source, report) {
  const changes = new Set([...report.changes, ...report.armorChanges].map(change => String(change.id)));
  return source.replace(/^  "(\d+)": \{[\s\S]*?^  \}(?=,?\r?$)/gm, (block, id) => {
    if (!changes.has(id)) return block;
    const item = JSON.parse(`{${block}}`)[id];
    for (const change of report.changes.filter(change => String(change.id) === id)) {
      if (change.entries.length) (item.script ??= {})[change.key] = change.entries;
      else if (item.script) delete item.script[change.key];
    }
    for (const change of report.armorChanges.filter(change => String(change.id) === id)) item.armorElement = change.armorElement;
    return `  "${id}": ${JSON.stringify(item, null, 2).replace(/\n/g, '\n  ')}`;
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const itemPath = resolve(root, 'src/assets/demo/data/item.json');
  const source = readFileSync(itemPath, 'utf8');
  const items = JSON.parse(source);
  const descriptions = JSON.parse(readFileSync(resolve(root, 'src/assets/demo/data/latam-items.json'), 'utf8'));
  const report = auditDefenderBonuses(items, descriptions);
  const reportPath = process.argv.find(arg => arg.startsWith('--report='))?.slice(9) ?? '/tmp/defender-bonus-audit.json';
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  if (process.argv.includes('--apply')) {
    writeFileSync(itemPath, applyDefenderAudit(source, report));
  }
  console.log(JSON.stringify({ descriptionsScanned: report.descriptionsScanned, candidates: report.candidates.length,
    changedItems: new Set(report.changes.map(change => change.id)).size, changedKeys: report.changes.length,
    armorChanges: report.armorChanges.length, unresolved: report.unresolved.length, conflicts: report.conflicts.length, reportPath }));
}
