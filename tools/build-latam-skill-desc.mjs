#!/usr/bin/env node
// Extract pt-BR skill descriptions from the LATAM client GRF skilldescript.lub
// (SKILL_DESCRIPT[id] = { "line1", "line2", ... }, the text shown in the client's
// skill tooltip — colour codes ^RRGGBB included, rendered like item descriptions).
//
// Output: src/assets/demo/data/latam-skill-desc.json  { "<skillId>": "desc text" }
//   keyed by the client/divine-pride skill id (same id used for the ragassets
//   icon), so the buff popover can look it up by the buff's pinned `icon`.
//
// Usage: node tools/build-latam-skill-desc.mjs [<data.grf>]

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openGrf, closeGrf, findBestEntry, extractFile } from "./grf.mjs";
import { runChunkInto, LuaTable, decodeClientString } from "./lua51.mjs";

const DEFAULT_GRF = "C:\\Gravity\\Ragnarok\\data.grf";
const SKILLINFOZ = "data/luafiles514/lua files/skillinfoz";

function grfLub(grf, base) {
  const e = findBestEntry(grf, `${base}.lub`) ?? findBestEntry(grf, `${base}.lua`);
  return e ? extractFile(grf, e) : null;
}

// Run skillid.lub + skilldescript.lub through the VM and read id -> joined lines.
function extractSkillDesc(grf) {
  const skillId = grfLub(grf, `${SKILLINFOZ}/skillid`);
  const skillDesc = grfLub(grf, `${SKILLINFOZ}/skilldescript`);
  if (!skillId || !skillDesc) return null;
  const g = new LuaTable();
  runChunkInto(skillId, g);
  runChunkInto(skillDesc, g);

  // SKILL_DESCRIPT is the biggest table that isn't the SKID constant map.
  let best = null, bestSize = -1;
  for (const [k, v] of g.map) {
    if (k === "SKID") continue;
    if (v instanceof LuaTable && v.map.size > bestSize) { best = v; bestSize = v.map.size; }
  }

  const out = {};
  if (best) {
    for (const [id, entry] of best.map) {
      if (typeof id !== "number" || !(entry instanceof LuaTable)) continue;
      // each entry is a 1-indexed array of description lines.
      const text = [...entry.map.entries()]
        .filter(([k, v]) => typeof k === "number" && typeof v === "string")
        .sort((a, b) => a[0] - b[0])
        .map(([, v]) => decodeClientString(v))
        .join("\n")
        .trim();
      if (text) out[id] = text;
    }
  }
  return out;
}

function main() {
  const grfPath = resolve(process.argv[2] ?? DEFAULT_GRF);
  const grf = openGrf(grfPath);
  try {
    const desc = extractSkillDesc(grf) ?? {};
    const outPath = resolve(process.cwd(), "src/assets/demo/data/latam-skill-desc.json");
    writeFileSync(outPath, JSON.stringify(desc));
    console.log(`wrote ${outPath}: ${Object.keys(desc).length} skill descriptions`);
  } finally {
    closeGrf(grf);
  }
}

main();
