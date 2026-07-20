import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { HyperNovice } from './HyperNovice';

/**
 * Hyper Novice (Hiperaprendiz) 4th-job attack-skill validation.
 *
 * Ground truth: the LATAM 2nd-version skill tables published by Sigma the Fallen,
 *   https://sigmathefallen.blogspot.com/2025/02/hyper-novice-2nd-version.html
 * reached from that blog's "Supplemental Class (2nd version)" selector. LATAM ships
 * the 2nd version of the Expanded 4th-class rebalance, which is what the `[V2]`
 * labels in HyperNovice.ts mark.
 *
 * No replay exists for this class yet — it is only now being surfaced in the UI
 * (see EXPANDED_4TH_AHEAD_OF_GRF in jobs/expanded-4th-ahead-of-grf.ts), so these assertions
 * encode the published formulas rather than observed damage packets.
 *
 * Hyper Novice is the only Expanded 4th job that is half physical / half magic: the
 * physical tree scales off the Self Study Tactics passive and POW, the magic tree
 * off Self Study Sorcery and SPL. Both passives are pinned in the fixtures.
 *
 * Assertions lock the skill *ratio*, floored, because the server int-casts the
 * coefficient — deliberately plain Math.floor, not the repo's float helper.
 */

const BASE_LEVEL = 250;
const TOTAL_POW = 100;
const TOTAL_SPL = 100;
const TACTICS = 10; // Self Study Tactics
const SORCERY = 10; // Self Study Sorcery

const stubBonuses = () =>
  ({
    activeSkillNames: new Set<string>(),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>([
      ['Self Study Tactics', TACTICS],
      ['Self Study Sorcery', SORCERY],
    ]),
    usedSkillMap: new Map<string, number>(),
  } as any);

const hn = (): HyperNovice => {
  const c = new HyperNovice();
  (c as any).bonuses = stubBonuses();
  return c;
};

const findSkill = (char: HyperNovice, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  return skill;
};

// Only Spiral Pierce Max reads monster.size; the rest ignore the monster entirely.
const monsterOfSize = (size: 's' | 'm' | 'l') => ({ size, isRace: () => false, isMVP: false });

const ratioOf = (char: HyperNovice, name: string, skillLevel: number, monster?: unknown) =>
  Math.floor(
    findSkill(char, name).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalPow: TOTAL_POW, totalSpl: TOTAL_SPL },
      monster,
    } as any),
  );

describe('Hyper Novice physical ratios @ base 250, POW 100, Self Study Tactics 10', () => {
  // (base + skillLv * (perLv + Tactics * masteryPerLv) + POW * powMul) * baseLv/100
  const physical = (base: number, perLv: number, masteryPerLv: number, powMul: number, skillLevel: number) =>
    Math.floor((base + skillLevel * (perLv + TACTICS * masteryPerLv) + TOTAL_POW * powMul) * (BASE_LEVEL / 100));

  it('Double Bowling Bash Lv10 matches the published per-hit formula', () => {
    // (150 + (SkillLv x (250 + Tactics x 3)) + POW x 2) x baseLv/100
    expect(ratioOf(hn(), 'Double Bowling Bash', 10)).toBe(physical(150, 250, 3, 2, 10));
  });

  it('Mega Sonic Blow Lv10 matches the published formula', () => {
    // (850 + (SkillLv x (450 + Tactics x 5)) + POW x 4) x baseLv/100
    expect(ratioOf(hn(), 'Mega Sonic Blow', 10)).toBe(physical(850, 450, 5, 4, 10));
  });

  it('Shield Chain Rush Lv10 matches the published formula', () => {
    // (600 + (SkillLv x (450 + Tactics x 3)) + POW x 3) x baseLv/100
    expect(ratioOf(hn(), 'Shield Chain Rush', 10)).toBe(physical(600, 450, 3, 3, 10));
  });

  describe('Spiral Pierce Max', () => {
    // ((550 + (SkillLv x (350 + Tactics x 3))) x SizeMultiplier + POW x 3) x baseLv/100
    // The size multiplier scales the whole skill term, not just the per-level part.
    const spiral = (sizeMultiplier: number, skillLevel: number) =>
      Math.floor(
        ((550 + skillLevel * (350 + TACTICS * 3)) * sizeMultiplier + TOTAL_POW * 3) * (BASE_LEVEL / 100),
      );

    const sizes: [string, 's' | 'm' | 'l', number][] = [
      ['small', 's', 1.5],
      ['medium', 'm', 1.3],
      ['large', 'l', 1.2],
    ];

    it.each(sizes)('Lv10 vs a %s target applies a x%s size multiplier', (_label, size, mult) => {
      expect(ratioOf(hn(), 'Spiral Pierce Max', 10, monsterOfSize(size))).toBe(spiral(mult, 10));
    });

    it('deals strictly more to smaller targets', () => {
      const small = ratioOf(hn(), 'Spiral Pierce Max', 10, monsterOfSize('s'));
      const medium = ratioOf(hn(), 'Spiral Pierce Max', 10, monsterOfSize('m'));
      const large = ratioOf(hn(), 'Spiral Pierce Max', 10, monsterOfSize('l'));
      expect(small).toBeGreaterThan(medium);
      expect(medium).toBeGreaterThan(large);
    });
  });
});

