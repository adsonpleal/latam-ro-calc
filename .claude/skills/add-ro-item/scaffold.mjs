#!/usr/bin/env node
// Scaffold for adding LATAM items to the calculator's item.json.
// Given one or more item ids, prints — per id — the pt-BR name, aegisName,
// cleaned description (with its effect/combo lines isolated), the structural
// fields inferred from a same-type sibling already in item.json, and a
// ready-to-fill item.json record skeleton (script left empty). It does NOT
// guess the bonus script — that's the judgement step the SKILL.md walks through.
//
// Usage:  node .claude/skills/add-ro-item/scaffold.mjs <id> [<id> ...]

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DATA = resolve(ROOT, "src/assets/demo/data");

const itemJson = JSON.parse(readFileSync(resolve(DATA, "item.json"), "utf8"));
const items = Array.isArray(itemJson) ? itemJson : Object.values(itemJson);
const byId = new Map(items.map((it) => [it.id, it]));
const latam = JSON.parse(readFileSync(resolve(DATA, "latam-items.json"), "utf8"));

const clean = (s) => (s || "").replace(/\^[0-9a-fA-F]{6}/g, "");
const field = (desc, label) => {
  const m = clean(desc).match(new RegExp(label + ":\\s*([^\\n]+)"));
  return m ? m[1].trim() : null;
};
const fieldNum = (desc, label) => {
  const m = clean(desc).match(new RegExp(label + ":\\s*(\\d+)"));
  return m ? Number(m[1]) : null;
};

// Build a location -> most-common {itemTypeId, itemSubTypeId, usableClass}
// profile straight from item.json (data-driven, no guessing).
const locProfile = new Map();
{
  const tally = new Map();
  for (const it of items) {
    if (it.location == null) continue;
    const key = `${it.location}`;
    const sub = `${it.itemTypeId}|${it.itemSubTypeId}|${JSON.stringify(it.usableClass ?? ["all"])}`;
    const m = tally.get(key) ?? new Map();
    m.set(sub, (m.get(sub) ?? 0) + 1);
    tally.set(key, m);
  }
  for (const [loc, m] of tally) {
    const [best] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    const [itemTypeId, itemSubTypeId, usableClass] = best.split("|");
    locProfile.set(loc, { itemTypeId: Number(itemTypeId), itemSubTypeId: Number(itemSubTypeId), usableClass: JSON.parse(usableClass) });
  }
}

// Map the pt-BR "Equipa em" / "Tipo" footer to an item.json location string.
function ptToLocation(desc) {
  const eq = (field(desc, "Equipa em") || "").toLowerCase();
  if (eq) {
    if (/baixo/.test(eq)) return "Lower";
    if (/meio/.test(eq)) return "Middle";
    if (/cima|topo|alto/.test(eq)) return "Upper";
  }
  const tipo = (field(desc, "Tipo") || "").toLowerCase();
  if (/armadura/.test(tipo)) return "Armor";
  if (/capa|manto/.test(tipo)) return "Garment";
  if (/sapato|cal[cç]ado|bota/.test(tipo)) return "Shoes";
  if (/escudo/.test(tipo)) return "Shield";
  if (/acess[oó]rio/.test(tipo)) return "AccessoryRight"; // side ambiguous; verify
  if (/arma|espada|lan[cç]a|machado|adaga|arco|cajado|varinha|chicote|manopla|katar|revólver|rifle|instrumento/.test(tipo)) return "Weapon";
  return null;
}

function effectBlocks(desc) {
  // Split on separator lines (----), drop the leading flavor block and the
  // trailing footer block (the one carrying "Tipo:" / "Nível necessário:").
  const blocks = clean(desc)
    .split(/\n-{5,}\n?/)
    .map((b) => b.trim())
    .filter(Boolean);
  return blocks.filter((b, i) => i > 0 && !/Tipo:|N[ií]vel necess[aá]rio:/.test(b));
}

function scaffold(id) {
  const out = [`\n=== ${id} ===`];
  if (byId.has(id)) { out.push("ALREADY in item.json — skip (or update in place)."); return out.join("\n"); }
  const lt = latam[id];
  if (!lt) { out.push("NOT in latam-items.json — id unknown to the LATAM client. Cannot scaffold."); return out.join("\n"); }

  const desc = lt.description || "";
  const location = ptToLocation(desc);
  const prof = location ? locProfile.get(location) : null;
  const def = fieldNum(desc, "DEF");
  const weight = fieldNum(desc, "Peso");
  const reqLvl = fieldNum(desc, "N[ií]vel necess[aá]rio") ?? fieldNum(desc, "Nivel necessario");
  const slots = (lt.name.match(/\[(\d)\]\s*$/) || [])[1] ?? "0";

  out.push(`name (pt):   ${lt.name}`);
  out.push(`aegisName:   ${lt.aegisName ?? "(none)"}`);
  out.push(`Tipo/Slot:   ${field(desc, "Tipo")} / ${field(desc, "Equipa em") ?? "-"}`);
  out.push(`location:    ${location ?? "(could not infer — set by hand)"}${prof ? `  → itemTypeId=${prof.itemTypeId}, itemSubTypeId=${prof.itemSubTypeId}` : ""}`);
  if (location === "Weapon") out.push(`  ⚠ weapon: itemSubTypeId varies by weapon class — confirm against a same-class weapon in item.json.`);
  if (location === "AccessoryRight") out.push(`  ⚠ accessory side ambiguous (Right/Left) — pick per the replay's worn slot.`);
  out.push(`divine-pride: https://www.divine-pride.net/database/item/${id}   (combos / verify script)`);
  out.push(`\n--- EFFECT / COMBO LINES (map each to a bonus key per SKILL.md) ---`);
  for (const b of effectBlocks(desc)) out.push(b.split("\n").map((l) => "  " + l).join("\n"));

  const record = {
    id,
    aegisName: lt.aegisName ?? "",
    name: lt.name,
    unidName: lt.name,
    resName: "",
    description: "",
    slots: Number(slots),
    itemTypeId: prof?.itemTypeId ?? null,
    itemSubTypeId: prof?.itemSubTypeId ?? null,
    itemLevel: null,
    attack: null,
    defense: def,
    weight: weight,
    requiredLevel: reqLvl,
    location: location,
    compositionPos: null,
    usableClass: prof?.usableClass ?? ["all"],
    script: {},
  };
  out.push(`\n--- RECORD SKELETON (fill "script", then insert into item.json) ---`);
  out.push(JSON.stringify(record, null, 2));
  return out.join("\n");
}

const ids = process.argv.slice(2).map(Number).filter(Boolean);
if (!ids.length) {
  console.error("usage: node .claude/skills/add-ro-item/scaffold.mjs <id> [<id> ...]");
  process.exit(1);
}
for (const id of ids) console.log(scaffold(id));
