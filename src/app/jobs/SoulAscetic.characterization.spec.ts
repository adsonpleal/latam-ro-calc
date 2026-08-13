import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { SoulAscetic } from './SoulAscetic';

/**
 * Soul Ascetic (Asceta das Almas) 4th-job attack-skill validation.
 *
 * Ground truth: the LATAM 2nd-version skill tables published by Sigma the Fallen,
 *   https://sigmathefallen.blogspot.com/2025/02/soul-ascetic-2nd-version.html
 * reached from that blog's "Supplemental Class (2nd version)" selector. LATAM ships
 * the 2nd version of the Expanded 4th-class rebalance, which is what the `[V2]`
 * labels in SoulAscetic.ts mark.
 *
 * No replay exists for this class yet — it is only now being surfaced in the UI
 * (the class now ships in the LATAM GRF), so these assertions
 * encode the published formulas rather than observed damage packets.
 *
 * Every skill here is magic (isMatk), and the four elemental talismans each have a
 * plain and an "enhanced" branch gated on the Talisman of Five Elements buff.
 * Exorcism of Malicious Soul instead scales with accumulated Soul Energy and is
 * enhanced by Totem of Tutelary (or the target's Dead Spirit's Curse, not modelled).
 *
 * Assertions lock the skill *ratio* (%MATK), floored, because the server int-casts
 * the coefficient — deliberately plain Math.floor, not the repo's float helper.
 */

const BASE_LEVEL = 250;
const TOTAL_SPL = 100;
const TALISMAN_MASTERY = 10;
const SOUL_MASTERY = 10;

const BLESSING = { East: 1, South: 2, West: 3, North: 4, Four_Directions: 5 } as const;

const stubBonuses = (opts: { active?: string[]; used?: Record<string, number> } = {}) =>
  ({
    activeSkillNames: new Set<string>(opts.active ?? []),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>([
      ['Talisman Mastery', TALISMAN_MASTERY],
      ['Soul Mastery', SOUL_MASTERY],
    ]),
    usedSkillMap: new Map<string, number>(Object.entries(opts.used ?? {})),
  } as any);

const soul = (opts: { active?: string[]; used?: Record<string, number> } = {}): SoulAscetic => {
  const c = new SoulAscetic();
  (c as any).bonuses = stubBonuses(opts);
  return c;
};

const findSkill = (char: SoulAscetic, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  return skill;
};

const ratioOf = (char: SoulAscetic, name: string, skillLevel: number) =>
  Math.floor(
    findSkill(char, name).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalSpl: TOTAL_SPL },
    } as any),
  );

// (base + skillLv * (perLv + Talisman Mastery * 15) + SPL * 5) * baseLv/100
const talisman = (base: number, perLv: number, skillLevel: number) =>
  Math.floor((base + skillLevel * (perLv + TALISMAN_MASTERY * 15) + TOTAL_SPL * 5) * (BASE_LEVEL / 100));

const FIVE_ELEMENTS = 'Talisman of Five Elements';

describe('Soul Ascetic talisman ratios @ base 250, SPL 100, Talisman Mastery 10', () => {
  // Each entry: [skill, plain base, plain perLv, enhanced base, enhanced perLv]
  const talismans: [string, number, number, number, number][] = [
    ['Talisman of Blue Dragon', 250, 1450, 350, 1650],
    ['Talisman of White Tiger', 350, 950, 350, 1350],
    ['Talisman of Red Phoenix', 1000, 900, 1200, 1300],
    ['Talisman of Black Tortoise', 2150, 1450, 2300, 1850],
  ];

  describe.each(talismans)('%s', (name, base, perLv, enhBase, enhPerLv) => {
    it('Lv5 without Talisman of Five Elements uses the plain branch', () => {
      expect(ratioOf(soul(), name, 5)).toBe(talisman(base, perLv, 5));
    });

    it('Lv5 with Talisman of Five Elements uses the enhanced branch', () => {
      expect(ratioOf(soul({ active: [FIVE_ELEMENTS] }), name, 5)).toBe(talisman(enhBase, enhPerLv, 5));
    });

    it('the enhanced branch is a strict upgrade', () => {
      expect(ratioOf(soul({ active: [FIVE_ELEMENTS] }), name, 5)).toBeGreaterThan(ratioOf(soul(), name, 5));
    });

    it('Lv1 scales down correctly on the plain branch', () => {
      expect(ratioOf(soul(), name, 1)).toBe(talisman(base, perLv, 1));
    });
  });

  describe('Talisman of Four Bearing God', () => {
    // (50 + (skillLv x (250 + Talisman Mastery x 15)) + SPL x 5) x baseLv/100 per hit
    it('Lv5 matches the published per-hit formula', () => {
      expect(ratioOf(soul(), 'Talisman of Four Bearing God', 5)).toBe(talisman(50, 250, 5));
    });

    // Hits: none=1, East=2, South=3, West=4, North=5, all=7
    const hitCases: [string, number | undefined, number][] = [
      ['no blessing', undefined, 1],
      ['East', BLESSING.East, 2],
      ['South', BLESSING.South, 3],
      ['West', BLESSING.West, 4],
      ['North', BLESSING.North, 5],
      ['all four directions', BLESSING.Four_Directions, 7],
    ];

    it.each(hitCases)('hits %s times with %s blessing', (_label, blessing, hits) => {
      const char = soul({ used: blessing ? { _SoulAscetic_Blessing: blessing } : {} });
      const totalHit = findSkill(char, 'Talisman of Four Bearing God').totalHit as () => number;
      expect(totalHit()).toBe(hits);
    });
  });
});

