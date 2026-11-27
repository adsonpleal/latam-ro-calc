import { describe, expect, it } from 'vitest';
import { AutoCastSource, BlockedAutoCastSource, ClassAutoCastResolution } from '../models/auto-cast.model';
import { SKILL_META } from '../skills';
import { ElementalMaster } from './ElementalMaster';
import { Scholar } from './Scholar';
import { Sorcerer } from './Sorcerer';

/**
 * Professor — Lanças Duplas (Lucky Cast / PF_DOUBLECASTING, 482). Tracker card
 * CtXQg4od5V0TyV78zIet: the skill existed in the client metadata and in no class, so it
 * reached neither the skill list nor the auto-cast panel.
 *
 * Sources, both read first-hand:
 *
 *  - the client's own text (`skill-meta.generated.ts`, 482): "Por 90 segundos, concede a
 *    chance de repetir Lanças de Fogo, Gelo ou Relâmpago ao atacar com essas
 *    habilidades", max level 5, chance 40/50/60/70/80;
 *  - https://browiki.org/wiki/Lanças_Duplas: "Concede a chance de repetir a magia **no
 *    mesmo nível** ao atacar com Lanças de Gelo, Lanças de Fogo e Relâmpago", and the
 *    class box that puts the skill under Professores.
 *
 * The level repeated is the selected one and not the learned one, which is why the rule
 * reads `model.selectedAtkSkill` rather than `skillState.learnedLevel`.
 */

const BOLTS = [
  { name: 'Fire Bolt', id: 19, label: 'Lanças de Fogo' },
  { name: 'Cold Bolt', id: 14, label: 'Lanças de Gelo' },
  { name: 'Lightening Bolt', id: 20, label: 'Relâmpago' },
] as const;

/** browiki's chance column, by Lanças Duplas level. */
const CHANCE_BY_LEVEL = [40, 50, 60, 70, 80];

const definitionOf = (character: Scholar = new Scholar()) =>
  character.autoCastDefinitions.find(({ key }) => key === 'lucky-cast')!;

function resolve(level: number, selectedAtkSkill = ''): ClassAutoCastResolution {
  return definitionOf().resolve({
    skillState: {
      isActive: () => false,
      activeLevel: (skill: any) => ((typeof skill === 'string' ? skill : skill.name) === 'Lucky Cast' ? level : 0),
      learnedLevel: () => 0,
    },
    model: { selectedAtkSkill },
  } as any);
}

const sourcesOf = (resolution: ClassAutoCastResolution): AutoCastSource[] => resolution.sources ?? [];
const blockedOf = (resolution: ClassAutoCastResolution): BlockedAutoCastSource[] => resolution.blocked ?? [];

describe('Lanças Duplas — the skill exists in the catalog', () => {
  it('carries id 482 and the pt-BR label from its own description', () => {
    // The client ships no entry for 482 in the skill-name table, so the label comes from
    // the first line of its description, which is how skill-meta is built.
    expect(SKILL_META['Lucky Cast'].id).toBe(482);
    expect(SKILL_META['Lucky Cast'].label).toBe('Lanças Duplas');
    expect(SKILL_META['Lucky Cast'].description.startsWith('Lanças Duplas')).toBe(true);
  });

  it('is offered as a skill the player can set a level on', () => {
    const labelsOf = (name: string) =>
      new Scholar().activeSkills.find((skill) => skill.name === name)?.dropdown.map(({ label }) => label);

    // Max level 5, in the order the base getter's sortSkill produces — asserted against a
    // neighbour it sorted rather than a literal list, which is easy to write backwards.
    expect(labelsOf('Lucky Cast')).toEqual(labelsOf('Endow Blaze'));
    expect(labelsOf('Lucky Cast')).toHaveLength(6);
  });

  it('reaches the Feiticeiro and the Elementalista, which inherit the Sage line', () => {
    for (const character of [new Sorcerer(), new ElementalMaster()]) {
      expect(character.activeSkills.some(({ name }) => name === 'Lucky Cast')).toBe(true);
    }
  });
});

describe('Lanças Duplas — repeating the bolt', () => {
  for (const [index, chance] of CHANCE_BY_LEVEL.entries()) {
    const level = index + 1;

    it(`Nv. ${level} repeats at ${chance}%`, () => {
      const sources = sourcesOf(resolve(level, 'Fire Bolt==10'));

      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({ chance, skillId: 19, triggerSkillId: 19, trigger: 'skill-use' });
    });
  }

  for (const { name, id } of BOLTS) {
    it(`repeats ${name} with itself when ${name} is the selected skill`, () => {
      const sources = sourcesOf(resolve(5, `${name}==10`));

      // The repeat is the same spell, so the cast and its trigger are one id.
      expect(sources).toHaveLength(1);
      expect(sources[0]).toMatchObject({ skillId: id, triggerSkillId: id, enablingSkillId: 482 });
    });
  }

  it('repeats at the level selected in the picker, not the maximum', () => {
    expect(sourcesOf(resolve(5, 'Fire Bolt==3'))[0].skillLevel).toBe(3);
    expect(sourcesOf(resolve(5, 'Fire Bolt==10'))[0].skillLevel).toBe(10);
  });

  it('offers no source for a skill it cannot repeat, and says which to select', () => {
    // Storm Gust is not one of the three bolts: nothing fires, and all three rows say so.
    const resolution = resolve(5, 'Storm Gust==10');

    expect(sourcesOf(resolution)).toHaveLength(0);
    // Each row is named after the spell in the pt-BR the client uses, not the internal name.
    expect(blockedOf(resolution).map(({ name, reason }) => [name, reason])).toEqual(
      BOLTS.map(({ label }) => [label, `Selecione ${label} como habilidade para ativar Lanças Duplas.`]),
    );
  });

  it('blocks the other two bolts while one of them is selected', () => {
    const resolution = resolve(5, 'Cold Bolt==10');

    expect(blockedOf(resolution).map(({ icon }) => icon)).toEqual([19, 20]);
  });

  it('asks for the level before anything else', () => {
    const resolution = resolve(0, 'Fire Bolt==10');

    expect(sourcesOf(resolution)).toHaveLength(0);
    expect(blockedOf(resolution)).toEqual([{
      key: 'lucky-cast', name: 'Lanças Duplas', icon: 482,
      reason: 'Selecione o nível de Lanças Duplas em Habilidades.',
    }]);
  });
});
