import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { Inquisitor } from './Inquisitor';

/**
 * Inquisitor (Inquisidor) 4th-job attack-skill validation.
 *
 * Ground truth: an in-game LATAM replay recorded by "Luìs" on tra_fild against a
 * "Dummy - Médio" (view 21065), character at base level 239, job level 50, with
 * the trait build the user specified:
 *
 *     EST (STA) 49, SAB (WIS) 100, everything else 0.
 *
 *   https://recap.latam-tools.com.br/?r=FhVVYpGBFo  (TesteSkillsInquisidorLuís.rrf)
 *
 * POW is **0 allocated**, so the only POW the atk formulas see is the job-trait
 * bonus at job 50 — traitBonusTable[50] = [9, 6, 4, 3, 5, 6], POW slot = 9. So
 * every ratio below is evaluated at **totalPow 9, base level 239** (×2.39). The
 * POW term is tiny (27–90 out of thousands): this build isolates the skill-%
 * × base-level scaling, which is exactly what the recording exercises.
 *
 * The replay's damage packets, by client skill id:
 *   Inquisitor skills (validated here):
 *     5244 Explosion Blaster    lv5  — non-crit 44749/44827/44905, crit 63765
 *     5243 Massive Flame Blaster lv10 — non-crit 110546/110739,      crit 157523
 *   Inquisitor skill NOT modelled as an atk skill in the calc (see note below):
 *     5241 Oleum Sanctum        lv5  — 27657/27706 (early), 31805/31861 (buffed)
 *   Inherited Sura skills (defined in Sura.ts, out of scope for this file):
 *     2517 Lion Howling, 2328 Earth Shaker, 2330 Tiger Cannon,
 *     2518 Lightning Ride, 271 (SR carryover)
 *
 * These assertions lock the skill *ratio* (%ATK, floored — the server int-casts
 * the coefficient), independent of the ATK/DEF pipeline, so they stay stable
 * across gear/stat changes. The replay cross-check at the bottom compares the
 * *relative* damage between two Inquisitor skills, which cancels the (fixed,
 * within-recording) ATK and so needs no MATK/ATK reconstruction.
 */

const BASE_LEVEL = 239;
// 0 allocated POW + traitBonusTable[50][0] (= 9). Cross-checked against the
// replay's MFB/EB damage ratio below (which favours 9 over 0).
const TOTAL_POW = 9;
// Current HP sampled from the replay (paramChange type 5). Only Third Flame Bomb
// reads maxHp, and it does not appear in this recording, so its lock is a pure
// characterization value.
const MAX_HP = 94581;

const stubBonuses = (activeSkills: string[] = []) =>
  ({
    activeSkillNames: new Set<string>(activeSkills),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>(),
    usedSkillMap: new Map<string, number>(),
  } as any);

const inq = (activeSkills: string[] = []): Inquisitor => {
  const c = new Inquisitor();
  (c as any).bonuses = stubBonuses(activeSkills);
  return c;
};

const findSkill = (char: Inquisitor, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  return skill;
};

// A monster whose isRace() answers true only for the given races.
const monsterOf = (...races: string[]) => ({
  isRace: (...r: string[]) => r.some((x) => races.includes(x)),
  isMVP: false,
});

/**
 * The server casts the skill ratio to int, so floor to match (skill-ratio
 * truncation convention). Formulas scale by baseLevel/100 (239/100 = 2.39),
 * which can land a hair off an integer in JS float, so a plain Math.floor —
 * not the float-correcting helper — mirrors the game.
 */
const ratioOf = (char: Inquisitor, name: string, skillLevel: number, monster?: unknown) =>
  Math.floor(
    findSkill(char, name).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalPow: TOTAL_POW },
      monster,
      maxHp: MAX_HP,
    } as any),
  );