describe('Exorcism of Malicious Soul (id 5425)', () => {
  // normal:   ((skillLv x 150) + (Soul Mastery x 2) + SPL) x Soul Energy x baseLv/100
  // enhanced: ((skillLv x 250) + (Soul Mastery x 2) + SPL) x Soul Energy x baseLv/100
  //           when the user stands in Totem of Tutelary (or target is cursed).
  const exorcism = (perLv: number, skillLevel: number, souls: number) =>
    Math.floor((perLv * skillLevel + SOUL_MASTERY * 2 + TOTAL_SPL) * souls * (BASE_LEVEL / 100));

  const withSouls = (souls: number, active: string[] = []) => soul({ active, used: { 'Total Soul': souls } });

  it('Lv5 without Totem of Tutelary uses the 150 coefficient', () => {
    expect(ratioOf(withSouls(5), 'Exorcism of Malicious Soul', 5)).toBe(exorcism(150, 5, 5));
  });

  it('Lv5 inside Totem of Tutelary uses the enhanced 250 coefficient', () => {
    expect(ratioOf(withSouls(5, ['Totem of Tutelary']), 'Exorcism of Malicious Soul', 5)).toBe(exorcism(250, 5, 5));
  });

  it('Totem of Tutelary enhances rather than weakens the skill', () => {
    expect(ratioOf(withSouls(5, ['Totem of Tutelary']), 'Exorcism of Malicious Soul', 5)).toBeGreaterThan(
      ratioOf(withSouls(5), 'Exorcism of Malicious Soul', 5),
    );
  });

  it('scales linearly with accumulated Soul Energy', () => {
    const one = ratioOf(withSouls(1), 'Exorcism of Malicious Soul', 5);
    const five = ratioOf(withSouls(5), 'Exorcism of Malicious Soul', 5);
    expect(five).toBe(one * 5);
  });
});

describe('Soul Ascetic cast/cooldown metadata', () => {
  // Published as "variable cast / fixed cast | cooldown"; the model stores
  // vct = variable, fct = fixed, cd = cooldown, all in seconds.
  //
  // First written from the "2nd version" blog tables; only Talisman of White Tiger's
  // cooldown disagreed with the client and now follows it. The authority is
  // skills/skill-delay.spec.ts.
  const cases: { name: string; vct: number; fct: number; cd: number }[] = [
    { name: 'Exorcism of Malicious Soul', vct: 3, fct: 1.5, cd: 1 },
    { name: 'Talisman of Blue Dragon', vct: 1, fct: 1.5, cd: 0.3 },
    { name: 'Talisman of White Tiger', vct: 1, fct: 1.5, cd: 0.3 },
    { name: 'Talisman of Red Phoenix', vct: 1, fct: 1.5, cd: 0.45 },
    { name: 'Talisman of Black Tortoise', vct: 1, fct: 1.5, cd: 0.7 },
    { name: 'Talisman of Four Bearing God', vct: 2, fct: 1.5, cd: 1 },
  ];

  it.each(cases)('$name has vct $vct, fct $fct, cd $cd', ({ name, vct, fct, cd }) => {
    const skill = findSkill(soul(), name);
    expect({ vct: skill.vct, fct: skill.fct, cd: skill.cd }).toEqual({ vct, fct, cd });
  });

  it('every Soul Ascetic atk skill is magic', () => {
    for (const { name } of cases) {
      expect(findSkill(soul(), name).isMatk, `${name} should be MATK`).toBe(true);
    }
  });
});
