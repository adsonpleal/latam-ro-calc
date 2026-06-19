#!/usr/bin/env node
// Extract the LATAM-server reference data from an installed Ragnarok Online
// LATAM client and emit JSON to src/assets/demo/data/:
//
//   latam-items.json    { "<id>": { name, description, aegisName, slots } } — the
//                        pt-BR item name (identifiedDisplayName), description
//                        (identifiedDescriptionName) and slotCount from
//                        System/iteminfo_new.lub (aegisName from itemmoveinfov5.txt;
//                        slots omitted when 0). The key set IS the "present in
//                        LATAM" item universe; the merge step flags item.json with
//                        `presentInLatam`.
//
//   latam-classes.json  [ <jobIconId>, ... ] — the class/job icon ids whose
//                        renewalparty/icon_jobs_<id>.bmp exists in data.grf.
//                        Classes unreleased on LATAM have no icon (same signal
//                        ragassets serves icons from), so the UI hides them.
//
// The GRF reader and the Lua 5.1 VM (lua51.mjs) are adapted from ../latamvisuais
// (tools/build-db.mjs), which shares that tooling with ragreplaystats (MIT).
// Only the GRF *file table* is read here (icon existence) — no entry decryption.
//
// Usage:
//   node tools/build-latam-db.mjs [--grf <data.grf>] [--iteminfo <lub>] [--out <dir>]
//
// Defaults to the standard LATAM install at C:\Gravity\Ragnarok\data.grf, with
// iteminfo_new.lub found in the System/ folder next to the GRF.

import {
  closeSync,
  existsSync,
  fstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { resolve, join, dirname } from "node:path";
import { inflateSync } from "node:zlib";
import { runChunk, LuaTable, decodeClientString } from "./lua51.mjs";
// Full GRF reader (with entry decryption) — only used to pull the one
// itemmoveinfov5.txt out of the GRF. Aliased to avoid clashing with the inline
// file-table-only reader below (openGrf/closeGrf/normalize).
import { openGrf as grfOpen, closeGrf as grfClose, extractFile as grfExtract, findBestEntry as grfFind } from "./grf.mjs";

const DEFAULT_GRF = "C:\\Gravity\\Ragnarok\\data.grf";
const DEFAULT_OUT = resolve(process.cwd(), "src/assets/demo/data");

function main() {
  const args = parseArgs(process.argv.slice(2));
  const grfPath = resolve(args.grf ?? DEFAULT_GRF);
  if (!existsSync(grfPath)) {
    console.error(`GRF not found: ${grfPath} (pass --grf <path>)`);
    process.exit(1);
  }
  const outDir = resolve(args.out ?? DEFAULT_OUT);
  mkdirSync(outDir, { recursive: true });

  // --- items: pt-BR names + descriptions from iteminfo_new.lub -------------
  const lubPath = resolveItemInfoPath(args, grfPath);
  if (!lubPath) {
    console.error("iteminfo_new.lub not found next to the GRF — pass --iteminfo <path>");
    process.exit(1);
  }
  console.log(`Items from ${lubPath}`);
  const aegisMap = extractAegisMap(grfPath);
  console.log(`  aegis names from data/itemmoveinfov5.txt — ${Object.keys(aegisMap).length}`);
  const items = extractItems(lubPath, aegisMap);
  writeJson(join(outDir, "latam-items.json"), items);
  console.log(`  latam-items.json — ${Object.keys(items).length} items (pt-BR)`);

  // --- classes: which job icons exist in the LATAM GRF ---------------------
  const classIds = extractPresentClasses(grfPath);
  writeJson(join(outDir, "latam-classes.json"), classIds);
  console.log(`  latam-classes.json — ${classIds.length} present job icons`);
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--grf") out.grf = argv[++i];
    else if (a === "--iteminfo") out.iteminfo = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "-h" || a === "--help") {
      console.error("usage: node tools/build-latam-db.mjs [--grf <data.grf>] [--iteminfo <lub>] [--out <dir>]");
      process.exit(1);
    }
  }
  return out;
}

