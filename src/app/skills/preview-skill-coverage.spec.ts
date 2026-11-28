/**
 * Holds the two level-expansion previews to the client's own skill catalog.
 *
 * The ROADMAP 2027 lists "14 novas habilidades" under Q4 without naming one, and counting
 * dev notes can only ever produce an argument about what the fourteen are. The client
 * settles it instead: `skill-meta.generated.ts` is read out of the LATAM client's
 * `skilldescript.lub`, so the ids it publishes in each expansion's block are exactly the
 * skills that expansion shipped — whether or not LATAM has enabled them yet.
 *
 * kRO split the 275/60 expansion in two waves: 15 skills with the cap itself (2024-08-07)
 * and exactly 14 in the follow-up (the 2024-09-30 dev note says so in as many words).
 * 15 + 14 = 29, which is the block asserted below, so the roadmap's fourteen is most
 * likely that second wave and both waves are already modelled.
 *
 * What this guards is the next client sync rather than today: a genuinely new skill arrives
 * by `skill-meta.generated.ts` growing an id, and the day one lands inside either block
 * without a preview reference entry, this fails and names it.
 */
import { describe, expect, it } from 'vitest';
import { SKILL_META, SkillMetaEntry } from './index';
import { PREVIEW_275_REFERENCE } from './preview-275-reference';
import { PREVIEW_285_REFERENCE } from './preview-285-reference';

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Every id the client catalog carries, with the internal names that share it. */
const clientIds = new Map<number, string[]>();
for (const [name, meta] of Object.entries(SKILL_META) as [string, SkillMetaEntry][]) {
  if (meta.id === undefined) continue;
  const names = clientIds.get(meta.id) ?? [];
  names.push(name);
  clientIds.set(meta.id, names);
}

/**
 * The id blocks each expansion was allotted, which is what makes "is anything missing?" a
 * question with an answer. They are wider than the ids actually used — the point is that
 * the client publishes nothing inside them that the references do not cover, so there is no
 * 6500, 6501 or 6522 hiding between the two waves.
 */
const EXPANSIONS = [
  { label: '275/60', block: [...range(5496, 5510), ...range(6500, 6530)], reference: PREVIEW_275_REFERENCE, count: 29 },
  { label: '285/65', block: range(6600, 6660), reference: PREVIEW_285_REFERENCE, count: 36 },
] as const;

describe('level-expansion preview coverage', () => {
  it.each(EXPANSIONS)('covers every $label skill the client publishes', ({ block, reference, count }) => {
    const referenced = new Set(reference.map((entry) => entry.id));
    expect(referenced.size).toBe(count);

    const published = block.filter((id) => clientIds.has(id));
    const missing = published.filter((id) => !referenced.has(id));

    expect(missing.map((id) => `${id} (${clientIds.get(id).join(', ')})`), 'client publishes it, no preview models it').toEqual([]);
    expect(published.sort((a, b) => a - b)).toEqual([...referenced].sort((a, b) => a - b));
  });

  it('models no id the client does not publish', () => {
    // The mirror of the test above, and the one that catches an invented id: a reference
    // entry whose id is absent from the client catalog has no in-game skill behind it.
    const unknown = [...PREVIEW_275_REFERENCE, ...PREVIEW_285_REFERENCE]
      .filter((entry) => !clientIds.has(entry.id))
      .map((entry) => `${entry.id} ${entry.name}`);

    expect(unknown).toEqual([]);
  });

  it('keeps the two waves in their own id blocks', () => {
    // The 275/60 skills sit in two runs — 5499-5507 for the expanded classes and 6502-6521
    // for the fourth jobs — and the 285/65 ones in a single 6608-6643 run. Overlap would
    // mean one wave had been filed under the other.
    const ids275 = PREVIEW_275_REFERENCE.map((entry) => entry.id).sort((a, b) => a - b);
    const ids285 = PREVIEW_285_REFERENCE.map((entry) => entry.id).sort((a, b) => a - b);

    expect(ids275).toEqual([...range(5499, 5507), ...range(6502, 6521)]);
    expect(ids285).toEqual(range(6608, 6643));
    expect(ids275.filter((id) => ids285.includes(id))).toEqual([]);
  });
});
