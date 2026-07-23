import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { SkyEmperor } from './SkyEmperor';

/**
 * Sky Emperor (Mestre Celestial) 4th-job attack-skill validation.
 *
 * Ground truth: the LATAM 2nd-version skill tables published by Sigma the Fallen,
 *   https://sigmathefallen.blogspot.com/2025/02/sky-emperor-2nd-version.html
 * reached from that blog's "Supplemental Class (2nd version)" selector. LATAM ships
 * the 2nd version of the Expanded 4th-class rebalance, which is what the `[V2]`
 * labels in SkyEmperor.ts mark.
 *
 * No replay exists for this class yet — it is only now being surfaced in the UI
 * (the class now ships in the LATAM GRF), so these assertions
 * encode the published formulas rather than observed damage packets. Replace the
 * expectations with replay-derived values if a recording turns up.
 *
 * Every Sky Emperor ratio scales with the Sky Mastery passive, so the fixtures pin
 * it explicitly. Assertions lock the skill *ratio* (%ATK), floored, because the
 * server int-casts the coefficient — deliberately plain Math.floor, not the repo's
 * float-correcting helper.
 *
 * Celestial state matters: Noon Blast/Sunset Blast only crit in their own phase,
 * and Midnight Kick/Dawn Break switch formula branch by moon phase. Those states
 * live in the private state-only skills `_SkyEmperor_Rising_Sun` /
 * `_SkyEmperor_Rising_Moon`, stubbed here via usedSkillMap.
 */

const BASE_LEVEL = 250;
const TOTAL_POW = 100;
const SKY_MASTERY = 10;

// Celestial phases, mirroring the RisingSun/RisingMoon consts in SkyEmperor.ts.
const SUN = { Sunrise: 1, Noon: 2, Sunset: 3 } as const;
const MOON = { Moonrise: 1, Midnight: 2, Moonset: 3 } as const;

const stubBonuses = (used: Record<string, number> = {}, skyMastery = SKY_MASTERY) =>
  ({
    activeSkillNames: new Set<string>(),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>([['Sky Mastery', skyMastery]]),
    usedSkillMap: new Map<string, number>(Object.entries(used)),
  } as any);

const sky = (used: Record<string, number> = {}, skyMastery = SKY_MASTERY): SkyEmperor => {
  const c = new SkyEmperor();
  (c as any).bonuses = stubBonuses(used, skyMastery);
  return c;
};

const findSkill = (char: SkyEmperor, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  return skill;
};

const ratioOf = (char: SkyEmperor, name: string, skillLevel: number) =>
  Math.floor(
    findSkill(char, name).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalPow: TOTAL_POW },
    } as any),
  );

// canCri is declared as an arrow function in the class body, so it closes over the
// instance that built it — it must be read off the very instance whose celestial
// state we want, and cannot be .call()'d onto another one.
const canCriOf = (char: SkyEmperor, name: string) => (findSkill(char, name).canCri as () => boolean)();

// (base + skillLv * (perLv + Sky Mastery * masteryPerLv) + POW * powMul) * baseLv/100
const expected = (base: number, perLv: number, masteryPerLv: number, powMul: number, skillLevel: number) =>
  Math.floor((base + skillLevel * (perLv + SKY_MASTERY * masteryPerLv) + TOTAL_POW * powMul) * (BASE_LEVEL / 100));

