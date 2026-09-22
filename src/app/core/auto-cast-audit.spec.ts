import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { VALID_SKILL_IDS } from '../skills';
import { VERIFIED_ITEM_AUTO_CASTS } from './auto-cast';

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<string, any>;
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8')) as Record<string, any>;
const clean = (text: string) => (text ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');
const ATTACK_TRIGGER = /(?:ao realizar (?:um )?ataques? (?:físicos?|mágicos?)|ao atacar(?: com)?|a cada ataque físico|ataques físicos (?:corpo a corpo|à distância|normais?)?)/i;

/**
 * Broad discovery ratchet, deliberately followed by manual clause classification.
 * Every non-verified candidate is pending; production reads only VERIFIED_ITEM_AUTO_CASTS.
 */
const candidates = Object.entries(latam).filter(([id, entry]) => {
  const description = clean(entry.description);
  return !!items[id] && /autoconjur/i.test(description) && ATTACK_TRIGGER.test(description);
});

describe('LATAM item auto-cast audit', () => {
  it('accounts for the current attack-trigger candidate set', () => {
    // A client-data update must deliberately reclassify the changed set rather than
    // silently making a new proc eligible for production.
    expect(candidates).toHaveLength(240);
    const dispositions = candidates.map(([id]) => VERIFIED_ITEM_AUTO_CASTS[Number(id)] ? 'verified-direct-damage' : 'pending-verification');
    expect(dispositions).toHaveLength(candidates.length);
  });

  it('ships only complete verified rules with catalogued skills and explicit roll semantics', () => {
    for (const [itemId, rules] of Object.entries(VERIFIED_ITEM_AUTO_CASTS)) {
      expect(items[itemId], `item ${itemId}`).toBeDefined();
      for (const rule of rules) {
        expect(rule.key).toBeTruthy();
        expect(VALID_SKILL_IDS.has(rule.skillId), `${itemId}/${rule.skillId}`).toBe(true);
        expect(rule.skillLevel).toBeGreaterThan(0);
        expect(rule.chance).toBeGreaterThan(0);
        expect(rule.trigger).toMatch(/^(physical-attack|physical-hit|melee-physical-hit|ranged-physical-hit)$/);
        expect(rule.roll).toMatch(/^(independent|all|one-of)$/);
        expect(rule.evidence).toBeTruthy();
      }
    }
  });

  it('pins Terror Violeta clauses as two independent sources', () => {
    const description = clean(latam['1185'].description);
    expect(description).toContain('5% de chance de autoconjurar [Congelar] nv.5');
    expect(description).toContain('3% de chance de autoconjurar [Chuva de Meteoros] nv.3');
    expect(VERIFIED_ITEM_AUTO_CASTS[1185]).toHaveLength(2);
    expect(VERIFIED_ITEM_AUTO_CASTS[1185].every((rule) => rule.roll === 'independent')).toBe(true);
  });
});