describe('Inquisitor atk-skill ratios @ base 239, POW 9 (replay scenario)', () => {
  // ---- Skills that appear in the replay ------------------------------------

  // Explosion Blaster (5244), ranged, can crit. Branches on the Oleum Sanctum
  // debuff being active on the caster's side:
  //   no oleum: (5*650 + 9*3) * 2.39 = 3277 * 2.39 = 7832.03 -> 7832
  //   oleum:    (5*850 + 9*5) * 2.39 = 4295 * 2.39 = 10265.05 -> 10265
  describe('Explosion Blaster (id 5244)', () => {
    it('Lv5 without Oleum Sanctum → 7832', () => {
      expect(ratioOf(inq(), 'Explosion Blaster', 5)).toBe(7832);
    });
    it('Lv5 with Oleum Sanctum active → 10265', () => {
      expect(ratioOf(inq(['Oleum Sanctum']), 'Explosion Blaster', 5)).toBe(10265);
    });
  });

  // Massive Flame Blaster (5243), ranged, can crit, +300%/lv vs Demon/Brute:
  //   normal:       (10*800 + 9*10) * 2.39 = 8090 * 2.39 = 19335.1 -> 19335
  //   demon/brute:  (10*1100 + 9*10) * 2.39 = 11090 * 2.39 = 26505.1 -> 26505
  describe('Massive Flame Blaster (id 5243, Lv10)', () => {
    it('vs a non-Demon/Brute target → 19335', () => {
      expect(ratioOf(inq(), 'Massive Flame Blaster', 10, monsterOf('fish'))).toBe(19335);
    });
    it('vs Brute → 26505', () => {
      expect(ratioOf(inq(), 'Massive Flame Blaster', 10, monsterOf('brute'))).toBe(26505);
    });
    it('vs Demon → 26505', () => {
      expect(ratioOf(inq(), 'Massive Flame Blaster', 10, monsterOf('demon'))).toBe(26505);
    });
  });

  // ---- Rest of the Inquisitor atk tree (not in this replay; locked against
  //      the in-game tooltip %ATK, see skill-meta.generated.ts) --------------
  describe('remaining Inquisitor atk tree (tooltip-locked characterization)', () => {
    // First Brand    5*450 tooltip 2250% : (2250 + 27) * 2.39 = 5442.03 -> 5442
    it('First Brand Lv5 → 5442', () => {
      expect(ratioOf(inq(), 'First Brand', 5)).toBe(5442);
    });
    // Second Faith   5*500 tooltip 2500% : (2500 + 36) * 2.39 = 6061.04 -> 6061
    it('Second Faith Lv5 → 6061', () => {
      expect(ratioOf(inq(), 'Second Faith', 5)).toBe(6061);
    });
    // Third Punish   5*650 tooltip 3250% : (3250 + 45) * 2.39 = 7875.05 -> 7875
    it('Third Punish Lv5 → 7875', () => {
      expect(ratioOf(inq(), 'Third Punish', 5)).toBe(7875);
    });
    // Second Judgement 5*500 tooltip 2500% : (2500 + 36) * 2.39 = 6061
    it('Second Judgement Lv5 → 6061', () => {
      expect(ratioOf(inq(), 'Second Judgement', 5)).toBe(6061);
    });
    // Third Consecration 5*650 tooltip 3250% : (3250 + 45) * 2.39 = 7875
    it('Third Consecration Lv5 → 7875', () => {
      expect(ratioOf(inq(), 'Third Consecration', 5)).toBe(7875);
    });
    // Second Flame   5*550 tooltip 2750% : (2750 + 36) * 2.39 = 6658.54 -> 6658
    it('Second Flame Lv5 → 6658', () => {
      expect(ratioOf(inq(), 'Second Flame', 5)).toBe(6658);
    });
    // Third Flame Bomb  (5*650 + 45 + floor(94581/5)) * 2.39
    //                 = (3250 + 45 + 18916) * 2.39 = 22211 * 2.39 = 53084.29 -> 53084
    it('Third Flame Bomb Lv5 (maxHp 94581) → 53084', () => {
      expect(ratioOf(inq(), 'Third Flame Bomb', 5)).toBe(53084);
    });
  });
});

/**
 * Cross-check against the raw replay damage. Damage ≈ ATK × ratio / 100 with ATK
 * fixed inside one recording, so the ratio *between* two skills' non-crit damage
 * must equal the ratio between their skill ratios (up to independent flooring) —
 * no ATK reconstruction needed. Representative non-crit packets:
 *
 *   Explosion Blaster (5244) Lv5  non-crit ≈ 44827   crit 63765
 *   Massive Flame Blaster (5243) Lv10 non-crit ≈ 110739  crit 157523
 */
describe('Inquisitor — replay ground-truth cross-check', () => {
  const EB_NONCRIT = 44827; // Explosion Blaster, no-oleum
  const EB_CRIT = 63765;
  const MFB_NONCRIT = 110739; // Massive Flame Blaster, vs the non-Demon/Brute dummy
  const MFB_CRIT = 157523;

  it('MFB / Explosion Blaster non-crit damage matches the no-oleum formula ratio', () => {
    const observed = MFB_NONCRIT / EB_NONCRIT; // 2.4704
    const formula =
      ratioOf(inq(), 'Massive Flame Blaster', 10, monsterOf('fish')) /
      ratioOf(inq(), 'Explosion Blaster', 5); // 19335 / 7832 = 2.4688
    expect(observed).toBeCloseTo(formula, 2);
  });

  it('the replay ran Explosion Blaster WITHOUT Oleum (matches the no-oleum branch, not oleum)', () => {
    const observed = MFB_NONCRIT / EB_NONCRIT; // 2.4704
    const mfb = ratioOf(inq(), 'Massive Flame Blaster', 10, monsterOf('fish'));
    const noOleum = mfb / ratioOf(inq(), 'Explosion Blaster', 5); // 2.4688
    const withOleum = mfb / ratioOf(inq(['Oleum Sanctum']), 'Explosion Blaster', 5); // 1.8836
    expect(Math.abs(observed - noOleum)).toBeLessThan(Math.abs(observed - withOleum));
  });

  it('Explosion Blaster and Massive Flame Blaster share one crit multiplier (both physical)', () => {
    // Both skills are physical + canCri, so their crit/non-crit ratio is the
    // same pipeline multiplier (~1.4225), independent of the skill formula.
    expect(EB_CRIT / EB_NONCRIT).toBeCloseTo(MFB_CRIT / MFB_NONCRIT, 3);
  });
});
