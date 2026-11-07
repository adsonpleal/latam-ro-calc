import { describe, expect, it } from 'vitest';
import { ArchMage } from 'src/app/jobs/ArchMage';
import { Doram } from 'src/app/jobs/Doram';
import { HighWizard } from 'src/app/jobs/HighWizard';
import { HyperNovice } from 'src/app/jobs/HyperNovice';
import { SkyEmperor } from 'src/app/jobs/SkyEmperor';
import { AtkSkillFormulaInput, AtkSkillModel } from 'src/app/jobs/_character-base.abstract';
import { SKILL_FORMULA_VERSION_OPTIONS, type SkillFormulaVersion } from 'src/app/skills/skill-formula-version';
import { stackRange } from 'src/app/utils';

/**
 * The skills that drop their hits on the ground one at a time and therefore ask the
 * rotation row how many of them reached the target — and, at the bottom, the ones that
 * look the same and deliberately do not ask.
 *
 * rAthena is what settles which skills are scattered at all: `skill_timerskill` draws a
 * fresh random cell for every fall of `HN_METEOR_STORM_BUSTER`, `SKE_TWINKLING_GALAXY` and
 * `SKE_STAR_CANNON`, and the meteor family in `skill_unit_onplace_timer` (`WZ_METEOR`,
 * `AG_VIOLENT_QUAKE_ATK`, `AG_ALL_BLOOM_ATK`) puts one unit on each cell and damages only
 * whoever is standing on it. The counts, though, come from the client's own tables, pinned
 * column by column below — never from rAthena, which disagrees with LATAM on several of
 * them, and a skill whose count no source publishes gets no picker.
 *
 * The one invariant that matters for every build already saved: the default count has to
 * be the figure the skill printed before it had a picker. Card mkvqph0HW51cDiRaXxKS,
 * reported by pazzoLino; Florescer and Pilares de Pedra have their own spec
 * (ArchMage.scattered-hits.spec.ts).
 */

const VERSIONS = SKILL_FORMULA_VERSION_OPTIONS.map((option) => option.value);

const skillOf = (cls: { getAtkSkills: (v: SkillFormulaVersion) => AtkSkillModel[] }, value: string, version: SkillFormulaVersion): AtkSkillModel => {
  const skill = cls.getAtkSkills(version).find((entry) => entry.value === value);
  if (!skill) throw new Error(`${value} is not in the skill list (${version})`);

  return skill;
};

/** `min-max/default` per level, the way the row offers it. */
const offer = (skill: AtkSkillModel, levels: number[]) =>
  levels.map((level) => {
    const { min, max, count } = stackRange(skill, level);

    return `${min}-${max}/${count}`;
  });

const input = (skillLevel: number, stack?: number) =>
  ({ skillLevel, stack, model: { level: 250 }, status: { totalSpl: 100, totalPow: 100, totalCon: 100 },
    skills: { isActive: () => false, activeLevel: () => 0, learnedLevel: () => 0 } }) as unknown as AtkSkillFormulaInput;

const resolve = (value: AtkSkillModel['damageRepeat'], skillLevel: number, stack?: number) =>
  typeof value === 'function' ? value(input(skillLevel, stack)) : value;

/**
 * One row per skill: where it lives, which field counts the falls, and what the client's
 * table says. `offers` is read as `min-max/default` at each of `levels`.
 */
const SCATTERED = [
  {
    // "Derruba meteoritos de 5x5 células no chão", client id 5455, with a Meteoros column
    // of 3 up to Nv3 and one more every three levels after it. Both entries — the landing
    // and the explosion behind it — price one meteorito, so the default is 1.
    name: 'Chuva de Meteoritos (queda)', job: () => new HyperNovice(), value: 'Meteor Storm Buster==10',
    field: (skill: AtkSkillModel) => skill.damageRepeat,
    levels: [1, 3, 4, 7, 10], offers: ['1-3/1', '1-3/1', '1-4/1', '1-5/1', '1-6/1'],
  },
  {
    name: 'Chuva de Meteoritos (explosão)', job: () => new HyperNovice(), value: 'Meteor Storm Buster (Explosão)==10',
    field: (skill: AtkSkillModel) => skill.damageRepeat,
    levels: [1, 3, 4, 7, 10], offers: ['1-3/1', '1-3/1', '1-4/1', '1-5/1', '1-6/1'],
  },
  {
    // The only one whose table answers the question itself: meteors fall "aleatoriamente
    // numa área de 13x13 células" (client id 83), the Meteoros column is how many fall and
    // the Golpes column is how many reach one target — so the ceiling is the first and the
    // default is the second.
    name: 'Chuva de Meteoros', job: () => new HighWizard(), value: 'Meteor Storm==10',
    field: (skill: AtkSkillModel) => skill.totalHit,
    levels: [1, 2, 5, 9, 10], offers: ['1-2/1', '1-3/1', '1-4/3', '1-6/5', '1-7/5'],
  },
] as const;

