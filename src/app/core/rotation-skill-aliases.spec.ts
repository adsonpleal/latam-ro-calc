/**
 * `AtkSkillModel.values` is how a catalog entry keeps answering to a value it no longer
 * owns: a skill that used to be two entries, a level that used to be its own row, an
 * `[Improved] <name>` string from before the two forms were merged. Share links, saved
 * simulations and autosaves are full of them, and `findRotationSkill` is the one resolver
 * that reads them — including the engine's own lookup in `damage-calculator`, where an
 * unresolved value reads as "basic attack only" and the row silently stops dealing damage.
 *
 * That resolver takes the first entry that answers to the value, so an alias shadowing
 * another entry's own `value` would quietly redirect that entry's damage somewhere else.
 * No catalog has one today; this is what says so, per class.
 */
import { describe, expect, it } from 'vitest';
import { CLASS_CTOR_BY_ID } from '../jobs/_class-list';
import { AtkSkillModel, CharacterBase } from '../jobs/_character-base.abstract';
import { findRotationSkill } from './rotation';

/** Every value a class's catalog resolves on its own terms, mapped to its owning entry. */
const ownedValues = (skills: AtkSkillModel[]): Map<string, AtkSkillModel> => {
  const owners = new Map<string, AtkSkillModel>();
  for (const skill of skills) {
    if (skill.value && !owners.has(skill.value)) owners.set(skill.value, skill);
    for (const level of skill.levelList ?? []) if (level?.value && !owners.has(level.value)) owners.set(level.value, skill);
  }

  return owners;
};

describe('a retired skill value', () => {
  for (const [classId, Ctor] of Object.entries(CLASS_CTOR_BY_ID)) {
    const cls = new Ctor() as CharacterBase;
    cls.setLearnSkills({ activeSkillIds: cls.activeSkills.map(() => 0), passiveSkillIds: cls.passiveSkills.map(() => 0) }).getSkillBonusAndName();
    const skills = cls.getAtkSkills('current') as AtkSkillModel[];
    const owners = ownedValues(skills);

    it(`never shadows a value another entry still owns — ${cls.constructor.name}`, () => {
      const shadowed = skills.flatMap((skill) => (skill.values ?? [])
        .filter((alias) => owners.has(alias) && owners.get(alias) !== skill)
        .map((alias) => `"${alias}" is an alias of ${skill.value} but owned by ${owners.get(alias)!.value}`));

      expect(shadowed, `class ${classId}`).toEqual([]);
    });

    it(`resolves to the entry that claims it — ${cls.constructor.name}`, () => {
      for (const alias of skills.flatMap((skill) => skill.values ?? [])) {
        const resolved = findRotationSkill(skills, alias);
        expect(resolved, `class ${classId}: ${alias}`).toBeDefined();
        expect(resolved!.values, `class ${classId}: ${alias}`).toContain(alias);
      }
    });
  }
});
