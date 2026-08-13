#!/usr/bin/env node
// Mirror the client's cast/delay table (the in-game "Informação de Conjuração" window)
// from the ragassets `skills.json` feed into src/assets/demo/data/skill-delay.json.
//
// ragassets publishes, per skill, a `delay` object with four per-level arrays in
// milliseconds — exactly the four columns the game shows:
//
//     castFixed    -> Conjuração / Fixa      -> AtkSkillModel.fct
//     castVariable -> Conjuração / Variável  -> AtkSkillModel.vct
//     afterCast    -> Espera / Pós           -> AtkSkillModel.acd
//     cooldown     -> Espera / Recarga       -> AtkSkillModel.cd
//
// The generated file is validation data, not runtime data: nothing in the browser
// bundle reads it (build-web-data.mjs only copies the files it names), and
// src/app/skills/skill-delay.spec.ts asserts every class's atk skills against it.
//
//   node tools/build-skill-delays.mjs
//   node tools/build-skill-delays.mjs --src ../ragassets/resources/raw --dry
//
// Two shapes in the source need care, and this script normalises both:
//
//  - **The arrays are zero-padded past `maxLevel`.** "Grito de Guerra" is a Lv1 skill
//    and still arrives as ten entries, nine of them 0. Reading index 4 for a "Lv5"
//    would silently yield 0, so every array is trimmed to `maxLevel` and the level
//    cap is carried into the output for the spec to enforce.
//  - **`null` means "no such delay"**, i.e. 0 — the client simply omits the column.
//    A field that is null, or constant across all levels, collapses to one number.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadRawJson } from './raw-source.mjs';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets/demo/data/skill-delay.json');

/** ragassets `delay` key -> the AtkSkillModel field the engine keeps it in. */
const FIELDS = [
  ['castFixed', 'fct'],
  ['castVariable', 'vct'],
  ['afterCast', 'acd'],
  ['cooldown', 'cd'],
];

/** Trim to the skill's level cap, then collapse a constant curve to a single value. */
const compact = (values, maxLevel) => {
  if (!values) return 0;

  const levels = values.slice(0, maxLevel);
  if (levels.length === 0) return 0;

  return levels.every((v) => v === levels[0]) ? levels[0] : levels;
};

export const buildSkillDelays = (skills) => {
  const out = {};

  for (const skill of skills) {
    if (!skill.delay) continue;

    const maxLevel = skill.maxLevel || 1;
    // An all-zero row is kept: "this skill has no cast and no delay" is a statement the
    // client is making, and the spec has to be able to hold us to it. Sura's Dragon
    // Combo is exactly that, and the engine had it at a full second of after-cast.
    const entry = { maxLevel };
    for (const [from, to] of FIELDS) entry[to] = compact(skill.delay[from], maxLevel);

    out[skill.id] = entry;
  }

  return out;
};

const main = async () => {
  const args = process.argv.slice(2);
  const srcIndex = args.indexOf('--src');
  const src = srcIndex >= 0 ? args[srcIndex + 1] : undefined;
  const dry = args.includes('--dry');

  const skills = await loadRawJson('skills.json', src);
  const table = buildSkillDelays(skills);

  const json = `${JSON.stringify(table, null, 0)}\n`;
  const before = (() => {
    try {
      return readFileSync(OUT, 'utf8');
    } catch {
      return '';
    }
  })();

  console.log(`${Object.keys(table).length} skills with a delay row (of ${skills.length} known)`);
  if (dry) return console.log(json === before ? 'unchanged' : 'would change skill-delay.json');

  writeFileSync(OUT, json);
  console.log(json === before ? `unchanged: ${OUT}` : `wrote: ${OUT}`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
