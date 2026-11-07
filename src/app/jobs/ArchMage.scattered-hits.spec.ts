import { describe, expect, it } from 'vitest';
import { resolveRebalancedSkill } from 'src/app/skills/rebalance-2026';
import { SKILL_FORMULA_VERSION_OPTIONS, type SkillFormulaVersion } from 'src/app/skills/skill-formula-version';
import { stackRange } from 'src/app/utils';
import { ArchMage } from './ArchMage';
import { AtkSkillFormulaInput, AtkSkillModel } from './_character-base.abstract';

/**
 * Florescer (All Bloom 5222) and Pilares de Pedra (Violent Quake 5218) plant a garden and
 * then pick **one random cell at a time** to explode:
 *
 *   "A cada 0,3 segundos, uma célula aleatória será escolhida para 1 Flor explodir e
 *    atingir inimigos que estiverem 7x7 células ao redor daquela célula escolhida."
 *    — skilldescript.lub, ids 5222 and 5218 (client read 31/07/2026)
 *
 * The client's own table counts the explosions in a `Flores`/`Pilares` column: 4, 8, 12,
 * 16, 20 by level. It never says how many of them reach one target, because that is a
 * question about where the target stood — so the rotation row asks the player instead,
 * and defaults to the whole garden, which is what the engine assumed on its own before
 * the picker existed. Card mkvqph0HW51cDiRaXxKS, reported by pazzoLino.
 *
 * Potencializar Magia (Climax) doubles the explosions — Nv2 for Florescer, Nv1 for
 * Pilares de Pedra — and that doubling applies on top of whatever landed, so it is left
 * out of the picker's own bound.
 */

const VERSIONS = SKILL_FORMULA_VERSION_OPTIONS.map((option) => option.value);

/** The client's `Flores` / `Pilares` column. */
const GARDEN_BY_LEVEL = [4, 8, 12, 16, 20];

const magus = (climax = 0) => {
  const cls = new ArchMage();
  cls.setLearnSkills({
    activeSkillIds: cls.activeSkills.map((s) => (s.name === 'Climax' ? climax : 0)),
    passiveSkillIds: cls.passiveSkills.map(() => 0),
  });
  cls.getSkillBonusAndName();

  return cls;
};

const skillOf = (cls: ArchMage, name: string, version: SkillFormulaVersion): AtkSkillModel => {
  const skill = cls.getAtkSkills(version).find((s) => s.name === name);
  if (!skill) throw new Error(`${name} is not in the Magus skill list (${version})`);

  return skill;
};

/** The rebalance patches read Climax off `input.skills`; the job file off the instance. */
const input = (skillLevel: number, stack: number | undefined, climax: number) =>
  ({
    skillLevel, stack, model: { level: 250 }, status: { totalSpl: 100 },
    skills: { isActive: (n: any) => climax > 0 && (n?.name ?? n) === 'Climax', activeLevel: (n: any) => ((n?.name ?? n) === 'Climax' ? climax : 0), learnedLevel: () => 0 },
  }) as unknown as AtkSkillFormulaInput;

/** Explosions in one use: `totalHit` for Pilares de Pedra, `damageRepeat` for Florescer. */
const explosions = (skill: AtkSkillModel, skillLevel: number, stack?: number, climax = 0) => {
  const count = (value: number | ((i: AtkSkillFormulaInput) => number) | undefined) =>
    (typeof value === 'function' ? value(input(skillLevel, stack, climax)) : value) ?? 1;

  return count(skill.totalHit) * count(skill.damageRepeat);
};

describe.each(['All Bloom', 'Violent Quake'] as const)('%s scatters its hits', (name) => {
  it.each(VERSIONS)('offers one option per explosion the level plants (%s)', (version) => {
    const skill = skillOf(magus(), name, version);

    expect(GARDEN_BY_LEVEL.map((_, index) => stackRange(skill, index + 1))).toEqual(
      GARDEN_BY_LEVEL.map((garden) => ({ min: 1, max: garden, count: garden })),
    );
  });

  it.each(VERSIONS)('calls the counter "Acertos" rather than an accumulation (%s)', (version) => {
    expect(skillOf(magus(), name, version).stackLabelKey).toBe('rot.hits');
  });

  it.each(VERSIONS)('lands only the explosions the player says landed (%s)', (version) => {
    const skill = skillOf(magus(), name, version);

    expect(explosions(skill, 5, 12)).toBe(12);
    expect(explosions(skill, 5, 1)).toBe(1);
    expect(explosions(skill, 3, 5)).toBe(5);
  });

  it.each(VERSIONS)('still plants the whole garden when nothing was picked (%s)', (version) => {
    const skill = skillOf(magus(), name, version);

    expect(GARDEN_BY_LEVEL.map((_, index) => explosions(skill, index + 1))).toEqual(GARDEN_BY_LEVEL);
  });
});

describe('Potencializar Magia doubles what landed', () => {
  // Florescer's Nv2 ("2 Flores a cada 0,3 seg.") and Pilares de Pedra's Nv1 ("2 Pilares a
  // cada 0,3 seg.") double the explosions, so they double the ones that reached the
  // target too — the picker counts cells, not packets.
  const doubled = ([['All Bloom', 2], ['Violent Quake', 1]] as const)
    .flatMap(([name, climax]) => VERSIONS.map((version) => [name, climax, version] as const));

  it.each(doubled)('%s under Climax Nv%d (%s)', (name, climax, version) => {
    const skill = skillOf(magus(climax), name, version);

    expect(explosions(skill, 5, undefined, climax)).toBe(40);
    expect(explosions(skill, 5, 12, climax)).toBe(24);
  });
});

describe('a skill with no scattered hits keeps its own counter', () => {
  it('leaves an accumulation reading "Acúm."', () => {
    const servant = resolveRebalancedSkill(
      { name: 'Servant Weapon-Phantom', label: 'Servant Weapon-Phantom', value: 'Servant Weapon-Phantom==5', acd: 0, fct: 0, vct: 0, cd: 0, formula: () => 0 } as AtkSkillModel,
      'rebalance-2026-02',
    );

    expect(servant.stackLabelKey).toBeUndefined();
    expect(stackRange(servant, 5)).toEqual({ min: 1, max: 5, count: 5 });
  });

  it('gives a plain ground field no counter at all — its ticks are not random', () => {
    // Vereda Floral Incandescente hits "todos os oponentes" in the area on every tick
    // (skilldescript.lub id 5229): a target that stays takes all ten, so there is nothing
    // for the player to choose.
    expect(stackRange(skillOf(magus(), 'Floral Flare Road', 'current'), 5).max).toBe(0);
  });
});
