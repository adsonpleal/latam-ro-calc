import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SKILL_ID_BY_NAME, SKILL_META } from '../skills';
import { Warlock } from './Warlock';

/**
 * Esquife de Gelo's identity, after a wrong skill id sat in the catalog.
 *
 * The catalog mapped Jack Frost to **720**, which is not the skill. bROWiki names it
 * WL_JACKFROST (2204), and the client feed agrees: id 2204 carries the pt-BR
 * description, the cast/delay row and an icon, while 720 is a bare name with all three
 * fields null. The wrong id showed up twice on screen — the picker rendered a broken
 * image, because the icon CDN has nothing at 720, and the tooltip had no description to
 * print. It also kept the skill out of `skill-delay.spec.ts`, which had 720 on its
 * "no client row" exemption list.
 *
 * Every other Warlock skill in item.json was already on the real id (Comet 2213, Chain
 * Lightning 2214, Crimson Rock 2211), so this was one skill out of step, not a numbering
 * scheme. Fixing it meant moving the item bonuses with it: 24 records on the bare key and
 * 8 more on `vct__`/`cd__`, plus the Visual-enchant behavioural baseline.
 */

const ITEM_DB: Record<string, { script?: Record<string, unknown> }> = JSON.parse(
  readFileSync('src/assets/demo/data/item.json', 'utf8'),
);

const scriptKeysEndingIn = (id: string) =>
  Object.entries(ITEM_DB).flatMap(([itemId, item]) =>
    Object.keys(item.script ?? {})
      .filter((key) => key === id || key.endsWith(`__${id}`))
      .map((key) => `${itemId}: ${key}`),
  );

describe('Esquife de Gelo is WL_JACKFROST (2204)', () => {
  it('resolves the name to the id the client and bROWiki both give', () => {
    expect(SKILL_ID_BY_NAME['Jack Frost']).toBe(2204);
  });

  // A skill with no description in the catalog renders an empty tooltip, and 720 had none.
  it('carries the client description that 720 never had', () => {
    expect(SKILL_META['Jack Frost'].description).toContain('Calafrio');
  });

  it('leaves no item bonus behind on the old id', () => {
    expect(scriptKeysEndingIn('720')).toEqual([]);
    expect(scriptKeysEndingIn('2204').length).toBe(32);
  });
});

describe('The two Esquife de Gelo entries are told apart in the picker', () => {
  // Both are Water, so the picker's element-based dedup collapses them to one label —
  // it listed "Esquife de Gelo - Água" twice. The suffixes are bROWiki's own column
  // headings for the two ratios.
  it('names the normal cast and the Calafrio cast', () => {
    const entries = new Warlock().atkSkills.filter((s) => s.name === 'Jack Frost');

    expect(entries.map((s) => s.labelSuffix)).toEqual(['Normal', 'Calafrio']);
  });

  it('keeps the client ratios behind each of them', () => {
    const entries = new Warlock().atkSkills.filter((s) => s.name === 'Jack Frost');
    const at = (index: number, skillLevel: number) =>
      entries[index].formula({ skillLevel, model: { level: 100 } } as never);

    // Client table, Nv1..Nv5: normal 1.300%..2.500%, Calafrio 1.800%..4.200%.
    expect([1, 2, 3, 4, 5].map((lv) => at(0, lv))).toEqual([1300, 1600, 1900, 2200, 2500]);
    expect([1, 2, 3, 4, 5].map((lv) => at(1, lv))).toEqual([1800, 2400, 3000, 3600, 4200]);
  });
});