describe('Sky Emperor atk-skill ratios @ base 250, POW 100, Sky Mastery 10', () => {
  describe('Noon Blast (id 5466)', () => {
    // (1600 + (SkillLv x (1250 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100
    it('Lv5 matches the published formula', () => {
      expect(ratioOf(sky(), 'Noon Blast', 5)).toBe(expected(1600, 1250, 5, 5, 5));
    });

    it('Lv1 matches the published formula', () => {
      expect(ratioOf(sky(), 'Noon Blast', 1)).toBe(expected(1600, 1250, 5, 5, 1));
    });

    it('scales with Sky Mastery — Lv5 at mastery 0 is 250 ratio lower per mastery step', () => {
      const atMastery0 = Math.floor((1600 + 5 * 1250 + TOTAL_POW * 5) * (BASE_LEVEL / 100));
      expect(
        Math.floor(
          findSkill(sky({}, 0), 'Noon Blast').formula({
            model: { level: BASE_LEVEL },
            skillLevel: 5,
            status: { totalPow: TOTAL_POW },
          } as any),
        ),
      ).toBe(atMastery0);
    });

    it('can only crit during the Noon phase', () => {
      expect(canCriOf(sky({ _SkyEmperor_Rising_Sun: SUN.Noon }), 'Noon Blast')).toBe(true);
      expect(canCriOf(sky({ _SkyEmperor_Rising_Sun: SUN.Sunrise }), 'Noon Blast')).toBe(false);
      expect(canCriOf(sky({ _SkyEmperor_Rising_Sun: SUN.Sunset }), 'Noon Blast')).toBe(false);
    });
  });

  describe('Sunset Blast (id 5467)', () => {
    // (950 + (SkillLv x (400 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100
    it('Lv5 matches the published formula', () => {
      expect(ratioOf(sky(), 'Sunset Blast', 5)).toBe(expected(950, 400, 5, 5, 5));
    });

    it('can only crit during the Sunset phase', () => {
      expect(canCriOf(sky({ _SkyEmperor_Rising_Sun: SUN.Sunset }), 'Sunset Blast')).toBe(true);
      expect(canCriOf(sky({ _SkyEmperor_Rising_Sun: SUN.Noon }), 'Sunset Blast')).toBe(false);
    });
  });

  describe('Midnight Kick (id 5469)', () => {
    // Moonrise:  (600  + (SkillLv x (1200 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100
    // Midnight:  (1550 + (SkillLv x (1450 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100
    it('Lv5 outside Midnight uses the base branch', () => {
      expect(ratioOf(sky({ _SkyEmperor_Rising_Moon: MOON.Moonrise }), 'Midnight Kick', 5)).toBe(
        expected(600, 1200, 5, 5, 5),
      );
    });

    it('Lv5 during Midnight uses the boosted branch', () => {
      expect(ratioOf(sky({ _SkyEmperor_Rising_Moon: MOON.Midnight }), 'Midnight Kick', 5)).toBe(
        expected(1550, 1450, 5, 5, 5),
      );
    });

    it('Midnight is a strict upgrade over Moonrise', () => {
      expect(ratioOf(sky({ _SkyEmperor_Rising_Moon: MOON.Midnight }), 'Midnight Kick', 5)).toBeGreaterThan(
        ratioOf(sky({ _SkyEmperor_Rising_Moon: MOON.Moonrise }), 'Midnight Kick', 5),
      );
    });
  });

  describe('Dawn Break (id 5470)', () => {
    // Midnight: (400 + (SkillLv x (400 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100
    // Moonset:  (400 + (SkillLv x (600 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100
    it('Lv5 outside Moonset uses the base branch', () => {
      expect(ratioOf(sky({ _SkyEmperor_Rising_Moon: MOON.Midnight }), 'Dawn Break', 5)).toBe(
        expected(400, 400, 5, 5, 5),
      );
    });

    it('Lv5 during Moonset uses the boosted branch', () => {
      expect(ratioOf(sky({ _SkyEmperor_Rising_Moon: MOON.Moonset }), 'Dawn Break', 5)).toBe(
        expected(400, 600, 5, 5, 5),
      );
    });
  });

  describe('Star Cannon (id 5473)', () => {
    // (200 + (SkillLv x (500 + Sky Mastery Lv x 5)) + POW x 5) x BaseLv/100 per hit
    it('Lv5 matches the published per-hit formula', () => {
      expect(ratioOf(sky(), 'Star Cannon', 5)).toBe(expected(200, 500, 5, 5, 5));
    });
  });
});

describe('Sky Emperor cast/cooldown metadata (2nd version)', () => {
  // Published as "variable cast / fixed cast | cooldown"; the model stores
  // vct = variable, fct = fixed, cd = cooldown, all in seconds.
  const cases: { name: string; vct: number; fct: number; cd: number }[] = [
    { name: 'Noon Blast', vct: 0, fct: 0, cd: 0.7 },
    { name: 'Sunset Blast', vct: 0, fct: 0, cd: 0.3 },
    { name: 'Midnight Kick', vct: 1, fct: 0.5, cd: 0.7 },
    { name: 'Dawn Break', vct: 1, fct: 0.5, cd: 0.3 },
    // "Cast: 0s variable, 0.5s fixed | Cooldown: 5s"
    { name: 'Star Cannon', vct: 0, fct: 0.5, cd: 5 },
  ];

  it.each(cases)('$name has vct $vct, fct $fct, cd $cd', ({ name, vct, fct, cd }) => {
    const skill = findSkill(sky(), name);
    expect({ vct: skill.vct, fct: skill.fct, cd: skill.cd }).toEqual({ vct, fct, cd });
  });
});
