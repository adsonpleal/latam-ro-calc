// divine-pride as a monster stat source, for the one case ragassets' mobs.json cannot
// serve: a monster LATAM has not shipped.
//
// `mobs.json` is generated from LATAM server data, so it can never carry a preview
// monster — waiting for it is waiting forever. divine-pride publishes the upstream
// (kRO) block instead, and it is already an accepted source in this repo:
// `src/app/constants/monster-damage-reduction.ts` records that 20994, 21360 and 21361
// "were added by hand", and the original Biosphere block (21548-21579) is feed-absent too.
//
// This module exists so those numbers are MACHINE-READ and reproducible rather than
// transcribed by hand, which is what the skill's "never hand-write a stat block from
// another site" rule is actually protecting against. Re-running it reproduces the record.
//
// Trust boundary: a fetched page is untrusted input. Every enum is validated against the
// calc's own vocabulary and anything unrecognized THROWS rather than being passed through
// — the same policy RACE_NORMALIZATION has in tools/mob-source.mjs.

import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The repo's single source of truth for race spellings, reused rather than copied: it
// already maps divine-pride's "Human" to the calc's DemiHuman and throws on anything
// unmapped, which is the policy this module wants.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const { RACE_NORMALIZATION } = await import(pathToFileURL(join(ROOT, 'tools/mob-source.mjs')).href);

/** The calc parses these English strings, not the numeric codes. Order matters below. */
const RACES = ['Formless', 'Undead', 'Brute', 'Plant', 'Insect', 'Fish', 'Demon', 'DemiHuman', 'Angel', 'Dragon'];
const SIZES = ['Small', 'Medium', 'Large'];
const ELEMENTS = ['Neutral', 'Water', 'Earth', 'Fire', 'Wind', 'Poison', 'Holy', 'Dark', 'Ghost', 'Undead'];

export const DP_URL = (id) => `https://www.divine-pride.net/database/monster/${id}`;

/** divine-pride prints European numbers: 32.534.117 is thirty-two million, -41,86% a decimal. */
const int = (text) => {
  const digits = String(text).replace(/\./g, '').trim();
  if (!/^\d+$/.test(digits)) throw new Error(`not an integer: ${JSON.stringify(text)}`);
  return Number(digits);
};

/**
 * Flatten the page to tag-separated tokens. Scripts and styles go first, so their
 * contents can never be mistaken for page text.
 */
