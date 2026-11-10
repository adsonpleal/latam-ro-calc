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
import { Bard } from './Bard';
import { Champion } from './Champion';
import { Creator } from './Creator';
import { Dancer } from './Dancer';
import { Gunslinger } from './Gunslinger';
import { HighPriest } from './HighPriest';
import { HighWizard } from './HighWizard';
import { LordKnight } from './LordKnight';
import { Minstrel } from './Minstrel';
import { Ninja } from './Ninja';
import { Oboro } from './Oboro';
import { Paladin } from './Paladin';
import { Rebellion } from './Rebellion';
import { RoyalGuard } from './RoyalGuard';
import { Scholar } from './Scholar';
import { Sniper } from './Sniper';
import { Stalker } from './Stalker';
import { Whitesmith } from './Whitesmith';
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

  /**
   * The thirteen transclasses and the two expanded starters, every one of which is also an
   * ancestor, so every one of them needs a row rather than fields. The numbers are the
   * pre-3rd tier's: base 1..99, job 70, 99 status points and the 190 ASPD ceiling.
   */
  it.each([
    ['Lorde', LordKnight],
    ['Paladino', Paladin],
    ['Sumo Sacerdote', HighPriest],
    ['Mestre', Champion],
    ['Arquimago', HighWizard],
    ['Professor', Scholar],
    ['Atirador de Elite', Sniper],
    ['Menestrel', Bard],
    ['Cigana', Dancer],
    ['Mestre Ferreiro', Whitesmith],
    ['Criador', Creator],
    ['Desordeiro', Stalker],
    ['Justiceiro', Gunslinger],
    ['Ninja', Ninja],
  ])('gives the %s the pre-3rd caps', (_name, Ctor) => {
    const cls = new Ctor();

    expect(cls.minMaxLevelCap).toEqual({ minMaxLevel: [1, 99], maxJob: 70 });
    expect(cls.maxBaseStat).toBe(99);
    expect(cls.maxAspd).toBe(190);
    expect(cls.excludedJobLevels).toEqual([]);
  });

  // The promotion above each new row extends the class that owns it and has no row of its
  // own, which is exactly the leak the table exists to stop — checked on one chain per
  // kind of row added here, including the Oboro, which sits two tiers above the Ninja.
  it.each([
    ['Paladino → Guardião Real', RoyalGuard],
    ['Menestrel → Trovador', Minstrel],
    ['Justiceiro → Insurgente', Rebellion],
    ['Ninja → Oboro', Oboro],
  ])('does not leak the new %s row downward', (_name, Ctor) => {
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
