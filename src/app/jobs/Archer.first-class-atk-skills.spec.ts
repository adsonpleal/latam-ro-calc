import { describe, expect, it } from 'vitest';
import { Archer } from './Archer';
import { CLASS_CTOR_BY_ID } from './_class-list';
import { ITEM_AUTO_CAST_SKILLS } from '../skills/item-auto-cast-skills';
import { defaultAtkSkill } from '../core/rotation';

/**
 * Card fLHaAqiBPMgALZZ0V9O7: "as habilidades de primeira classe estão faltando no sentinela".
 * `Archer._atkSkillList` was empty, and `inheritSkills` only pushes a child's skills onto the
 * parent's list, so no Arqueiro attack skill reached any class promoted from it.
 *
 * What this pins is the reach, and the handful of facts that make the two skills safe to
 * inherit. Their per-level ratios belong to `skills/pre-third-skill-ratio-client-table.spec.ts`
 * and their cast and delay numbers to `skills/skill-delay.spec.ts`, so neither is restated here.
 */
const SKILLS = ['Double Strafe', 'Arrow Shower'] as const;

/**
 * Every selectable class promoted from the Arqueiro. `class-lineage.spec.ts` owns that tree and
 * names all nine; this derives the same set rather than copying the list into a second file.
 */
const PROMOTED_FROM_ARCHER = Object.values(CLASS_CTOR_BY_ID).filter((Ctor) => new Ctor() instanceof Archer);

describe("the Arqueiro's own attack skills", () => {
  it('offers both of them, at the ten levels the client publishes', () => {
    const archer = new Archer();

    for (const name of SKILLS) {
      const skill = archer.atkSkills.find((entry) => entry.name === name);

      expect(skill, `${name} is not on the Arqueiro`).toBeDefined();
      expect(skill!.levelList!.map((entry) => entry.value))
        .toEqual(Array.from({ length: 10 }, (_, index) => `${name}==${index + 1}`));
    }
  });

  /**
   * The card was filed about the Sentinela, but the skills sit a tier below it, so they reach
   * the whole bow line and both artist lines. The opening pick moves with them: `defaultAtkSkill`
   * takes the first non-utility entry and a parent's entries come first — already what the
   * Mercador's Mammonita does to the Criador. Builds already saved are untouched, `selectedAtkSkill`
   * being a string the picker resolves by name rather than by position.
   */
  it('carries them to every class promoted from the Arqueiro, and opens on one', () => {
    expect(PROMOTED_FROM_ARCHER).toHaveLength(9);

    for (const Ctor of PROMOTED_FROM_ARCHER) {
      const skills = new Ctor().atkSkills;
      const names = skills.map((entry) => entry.name);

      for (const name of SKILLS) expect(names, `${name} is missing`).toContain(name);
      expect(defaultAtkSkill(skills)).toBe('Double Strafe==10');
    }
  });

  /**
   * Rajada de Flechas is the one skill whose client ATQ column carries a hit count ("100% x2"):
   * `totalHit` applies the ratio twice, where `hit` would have split a single ratio into two
   * packets and halved the damage. The copy an item auto-cast fires has to agree, because
   * `skillForId` prefers the class entry — these nine classes would otherwise read a different
   * number from every other build. Only the element differs between the two, deliberately.
   */
  it('fires Rajada de Flechas twice per cast, and Chuva de Flechas once', () => {
    const skills = new Archer().atkSkills;
    const doubleStrafe = skills.find((entry) => entry.name === 'Double Strafe')!;
    const arrowShower = skills.find((entry) => entry.name === 'Arrow Shower')!;

    expect(doubleStrafe.totalHit).toBe(2);
    expect(doubleStrafe.hit).toBeUndefined();
    expect(ITEM_AUTO_CAST_SKILLS.find((entry) => entry.name === 'Double Strafe')!.totalHit).toBe(2);

    expect(arrowShower.totalHit).toBeUndefined();
    expect(arrowShower.hit).toBeUndefined();
  });

  /** A bow skill takes the equipped arrow's property, which is what leaving `element` unset means. */
  it('leaves the element to the arrow', () => {
    for (const entry of new Archer().atkSkills) {
      expect(entry.element, `${entry.name} should take the arrow's element`).toBeUndefined();
      expect(entry.isMatk, `${entry.name} is physical`).toBeFalsy();
      expect(entry.isMelee, `${entry.name} is ranged`).toBeFalsy();
    }
  });

  /**
   * Saved builds restore the buff and mastery dropdowns positionally whenever the saved array is
   * as long as the class's list (`matchesSavedSkillCount`), so a row added to either would shift
   * every saved level on nine classes. Nothing was added to them.
   */
  it('leaves the active and passive lists untouched', () => {
    const archer = new Archer();

    expect(archer.activeSkills.map((entry) => entry.name)).toEqual(['Improve Concentration']);
    expect(archer.passiveSkills.map((entry) => entry.name))
      .toEqual(["Owl's Eye", "Vulture's Eye", 'Double Strafe']);
  });
});
