import { describe, expect, it } from 'vitest';
import { AtkSkillModel } from './_character-base.abstract';
import { HyperNovice } from './HyperNovice';

/**
 * Hyper Novice — the per-level percentages of the 4th-job attack skills.
 *
 * Source: the **client description** (`SKILL_META[...].description`, taken from the GRF's
 * `skilldescript.lub`), transcribed level by level in the tables below. It replaced the
 * `[V2]` tables from Sigma's blog that this file used to encode: the `hn-magic-lv1.rrf`
 * recording showed those were wrong, the same way the Night Watch recordings did (see
 * NightWatch.replay.spec.ts). `HyperNovice.replay.spec.ts` is what pins the measured
 * damage; this file only checks the table.
 *
 * Every description carries two columns per level: the ATK/MATK and the "Nv. de
 * Físico/Mágico Autodidata" one, which adds `N x skill level x passive level`. The
 * POW/SPL term is not in the description — that coefficient is the measured one.
 *
 * The passive's own "+N% damage" column is folded into the ratio too (see HyperNovice),
 * so the fixtures below keep both passives at 0 to isolate the table itself.
 */

const BASE_LEVEL = 250;
const TOTAL_POW = 100;
const TOTAL_SPL = 100;
const TACTICS = 10; // Self Study Tactics
const SORCERY = 10; // Self Study Sorcery

const stubBonuses = (tactics: number, sorcery: number) =>
  ({
    activeSkillNames: new Set<string>(),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>([
      ['Self Study Tactics', tactics],
      ['Self Study Sorcery', sorcery],
    ]),
    usedSkillMap: new Map<string, number>(),
  } as any);

const hn = (opts: { damageBonus?: boolean } = {}): HyperNovice => {
  const c = new HyperNovice();
  // The mastery levels feed the skill table's own "Nv. de Autodidata" column, so they stay
  // at their real value; `damageBonus` is what switches the passive's +N% damage on.
  (c as any).bonuses = stubBonuses(TACTICS, SORCERY);
  if (!opts.damageBonus) {
    const noBonus = (c as any).withPassiveBonus.bind(c);
    (c as any).withPassiveBonus = (raw: number, _percent: number, ult = 1) => noBonus(raw, 0, ult);
  }
  return c;
};

const findSkill = (char: HyperNovice, name: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  return skill;
};

// A few skills have two atk entries under the same `name` (the first damage and the
// repeating one); those are found by `value`, which is unique.
const findSkillByValue = (char: HyperNovice, value: string): AtkSkillModel => {
  const skill = char.atkSkills.find((s) => s.value === value);
  if (!skill) throw new Error(`atk skill not found by value: ${value}`);
  return skill;
};

// Only Spiral Pierce Max reads monster.size; every other skill ignores the target.
const monsterOfSize = (size: 's' | 'm' | 'l') => ({ size, isRace: () => false, isMVP: false });

const ratioOfValue = (char: HyperNovice, value: string, skillLevel: number, monster?: unknown) =>
  Math.floor(
    findSkillByValue(char, value).formula({
      model: { level: BASE_LEVEL },
      skillLevel,
      status: { totalPow: TOTAL_POW, totalSpl: TOTAL_SPL },
      monster,
    } as any),
  );

/**
 * The client tables, level by level. `atk[i]` is the Lv i+1 percentage and `mastery` is
 * the multiplier of the "Nv. de Autodidata" column (which the description spells out as
 * `x3`, `x6`, `x9`… = `mastery x level`). `stat` is the POW/SPL coefficient.
 */
type SkillTable = { value: string; atk: number[]; mastery: number; stat: number };

const PHYSICAL: SkillTable[] = [
  // Golpe de Tyr
  { value: 'Double Bowling Bash==10', atk: [300, 500, 700, 900, 1100, 1300, 1500, 1700, 1900, 2100], mastery: 3, stat: 2 },
  // Lâminas Devastadoras
  { value: 'Mega Sonic Blow==10', atk: [950, 1100, 1250, 1400, 1550, 1700, 1850, 2000, 2150, 2300], mastery: 5, stat: 4 },
  // Choque Violento
  { value: 'Shield Chain Rush==10', atk: [700, 1000, 1300, 1600, 1900, 2200, 2500, 2800, 3100, 3400], mastery: 3, stat: 3 },
];

