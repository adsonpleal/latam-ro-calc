import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { SkyEmperor } from './SkyEmperor';

/**
 * Sky Emperor (Mestre Celestial) 4th-job attack-skill validation.
 *
 * Ground truth: the **client's own pt-BR/EN skill descriptions** shipped in the skill
 * catalog (src/app/skills/skill-meta.generated.ts), cross-checked against browiki.org.
 * The ratios they give are confirmed end-to-end by an in-game recording — see
 * SkyEmperor.replay.spec.ts, which pins six of them to the exact integer.
 *
 * These tables replaced the LATAM "2nd version" tables published by Sigma the Fallen
 * (sigmathefallen.blogspot.com), which this class used to encode: every skill except
 * Star Cannon had different numbers there, and the recording rules them out.
 *
 * Every Sky Emperor ratio scales with the Sky Mastery passive, so the fixtures pin it
 * explicitly. Assertions lock the skill *ratio* (%ATK), floored, because the server
 * int-casts the coefficient — deliberately plain Math.floor, not the repo's
 * float-correcting helper.
 *
 * Celestial state matters: Noon Blast/Sunset Blast only crit in their own phase, and
 * Midnight Kick/Dawn Break switch formula branch by moon phase. All six phases plus
 * Elo Celestial live in one state-only skill, `_SkyEmperor_Celestial_Space`, stubbed
 * here via usedSkillMap.
 */

const BASE_LEVEL = 250;
const TOTAL_POW = 100;
const SKY_MASTERY = 10;

// Celestial Space phases, mirroring the CelestialSpace const in SkyEmperor.ts.
const SPACE = {
  Sunrise: 1,
  Noon: 2,
  Sunset: 3,
  Moonrise: 4,
  Midnight: 5,
  Moonset: 6,
  Unity: 7,
} as const;

const stubBonuses = (used: Record<string, number> = {}, skyMastery = SKY_MASTERY) =>
  ({
    activeSkillNames: new Set<string>(Object.keys(used)),
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

/** Shorthand: build an instance parked in one Celestial Space phase. */
const at = (space: number, skyMastery = SKY_MASTERY) => sky({ _SkyEmperor_Celestial_Space: space }, skyMastery);

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
    // Client: ATK 2400/3300/4200/5100/6000 + (Sky Mastery Lv x 5 x SkillLv), POW x 5.
    it('Lv5 matches the client table', () => {
      expect(ratioOf(sky(), 'Noon Blast', 5)).toBe(expected(1500, 900, 5, 5, 5));
    });

    it('Lv1 matches the client table', () => {
      expect(ratioOf(sky(), 'Noon Blast', 1)).toBe(expected(1500, 900, 5, 5, 1));
    });

    it('scales with Sky Mastery — Lv5 at mastery 0 drops the whole mastery term', () => {
      const atMastery0 = Math.floor((1500 + 5 * 900 + TOTAL_POW * 5) * (BASE_LEVEL / 100));
      expect(ratioOf(sky({}, 0), 'Noon Blast', 5)).toBe(atMastery0);
    });

    it('crits during Noon and under Elo Celestial only', () => {
      expect(canCriOf(at(SPACE.Noon), 'Noon Blast')).toBe(true);
      expect(canCriOf(at(SPACE.Unity), 'Noon Blast')).toBe(true);
      expect(canCriOf(at(SPACE.Sunrise), 'Noon Blast')).toBe(false);
      expect(canCriOf(at(SPACE.Sunset), 'Noon Blast')).toBe(false);
    });
  });

  describe('Sunset Blast (id 5467)', () => {
    // Client: ATK 1200/1500/1800/2100/2400 + (Sky Mastery Lv x 5 x SkillLv), POW x 5.
    it('Lv5 matches the client table', () => {
      expect(ratioOf(sky(), 'Sunset Blast', 5)).toBe(expected(900, 300, 5, 5, 5));
    });

    it('crits during Sunset and under Elo Celestial only', () => {
      expect(canCriOf(at(SPACE.Sunset), 'Sunset Blast')).toBe(true);
      expect(canCriOf(at(SPACE.Unity), 'Sunset Blast')).toBe(true);
      expect(canCriOf(at(SPACE.Noon), 'Sunset Blast')).toBe(false);
    });
  });

  describe('Midnight Kick (id 5469)', () => {
    // Client: normal 1500/2500/3500/4500/5500, Midnight 2700/3900/5100/6300/7500.
    it('Lv5 outside Midnight uses the base branch', () => {
      expect(ratioOf(at(SPACE.Moonrise), 'Midnight Kick', 5)).toBe(expected(500, 1000, 5, 5, 5));
    });

    it('Lv5 during Midnight uses the boosted branch', () => {
      expect(ratioOf(at(SPACE.Midnight), 'Midnight Kick', 5)).toBe(expected(1500, 1200, 5, 5, 5));
    });

    it('Elo Celestial gives the boosted branch too', () => {
      expect(ratioOf(at(SPACE.Unity), 'Midnight Kick', 5)).toBe(expected(1500, 1200, 5, 5, 5));
    });
  });

  describe('Dawn Break (id 5470)', () => {
    // Client: normal 700/1100/1500/1900/2300, Moonset 900/1500/2100/2700/3300.
    it('Lv5 outside Moonset uses the base branch', () => {
      expect(ratioOf(at(SPACE.Midnight), 'Dawn Break', 5)).toBe(expected(300, 400, 5, 5, 5));
    });

    it('Lv5 during Moonset uses the boosted branch', () => {
      expect(ratioOf(at(SPACE.Moonset), 'Dawn Break', 5)).toBe(expected(300, 600, 5, 5, 5));
    });

    it('Elo Celestial gives the boosted branch too', () => {
      expect(ratioOf(at(SPACE.Unity), 'Dawn Break', 5)).toBe(expected(300, 600, 5, 5, 5));
    });
  });

  describe('Twinkling Galaxy (id 5471)', () => {
    // Client: ATK 600/1000/1400/1800/2200 + (Sky Mastery Lv x 3 x SkillLv), POW x 3 —
    // the only Sky Emperor skill whose mastery/POW coefficients are 3, not 5.
    it('Lv5 matches the client per-star table', () => {
      expect(ratioOf(sky(), 'Twinkling Galaxy', 5)).toBe(expected(200, 400, 3, 3, 5));
    });

    it('Lv1 matches the client per-star table', () => {
      expect(ratioOf(sky(), 'Twinkling Galaxy', 1)).toBe(expected(200, 400, 3, 3, 1));
    });
  });

  describe('Star Cannon (id 5473)', () => {
    // Client: ATK 700/1200/1700/2200/2700 + (Sky Mastery Lv x 5 x SkillLv), POW x 5.
    it('Lv5 matches the client per-star table', () => {
      expect(ratioOf(sky(), 'Star Cannon', 5)).toBe(expected(200, 500, 5, 5, 5));
    });
  });
});

