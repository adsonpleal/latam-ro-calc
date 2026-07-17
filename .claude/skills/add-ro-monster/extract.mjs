#!/usr/bin/env node
// Extract LATAM monster records for the calculator's monster.json from their
// in-game ids. Two sources, mirroring how the calc actually consumes a monster:
//
//   GRF (data.grf)            -> dbname (aegis). npcidentity.lub maps
//                               JT_<AEGIS> -> id; we strip "JT_". The client
//                               carries NO mob stats and NO instance spawns
//                               (navi_mob excludes instance mobs), so that's all.
//   divine-pride (lang=en)    -> the full stat block. LATAM mobs are gated behind
//                               login, so the request carries the logged-in
//                               session from .dp-cookies.json (git-ignored). We read
//                               lang=en because Monster.setData (src/app/domain/
//                               monster.ts) parses the ENGLISH strings elementName
//                               ("Dark 3"), raceName ("Undead"), scaleName ("Medium").
//                               The "Default" server values ARE the LATAM ones.
//
// What the calc reads (everything else is derived or display-only): name + stats.
// {level, health, defense, magicDefense, res, mres, str, agi, vit, int, dex, luk,
//  elementName, raceName, scaleName, class, mvp}. We fill the rest of the
//  monster.json shape from DP where shown and 0/"" otherwise.
//
// spawn is left "TBD": instance mobs have no machine-derivable spawn map. Set it
// by hand (the instance's map code) and add a monster-spawn-mapper.ts group entry.
//
// Usage:
//   node .claude/skills/add-ro-monster/extract.mjs <id> [<id> ...] [--grf <data.grf>] [--out <file>]
// Writes the records array to --out (default: <os tmp>/latam-monster-recs.json)
// and prints a summary. Feed that file to apply.mjs.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const DEFAULT_GRF = "C:\\Gravity\\Ragnarok\\data.grf";

const argv = process.argv.slice(2);
const ids = [];
let grfPath = DEFAULT_GRF;
let outPath = join(tmpdir(), "latam-monster-recs.json");
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--grf") grfPath = argv[++i];
  else if (argv[i] === "--out") outPath = argv[++i];
  else if (/^\d+$/.test(argv[i])) ids.push(Number(argv[i]));
}
if (!ids.length) {
  console.error("usage: node .claude/skills/add-ro-monster/extract.mjs <id> [<id> ...] [--grf <data.grf>] [--out <file>]");
  process.exit(1);
}

// --- divine-pride session (git-ignored) ------------------------------------
let cookie;
try {
  const c = JSON.parse(readFileSync(resolve(ROOT, ".dp-cookies.json"), "utf8"));
  if (!c.ASPXAUTH || !c["ASP.NET_SessionId"]) throw new Error("missing keys");
  cookie = ["lang=en", "ASP.NET_SessionId=" + c["ASP.NET_SessionId"], ".ASPXAUTH=" + c.ASPXAUTH].join("; ");
} catch (e) {
  console.error(`Could not read .dp-cookies.json at repo root (${e.message}).`);
  console.error(`Create it (git-ignored) with a logged-in divine-pride session:`);
  console.error(`  { "ASPXAUTH": "<.ASPXAUTH>", "ASP.NET_SessionId": "<id>", "lang": "pt" }`);
  process.exit(1);
}

// --- GRF: id -> dbname (aegis), from npcidentity.lub ------------------------
async function loadDbnames(ids) {
  const { openGrf, closeGrf, findBestEntry, extractFile } = await import(pathToFileURL(join(ROOT, "tools/grf.mjs")).href);
  const { runChunk, LuaTable } = await import(pathToFileURL(join(ROOT, "tools/lua51.mjs")).href);
  const grf = openGrf(grfPath);
  try {
    const entry = findBestEntry(grf, "datainfo/npcidentity.lub");
    if (!entry) { console.warn("npcidentity.lub not found in GRF — dbname will be blank"); return {}; }
    const jobtbl = runChunk(Buffer.from(extractFile(grf, entry))).get("jobtbl");
    const want = new Set(ids);
    const out = {};
    if (jobtbl instanceof LuaTable) {
      for (const [k, v] of jobtbl.map) {
        if (typeof k === "string" && want.has(v)) out[v] = k.replace(/^JT_/, "");
      }
    }
    return out;
  } finally {
    closeGrf(grf);
  }
}