const tokens = (html) => {
  const stripped = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
  return stripped
    .replace(/<[^>]+>/g, '|')
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .split('|')
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

export async function fetchMonsterPage(id, fetchImpl = fetch) {
  const response = await fetchImpl(DP_URL(id), { headers: { 'user-agent': 'latam-ro-calc monster import' } });
  if (!response.ok) throw new Error(`${DP_URL(id)} -> HTTP ${response.status}`);
  return response.text();
}

/**
 * Parse one monster page into the fields the calc reads, plus the few extras
 * monster.json carries for format parity.
 *
 * Everything is read from the "Basic Info" / "Primary Stats" / "Secondary Stats"
 * region, never from the whole document: every divine-pride page carries a site-wide
 * "Latest Updates" sidebar whose monsters look like page data.
 */
export function parseMonsterPage(html, id) {
  const all = tokens(html);

  // A monster's own block starts at its "Basic Info" heading and ends before "Drops".
  // Anchoring on the id inside that block is what rejects a page served for another id.
  const start = all.findIndex((token) => token === 'Basic Info');
  if (start < 0) throw new Error(`${id}: no "Basic Info" section — not a monster page?`);
  const end = all.findIndex((token, index) => index > start && token === 'Drops');
  const block = all.slice(start, end < 0 ? all.length : end);
  const text = block.join(' / ');

  if (!block.includes(String(id))) throw new Error(`${id}: page's stat block does not carry this id`);

  // Guard against the per-server stat split that bites item pages: if divine-pride ever
  // serves more than one stat block here, refuse rather than silently taking the first.
  if (block.filter((token) => token === 'Primary Stats').length !== 1) {
    throw new Error(`${id}: expected exactly one "Primary Stats" block; report it rather than guessing`);
  }

  const one = (pattern, label) => {
    const match = text.match(pattern);
    if (!match) throw new Error(`${id}: could not read ${label}`);
    return match;
  };

  // Basic Info is positional: <id> / Lv. / <level> / <race> / <size> / <element> / <level>.
  // Validating each enum against the calc's vocabulary is what defuses the documented
  // trap where an Undead monster's race and element tokens look alike and get swapped.
  const basic = one(
    new RegExp(`${id} / Lv\\. / (\\d+) / ([A-Za-z]+) / ([A-Za-z]+) / ([A-Za-z]+) / (\\d)`),
    'the Basic Info row',
  );
  const [, levelText, rawRace, size, element, elementLevel] = basic;
  const race = RACE_NORMALIZATION[rawRace];
  if (!race) {
    throw new Error(
      `${id}: unmapped race ${JSON.stringify(rawRace)} — add it to RACE_NORMALIZATION in ` +
        `tools/mob-source.mjs after checking what the race actually is, never pass it through`,
    );
  }
  if (!RACES.includes(race)) throw new Error(`${id}: unknown race ${JSON.stringify(race)}`);
  if (!SIZES.includes(size)) throw new Error(`${id}: unknown size ${JSON.stringify(size)}`);
  if (!ELEMENTS.includes(element)) throw new Error(`${id}: unknown element ${JSON.stringify(element)}`);

  const stat = (name) => int(one(new RegExp(`([\\d.]+) ${name}\\b`), name)[1]);
  const pair = (label) => {
    const match = one(new RegExp(`([\\d.]+) - ([\\d.]+) ${label}`), label);
    return { minimum: int(match[1]), maximum: int(match[2]) };
  };

  // "439 / (-41,86%) / Res" — the percentage is derived, the flat value is the stat.
  const resistance = (label) => int(one(new RegExp(`([\\d.]+) / \\([^)]*\\) / ${label}\\b`), label)[1]);

  const heading = all.findIndex((token) => token === `ID: ${id}`);
  if (heading < 1) throw new Error(`${id}: could not find the monster's heading`);
  const name = all[heading - 1];
  if (!name) throw new Error(`${id}: could not read the monster's name`);
  const dbname = all[heading + 1] ?? '';

  // "Normal" / "Boss" / "MVP" is its own token in the header strip, between the heading
  // and "Basic Info". It must be read from that strip and nowhere else: the site-wide
  // Tools menu contains an "MVP Timer" entry, which a whole-document search matches.
  const strip = all.slice(heading, start);
  const mvp = strip.includes('MVP');
  const boss = mvp || strip.includes('Boss');
  if (!boss && !strip.includes('Normal')) {
    throw new Error(`${id}: could not read the Normal/Boss/MVP class from the header strip`);
  }

  // Published per monster as "Taking only N% of the damage dealt to it". The engine does
  // NOT read this bit (monster-damage-reduction.ts is an explicit id list, because 512 is
  // also set on MVPs already in RED_AURA_MVP_IDS) — it is carried for parity and reported
  // so the id can be added to that file deliberately.
  const reduction = html.match(/Taking only (\d+)% of the damage dealt to it/);
  const takesPercent = reduction ? Number(reduction[1]) : null;

  return {
    id,
    dbname,
    name,
    spawn: 'TBD',
    takesPercent,
    stats: {
      attackRange: stat('Range'),
      level: Number(levelText),
      health: stat('Health'),
      // Not published by divine-pride. Left at 0 rather than invented; the calc reads
      // none of these (see the header of extract.mjs for the list it does read).
      sp: 0,
      str: stat('STR'), int: stat('INT'), vit: stat('VIT'),
      dex: stat('DEX'), agi: stat('AGI'), luk: stat('LUK'),
      rechargeTime: 0,
      atk1: 0, atk2: 0,
      attack: pair('Attack'),
      magicAttack: pair('Magic Attack'),
      defense: stat('Def'),
      baseExperience: 0, jobExperience: 0,
      aggroRange: 0, escapeRange: 0, movementSpeed: 0, attackSpeed: 0, attackedSpeed: 0,
      element: ELEMENTS.indexOf(element) + 20 * Number(elementLevel),
      scale: SIZES.indexOf(size),
      race: RACES.indexOf(race),
      magicDefense: stat('MDef'),
      hit: stat('Req\\. Hit'),
      flee: stat('Req\\. Flee'),
      ai: '',
      mvp: mvp ? 1 : 0,
      class: boss || mvp ? 1 : 0,
      attr: takesPercent === 1 ? 1024 : takesPercent === 10 ? 512 : 0,
      res: resistance('Res'),
      mres: resistance('MRes'),
      elementName: `${element} ${elementLevel}`,
      elementShortName: element,
      scaleName: size,
      raceName: race,
    },
  };
}
