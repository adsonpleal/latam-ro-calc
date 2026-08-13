/**
 * Validates the bonus keys and class names declared in item.json.
 *
 * This used to be a dev-only sweep inside RoService, which re-walked all 9,555 items on
 * every reload in development and dumped `console.error` output nobody read. As a spec it
 * runs on pre-push and genuinely fails when the item database gains a key the engine does
 * not know.
 *
 * Why the keys matter: a bonus misspelled in item.json raises an error nowhere — the item
 * simply does nothing in the calculation.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRawTotalBonus } from 'src/app/utils';
import { VALID_SKILL_IDS } from 'src/app/skills';
import { validClassNameSet } from './valid-bonuses';

const items: Record<string, any> = JSON.parse(
  readFileSync(join(process.cwd(), 'src/assets/demo/data/item.json'), 'utf8'),
);

/** Time/cooldown modifiers prefixed onto an already valid key. */
const PREFIXES = ['fix_vct__', 'vct__', 'chance__', 'fctPercent__', 'fct__', 'acd__', 'cd__'];

/** Prefixes stack — `chance__cd__2447` is a cooldown-reduction chance for skill 2447. */
const stripPrefix = (key: string) => {
  let out = key;
  for (let changed = true; changed; ) {
    changed = false;
    for (const p of PREFIXES) {
      if (out.startsWith(p)) {
        out = out.slice(p.length);
        changed = true;
        break;
      }
    }
  }
  return out;
};

/**
 * Key families assembled dynamically at runtime, which is why they do not appear in the
 * static createRawTotalBonus():
 *
 *   cri_race_<race>  — read in damage-calculator.ts:538 (`cri_race_${race}`).
 */
const DYNAMIC_KEY_PATTERNS = [/^cri_race_\w+$/];

/**
 * Keys the database declares and the engine does NOT consume. These are not typos: they
 * are bonuses not yet modelled. They are pinned here so the spec passes today and still
 * breaks if the database gains a new unknown key. When a bonus gets modelled, delete its
 * line.
 *
 *   dmg__<monster> — damage against one specific monster. Only Diabolus Manteau (2537)
 *                    and Diabolus Ring (2729) use it, against Lucifer Morocc.
 */
const CHAVES_NAO_MODELADAS = ['dmg__Lucifer Morocc'];

describe('item.json: chaves de bônus', () => {
  const validStatusSet = new Set(Object.keys(createRawTotalBonus()));

  const desconhecidas = new Map<string, string[]>();

  for (const key of Object.keys(items)) {
    const script = items[key].script as Record<string, unknown> | undefined;
    if (!script) continue;

    for (const bonusKey of Object.keys(script)) {
      const realKey = stripPrefix(bonusKey);
      if (validStatusSet.has(realKey)) continue;
      // skill bonus keys are the game's skill ids (see the Skill Catalog)
      if (/^\d+$/.test(realKey) && VALID_SKILL_IDS.has(Number(realKey))) continue;
      if (DYNAMIC_KEY_PATTERNS.some((re) => re.test(realKey))) continue;

      const donos = desconhecidas.get(realKey) ?? [];
      donos.push(key);
      desconhecidas.set(realKey, donos);
    }
  }

  it('introduces no keys the engine does not know', () => {
    const inesperadas = [...desconhecidas.keys()].filter((k) => !CHAVES_NAO_MODELADAS.includes(k));
    expect(inesperadas).toEqual([]);
  });

  it('keeps the unmodelled-bonus list from growing', () => {
    // If one of these leaves the database (or becomes modelled), delete it from the
    // constant — the spec warns rather than letting the list rot.
    expect([...desconhecidas.keys()].sort()).toEqual([...CHAVES_NAO_MODELADAS].sort());
  });
});

describe('item.json: class names', () => {
  it('uses only known class names in usableClass/unusableClass', () => {
    const invalidas = new Set<string>();

    for (const key of Object.keys(items)) {
      for (const field of ['usableClass', 'unusableClass'] as const) {
        const list = items[key][field];
        if (!Array.isArray(list)) continue;
        for (const className of list) {
          if (!validClassNameSet.has(className)) invalidas.add(className);
        }
      }
    }

    expect([...invalidas]).toEqual([]);
  });
});