// --- divine-pride monster page parse ---------------------------------------
const ELE = ["Neutral", "Water", "Earth", "Fire", "Wind", "Poison", "Holy", "Dark", "Ghost", "Undead"];
const RACE = ["Formless", "Undead", "Brute", "Plant", "Insect", "Fish", "Demon", "DemiHuman", "Angel", "Dragon"];
const RACE_FIX = { Human: "DemiHuman", "Demi-Human": "DemiHuman", DemiHuman: "DemiHuman" }; // DP label -> calc enum
const SIZE = { Small: 0, Medium: 1, Large: 2 };
const dec = (s) => String(s).replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)).replace(/&amp;/g, "&").replace(/&nbsp;/g, " ");
const n = (s) => parseInt(String(s).replace(/[.,]/g, ""), 10) || 0;

async function fetchMob(id, dbname) {
  const r = await fetch(`https://www.divine-pride.net/database/monster/${id}`, {
    headers: { "Accept-Language": "en-US,en;q=0.9", "User-Agent": "Mozilla/5.0", Cookie: cookie },
  });
  if (!r.ok) throw new Error(`${id}: HTTP ${r.status}`);
  const html = await r.text();
  if (/account\/login/i.test(html) && /Unknown\s+\w*\s*name/i.test(html)) {
    throw new Error(`${id}: page is gated — .dp-cookies.json session expired or lacks this server. Refresh it.`);
  }
  const og = dec((html.match(/og:title"\s+content="([^"]*)"/i) || [])[1] || "");
  const kind = og.split(":")[0].trim(); // Monster | MVP | Mini — UNRELIABLE (DP labels some MVPs "Monster:")
  // Authoritative MVP signal: only MVPs have an "MVP Exp/Reward/Drops" block.
  const isMvp = /MVP\s*(Exp|Reward|Drops)/i.test(html) || kind === "MVP";
  const isBoss = isMvp || kind === "Mini"; // boss protocol (class != 0)
  const name = og.slice(og.indexOf(":") + 1).trim();
  const koreanName = /[ㄱ-힝]/.test(name);

  // DP renders one stat block per server/episode (iRO 17.1, kRO EP 20, ..., Default),
  // all in the DOM but hidden except the one matching <option value="default" selected>.
  // A plain indexOf("Basic Info")/"Secondary stats" grabs whichever block comes FIRST
  // in the DOM (usually iRO), not the selected LATAM "Default" one — scope to the
  // div#alternatestats_default block, which always exists and is listed last.
  const defStart = html.indexOf('id="alternatestats_default"');
  if (defStart < 0) throw new Error(`${id}: no alternatestats_default block found on the page`);
  const scope = html.slice(defStart);

  const bi = scope.slice(scope.indexOf("Basic Info"), scope.indexOf("Basic Info") + 700)
    .replace(/<[^>]+>/g, "|").replace(/\|+/g, "|").split("|").map((x) => dec(x).trim()).filter(Boolean);
  // bi: ["Basic Info", "<id>", "Lv.", "<lvl>", "<Race>", "<Size>", "<Element L>"]
  const level = n(bi[3]);
  let raceName = bi[4];
  const scaleName = bi[5];
  const elementName = bi[6];
  raceName = RACE_FIX[raceName] || raceName;
  const [eleWord, eleLvl] = (elementName || " ").split(" ");

  const prim = {};
  let pm, pre = /<span style="font-weight: ?bold;?">\s*([\d.,]+)\s*<\/span>\s*(STR|AGI|VIT|INT|DEX|LUK)/g;
  const pStart = scope.indexOf("Primary stats");
  while ((pm = pre.exec(scope.slice(pStart, pStart + 1400)))) prim[pm[2]] = n(pm[1]);

  const cells = [];
  let m, re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
  const sStart = scope.indexOf("Secondary stats");
  while ((m = re.exec(scope.slice(sStart, sStart + 4200)))) {
    const t = dec(m[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (t) cells.push(t);
  }
  const cell = (lab) => { const f = cells.find((x) => x.endsWith(lab)); return f ? f.replace(lab, "").trim() : ""; };
  const health = n(cell("Health")), def = n(cell("Def")), mdef = n(cell("MDef")), range = n(cell("Range"));
  const [amin, amax] = (cell("Attack").match(/[\d.,]+/g) || ["0", "0"]).map(n);
  const [mmin, mmax] = (cell("MATK").match(/[\d.,]+/g) || ["0", "0"]).map(n);
  const reqHit = n(cell("Req. Hit")), reqFlee = n(cell("Req. Flee"));
  // Res/Mres cells read "<raw> Res (-NN.NN%)" — they end with "%)", not the label,
  // so match the label mid-string and take the leading raw number (the % is derived).
  const grabPct = (rx) => { const cc = cells.find((x) => rx.test(x)); return cc ? n((cc.match(/^[\d.,]+/) || ["0"])[0]) : 0; };
  const res = grabPct(/ Res \(/), mres = grabPct(/ Mres \(/);

  const eleIdx = ELE.indexOf(eleWord), raceIdx = RACE.indexOf(raceName), sizeIdx = SIZE[scaleName];
  const warn = [];
  if (eleIdx < 0) warn.push(`unmapped element "${elementName}"`);
  if (raceIdx < 0) warn.push(`unmapped race "${raceName}"`);
  if (sizeIdx == null) warn.push(`unmapped size "${scaleName}"`);
  if (koreanName) warn.push(`name is Korean ("${name}") — DP has no en/pt name; keep an English base name and REPORT the missing pt-BR name to the user (don't invent one)`);

  const rec = {
    id, dbname: dbname || "", name, spawn: "TBD",
    stats: {
      attackRange: range, level, health, sp: 1,
      str: prim.STR || 0, int: prim.INT || 0, vit: prim.VIT || 0, dex: prim.DEX || 0, agi: prim.AGI || 0, luk: prim.LUK || 0,
      rechargeTime: 0, atk1: amin, atk2: 0,
      attack: { minimum: amin, maximum: amax }, magicAttack: { minimum: mmin, maximum: mmax },
      defense: def, baseExperience: 0, jobExperience: 0, aggroRange: 0, escapeRange: 0,
      movementSpeed: 0, attackSpeed: 0, attackedSpeed: 0,
      element: eleIdx >= 0 ? 20 * Number(eleLvl) + eleIdx : 0,
      scale: sizeIdx ?? 1, race: raceIdx >= 0 ? raceIdx : 0, magicDefense: mdef,
      hit: reqHit, flee: reqFlee, ai: "", mvp: isMvp ? 1 : 0, class: isBoss ? 1 : 0, attr: 0, res, mres,
      elementName, elementShortName: eleWord, scaleName, raceName,
    },
  };
  return { rec, kind, warn };
}

const dbnames = await loadDbnames(ids);
const recs = [];
for (const id of ids) {
  try {
    const { rec, kind, warn } = await fetchMob(id, dbnames[id]);
    recs.push(rec);
    const s = rec.stats;
    console.log(`\n=== ${id}  ${rec.dbname || "(no dbname)"}  "${rec.name}"  [${kind}] ===`);
    console.log(`  Lv ${s.level} | ${s.raceName}/${s.scaleName}/${s.elementName} | HP ${s.health.toLocaleString()} | DEF ${s.defense} MDEF ${s.magicDefense} | RES ${s.res} MRES ${s.mres}`);
    console.log(`  STR ${s.str} AGI ${s.agi} VIT ${s.vit} INT ${s.int} DEX ${s.dex} LUK ${s.luk}`);
    console.log(`  divine-pride: https://www.divine-pride.net/database/monster/${id}`);
    for (const w of warn) console.log(`  ⚠ ${w}`);
  } catch (e) {
    console.error(`\n=== ${id} FAILED: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 250));
}

if (!recs.length) { console.error("\nno records extracted."); process.exit(1); }
writeFileSync(outPath, JSON.stringify(recs, null, 2));
console.log(`\nwrote ${recs.length} record(s) -> ${outPath}`);
console.log(`Next: set each record's "spawn" (the instance map code), add a monster-spawn-mapper.ts group, then:`);
console.log(`  node .claude/skills/add-ro-monster/apply.mjs "${outPath}"`);
