#!/usr/bin/env node
// Build the calculator's pt-BR skill map, keyed by the calculator's own skill
// names, using divine-pride skill ids as the bridge.
//
// Strategy (replaces the old runtime fuzzy match):
//   1. english name -> id   : the LATAM client GRF skillinfolist_enus (id ->
//      English name) reversed. These ids ARE the standard divine-pride / client
//      skill ids (verified: Adoramus 2040, Wind Cutter 2005, Napalm Vulcan 400).
//   2. add the id to every calc skill : for each name in OFFENSIVE_SKILL_NAMES
//      we resolve an id (exact -> curated alias -> spacing/punctuation-insensitive
//      match -> manual override) and bake it into the output, saved in the repo.
//   3. id -> pt name : from divine-pride (../ragreplaystats public/db/skill.json,
//      id -> pt), falling back to the GRF skillinfolist_ptbr, then English.
//
// Output: src/assets/demo/data/latam-skills.json  { "<calcName>": { id, name } }
//   `id`   drives the ragassets skill icon (/icons/skill/{id}.png)
//   `name` is the pt-BR label shown in the Habilidade picker.
//
// Usage: node tools/build-latam-skills.mjs [--grf <data.grf>] [--dp <skill.json>] [--report]

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { openGrf, closeGrf, findBestEntry, extractFile, normalize } from "./grf.mjs";
import { runChunkInto, LuaTable, decodeClientString } from "./lua51.mjs";

const DEFAULT_GRF = "C:\\Gravity\\Ragnarok\\data.grf";
const DEFAULT_DP = "../ragreplaystats/public/db/skill.json"; // divine-pride id -> { name: ptName }
const SKILLINFOZ = "data/luafiles514/lua files/skillinfoz";

// calc-name spelling/variant -> the English name as it appears in the client
// skillinfolist_enus, so the exact id lookup hits. Only confident fixes.
const SKILL_NAME_ALIASES = {
  "Fatal Manace": "Fatal Menace",
  "Metalic Sound": "Metallic Sound",
  "Lightening Bolt": "Lightning Bolt",
  "Mandragora Howling": "Mandragora Howl",
  "Hack and Slasher": "Hack and Slash",
  "Third Punish": "Third Punishment",
  "Second Judgement": "Second Judgment",
  "Rock Down Arrow": "Rock Down",
  "Powerful Swing": "Power Swing",
  "Shatter Storm": "Shattering Storm",
  "Nuckle Boost": "Knuckle Boost",
  "Spread Shot": "Spread Attack",
  "Rain of Crystal": "Crystal Rain",        // AG_CRYSTAL_RAIN 5216 "Cascata de Cristal"
  "Two hand Staff Mastery": "Two Staff",    // AG_TWOHANDSTAFF 5228 "Perícia com Cajado de Duas Mãos"
};

// Calc names whose id we pin by hand because the client English name differs
// from the calc's name. Each id comes from the GRF SKID constant table
// (skill-const -> id), so there's no guesswork: calcName -> skill id.
const SKILL_ID_OVERRIDES = {
  "Cart Termination": 485,    // WS_CARTTERMINATION  "High Speed Cart Ram"
  "Catnip Meteor": 5028,      // SU_CN_METEOR        "CN Meteor"
  "Crazy Weed": 2483,         // GN_CRAZYWEED        "Crazy Vines"
  "Combo Finish": 273,        // MO_COMBOFINISH      "Raging Thrust"
  "Chain Combo": 272,         // MO_CHAINCOMBO       "Raging Quadruple Blow"
  "Finger Offensive": 267,    // MO_FINGEROFFENSIVE  "Throw Spirit Sphere"
  "Shield Chain": 480,        // PA_SHIELDCHAIN      "Rapid Smiting"
  "Banishing Point": 2308,    // LG_BANISHINGPOINT   "Vanishing Point"
  "Dragon Breath": 2008,      // RK_DRAGONBREATH     "Dragon's Breath"
  "Dragon Breath - WATER": 5004, // RK_DRAGONBREATH_WATER "Dragon's Water Breath"
  "Hot Barrel": 2568,         // RL_HEAT_BARREL      "Hit Barrel"
  "Wug Strike": 2243,         // RA_WUGSTRIKE        "Warg Strike"
  "Wug Rider": 2241,          // RA_WUGRIDER         "Warg Ride"
  "Nature Friendly": 5325,    // WH_NATUREFRIENDLY   "Nature's Friend"
  "Wind Walk": 383,           // SN_WINDWALK         "Wind Walk" -> "Caminho do Vento"
  "Cold Slower": 2260,        // NC_COLDSLOWER       "Ice Launcher"
  "Musical Strike": 316,      // BA_MUSICALSTRIKE    "Melody Strike"
  "Lion Howling": 2517,       // SR_HOWLINGOFLION    "Lion's Howl"
};

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--grf") out.grf = argv[++i];
    else if (argv[i] === "--dp") out.dp = argv[++i];
    else if (argv[i] === "--report") out.report = true;
  }
  return out;
}

function grfLub(grf, base) {
  const e = findBestEntry(grf, `${base}.lub`) ?? findBestEntry(grf, `${base}.lua`);
  return e ? extractFile(grf, e) : null;
}

