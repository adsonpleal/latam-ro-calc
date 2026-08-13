import { describe, expect, it } from 'vitest';
import { InfoForClass } from 'src/app/models/info-for-class.model';
import { StarEmperor } from './StarEmperor';

/**
 * The three Wrath skills — Fúria Solar (435), Fúria Lunar (436) and Fúria Estelar (437)
 * — and the size-based alignment that decides which one applies.
 *
 * Oposição Solar, Lunar e Estelar (434) permanently marks the target with a sun, moon or
 * star alignment *according to its Size*:
 *
 *   [Lv 1] Sun l Small l min HP —        [Lv 2] Moon l Medium l min HP 6,000
 *   [Lv 3] Star l Large l min HP 20,000
 *
 * That is why the three never overlap: at most one applies to any given target. STR
 * enters only the Star one — Sun and Moon read "based on your LUK, DEX and base level",
 * Star reads "based on STR, LUK, DEX and base level".
 *
 * Everything here is a reading of the client description, not a measurement: there is no
 * recording with any Wrath active. If a Star Gladiator `.rrf` ever shows up, this is the
 * file it attaches to.
 */

const target = (size: string, hp = 1_000_000, isPlayerTarget = false) => ({ size, data: { hp }, isPlayerTarget });

const info = (opts: { level: number; str: number; dex: number; luk: number; monster: any }): InfoForClass =>
  ({
    model: { level: opts.level },
    status: { totalStr: opts.str, totalDex: opts.dex, totalLuk: opts.luk },
    monster: opts.monster,
  } as any);

/** Builds the class with the given Wrath skills switched on. */
const star = (...active: string[]): StarEmperor => {
  const c = new StarEmperor();
  (c as any).bonuses = {
    activeSkillNames: new Set<string>(active),
    usedSkillMap: new Map<string, number>(active.map((s) => [s, 3])),
    learnedSkillMap: new Map<string, number>(),
    equipAtks: {},
    masteryAtks: {},
  };
  return c;
};

const BASE = { level: 239, str: 132, dex: 129, luk: 128 };
/** (239 + 128 + 129 + 132) / 3 = 209 — with STR. */
const WITH_STR = 209;
/** (239 + 128 + 129) / 3 = 165 — without STR. */
const WITHOUT_STR = 165;

describe('Wrath skills — none active', () => {
  it('gives no bonus at all', () => {
    expect(star().getWrathAtkBonus(info({ ...BASE, monster: target('l') }))).toBe(0);
  });
});

describe('Fúria Estelar — Large targets only, and the only one that adds STR', () => {
  it('adds base level + LUK + DEX + STR against a Large target', () => {
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: target('l') }))).toBe(WITH_STR);
  });

  it('gives nothing against Medium or Small — those are not Star targets', () => {
    const s = star('Wrath of');
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: target('m') }))).toBe(0);
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: target('s') }))).toBe(0);
  });

  it('cannot mark a Large target below 20,000 HP as Star', () => {
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: target('l', 19_999) }))).toBe(0);
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: target('l', 20_000) }))).toBe(WITH_STR);
  });
});

describe('Fúria Lunar — Medium targets only, and without STR', () => {
  it('adds base level + LUK + DEX against a Medium target, no STR', () => {
    expect(star('Wrath of Moon').getWrathAtkBonus(info({ ...BASE, monster: target('m') }))).toBe(WITHOUT_STR);
  });

  it('gives nothing against Large or Small', () => {
    const s = star('Wrath of Moon');
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: target('l') }))).toBe(0);
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: target('s') }))).toBe(0);
  });

  it('cannot mark a Medium target below 6,000 HP as Moon', () => {
    expect(star('Wrath of Moon').getWrathAtkBonus(info({ ...BASE, monster: target('m', 5_999) }))).toBe(0);
    expect(star('Wrath of Moon').getWrathAtkBonus(info({ ...BASE, monster: target('m', 6_000) }))).toBe(WITHOUT_STR);
  });
});

describe('Fúria Solar — Small targets only, without STR and with no minimum HP', () => {
  it('adds base level + LUK + DEX against a Small target, no STR', () => {
    expect(star('Wrath of Sun').getWrathAtkBonus(info({ ...BASE, monster: target('s', 1) }))).toBe(WITHOUT_STR);
  });

  it('gives nothing against Medium or Large', () => {
    const s = star('Wrath of Sun');
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: target('m') }))).toBe(0);
    expect(s.getWrathAtkBonus(info({ ...BASE, monster: target('l') }))).toBe(0);
  });
});

describe('Wrath skills — all three active at once', () => {
  // Having all three on is the normal state for anyone with Oposição at Lv3: the target
  // is what selects between them.
  const all = () => star('Wrath of Sun', 'Wrath of Moon', 'Wrath of');

  it.each([
    { label: 'Small', size: 's', expected: WITHOUT_STR },
    { label: 'Medium', size: 'm', expected: WITHOUT_STR },
    { label: 'Large', size: 'l', expected: WITH_STR },
  ])('$label target → $expected', ({ size, expected }) => {
    expect(all().getWrathAtkBonus(info({ ...BASE, monster: target(size) }))).toBe(expected);
  });

  it('never stack with each other — a target has exactly one alignment', () => {
    const large = all().getWrathAtkBonus(info({ ...BASE, monster: target('l') }));
    expect(large).toBe(WITH_STR);
    expect(large).toBeLessThan(WITH_STR + WITHOUT_STR);
  });
});

describe('Wrath skills — player target', () => {
  // Other characters can be aligned "with no size or HP restriction". A PVP target comes
  // in as id -1 and Medium size (Calculator.setPlayerTarget).
  const player = target('m', 300_000, true);

  it('accepts any alignment, including the Star one', () => {
    expect(star('Wrath of').getWrathAtkBonus(info({ ...BASE, monster: player }))).toBe(WITH_STR);
    expect(star('Wrath of Sun').getWrathAtkBonus(info({ ...BASE, monster: player }))).toBe(WITHOUT_STR);
  });
});
