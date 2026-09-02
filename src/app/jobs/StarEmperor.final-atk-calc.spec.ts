import { describe, expect, it } from 'vitest';
import { InfoForClass } from 'src/app/models/info-for-class.model';
import { floor } from 'src/app/utils';
import { StarEmperor } from './StarEmperor';

/**
 * The derivation behind the damage graph's "ATQ (ajuste de classe)" step.
 *
 * That step is `modifyFinalAtk` — for this line, Kihop and then one of the three Fúrias
 * — and two numbers either side of it explain none of it. Which Fúria pays is decided by
 * the *target's* Size, so the reader watches the figure swing on a stat that appears
 * nowhere else in the chain (Solar and Lunar read SOR and DES, never FOR; only Estelar
 * adds FOR). The rows say which one applied and out of what, and the link points at that
 * skill's bROWiki page.
 *
 * The Fúria formula itself is a reading of the client description, not a measurement —
 * see StarEmperor.wrath.spec.ts. This file only holds the explanation to the arithmetic
 * the engine actually runs.
 */

const target = (size: string, hp = 1_000_000) => ({ size, data: { hp }, isPlayerTarget: false });

const info = (monster: any): InfoForClass =>
  ({
    model: { level: 235 },
    status: { totalStr: 143, totalDex: 134, totalLuk: 133 },
    monster,
  } as any);

/** The class with the given Fúrias toggled on and Kihop learned at `powerLv`. */
const star = (powerLv: number, ...active: string[]): StarEmperor => {
  const c = new StarEmperor();
  (c as any).bonuses = {
    activeSkillNames: new Set<string>(active),
    usedSkillMap: new Map<string, number>(active.map((s) => [s, 3])),
    learnedSkillMap: new Map<string, number>(powerLv ? [['Power', powerLv]] : []),
    equipAtks: {},
    masteryAtks: {},
  };
  return c;
};

const ATK = 14_041.95; // a real P.ATQ output — deliberately fractional
const rowLabels = (calc: any) => calc.rows.map((r: any) => r.label);
const lastRow = (calc: any) => calc.rows[calc.rows.length - 1];

describe('The class ATQ adjustment explains itself', () => {
  it('closes on the same number modifyFinalAtk returns', () => {
    const c = star(5, 'Wrath of Moon');
    const i = info(target('m'));

    expect(lastRow(c.getFinalAtkCalc(ATK, i)).display).toBe('69.353');
    expect(floor(c.modifyFinalAtk(ATK, i))).toBe(69_353);
  });

  it('walks the chain in the order the engine applies it', () => {
    const calc = star(5, 'Wrath of Moon').getFinalAtkCalc(ATK, info(target('m')));

    expect(rowLabels(calc)).toEqual([
      'ATQ arredondado p/ baixo',
      'Kihop Nv 5 (+85%)',
      'Fúria Lunar: (nível 235 + SOR 133 + DES 134) ÷ 3',
      '× Fúria Lunar',
      'ATQ (ajuste de classe)',
    ]);
    // Kihop floors its own product before the Fúria multiplies it, which is what makes
    // the chain worth printing: 14.041 + floor(14.041 × 0,85) = 25.975, not 25.975,85.
    expect(calc.rows[1].display).toBe('25.975');
    expect(calc.rows[2].display).toBe('+167%');
  });

  it('names the Fúria the target actually aligns to, and links to its page', () => {
    const all = ['Wrath of Sun', 'Wrath of Moon', 'Wrath of'];
    const linkFor = (size: string) => star(5, ...all).getFinalAtkCalc(ATK, info(target(size, 1_000_000))).link;

    expect(linkFor('s')).toEqual({ label: 'Fúria Solar no bROWiki', url: 'https://browiki.org/wiki/F%C3%BAria_Solar' });
    expect(linkFor('m')).toEqual({ label: 'Fúria Lunar no bROWiki', url: 'https://browiki.org/wiki/F%C3%BAria_Lunar' });
    expect(linkFor('l')).toEqual({ label: 'Fúria Estelar no bROWiki', url: 'https://browiki.org/wiki/F%C3%BAria_Estelar' });
  });

  it('spells FOR into the terms only for Estelar', () => {
    const withAll = (size: string) => rowLabels(star(5, 'Wrath of Sun', 'Wrath of Moon', 'Wrath of').getFinalAtkCalc(ATK, info(target(size))));

    expect(withAll('l').some((l: string) => l.includes('FOR 143'))).toBe(true);
    expect(withAll('m').some((l: string) => l.includes('FOR'))).toBe(false);
    expect(withAll('s').some((l: string) => l.includes('FOR'))).toBe(false);
  });

  it('drops the Fúria half when no alignment reaches the target', () => {
    const calc = star(5, 'Wrath of').getFinalAtkCalc(ATK, info(target('m')));

    expect(rowLabels(calc)).toEqual(['ATQ arredondado p/ baixo', 'Kihop Nv 5 (+85%)', 'ATQ (ajuste de classe)']);
    expect(calc.link).toBeUndefined();
    expect(calc.note).toBeUndefined();
  });

  it('says nothing at all when the adjustment is a no-op', () => {
    // No Kihop and no Fúria: modifyFinalAtk only floors, and the step's own before/after
    // pair already says that much.
    expect(star(0).getFinalAtkCalc(ATK, info(target('m')))).toBeUndefined();
  });
});
