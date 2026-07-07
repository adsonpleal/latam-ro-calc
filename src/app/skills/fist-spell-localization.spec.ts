import { describe, expect, it } from 'vitest';
import { Sorcerer } from '../jobs/Sorcerer';
import { resolveSkillMeta } from './index';

// Guards the data contract behind ro-calculator.component.ts `localize()` for a
// treated-as skill (Fist Spell / Punho Arcano): the Skill Catalog entry, the
// Sorcerer level-list values and its treatedAsSkillNameFn must keep resolving each
// entry to the underlying bolt's pt-BR name + icon. Mirrors the component mapping.
const resolveSkill = (name: string) => {
  const meta = resolveSkillMeta(name);
  if (!meta || meta.id === undefined) return undefined;
  return { id: meta.id, name: meta.label ?? name };
};

describe('Punho Arcano (Fist Spell) picker localization', () => {
  const fist = new Sorcerer().atkSkills.find((s) => s.name === 'Fist Spell')!;

  it('parent skill localizes to "Punho Arcano" with icon 2445', () => {
    expect(resolveSkill('Fist Spell')).toEqual({ id: 2445, name: 'Punho Arcano' });
  });

  it('level-list entries relabel to the bold bolt name + icon, no repeating prefix', () => {
    const treatedFn = (fist as any).treatedAsSkillNameFn as (v: string) => string;
    const localized = fist.levelList!.map((entry) => {
      const treatedName = treatedFn(entry.value)?.split('==')[0];
      const pt = resolveSkill(treatedName);
      return { value: entry.value, label: pt!.name, icon: pt!.id };
    });

    expect(localized).toEqual([
      { value: 'Fist Spell Fire Bolt==10', label: 'Lanças de Fogo', icon: 19 },
      { value: 'Fist Spell Cold Bolt==10', label: 'Lanças de Gelo', icon: 14 },
      { value: 'Fist Spell Lightening Bolt==10', label: 'Relâmpago', icon: 20 },
    ]);
  });
});