const MAGIC: SkillTable[] = [
  // Chuva de Meteoritos — the landing (1º ATQM) and the explosion (2º ATQM)
  { value: 'Meteor Storm Buster==10', atk: [600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300], mastery: 5, stat: 3 },
  { value: 'Meteor Storm Buster (Explosão)==10', atk: [600, 750, 900, 1050, 1200, 1350, 1500, 1650, 1800, 1950], mastery: 5, stat: 3 },
  // Espectro Napalm
  { value: 'Napalm Vulcan Strike==10', atk: [500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750], mastery: 4, stat: 3 },
  // Tempestade de Júpiter
  { value: 'Jupitel Thunderstorm==10', atk: [1800, 3600, 5400, 7200, 9000, 10800, 12600, 14400, 16200, 18000], mastery: 3, stat: 3 },
  // Ira da Terra
  { value: "Hell's Drive==10", atk: [1550, 2100, 2650, 3200, 3750, 4300, 4850, 5400, 5950, 6500], mastery: 4, stat: 3 },
  // Esquife Congelante — the sphere (1º) and the repeating explosion (2º)
  { value: 'Jack Frost Nova (Inicial)==10', atk: [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000], mastery: 3, stat: 2 },
  { value: 'Jack Frost Nova==10', atk: [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200], mastery: 3, stat: 4 },
  // Zona Gravitacional — the initial burst (1º) and the repeating field (2º)
  { value: 'Ground Gravitation (Inicial)==10', atk: [4500, 6000, 7500, 9000, 10500, 12000, 13500, 15000, 16500, 18000], mastery: 4, stat: 5 },
  { value: 'Ground Gravitation==10', atk: [700, 1000, 1300, 1600, 1900, 2200, 2500, 2800, 3100, 3400], mastery: 2, stat: 2 },
];

const expected = (t: SkillTable, lv: number, masteryLv: number, statTotal: number, sizeMultiplier = 1) =>
  Math.floor(((t.atk[lv - 1] + t.mastery * lv * masteryLv) * sizeMultiplier + statTotal * t.stat) * (BASE_LEVEL / 100));

describe('Hyper Novice — per-level percentage vs the client description', () => {
  it.each(PHYSICAL)('$value: all 10 levels match the client table', (t) => {
    for (let lv = 1; lv <= 10; lv++) {
      expect(ratioOfValue(hn(), t.value, lv), `${t.value} Lv${lv}`).toBe(expected(t, lv, TACTICS, TOTAL_POW));
    }
  });

  it.each(MAGIC)('$value: all 10 levels match the client table', (t) => {
    for (let lv = 1; lv <= 10; lv++) {
      expect(ratioOfValue(hn(), t.value, lv), `${t.value} Lv${lv}`).toBe(expected(t, lv, SORCERY, TOTAL_SPL));
    }
  });

  describe('Spiral Pierce Max', () => {
    // The description gives the usual table plus "Pequeno: x1,5 Médio: x1,3 Grande: x1,2".
    // The multiplier scales the whole skill term, not only the per-level part.
    const spiral: SkillTable = {
      value: 'Spiral Pierce Max==10',
      atk: [750, 1000, 1250, 1500, 1750, 2000, 2250, 2500, 2750, 3000],
      mastery: 3,
      stat: 3,
    };
    const sizes: [string, 's' | 'm' | 'l', number][] = [
      ['small', 's', 1.5],
      ['medium', 'm', 1.3],
      ['large', 'l', 1.2],
    ];

    it.each(sizes)('applies x%s against a %s target at every level', (_label, size, mult) => {
      for (let lv = 1; lv <= 10; lv++) {
        expect(ratioOfValue(hn(), spiral.value, lv, monsterOfSize(size)), `Lv${lv}`).toBe(
          expected(spiral, lv, TACTICS, TOTAL_POW, mult),
        );
      }
    });

    it('deals strictly more to smaller targets', () => {
      const small = ratioOfValue(hn(), spiral.value, 10, monsterOfSize('s'));
      const medium = ratioOfValue(hn(), spiral.value, 10, monsterOfSize('m'));
      const large = ratioOfValue(hn(), spiral.value, 10, monsterOfSize('l'));
      expect(small).toBeGreaterThan(medium);
      expect(medium).toBeGreaterThan(large);
    });
  });
});

describe('Hyper Novice — the passives own damage column', () => {
  // Self Study Tactics/Sorcery add "+N% damage", doubled on Shield Chain Rush and Napalm
  // Vulcan Strike. It is applied on top of the already-truncated table value.
  it.each([
    { label: 'Double Bowling Bash', value: 'Double Bowling Bash==10', percent: TACTICS },
    { label: 'Shield Chain Rush (doubled)', value: 'Shield Chain Rush==10', percent: TACTICS * 2 },
    { label: 'Jupitel Thunderstorm', value: 'Jupitel Thunderstorm==10', percent: SORCERY },
    { label: 'Napalm Vulcan Strike (doubled)', value: 'Napalm Vulcan Strike==10', percent: SORCERY * 2 },
  ])('$label: adds $percent% on top of the table', ({ value, percent }) => {
    const base = ratioOfValue(hn(), value, 10);
    expect(ratioOfValue(hn({ damageBonus: true }), value, 10)).toBe(Math.floor(base * (1 + percent / 100)));
  });

  it('leaves the first hit of Jack Frost Nova and Ground Gravitation alone', () => {
    for (const value of ['Jack Frost Nova (Inicial)==10', 'Ground Gravitation (Inicial)==10']) {
      expect(ratioOfValue(hn({ damageBonus: true }), value, 10), value).toBe(ratioOfValue(hn(), value, 10));
    }
  });

  /**
   * Meteor Storm Buster is the exception to the rule above: the bonus reaches its landing
   * and skips its explosion, the other way round from the two ground skills. Both columns
   * read 600% at Lv1, so only a Lv5 recording could tell them apart — see the Lv5 runs in
   * `HyperNovice.magic-matrix.replay.spec.ts`.
   */
  it('reaches the landing of Meteor Storm Buster but not its explosion', () => {
    const landing = 'Meteor Storm Buster==10';
    const explosion = 'Meteor Storm Buster (Explosão)==10';
    expect(ratioOfValue(hn({ damageBonus: true }), landing, 10)).toBe(
      Math.floor(ratioOfValue(hn(), landing, 10) * (1 + SORCERY / 100)),
    );
    expect(ratioOfValue(hn({ damageBonus: true }), explosion, 10)).toBe(ratioOfValue(hn(), explosion, 10));
  });
});

