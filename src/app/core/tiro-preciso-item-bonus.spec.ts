import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SKILL_ID_BY_NAME } from '../skills';
import { DamageCalculator } from './damage-calculator';

/**
 * Smoke test for items that boost the bow/Windhawk skill line. item.json keys a
 * "+X% <skill> damage" bonus by the skill's in-game id; the engine reads it back
 * with getSkillBonus(name) -> totalBonus[SKILL_ID_BY_NAME[name]] and applies it as
 * the equip skill multiplier. These tests pin that wiring end to end:
 *   - the catalog still maps each skill name to the id item.json uses,
 *   - getSkillBonus resolves the id-keyed bonus, and
 *   - item.json actually ships items that boost each skill.
 *
 * pt-BR "Tiro Preciso" = Focused Arrow Strike (id 382). The rest are the Windhawk
 * damage skills.
 */
const items: Record<string, { script?: Record<string, unknown> }> = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/assets/demo/data/item.json'), 'utf8'),
);

const SKILLS: Record<string, number> = {
  'Focused Arrow Strike': 382, // Tiro Preciso
  'Crescive Bolt': 5334,
  'Gale Storm': 5330,
  'Hawk Rush': 5326,
  'Hawk Boomerang': 5329,
};

// Bonus keys can carry stacked prefixes (e.g. cd__382 = cooldown for skill 382);
// strip them to reach the bare skill id (same convention as item-skills.spec.ts).
const SKILL_PREFIXES = ['fix_vct__', 'vct__', 'chance__', 'fctPercent__', 'fct__', 'acd__', 'cd__'];
const stripPrefixes = (key: string): string => {
  let base = key;
  for (let again = true; again; ) {
    again = false;
    for (const p of SKILL_PREFIXES) if (base.startsWith(p)) { base = base.slice(p.length); again = true; break; }
  }
  return base;
};

describe('Tiro Preciso + Windhawk skill item bonuses', () => {
  it('catalog maps each skill name to the id item.json keys its bonus under', () => {
    for (const [name, id] of Object.entries(SKILLS)) {
      expect(SKILL_ID_BY_NAME[name]).toBe(id);
    }
  });

  it('getSkillBonus reads the id-keyed equip bonus, so items boost the skill', () => {
    const dc = new DamageCalculator();
    dc.totalBonus = { 382: 25, 5334: 40 } as any; // as if equipping +25% Tiro Preciso / +40% Crescive Bolt

    expect((dc as any).getSkillBonus('Focused Arrow Strike')).toBe(25);
    expect((dc as any).getSkillBonus('Crescive Bolt')).toBe(40);
    expect((dc as any).getSkillBonus('Gale Storm')).toBe(0); // nothing equipped for it
  });

  it('item.json ships at least one item that boosts each skill', () => {
    const affectedBy = new Map<number, string>();
    for (const [itemId, item] of Object.entries(items)) {
      if (!item.script) continue;
      for (const key of Object.keys(item.script)) {
        const base = Number(stripPrefixes(key));
        if (!affectedBy.has(base) && Object.values(SKILLS).includes(base)) affectedBy.set(base, itemId);
      }
    }

    const missing = Object.entries(SKILLS).filter(([, id]) => !affectedBy.has(id)).map(([name]) => name);
    expect(missing).toEqual([]);
  });
});
