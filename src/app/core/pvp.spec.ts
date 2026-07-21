import { describe, expect, it } from 'vitest';
import { defenderReductionMultiplier, defenderReductionSteps, pvpChannelOf, woeFleeMultiplier, woeGlobalMultiplier } from './pvp';

describe('pvp reduction math', () => {
  describe('woeGlobalMultiplier — Luís validated table (docs/pvp.md §2)', () => {
    it('open PVP applies no castle reduction on any channel', () => {
      expect(woeGlobalMultiplier('pvp', 'phys_melee')).toBe(1);
      expect(woeGlobalMultiplier('pvp', 'phys_ranged')).toBe(1);
      expect(woeGlobalMultiplier('pvp', 'skill')).toBe(1);
    });

    it("normal castle: −70% across the board (the '1kk → 300k' anchor)", () => {
      expect(woeGlobalMultiplier('woe', 'phys_melee')).toBe(0.3);
      expect(woeGlobalMultiplier('woe', 'phys_ranged')).toBe(0.3);
      expect(woeGlobalMultiplier('woe', 'skill')).toBe(0.3);
      // 1kk asura → 300k inside a normal castle
      expect(1_000_000 * woeGlobalMultiplier('woe', 'skill')).toBe(300_000);
    });

    it('TE castle: melee full, ranged −20%, skills −40%', () => {
      expect(woeGlobalMultiplier('woe-te', 'phys_melee')).toBe(1);
      expect(woeGlobalMultiplier('woe-te', 'phys_ranged')).toBe(0.8);
      expect(woeGlobalMultiplier('woe-te', 'skill')).toBe(0.6);
    });

    it('mode none is a no-op', () => {
      expect(woeGlobalMultiplier('none', 'skill')).toBe(1);
    });
  });

  describe('woeFleeMultiplier', () => {
    it('reduces target flee 20% inside both castle modes, not open PVP', () => {
      expect(woeFleeMultiplier('woe')).toBe(0.8);
      expect(woeFleeMultiplier('woe-te')).toBe(0.8);
      expect(woeFleeMultiplier('pvp')).toBe(1);
      expect(woeFleeMultiplier('none')).toBe(1);
    });
  });

  describe('pvpChannelOf — only basic attacks split melee/ranged; all skills are skill', () => {
    it('classifies basic attacks by range', () => {
      expect(pvpChannelOf({ isSkill: false, isMelee: true })).toBe('phys_melee');
      expect(pvpChannelOf({ isSkill: false, isMelee: false })).toBe('phys_ranged');
    });
    it('classifies any skill as skill regardless of range', () => {
      expect(pvpChannelOf({ isSkill: true, isMelee: true })).toBe('skill');
      expect(pvpChannelOf({ isSkill: true, isMelee: false })).toBe('skill');
    });
  });

  describe('defenderReductionMultiplier', () => {
    const base = {
      dmgType: 'physical' as const,
      attackerRace: 'player_human',
      attackerElement: 'neutral',
      attackerSize: 'm' as const,
      attackerType: 'normal' as const,
    };

    it('no defensive gear → no reduction', () => {
      expect(defenderReductionMultiplier({ ...base, bonus: {} })).toBe(1);
    });

    it('Thanatos-mask shape: dmg_taken_all 5% reduces both phys and magic', () => {
      expect(defenderReductionMultiplier({ ...base, bonus: { dmg_taken_all: 5 } })).toBeCloseTo(0.95, 10);
      expect(defenderReductionMultiplier({ ...base, dmgType: 'magical', bonus: { dmg_taken_all: 5 } })).toBeCloseTo(0.95, 10);
    });

    it('dmg_taken_physical only applies to physical', () => {
      expect(defenderReductionMultiplier({ ...base, bonus: { dmg_taken_physical: 10 } })).toBeCloseTo(0.9, 10);
      expect(defenderReductionMultiplier({ ...base, dmgType: 'magical', bonus: { dmg_taken_physical: 10 } })).toBe(1);
    });

    it('subrace matches the attacker race, not other races', () => {
      expect(defenderReductionMultiplier({ ...base, bonus: { subrace_player_human: 20 } })).toBeCloseTo(0.8, 10);
      expect(defenderReductionMultiplier({ ...base, attackerRace: 'player_doram', bonus: { subrace_player_human: 20 } })).toBe(1);
    });

    it('categories combine multiplicatively; values within a category sum', () => {
      // subele_all 10 + subele_neutral 10 = 20% ele, plus dmg_taken_all 5%
      const m = defenderReductionMultiplier({ ...base, bonus: { subele_all: 10, subele_neutral: 10, dmg_taken_all: 5 } });
      expect(m).toBeCloseTo(0.8 * 0.95, 10);
    });

    it('a single category is clamped so it cannot flip damage negative', () => {
      expect(defenderReductionMultiplier({ ...base, bonus: { dmg_taken_all: 150 } })).toBe(0);
    });
  });

  describe('defenderReductionSteps — one named step per applied category', () => {
    const base = { dmgType: 'physical' as const, attackerRace: 'player_human', attackerElement: 'neutral', attackerSize: 'm' as const, attackerType: 'normal' as const };

    it('emits only nonzero categories, named + keyed, factors multiplying to the combined value', () => {
      const steps = defenderReductionSteps({ ...base, bonus: { subrace_player_human: 10, subele_neutral: 20, dmg_taken_all: 5 } });
      expect(steps.map((s) => s.label)).toEqual(['Redução Humano', 'Redução Neutro', 'Redução plana']);
      expect(steps.find((s) => s.label === 'Redução Humano')).toMatchObject({ keys: ['subrace_all', 'subrace_player_human'], factor: 0.9 });
      expect(steps.find((s) => s.label === 'Redução Neutro')).toMatchObject({ keys: ['subele_all', 'subele_neutral'], factor: 0.8 });
      const combined = steps.reduce((m, s) => m * s.factor, 1);
      expect(combined).toBeCloseTo(defenderReductionMultiplier({ ...base, bonus: { subrace_player_human: 10, subele_neutral: 20, dmg_taken_all: 5 } }), 10);
    });

    it('names the element by the attack element and the race by the attacker', () => {
      expect(defenderReductionSteps({ ...base, attackerElement: 'fire', bonus: { subele_fire: 15 } })[0].label).toBe('Redução Fogo');
      expect(defenderReductionSteps({ ...base, attackerRace: 'player_doram', bonus: { subrace_player_doram: 12 } })[0].label).toBe('Redução Doram');
    });

    it('is empty when nothing applies', () => {
      expect(defenderReductionSteps({ ...base, bonus: {} })).toEqual([]);
    });
  });
});
