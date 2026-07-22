import { describe, expect, it } from 'vitest';
import { resolveAspdPotionFromStatus, resolveBuffsFromStatus } from './replay-buffs';

describe('resolveAspdPotionFromStatus', () => {
  it('maps the ASPD-potion EFSTs to their item ids, strongest single-select wins', () => {
    // Despertar (38) replaces Concentração (37): pick the stronger one.
    expect(resolveAspdPotionFromStatus([37, 38])).toEqual({ aspdPotion: 656, aspdPotions: [] });
    expect(resolveAspdPotionFromStatus([37])).toEqual({ aspdPotion: 645, aspdPotions: [] });
    expect(resolveAspdPotionFromStatus([39])).toEqual({ aspdPotion: 657, aspdPotions: [] });
  });

  it('adds Poção de Ouro (647) as a stackable potion', () => {
    expect(resolveAspdPotionFromStatus([38, 647])).toEqual({ aspdPotion: 656, aspdPotions: [12684] });
  });

  it('is empty when no potion status is active', () => {
    expect(resolveAspdPotionFromStatus([10, 12, 673])).toEqual({ aspdPotions: [] });
  });
});

describe('resolveBuffsFromStatus', () => {
  it('switches on Bênção and Aumentar Agilidade from their EFSTs', () => {
    const out = resolveBuffsFromStatus([10, 12]);
    expect(out['Clementia']).toBe(10); // Bênção
    expect(out['Cantocandidus']).toBe(10); // Aumentar Agilidade
  });

  it('ignores unmapped / unknown statuses', () => {
    expect(resolveBuffsFromStatus([673, 999])).toEqual({});
  });
});
