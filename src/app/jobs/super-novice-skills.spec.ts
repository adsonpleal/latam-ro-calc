import { describe, expect, it } from 'vitest';
import { ArchMage, SuperNovice } from './index';
import { SKILL_ID_BY_NAME } from '../skills';
import { IntensificationFn } from '../constants/share-active-skills';
import { ElementType } from '../constants/element-type.const';
import { AtkSkillModel } from './_character-base.abstract';

/**
 * Reported by bernardoolimpio: Superaprendiz was missing two skills the Magus line has —
 * "Telecinesia" (Intensification) under Habilidades/efeitos ativos, and "Impacto
 * Espiritual" (Soul Expansion) as a battle-summary attack skill.
 *
 * The pt-BR labels come from the skill catalog at render time, so the job files key off
 * the English names. Magus is ArchMage, which inherits both from Warlock — these tests
 * compare the Super Novice copies against that source so the two cannot drift apart.
 */

const superNovice = new SuperNovice();
const magus = new ArchMage();

const atk = (char: { atkSkills: AtkSkillModel[] }, name: string) => char.atkSkills.find((s) => s.name === name);
const active = (char: { activeSkills: any[] }, name: string) => char.activeSkills.find((s) => s.name === name);

describe('Superaprendiz — Telecinesia / Impacto Espiritual', () => {
  it('resolves both skills in the catalog under their pt-BR labels', () => {
    expect(SKILL_ID_BY_NAME['Intensification']).toBe(5012);
    expect(SKILL_ID_BY_NAME['Soul Expansion']).toBe(2202);
  });

  it('offers Impacto Espiritual as an attack skill', () => {
    const skill = atk(superNovice, 'Soul Expansion');

    expect(skill, 'Soul Expansion missing from atkSkills').toBeDefined();
    expect(skill.value).toBe('Soul Expansion==5');
    expect(skill.isMatk).toBe(true);
    expect(skill.element).toBe(ElementType.Ghost);
    expect(skill.hit).toBe(2);
  });

  it('offers Telecinesia as an active skill with all five levels', () => {
    const skill = active(superNovice, 'Intensification');

    expect(skill, 'Intensification missing from activeSkills').toBeDefined();
    expect(skill.inputType).toBe('dropdown');
    expect(skill.dropdown.filter((d: any) => d.isUse)).toHaveLength(5);
  });

  it('matches the Magus versions field for field', () => {
    const mine = atk(superNovice, 'Soul Expansion');
    const theirs = atk(magus, 'Soul Expansion');
    for (const key of ['value', 'acd', 'fct', 'vct', 'cd', 'isMatk', 'element', 'hit']) {
      expect(mine[key], key).toEqual(theirs[key]);
    }

    expect(active(superNovice, 'Intensification').dropdown).toEqual(active(magus, 'Intensification').dropdown);
  });

  it('hands every class its own Telecinesia object', () => {
    // `CharacterBase.activeSkills` sorts `dropdown` IN PLACE, so a shared const would have
    // Warlock and Super Novice mutating one array. Hence the factory. Asserted on the
    // factory itself, not on `activeSkills` — that getter returns `{...a, dropdown: [...]}`,
    // so it hands back a fresh array either way and would pass even for a shared const.
    const a = IntensificationFn();
    const b = IntensificationFn();

    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    expect(a.dropdown).not.toBe(b.dropdown);
  });

  it('computes the same damage ratio as the Magus copy', () => {
    // (1000 + skillLevel*200 + INT) * (baseLevel/100)
    const input: any = { model: { level: 200 }, skillLevel: 5, status: { totalInt: 100 } };
    const mine = atk(superNovice, 'Soul Expansion').formula(input);

    expect(mine).toBe(4200);
    expect(mine).toBe(atk(magus, 'Soul Expansion').formula(input));
  });

  it('scales Telecinesia\'s Ghost bonus 40 per level, alongside the cast-time cut', () => {
    // The pairing is the point: Telecinesia only does anything because Impacto Espiritual
    // is Ghost-element. Landing one without the other would be inert.
    // The `activeSkills` getter runs each dropdown through sortSkill, which surfaces the
    // highest level first — hence the descending order here.
    const levels = active(superNovice, 'Intensification').dropdown.filter((d: any) => d.isUse);

    expect(levels.map((d: any) => d.bonus.final_ghost)).toEqual([200, 160, 120, 80, 40]);
    expect(levels.map((d: any) => d.bonus.vct)).toEqual([50, 40, 30, 20, 10]);
  });

  it('leaves the rest of the Super Novice kit alone', () => {
    // Regression guard: the two additions should not have displaced anything.
    for (const name of ['Fire Bolt', 'Psychic Wave', 'Tiger Cannon', 'Ignition Break']) {
      expect(atk(superNovice, name), name).toBeDefined();
    }
    for (const name of ['Improve Concentration', 'Cart Boost', 'Enchant Deadly Poison']) {
      expect(active(superNovice, name), name).toBeDefined();
    }
  });
});