function writeJson(path, obj) {
  writeFileSync(path, JSON.stringify(obj));
  console.log(`  wrote ${path}`);
}

// ---------------------------------------------------------------------------
// Items — System/iteminfo_new.lub via the Lua VM. The chunk builds a `tbl`
// global mapping item id -> entry. We keep the pt-BR identified name and the
// description (an array of lines, joined with \n, color codes preserved to
// match the existing item.json format).
// ---------------------------------------------------------------------------

function extractItems(lubPath, aegisMap = {}) {
  const tbl = runChunk(readFileSync(lubPath)).get("tbl");
  if (!(tbl instanceof LuaTable)) throw new Error("iteminfo: no `tbl` global");

  const out = {};
  for (const [id, entry] of tbl.map) {
    if (typeof id !== "number" || !(entry instanceof LuaTable)) continue;
    const name = decodeClientString(entry.get("identifiedDisplayName"));
    if (!name) continue;
    const rec = { name };
    const desc = joinDescription(entry.get("identifiedDescriptionName"));
    if (desc) rec.description = desc;
    // aegisName reference (a label only — it doesn't affect calculations; handy
    // when adding a missing item to item.json). Prefer the real item_db aegis
    // name from data/itemmoveinfov5.txt (correct prefixes like E_Illusion_Armor_A,
    // matches divine-pride), and fall back to the client sprite-resource name for
    // items the move-info table doesn't cover.
    const aegisName = aegisMap[id] ?? decodeClientString(entry.get("identifiedResourceName"));
    if (aegisName) rec.aegisName = aegisName;
    // Card/enchant slot count — the GRF-authoritative source. The LATAM display
    // name drops the "[N]" suffix, so this is the only reliable slot signal; the
    // calc reads `slots` from item.json, so add-ro-item uses this to fill it.
    // Omit when 0 to keep the file minimal (matches the empty-field style above).
    const slots = Number(entry.get("slotCount") || 0);
    if (slots > 0) rec.slots = slots;
    out[id] = rec;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Aegis names — data/itemmoveinfov5.txt (inside the GRF) lists every item as
// `<id>\t<move flags...>\t// <AegisName>`; the trailing comment is the real
// item_db aegis name. A few early lines carry a generic comment instead
// (cashitem, Korean text, names with spaces), so keep only clean aegis tokens.
// ---------------------------------------------------------------------------

function extractAegisMap(grfPath) {
  const grf = grfOpen(grfPath);
  try {
    const entry = grfFind(grf, "data/itemmoveinfov5.txt");
    if (!entry) return {};
    const txt = Buffer.from(grfExtract(grf, entry)).toString("latin1");
    const map = {};
    for (const line of txt.split(/\r?\n/)) {
      const m = line.match(/^\s*(\d+)\t.*?\/\/\s*(.+?)\s*$/);
      if (!m) continue;
      const aegis = m[2];
      if (/^[A-Za-z0-9][A-Za-z0-9_]*$/.test(aegis) && (aegis.includes("_") || /[A-Z]/.test(aegis))) {
        map[Number(m[1])] = aegis;
      }
    }
    return map;
  } finally {
    grfClose(grf);
  }
}

function joinDescription(desc) {
  if (!(desc instanceof LuaTable)) return "";
  const lines = [];
  for (const line of desc.map.values()) {
    if (typeof line === "string") lines.push(decodeClientString(line));
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Classes — a class is "present in LATAM" when its party icon exists in the
// client GRF (renewalparty/icon_jobs_<id>.bmp). Only the GRF file table is
// scanned; the icon bytes are never read.
// ---------------------------------------------------------------------------

function extractPresentClasses(grfPath) {
  const grf = openGrf(grfPath);
  try {
    const ids = new Set();
    const re = /\/renewalparty\/icon_jobs_(\d+)\.bmp$/;
    for (const f of grf.files) {
      if (!(f.flags & 0x01)) continue;
      const m = normalize(f.filename).match(re);
      if (m) ids.add(Number(m[1]));
    }
    return [...ids].sort((a, b) => a - b);
  } finally {
    closeGrf(grf);
  }
}

// ---------------------------------------------------------------------------
// System/iteminfo_new.lub sits next to data.grf. Skip the tiny stub variants.
// ---------------------------------------------------------------------------

function resolveItemInfoPath(args, grfPath) {
  if (args.iteminfo) return existsSync(args.iteminfo) ? resolve(args.iteminfo) : null;
  const root = join(dirname(grfPath), "System");
  for (const name of ["iteminfo_new.lub", "itemInfo.lub", "iteminfo.lub"]) {
    const p = join(root, name);
    if (existsSync(p) && statSync(p).size > 4096) return p;
  }
  return null;
}

// ---------------------------------------------------------------------------
// GRF reader (file table only) — adapted from ../latamvisuais; handles GRF
// versions 0x103/0x200 and the 0x300 fork. Entry decryption (custom DES) is not
// needed here because we only test for icon existence, never read icon bytes.
// ---------------------------------------------------------------------------

function openGrf(path) {
  const fd = openSync(path, "r");
  const fileSize = fstatSync(fd).size;

  const header = Buffer.alloc(0x2e);
  readAt(fd, header, 0);
  const filetableOffset = header.readUInt32LE(0x1e);
  const m1 = header.readUInt32LE(0x22);
  const m2 = header.readUInt32LE(0x26);
  const version = header.readUInt32LE(0x2a);
  const fileCount = m2 - m1 - 7;
  console.log(`GRF version 0x${version.toString(16)}, ${fileCount} files (~${(fileSize / 1e9).toFixed(2)} GB)`);

  let files;
  if (version === 0x200) {
    files = readFileTableV200(fd, 0x2e + filetableOffset);
  } else if (version === 0x300) {
    files = readFileTableV200(fd, 0x32 + filetableOffset, 21);
  } else if (version === 0x103 || version === 0x101) {
    files = readFileTableV103(fd, 0x2e + filetableOffset, fileCount, fileSize);
  } else {
    closeSync(fd);
    throw new Error(`Unsupported GRF version 0x${version.toString(16)}`);
  }
  return { fd, fileSize, version, files };
}

function readAt(fd, buf, position) {
  let read = 0;
  while (read < buf.length) {
    const n = readSync(fd, buf, read, buf.length - read, position + read);
    if (n <= 0) break;
    read += n;
  }
  return read;
}

function readBytes(fd, length, position) {
  const buf = Buffer.alloc(length);
  readAt(fd, buf, position);
  return buf;
}

function readFileTableV200(fd, tableStart, entryTrailerBytes = 17) {
  const sizes = readBytes(fd, 8, tableStart);
  const compressedSize = sizes.readUInt32LE(0);
  const compressed = readBytes(fd, compressedSize, tableStart + 8);
  const table = inflateSync(compressed);
  const files = [];
  let p = 0;
  while (p < table.length) {
    const nullIdx = table.indexOf(0, p);
    if (nullIdx < 0) break;
    const filename = decodeName(table.subarray(p, nullIdx));
    p = nullIdx + 1;
    if (p + entryTrailerBytes > table.length) break;
    const flags = table.readUInt8(p + 12);
    p += entryTrailerBytes;
    files.push({ filename, flags });
  }
  return files;
}

function readFileTableV103(fd, tableStart, fileCount, fileSize) {
  const buf = readBytes(fd, fileSize - tableStart, tableStart);
  const files = [];
  let p = 0;
  for (let i = 0; i < fileCount && p < buf.length; i++) {
    const len = buf.readUInt32LE(p);
    p += 4;
    const filename = decodeName(buf.subarray(p + 2, p + 2 + len - 6));
    p += len;
    if (p + 17 > buf.length) break;
    const flags = buf.readUInt8(p + 12);
    p += 17;
    files.push({ filename, flags });
  }
  return files;
}

function normalize(s) {
  return s.replace(/[\\/]+/g, "/").toLowerCase();
}

function decodeName(bytes) {
  try {
    return new TextDecoder("euc-kr", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

function closeGrf(grf) {
  if (grf?.fd != null) closeSync(grf.fd);
}

main();
