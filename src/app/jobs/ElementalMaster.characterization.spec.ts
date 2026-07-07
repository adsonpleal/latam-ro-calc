import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { ElementalMaster } from './ElementalMaster';

/**
 * Elemental Master (Elementalista) 2nd-version attack-skill validation.
 *
 * Ground truth: two in-game LATAM replays recorded by "Ted." on tra_fild against
 * elemental dummies, character at base level 239 with **100 FEI (SPL) invested**
 * — total SPL **110** after the +10 EM job-trait bonus at job level 50
 * (traitBonusTable[50] = [3, 6, 6, 10, 5, 3], the SPL slot is 10).
 *
 *   with weapon (book):  https://recap.latam-tools.com.br/?r=6AtvDJoia4  (TesteEMlatamtools.rrf)
 *   no weapon:           https://recap.latam-tools.com.br/?r=oWqKSdBeZC  (testesemarma.rrf)
 *
 * No elemental spirit was summoned in either recording (every hit-5 skill dealt
 * the same total, every 10-hit skill the same per-hit — a summon would have
 * boosted only its own element), so the replays validate the *no-spirit* branch;
 * the spirit branch is validated against the skill formulas below.
 *
 * The formulas agree across three independent sources:
 *   1. Sigma the Fallen rebalance blog (the PDF the user referenced).
 *   2. The calc's own in-game tooltip data (skill-meta.generated.ts): e.g.
 *      Diamond Storm Lv5 = 6.250% / 12.250% (Diluvium), Conflagration = 2.000% / 4.000%.
 *   3. The replay damage numbers cross-checked at the bottom of this file.
 *
 * These assertions lock the skill *ratio* (%MATK), which is what the server
 * int-casts and what the in-game formula defines — independent of the MATK/MDEF
 * pipeline, so they stay stable across gear/stat changes.
 */

const BASE_LEVEL = 239;
const SPL = 110;

// ElementalMaster._spirit dropdown values.
const SPIRIT = { Divulio: 1, Ardor: 2, Procella: 3, Terramotus: 4, Serpens: 5 } as const;

const stubBonuses = (spirit = 0) =>
  ({
    activeSkillNames: new Set<string>(),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>(),
    usedSkillMap: new Map<string, number>(spirit ? [['_ElementalMaster_spirit', spirit]] : []),
  } as any);

const em = (spirit = 0): ElementalMaster => {
  const c = new ElementalMaster();
  (c as any).bonuses = stubBonuses(spirit);
  return c;
};

const findSkill = (char: ElementalMaster, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  return skill;
};

// A monster whose isRace() answers true only for the given races.
const monsterOf = (...races: string[]) => ({ isRace: (...r: string[]) => r.some((x) => races.includes(x)) });

/**
 * The in-game server casts the skill ratio to int, so floor to match (see the
 * skill-ratio-truncation convention). Formulas that scale by baseLevel/100
 * (239/100 = 2.39) can land a hair above/below an integer in JS float, so a
 * plain Math.floor — not the float-correcting helper — mirrors the game.
 */
const ratioOf = (char: ElementalMaster, name: string, skillLevel: number, monster?: unknown) =>
  Math.floor(
    findSkill(char, name).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalSpl: SPL },
      monster,
    } as any),
  );

