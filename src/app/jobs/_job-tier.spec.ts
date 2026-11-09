/**
 * `JOB_TIER_CAPS` resolves a job's own caps without reaching the jobs below it.
 *
 * The trap this replaces: a job file is both a playable class and the ancestor its
 * promotions extend, so the caps cannot be fields (a descendant would inherit them) and
 * were written as four `className === X ? … : super.…` getters on the Algoz. Repeating
 * that per class is what the table removes — and these are the two things it has to keep
 * true for every row added to it.
 */
import { describe, expect, it } from 'vitest';
import { AssassinCross } from './AssassinCross';
import { CLASS_CTOR_BY_ID } from './_class-list';
import { ClassName } from './_class-name';
import { JOB_TIER_CAPS } from './_job-tier';
import { GuillotineCross } from './GuillotineCross';
import { SoulReaper } from './SoulReaper';
import { StarEmperor } from './StarEmperor';

describe('job tier caps', () => {
  it('gives the Algoz the caps its four hand-written getters used to', () => {
    const algoz = new AssassinCross();

    expect(algoz.minMaxLevelCap).toEqual({ minMaxLevel: [1, 99], maxJob: 70 });
    expect(algoz.maxBaseStat).toBe(99);
    expect(algoz.maxAspd).toBe(190);
    expect(algoz.excludedJobLevels).toEqual([]);
  });

  // Each of these extends a class that HAS a row and has none of its own, so each must
  // read the 3rd-job defaults — the regression the old `className ===` guards existed to
  // avoid, now checked once for every chain a row sits at the top of.
  it.each([
    ['Sicário', GuillotineCross],
    ['Mestre Estelar', StarEmperor],
    ['Ceifador de Almas', SoulReaper],
  ])('does not leak a row down to the %s', (_name, Ctor) => {
    const descendant = new Ctor();

    expect(descendant.minMaxLevelCap).toEqual({ minMaxLevel: [99, 200], maxJob: 70 });
    expect(descendant.maxBaseStat).toBe(130);
    expect(descendant.maxAspd).toBe(193);
    expect(descendant.excludedJobLevels).toEqual([66, 67, 68, 69]);
  });

  it('keeps every row on a class the calculator actually offers', () => {
    const playable = new Set(Object.values(CLASS_CTOR_BY_ID).map((Ctor) => new Ctor().className));
    const orphans = (Object.keys(JOB_TIER_CAPS) as ClassName[]).filter((name) => !playable.has(name));

    expect(orphans).toEqual([]);
  });
});