// Run skillid.lub + the given skillinfolist through the VM and read id -> SkillName.
function extractSkillNames(grf, listBase) {
  const skillId = grfLub(grf, `${SKILLINFOZ}/skillid`);
  const skillInfo = grfLub(grf, listBase);
  if (!skillId || !skillInfo) return null;
  const g = new LuaTable();
  runChunkInto(skillId, g);
  runChunkInto(skillInfo, g);
  let best = null, bestSize = -1;
  for (const [k, v] of g.map) {
    if (k === "SKID") continue;
    if (v instanceof LuaTable && v.map.size > bestSize) { best = v; bestSize = v.map.size; }
  }
  const out = {};
  if (best) {
    for (const [id, entry] of best.map) {
      if (typeof id !== "number" || !(entry instanceof LuaTable)) continue;
      const name = decodeClientString(entry.get("SkillName"));
      if (name) out[id] = name.trim();
    }
  }
  return out;
}

// Read one `<VAR> = [ ... ] as const;` string array out of skill-name.ts.
function readSkillNamesArray(varName) {
  const src = readFileSync(resolve(process.cwd(), "src/app/constants/skill-name.ts"), "utf8");
  const block = src.split(`${varName} = [`)[1].split("] as const;")[0];
  return [...block.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2]);
}

// Every calc skill name we want a pt-BR label + icon id for: the offensive
// (atkSkill) names AND the active/passive skill names shown in the
// "learn for bonuses" / "activating skills" panels. `_`-prefixed names are
// calc-internal pseudo-skills (no real client skill / icon) — drop them so
// they don't norm-match an unrelated id.
function readSkillNames() {
  const names = [
    ...readSkillNamesArray("OFFENSIVE_SKILL_NAMES"),
    ...readSkillNamesArray("ACTIVE_PASSIVE_SKILL_NAMES"),
  ].filter((n) => n && !n.startsWith("_"));
  return [...new Set(names)];
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const grfPath = resolve(args.grf ?? DEFAULT_GRF);
  const dpPath = resolve(process.cwd(), args.dp ?? DEFAULT_DP);

  // divine-pride id -> pt name (preferred pt source).
  let dpPt = {};
  if (existsSync(dpPath)) {
    const raw = JSON.parse(readFileSync(dpPath, "utf8"));
    for (const [id, v] of Object.entries(raw)) if (v && v.name) dpPt[id] = v.name;
    console.log(`divine-pride pt: ${Object.keys(dpPt).length} skills (${dpPath})`);
  } else {
    console.warn(`! divine-pride file not found at ${dpPath} — falling back to GRF pt only`);
  }

  const grf = openGrf(grfPath);
  try {
    const ptGrf = extractSkillNames(grf, `${SKILLINFOZ}/skillinfolist_ptbr`) ?? {};
    let en = null, enFrom = null;
    for (const base of ["skillinfolist_enus", "skillinfolist_us", "skillinfolist_en"]) {
      const m = extractSkillNames(grf, `${SKILLINFOZ}/${base}`);
      if (m && Object.keys(m).length && m[28] && m[28] !== ptGrf[28]) { en = m; enFrom = base; break; }
    }
    if (!en) throw new Error("could not find an English skillinfolist in the GRF");
    console.log(`GRF English list (${enFrom}): ${Object.keys(en).length} skills`);

    // english name -> id (lowest id wins: integer keys iterate ascending, so the
    // base skill beats its high-id clone).
    const enToId = {};
    const normToId = {};
    for (const [id, name] of Object.entries(en)) {
      if (!name) continue;
      if (!(name in enToId)) enToId[name] = Number(id);
      const nk = norm(name);
      if (!(nk in normToId)) normToId[nk] = Number(id);
    }

    const ptById = (id) => dpPt[id] ?? ptGrf[id] ?? null;

    const names = readSkillNames();
    const out = {};
    const unmatched = [];
    let exact = 0, alias = 0, normd = 0, override = 0;

    for (const name of names) {
      let id;
      if (name in SKILL_ID_OVERRIDES) { id = SKILL_ID_OVERRIDES[name]; override++; }
      else if (name in enToId) { id = enToId[name]; exact++; }
      else if (SKILL_NAME_ALIASES[name] && enToId[SKILL_NAME_ALIASES[name]]) { id = enToId[SKILL_NAME_ALIASES[name]]; alias++; }
      else if (normToId[norm(name)]) { id = normToId[norm(name)]; normd++; }

      if (id == null) { unmatched.push(name); continue; }

      const pt = ptById(id);
      out[name] = { id, name: pt || name };
    }

    const outPath = resolve(process.cwd(), "src/assets/demo/data/latam-skills.json");
    writeFileSync(outPath, JSON.stringify(out));

    const total = names.length;
    const matched = total - unmatched.length;
    console.log(`\nwrote ${outPath}`);
    console.log(`calc skills (offensive + active/passive): ${total}`);
    console.log(`  matched: ${matched} (${Math.round((matched / total) * 100)}%) — exact ${exact}, alias ${alias}, norm ${normd}, override ${override}`);
    console.log(`  unmatched (left English): ${unmatched.length}`);
    if (args.report && unmatched.length) {
      console.log("\nunmatched calc skill names:");
      for (const n of unmatched.sort()) console.log("  " + n);
    }
  } finally {
    closeGrf(grf);
  }
}

main();