describe('Elemental Master atk-skill ratios @ base 239, SPL 110 (replay scenario)', () => {
  // Diamond Storm / Terra Drive share one formula:
  //   no spirit: (5*1250 + 110*5) * 2.39 = 6800 * 2.39 = 16252
  //   spirit:    (3500 + 5*1750 + 110*7) * 2.39 = 13020 * 2.39 = 31117.8 -> 31117
  describe('Diamond Storm (Water, id 5369, displays 5×)', () => {
    it('Lv5 no spirit → 16252', () => {
      expect(ratioOf(em(), 'Diamond Storm', 5)).toBe(16252);
    });
    it('Lv5 Divulio summoned → 31117', () => {
      expect(ratioOf(em(SPIRIT.Divulio), 'Diamond Storm', 5)).toBe(31117);
    });
    it('a non-matching spirit (Ardor) does NOT trigger the boost', () => {
      expect(ratioOf(em(SPIRIT.Ardor), 'Diamond Storm', 5)).toBe(16252);
    });
  });

  describe('Terra Drive (Earth, id 5373, displays 5×)', () => {
    it('Lv5 no spirit → 16252', () => {
      expect(ratioOf(em(), 'Terra Drive', 5)).toBe(16252);
    });
    it('Lv5 Terramotus summoned → 31117', () => {
      expect(ratioOf(em(SPIRIT.Terramotus), 'Terra Drive', 5)).toBe(31117);
    });
  });

  // Conflagration / Lightning Land / Venom Swamp share one *per-hit* formula
  // (10 continuous hits):
  //   no spirit: (5*400 + 110*5) * 2.39 = 2550 * 2.39 = 6094.5 -> 6094
  //   spirit:    (5*800 + 110*7) * 2.39 = 4770 * 2.39 = 11400.3 -> 11400
  describe('Conflagration (Fire, id 5372, 10 hits)', () => {
    it('Lv5 no spirit → 6094 per hit', () => {
      expect(ratioOf(em(), 'Conflagration', 5)).toBe(6094);
    });
    it('Lv5 Ardor summoned → 11400 per hit', () => {
      expect(ratioOf(em(SPIRIT.Ardor), 'Conflagration', 5)).toBe(11400);
    });
  });

  describe('Lightning Land (Wind, id 5370, 10 hits)', () => {
    it('Lv5 no spirit → 6094 per hit', () => {
      expect(ratioOf(em(), 'Lightning Land', 5)).toBe(6094);
    });
    it('Lv5 Procella summoned → 11400 per hit', () => {
      expect(ratioOf(em(SPIRIT.Procella), 'Lightning Land', 5)).toBe(11400);
    });
  });

  describe('Venom Swamp (Poison, id 5371, 10 hits)', () => {
    it('Lv5 no spirit → 6094 per hit', () => {
      expect(ratioOf(em(), 'Venom Swamp', 5)).toBe(6094);
    });
    it('Lv5 Serpens summoned → 11400 per hit', () => {
      expect(ratioOf(em(SPIRIT.Serpens), 'Venom Swamp', 5)).toBe(11400);
    });
  });

  // Elemental Buster (displays 3×), branches on target race, not on spirit:
  //   normal:          (10*480 + 110*10) * 2.39 = 5900 * 2.39 = 14101
  //   dragon/formless: (10*1100 + 110*10) * 2.39 = 12100 * 2.39 = 28919
  describe('Elemental Buster (id 5379, displays 3×)', () => {
    it('Lv10 vs a normal race → 14101', () => {
      expect(ratioOf(em(), 'Elemental Buster', 10, monsterOf('demihuman'))).toBe(14101);
    });
    it('Lv10 vs Dragon → 28919', () => {
      expect(ratioOf(em(), 'Elemental Buster', 10, monsterOf('dragon'))).toBe(28919);
    });
    it('Lv10 vs Formless → 28919', () => {
      expect(ratioOf(em(), 'Elemental Buster', 10, monsterOf('formless'))).toBe(28919);
    });
  });
});

/**
 * Cross-check against the raw replay damage on the neutral dummy ("Dummy - Neutro",
 * view 21077 — neutral defense means every element lands at 100%, isolating the
 * ratio). The **no-weapon** run is deterministic (no weapon-MATK variance), so
 * these are exact per-recording numbers:
 *
 *   Diamond Storm (5369) total  = 191585  (hits=5, one packet)
 *   Terra Drive   (5373) total  = 191585  (identical → same formula, no spirit)
 *   Conflagration (5372) per hit = 71823
 *   Lightning Land(5370) per hit = 71823
 *   Venom Swamp   (5371) per hit = 71823  (all identical → same formula, no spirit)
 *
 * Because damage ≈ MATK × ratio / 100 and MATK is fixed within a recording, the
 * ratio *between* two skills' damage must equal the ratio between their skill
 * ratios (up to independent per-hit flooring). This proves the calc's relative
 * scaling reproduces the in-game numbers without needing to reconstruct MATK.
 */
describe('Elemental Master — replay ground-truth cross-check (no-weapon, deterministic)', () => {
  const DS_TOTAL = 191585; // Diamond Storm & Terra Drive
  const CF_PER_HIT = 71823; // Conflagration, Lightning Land & Venom Swamp

  it('Diamond Storm total / Conflagration per-hit matches the formula ratio', () => {
    const observed = DS_TOTAL / CF_PER_HIT; // 2.66746
    const formula = ratioOf(em(), 'Diamond Storm', 5) / ratioOf(em(), 'Conflagration', 5); // 16252/6094
    // Within rounding: each damage number is floored independently in the pipeline.
    expect(observed).toBeCloseTo(formula, 2);
  });

  it('the three 10-hit skills share a formula (identical per-hit damage in-game)', () => {
    expect(ratioOf(em(), 'Conflagration', 5)).toBe(ratioOf(em(), 'Lightning Land', 5));
    expect(ratioOf(em(), 'Lightning Land', 5)).toBe(ratioOf(em(), 'Venom Swamp', 5));
  });

  it('the two hit-5 skills share a formula (identical total damage in-game)', () => {
    expect(ratioOf(em(), 'Diamond Storm', 5)).toBe(ratioOf(em(), 'Terra Drive', 5));
  });
});
