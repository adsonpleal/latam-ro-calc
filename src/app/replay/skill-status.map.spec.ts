import { describe, expect, it } from 'vitest';
import { loadReplayFixture } from './__tests__/load-fixture';
import { importReplayBuffer } from './replay-to-model';
import { makeBuffGate } from './skill-status.map';

// Minimal item map — this test only cares about skills/statuses, not gear.
const emptyItems = {} as any;

describe('makeBuffGate — positive-confirmation buff/effect import gating', () => {
  it('imports a mapped buff only when its EFST status is active', () => {
    const gateWithWater = makeBuffGate([91]); // Geada (Frost Weapon) active
    expect(gateWithWater('Frost Weapon')).toBe(true);
    expect(gateWithWater('Endow Blaze')).toBe(false); // Chamas (90) not up
    expect(gateWithWater('Lightning Loader')).toBe(false); // Ventania (92) not up
    expect(gateWithWater('Seismic Weapon')).toBe(false); // Terremoto (93) not up

    const gateWithFire = makeBuffGate([90]); // Chamas (Endow Blaze) active
    expect(gateWithFire('Endow Blaze')).toBe(true);
    expect(gateWithFire('Frost Weapon')).toBe(false);
  });

  it('skips anything whose active state cannot be confirmed', () => {
    const gate = makeBuffGate([91]); // only Geada active
    expect(gate('Lightning Loader')).toBe(false); // mapped + not active
    expect(gate('Magic Book Mastery')).toBe(false); // unmapped → cannot confirm → skip
    expect(gate('Foresight')).toBe(false); // unmapped → skip
  });
});

/**
 * Ground truth: the LATAM EM replay (recap ?r=6AtvDJoia4) learned Frost Weapon,
 * Lightning Loader and Seismic Weapon at Lv5, but cast none of them — the only
 * status up on the player was EFST 46. Importing must therefore NOT switch the
 * endow buffs on (the reported "starts at Lv5" bug).
 */
describe('replay import surfaces active statuses (endow learned but not active)', () => {
  const { learnedSkills, activeStatuses } = importReplayBuffer(
    loadReplayFixture('em-endow-learned-not-active.rrf'),
    emptyItems,
  );

  it('the endow skills are in the learned tree at Lv5', () => {
    expect(learnedSkills[281]).toBe(5); // Frost Weapon
    expect(learnedSkills[282]).toBe(5); // Lightning Loader
    expect(learnedSkills[283]).toBe(5); // Seismic Weapon
  });

  it('no endow status was active — only EFST 46 was up', () => {
    expect(activeStatuses).toContain(46);
    expect(activeStatuses).not.toContain(91);
    expect(activeStatuses).not.toContain(92);
    expect(activeStatuses).not.toContain(93);
  });

  it('the gate built from this replay blocks all three endow skills', () => {
    const gate = makeBuffGate(activeStatuses);
    expect(gate('Frost Weapon')).toBe(false);
    expect(gate('Lightning Loader')).toBe(false);
    expect(gate('Seismic Weapon')).toBe(false);
  });
});
