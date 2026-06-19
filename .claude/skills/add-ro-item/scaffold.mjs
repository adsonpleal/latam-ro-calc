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

// Authoritative slot -> item.json fields. The calc routes the equip dropdowns by
// itemTypeId + itemSubTypeId (see ro-calculator.component setItemDropdownList):
// NORMAL gear is itemTypeId 2 (ARMOR) with the ItemSubTypeId enum values; COSTUME
// gear is itemTypeId 9 with 519-522. Headgear also needs `location`
// (Upper/Middle/Lower) since all head slots share itemSubTypeId 512.
// (The location-tagged itemSubTypeId 526-530 items in item.json are SHADOW gear —
// do not copy those for normal equipment.)
const SLOT_FIELDS = {
  Upper:    { itemTypeId: 2, itemSubTypeId: 512, location: "Upper" },
  Middle:   { itemTypeId: 2, itemSubTypeId: 512, location: "Middle" },
  Lower:    { itemTypeId: 2, itemSubTypeId: 512, location: "Lower" },
  Armor:    { itemTypeId: 2, itemSubTypeId: 513, location: "Armor" },
  Garment:  { itemTypeId: 2, itemSubTypeId: 515, location: "Garment" },
  Shoes:    { itemTypeId: 2, itemSubTypeId: 516, location: "Shoes" },
  Shield:   { itemTypeId: 2, itemSubTypeId: 514, location: "Shield" },
  Accessory:{ itemTypeId: 2, itemSubTypeId: 517, location: "Accessory" },
  Weapon:   null, // weapon: itemTypeId 1; itemSubTypeId = weapon class — copy from a same-class weapon
  CostumeUpper:   { itemTypeId: 9, itemSubTypeId: 519, location: "Upper" },
  CostumeMiddle:  { itemTypeId: 9, itemSubTypeId: 520, location: "Middle" },
  CostumeLower:   { itemTypeId: 9, itemSubTypeId: 521, location: "Lower" },
  CostumeGarment: { itemTypeId: 9, itemSubTypeId: 522, location: "Garment" },
};

// Map the pt-BR footer (Tipo / Equipa em) + name to a slot key.
function ptToSlot(desc, name) {
  const tipo = (field(desc, "Tipo") || "").toLowerCase();
  const eq = (field(desc, "Equipa em") || "").toLowerCase();
  // Costume / vanity: Tipo "Visual"/"Fantasia" or a "[Visual]" name. A costume can
  // span several head slots ("Topo, Meio e Baixo") — use the topmost present.
  if (/visual|fantasia/.test(tipo) || /^\s*\[visual\]/i.test(name)) {
    if (/topo|cima/.test(eq)) return "CostumeUpper";
    if (/meio/.test(eq)) return "CostumeMiddle";
    if (/baixo/.test(eq)) return "CostumeLower";
    if (/capa|manto/.test(eq) || /capa|manto/.test(tipo)) return "CostumeGarment";
    return "CostumeUpper";
  }
  if (/baixo/.test(eq)) return "Lower";
  if (/meio/.test(eq)) return "Middle";
  if (/cima|topo|alto/.test(eq)) return "Upper";
  if (/armadura/.test(tipo)) return "Armor";
  if (/capa|manto/.test(tipo)) return "Garment";
  if (/sapato|cal[cç]ado|bota/.test(tipo)) return "Shoes";
  if (/escudo/.test(tipo)) return "Shield";
  if (/acess[oó]rio/.test(tipo)) return "Accessory";
  if (/arma|espada|lan[cç]a|machado|adaga|arco|cajado|varinha|chicote|manopla|katar|rev[oó]lver|rifle|instrumento|livro|punho/.test(tipo)) return "Weapon";
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
  const slot = ptToSlot(desc, lt.name);
  const f = slot ? SLOT_FIELDS[slot] : null;
  const def = fieldNum(desc, "DEF");
  const weight = fieldNum(desc, "Peso");
  const reqLvl = fieldNum(desc, "N[ií]vel necess[aá]rio") ?? fieldNum(desc, "Nivel necessario");
  // Slot count: prefer the GRF-authoritative `slots` field carried in
  // latam-items.json (from iteminfo_new.lub slotCount via build-latam-db.mjs).
  // The LATAM display name usually drops the "[N]" suffix, so the name-parse is
  // only a fallback for entries built before slots were extracted.
  const slots = lt.slots != null ? String(lt.slots) : (lt.name.match(/\[(\d)\]\s*$/) || [])[1] ?? "0";

  out.push(`name (pt):   ${lt.name}`);
  out.push(`aegisName:   ${lt.aegisName ?? "(none)"}`);
  out.push(`Tipo/Slot:   ${field(desc, "Tipo")} / ${field(desc, "Equipa em") ?? "-"}`);
  out.push(`slot:        ${slot ?? "(could not infer — set itemTypeId/itemSubTypeId/location by hand)"}${f ? `  → itemTypeId=${f.itemTypeId}, itemSubTypeId=${f.itemSubTypeId}, location=${JSON.stringify(f.location)}` : ""}`);
  out.push(`slots:       ${slots}${lt.slots != null ? "  (GRF slotCount)" : "  (from name suffix — verify; GRF slotCount not in latam-items.json)"}`);
  if (slot === "Weapon") out.push(`  ⚠ weapon: itemTypeId=1, itemSubTypeId = the weapon class — copy from a same-class weapon already in item.json.`);
  if (slot === "Accessory") out.push(`  ⚠ accessory: itemSubTypeId 517 = both sides; use 510 (right) / 511 (left) if side-specific.`);
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
    itemTypeId: f?.itemTypeId ?? null,
    itemSubTypeId: f?.itemSubTypeId ?? null,
    itemLevel: null,
    attack: null,
    defense: def,
    weight: weight,
    requiredLevel: reqLvl,
    location: f?.location ?? null,
    compositionPos: null,
    usableClass: ["all"],
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