describe('Hyper Novice — skill structure', () => {
  it('exposes every level in the picker, like Night Watch does', () => {
    const cls = hn();
    for (const value of [...PHYSICAL, ...MAGIC].map((t) => t.value).concat('Spiral Pierce Max==10')) {
      const skill = findSkillByValue(cls, value);
      const name = value.replace(/==\d+$/, '');
      expect(skill.levelList?.map((l) => l.value), value).toEqual(
        Array.from({ length: 10 }, (_, i) => `${name}==${i + 1}`),
      );
    }
  });

  it('marks the magic tree as isMatk and leaves the physical tree unmarked', () => {
    for (const t of MAGIC) {
      expect(findSkillByValue(hn(), t.value).isMatk, `${t.value} should be magic`).toBe(true);
    }
    for (const name of ['Double Bowling Bash', 'Mega Sonic Blow', 'Shield Chain Rush', 'Spiral Pierce Max']) {
      expect(findSkill(hn(), name).isMatk, `${name} should be physical`).toBeFalsy();
    }
  });

  // The recording shows Ground Gravitation's field landing 10 times (5s every 0.5s, as the
  // description says) and Jack Frost Nova exploding 4 times at Lv1 — that one the
  // description does not quantify, so the number comes from the recording.
  it('repeats the continuous damage as many times as the recording shows', () => {
    expect(findSkillByValue(hn(), 'Ground Gravitation==10').totalHit).toBe(10);
    expect(findSkillByValue(hn(), 'Jack Frost Nova==10').totalHit).toBe(4);
  });

  it('carries Meteor Storm Buster (5455), which the class was missing', () => {
    expect(findSkillByValue(hn(), 'Meteor Storm Buster==10').element).toBe('Fire');
    expect(findSkillByValue(hn(), 'Meteor Storm Buster (Explosão)==10').name).toBe('Meteor Storm Buster');
  });
});

describe('Hyper Novice — cast time and cooldown', () => {
  // Published as "variable cast / fixed cast | cooldown"; the model stores vct = variable,
  // fct = fixed, cd = cooldown, all in seconds.
  //
  // These pin the class at its own Lv10; the authority for the numbers themselves is the
  // client's cast/delay table, enforced for every class in skills/skill-delay.spec.ts.
  // Several of these are level curves rather than constants, so resolve before comparing.
  const at10 = (value: number | ((level: number) => number)) => (typeof value === 'function' ? value(10) : value);

  const cases: { name: string; vct: number; fct: number; cd: number }[] = [
    { name: 'Double Bowling Bash', vct: 0, fct: 0.35, cd: 0.7 },
    { name: 'Mega Sonic Blow', vct: 0, fct: 0, cd: 0.3 },
    { name: 'Shield Chain Rush', vct: 1.2, fct: 0.3, cd: 0.3 },
    { name: 'Spiral Pierce Max', vct: 1, fct: 0.3, cd: 0.3 },
    { name: 'Napalm Vulcan Strike', vct: 0.5, fct: 1, cd: 0.3 },
    { name: 'Jupitel Thunderstorm', vct: 2, fct: 1, cd: 1.8 },
    { name: "Hell's Drive", vct: 1.2, fct: 1, cd: 0.7 },
    { name: 'Jack Frost Nova', vct: 2.5, fct: 1.5, cd: 3 },
    { name: 'Ground Gravitation', vct: 5, fct: 1.5, cd: 5 },
  ];

  it.each(cases)('$name has vct $vct, fct $fct, cd $cd', ({ name, vct, fct, cd }) => {
    const skill = findSkill(hn(), name);
    expect({ vct: at10(skill.vct), fct: at10(skill.fct), cd: at10(skill.cd) }).toEqual({ vct, fct, cd });
  });
});