describe('Sky Emperor Celestial Space selector', () => {
  // The six sun/moon phases are mutually exclusive and Elo Celestial cancels all of
  // them, so the UI offers one selector, not two — asserted here because the phase is
  // what switches Midnight Kick / Dawn Break branches and gates the two crits.
  const selector = new SkyEmperor().activeSkills.find((s) => s.name === '_SkyEmperor_Celestial_Space');

  it('is a single dropdown labelled "Espaço Celeste"', () => {
    expect(selector?.label).toBe('Espaço Celeste');
    expect(selector?.inputType).toBe('dropdown');
  });

  // `activeSkills` sorts each dropdown by value descending (the app-wide "Lv 10 first"
  // convention), so the phases come out newest-state-first under the empty option.
  it('offers the six phases plus Elo Celestial, over an empty option', () => {
    expect(selector?.dropdown.map((d) => d.label)).toEqual([
      '-',
      'Elo Celestial',
      'Pôr da Lua',
      'Meia-Noite',
      'Nascer da Lua',
      'Pôr do Sol',
      'Meio-Dia',
      'Nascer do Sol',
    ]);
  });
});

describe('Sky Emperor cast/cooldown metadata', () => {
  // browiki.org lists these as "Conjuração: fixa + variável | Recarga"; the model
  // stores vct = variable, fct = fixed, cd = cooldown, all in seconds.
  const cases: { name: string; vct: number; fct: number; cd: number }[] = [
    { name: 'Noon Blast', vct: 0, fct: 0, cd: 0.7 },
    { name: 'Sunset Blast', vct: 0, fct: 0, cd: 0.3 },
    { name: 'Midnight Kick', vct: 1, fct: 0.5, cd: 0.7 },
    { name: 'Dawn Break', vct: 1, fct: 0.5, cd: 0.3 },
    { name: 'Twinkling Galaxy', vct: 1, fct: 0.5, cd: 5 },
    { name: 'Star Cannon', vct: 0, fct: 0.5, cd: 5 },
  ];

  it.each(cases)('$name has vct $vct, fct $fct, cd $cd', ({ name, vct, fct, cd }) => {
    const skill = findSkill(sky(), name);
    expect({ vct: skill.vct, fct: skill.fct, cd: skill.cd }).toEqual({ vct, fct, cd });
  });
});
