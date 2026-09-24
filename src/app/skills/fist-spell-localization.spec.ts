import { describe, expect, it } from 'vitest';
import { Sorcerer } from '../jobs/Sorcerer';
import { resolveSkillMeta } from './index';

// Tracker GfZHIU4zvFliyhIw1bdM: Punho Arcano is an active state applied to
// ordinary attacks, never a skill that occupies a Batalha rotation slot.
describe('Punho Arcano picker', () => {
  const sorcerer = new Sorcerer();
  const fist = sorcerer.activeSkills.find((skill) => skill.name === 'Fist Spell')!;

  it('appears among active effects with the three interruptible bolts', () => {
    expect(resolveSkillMeta('Fist Spell')).toMatchObject({ id: 2445, label: 'Punho Arcano' });
    expect(fist.dropdown.map(({ label, value, icon }) => ({ label, value, icon }))).toEqual(expect.arrayContaining([
      { label: '-', value: 0, icon: undefined },
      { label: 'Lanças de Fogo Nv 10', value: 1, icon: 19 },
      { label: 'Lanças de Gelo Nv 10', value: 2, icon: 14 },
      { label: 'Relâmpago Nv 10', value: 3, icon: 20 },
    ]));
    expect(fist.dropdown).toHaveLength(4);
  });

  it('does not appear among attack skills', () => {
    expect(sorcerer.atkSkills.some((skill) => skill.name === 'Fist Spell')).toBe(false);
  });
});
