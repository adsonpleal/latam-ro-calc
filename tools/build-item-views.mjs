#!/usr/bin/env node
// Extract item id -> sprite "view" id (the client's `ClassNum`) from the LATAM
// client's System/iteminfo_new.lub and emit src/assets/demo/data/item-views.json
// ({ "<id>": <view> }). The view is the accessory id for headgears/costumes, the
// robe id for garments, and the shield/weapon look — exactly what the ragassets
// (zrenderer) /image gateway needs to draw equipped gear on the character sprite.
//
// This is the same `ClassNum` that ragreplaystats (tools/build-db.mjs) and
// latamvisuais use to render the paper-doll; only the iteminfo Lua table is read
// here (no GRF entry decryption), reusing the shared Lua 5.1 VM (lua51.mjs).
//
// Usage:
//   node tools/build-item-views.mjs [--grf <data.grf>] [--iteminfo <lub>] [--out <dir>]
//
// Defaults to the standard LATAM install at C:\Gravity\Ragnarok\data.grf, with
// iteminfo_new.lub found in the System/ folder next to the GRF.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { runChunk, LuaTable, decodeClientString } from "./lua51.mjs";

// Visual-slot bits for the head/garment paper-doll coverage (parsed from the
// "Equipa em:" / "Posição:" description line). A multi-slot costume (e.g. a hood
// that is "Topo, Meio e Baixo") covers several slots at once, so the renderer can
// hide the equipped headgears underneath it.
const SLOT_TOP = 1;
const SLOT_MID = 2;
const SLOT_LOW = 4;
const SLOT_GARMENT = 8;

const DEFAULT_GRF = "C:\\Gravity\\Ragnarok\\data.grf";
const DEFAULT_OUT = resolve(process.cwd(), "src/assets/demo/data");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const lubPath = resolveItemInfoPath(args);
  if (!lubPath) {
    console.error("iteminfo_new.lub not found next to the GRF — pass --iteminfo <path> or --grf <data.grf>");
    process.exit(1);
  }
  console.log(`Item views from ${lubPath}`);

  const tbl = runChunk(readFileSync(lubPath)).get("tbl");
  if (!(tbl instanceof LuaTable)) throw new Error("iteminfo: no `tbl` global");

  // id -> [view, slotMask]. slotMask is the union of visual slots the item covers
  // (TOP|MID|LOW|GARMENT), so a multi-slot costume hides the gear it covers.
  const views = {};
  let count = 0;
  for (const [id, entry] of tbl.map) {
    if (typeof id !== "number" || !(entry instanceof LuaTable)) continue;
    const view = entry.get("ClassNum");
    if (typeof view === "number" && view > 0) {
      views[id] = [Math.round(view), parseSlots(entry.get("identifiedDescriptionName"))];
      count++;
    }
  }

  const outDir = resolve(args.out ?? DEFAULT_OUT);
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "item-views.json");
  writeFileSync(outPath, JSON.stringify(views));
  console.log(`  wrote ${outPath} — ${count} item views`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--grf") out.grf = argv[++i];
    else if (a === "--iteminfo") out.iteminfo = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "-h" || a === "--help") {
      console.error("usage: node tools/build-item-views.mjs [--grf <data.grf>] [--iteminfo <lub>] [--out <dir>]");
      process.exit(1);
    }
  }
  return out;
}

// "Equipa em: ^777777Topo, Meio e Baixo^000000" -> SLOT_TOP|SLOT_MID|SLOT_LOW.
// Newer LATAM items write "Posição: Topo" instead; both labels are accepted, and
// color codes (^RRGGBB) are stripped first. Ported from ../latamvisuais build-db.mjs.
function parseSlots(desc) {
  if (!(desc instanceof LuaTable)) return 0;
  for (const line of desc.map.values()) {
    if (typeof line !== "string") continue;
    const s = decodeClientString(line).replace(/\^[0-9a-fA-F]{6}/g, "");
    const m = s.match(/(?:Equipa em|Posi[çc][ãa]o)\s*:\s*(.+)/i);
    if (!m) continue;
    // The position value runs until the next "Label:" on the same line, if any.
    const t = m[1].split(/\s+\S+\s*:/)[0].toLowerCase();
    let mask = 0;
    if (t.includes("topo")) mask |= SLOT_TOP;
    if (t.includes("meio")) mask |= SLOT_MID;
    if (t.includes("baixo") || /(^|\s)ixo\b/.test(t)) mask |= SLOT_LOW;
    if (t.includes("capa")) mask |= SLOT_GARMENT;
    return mask;
  }
  return 0;
}

// System/iteminfo_new.lub sits next to data.grf. Skip the tiny stub variants.
function resolveItemInfoPath(args) {
  if (args.iteminfo) return existsSync(args.iteminfo) ? resolve(args.iteminfo) : null;
  const grfPath = resolve(args.grf ?? DEFAULT_GRF);
  const root = join(dirname(grfPath), "System");
  for (const name of ["iteminfo_new.lub", "itemInfo.lub", "iteminfo.lub"]) {
    const p = join(root, name);
    if (existsSync(p) && statSync(p).size > 4096) return p;
  }
  return null;
}

main();