describe.each(SCATTERED)('$name asks how many of its falls landed', ({ job, value, field, levels, offers }) => {
  it.each(VERSIONS)('offers one option per fall the client publishes (%s)', (version) => {
    expect(offer(skillOf(job(), value, version), [...levels])).toEqual([...offers]);
  });

  it.each(VERSIONS)('calls the counter "Acertos" rather than an accumulation (%s)', (version) => {
    expect(skillOf(job(), value, version).stackLabelKey).toBe('rot.hits');
  });

  it.each(VERSIONS)('counts exactly the falls the player picked (%s)', (version) => {
    const skill = skillOf(job(), value, version);

    for (const level of levels) {
      const { min, max } = stackRange(skill, level);
      expect(resolve(field(skill), level, min)).toBe(min);
      expect(resolve(field(skill), level, max)).toBe(max);
    }
  });

  it.each(VERSIONS)('keeps the count it had before the picker when nothing is chosen (%s)', (version) => {
    const skill = skillOf(job(), value, version);

    for (const [index, level] of levels.entries()) {
      expect(resolve(field(skill), level)).toBe(Number(offers[index].split('/')[1]));
    }
  });
});

/**
 * Colisão Astral's own row, which the table above cannot carry: the counter sits on the
 * skill but the falls are counted by `part2` — the asteroid lands once either way — and
 * the number of falls is the one thing that differs between bundles, 50 on the [V2] entry
 * in ArchMage.ts against the 19 of the patched ones.
 */
describe('Colisão Astral asks how many meteoritos landed', () => {
  const astral = (version: SkillFormulaVersion) => skillOf(new ArchMage(), 'Astral Strike==10', version);
  const falls = { current: 19, 'rebalance-2026-02': 19, 'pre-rebalance': 50 } as const;

  it.each(VERSIONS)('offers one option per meteorito of its own bundle (%s)', (version) => {
    expect(stackRange(astral(version), 10)).toEqual({ min: 1, max: falls[version], count: falls[version] });
    expect(astral(version).stackLabelKey).toBe('rot.hits');
  });

  it.each(VERSIONS)('repeats the meteoritos the player picked, and the asteroid once (%s)', (version) => {
    const skill = astral(version);

    expect(resolve(skill.part2!.damageRepeat, 10, 7)).toBe(7);
    expect(resolve(skill.part2!.damageRepeat, 10)).toBe(falls[version]);
    expect(resolve(skill.damageRepeat, 10, 7)).toBeUndefined();
  });
});

/** The ones that rain meteors too and deliberately have no counter. */
describe('a rain this change leaves alone keeps no counter', () => {
  it('leaves Meteoros de Nepeta alone', () => {
    // rAthena files SU_CN_METEOR with the meteor family, but the client's table (id 5028)
    // has one column, ATQM, and says nothing about how many nepetas fall. The engine's
    // seven hits are not documented as a fall count, so there is no number to bound the
    // picker with that would not be invented.
    expect(stackRange(skillOf(new Doram(), 'Catnip Meteor==5', 'current'), 5).max).toBe(0);
  });

  it('leaves Colapso Estelar alone — its meteors aim', () => {
    // "Faz meteoros caírem concentradamente sobre o alvo [...] uma vez a cada 0,3 segundos
    // ao alvo" (client id 5472), and rAthena draws no cell for it. Every fall reaches the
    // target, so there is nothing to choose — which is why the reference row prices all
    // 15 of them at once.
    expect(stackRange(skillOf(new SkyEmperor(), 'Star Burst==5', 'current'), 5).max).toBe(0);
  });

  it.each(['Twinkling Galaxy==5', 'Star Cannon==5'])('leaves %s alone until its fall count is settled', (value) => {
    // Constelação and Explosão Galática ARE scattered — `SKE_TWINKLING_GALAXY` and
    // `SKE_STAR_CANNON` draw a cell per fall — but a picker needs a fall count to bound
    // it, and the three bundles do not agree on one. The reference rows price 7 and 5
    // falls on `current` and 15 and 15 on `rebalance-2026-02`, while the job entries price
    // a single star ("1 estrela") and the client's own "4,5 segundos, uma vez a cada 0,3
    // segundos" reads 15. Choosing between them is a damage question, not a UI one, and it
    // needs a recording — so neither gets a counter yet.
    for (const version of VERSIONS) {
      expect(stackRange(skillOf(new SkyEmperor(), value, version), 5).max).toBe(0);
    }
  });
});