describe('Hyper Novice magic ratios @ base 250, SPL 100, Self Study Sorcery 10', () => {
  const magic = (base: number, perLv: number, masteryPerLv: number, splMul: number, skillLevel: number) =>
    Math.floor((base + skillLevel * (perLv + SORCERY * masteryPerLv) + TOTAL_SPL * splMul) * (BASE_LEVEL / 100));

  it('Napalm Vulcan Strike Lv10 matches the published formula', () => {
    // (350 + (SkillLv x (650 + Sorcery x 4)) + SPL x 3) x baseLv/100
    expect(ratioOf(hn(), 'Napalm Vulcan Strike', 10)).toBe(magic(350, 650, 4, 3, 10));
  });

  it('Jupitel Thunderstorm Lv10 matches the published formula', () => {
    // ((SkillLv x (1800 + Sorcery x 3)) + SPL x 3) x baseLv/100 — no flat base term
    expect(ratioOf(hn(), 'Jupitel Thunderstorm', 10)).toBe(magic(0, 1800, 3, 3, 10));
  });

  it("Hell's Drive Lv10 matches the published formula", () => {
    // (1500 + (SkillLv x (700 + Sorcery x 4)) + SPL x 3) x baseLv/100
    expect(ratioOf(hn(), "Hell's Drive", 10)).toBe(magic(1500, 700, 4, 3, 10));
  });

  it('marks the magic tree as isMatk and leaves the physical tree unmarked', () => {
    for (const name of ['Napalm Vulcan Strike', 'Jupitel Thunderstorm', "Hell's Drive"]) {
      expect(findSkill(hn(), name).isMatk, `${name} should be MATK`).toBe(true);
    }
    for (const name of ['Double Bowling Bash', 'Mega Sonic Blow', 'Shield Chain Rush', 'Spiral Pierce Max']) {
      expect(findSkill(hn(), name).isMatk, `${name} should be physical`).toBeFalsy();
    }
  });
});

describe('Hyper Novice cast/cooldown metadata (2nd version)', () => {
  // Published as "variable cast / fixed cast | cooldown"; the model stores
  // vct = variable, fct = fixed, cd = cooldown, all in seconds. Level-dependent
  // values are pinned at the max level the skill entry is defined for.
  const cases: { name: string; vct: number; fct: number; cd: number }[] = [
    { name: 'Double Bowling Bash', vct: 0, fct: 0.35, cd: 0.7 },
    { name: 'Mega Sonic Blow', vct: 0, fct: 0, cd: 0.3 },
    { name: 'Shield Chain Rush', vct: 1.2, fct: 0.3, cd: 0.3 },
    { name: 'Spiral Pierce Max', vct: 1, fct: 0.3, cd: 0.3 },
    { name: 'Napalm Vulcan Strike', vct: 0.5, fct: 1, cd: 0.3 },
    // Jupitel: variable cast is 1 + (Lv x 0.1) -> 2 at Lv10
    { name: 'Jupitel Thunderstorm', vct: 2, fct: 1, cd: 1.8 },
    // Hell's Drive: cooldown is 2.7 - (Lv x 0.2) -> 0.7 at Lv10
    { name: "Hell's Drive", vct: 1.2, fct: 1, cd: 0.7 },
  ];

  it.each(cases)('$name has vct $vct, fct $fct, cd $cd', ({ name, vct, fct, cd }) => {
    const skill = findSkill(hn(), name);
    expect({ vct: skill.vct, fct: skill.fct, cd: skill.cd }).toEqual({ vct, fct, cd });
  });
});
