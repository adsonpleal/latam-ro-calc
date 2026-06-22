import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SKILL_ID_BY_NAME, VALID_SKILL_IDS } from '../skills';

/**
 * Validator: item.json keys skill bonuses by in-game skill id (see the Skill
 * Catalog, src/app/skills). This runs under `npm test`, which the pre-push hook
 * executes, so it guards against:
 *   - a numeric skill key that is not a real skill id (a typo / wrong id), and
 *   - a key still on a skill NAME for a skill that does have an id (a migration miss).
 *
 * It intentionally allows non-numeric keys for skills that have no catalog id yet
 * (the engine falls back to the name) and for non-skill bonus keys (e.g. stat
 * chances, `cri_race_*`, `dmg__<monster>`), which are not skill references.
 */
const items: Record<string, { script?: Record<string, unknown> }> = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/assets/demo/data/item.json'), 'utf8'),
);

// Prefixes can stack, e.g. `chance__cd__<skill>`. Strip them all to reach the base.
const SKILL_PREFIXES = ['fix_vct__', 'vct__', 'chance__', 'fctPercent__', 'fct__', 'acd__', 'cd__'];
const stripPrefixes = (key: string): string => {
  let base = key;
  for (let again = true; again; ) {
    again = false;
    for (const p of SKILL_PREFIXES) if (base.startsWith(p)) { base = base.slice(p.length); again = true; break; }
  }
  return base;
};

describe('item.json skill references', () => {
  it('use valid skill ids, with no key left on a name that has an id', () => {
    const invalidIds: string[] = [];
    const unmigrated: string[] = [];

    for (const [itemId, item] of Object.entries(items)) {
      if (!item.script) continue;
      for (const key of Object.keys(item.script)) {
        const base = stripPrefixes(key);
        if (/^\d+$/.test(base)) {
          if (!VALID_SKILL_IDS.has(Number(base))) invalidIds.push(`${itemId}: "${key}"`);
        } else if (base in SKILL_ID_BY_NAME) {
          unmigrated.push(`${itemId}: "${key}"`);
        }
      }
    }

    expect({ invalidIds, unmigrated }).toEqual({ invalidIds: [], unmigrated: [] });
  });

  // The id-based condition tokens (parsed in calculator.ts): SKILL_ID[id==lv],
  // SKILL_ID2[id==lv] and ACTIVE_SKILL_ID[id]. The (?<!ACTIVE_) lookbehind on the
  // SKILL_ID alternative avoids double-matching the SKILL_ID tail of ACTIVE_SKILL_ID.
  it('reference valid skill ids in SKILL_ID / SKILL_ID2 / ACTIVE_SKILL_ID tokens', () => {
    const tokenRe = /(?:ACTIVE_SKILL_ID|(?<!ACTIVE_)SKILL_ID2?)\[(\d+)/g;
    const invalid: string[] = [];

    for (const [itemId, item] of Object.entries(items)) {
      if (!item.script) continue;
      for (const entries of Object.values(item.script)) {
        for (const entry of Array.isArray(entries) ? entries : [entries]) {
          if (typeof entry !== 'string') continue;
          for (const [, id] of entry.matchAll(tokenRe)) {
            if (!VALID_SKILL_IDS.has(Number(id))) invalid.push(`${itemId}: "${entry}"`);
          }
        }
      }
    }

    expect(invalid).toEqual([]);
  });
});
