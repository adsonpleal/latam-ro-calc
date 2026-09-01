import { describe, expect, it } from 'vitest';
import { ArchMage, SuperNovice, Warlock } from './index';
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

/**
 * Three more skills the Superaprendiz has in game and the calculator did not offer,
 * reported anonymously (tracker RtQoUCeAB7NxnzQ7Xlkq).
 *
 * Two of them are learned: bROWiki's Superaprendizes page lists the whole Bruxo column
 * under "Expansão", Nevasca and Chuva de Meteoros among them. The third is not — Meteoro
 * Escarlate reaches this class only through an item, and that is what the gate below is
 * about:
 *
 *   400528 Boina Escarlate-OS
 *     Conjunto [Rutilus-OS]: Habilita [Meteoro Escarlate] nv.5.
 *
 * The grant lives on the headgear's script as `enable_skill__2211`, conditioned on
 * EQUIP_ID[26151], so the job file reads the item instead of hardcoding the pair. Without
 * both pieces the skill still shows in the picker and reports "Requer", the same way
 * Shield Chain does with no shield.
 */
describe('Superaprendiz — Nevasca, Chuva de Meteoros e Meteoro Escarlate', () => {
  const arcano = new Warlock();

  it('resolves all three in the catalog under their pt-BR labels', () => {
    expect(SKILL_ID_BY_NAME['Storm Gust']).toBe(89);
    expect(SKILL_ID_BY_NAME['Meteor Storm']).toBe(83);
    expect(SKILL_ID_BY_NAME['Crimson Rock']).toBe(2211);
  });

  it('offers Nevasca at Lv10: Water, 10 snowballs, 570% each', () => {
    const skill = atk(superNovice, 'Storm Gust');

    expect(skill, 'Storm Gust missing from atkSkills').toBeDefined();
    expect(skill.value).toBe('Storm Gust==10');
    expect(skill.isMatk).toBe(true);
    expect(skill.element).toBe(ElementType.Water);
    // bROWiki Nevasca: "O ATQM causado é contado por cada bola de neve, num máximo de 10".
    expect(skill.totalHit).toBe(10);
    // Client table: 120% at Lv1, +50 per level.
    expect(skill.formula({ skillLevel: 1 } as any)).toBe(120);
    expect(skill.formula({ skillLevel: 10 } as any)).toBe(570);
  });

  it('offers Chuva de Meteoros at Lv10: Fire, 125% per hit, ceil(nível/2) hits', () => {
    const skill = atk(superNovice, 'Meteor Storm');

    expect(skill, 'Meteor Storm missing from atkSkills').toBeDefined();
    expect(skill.value).toBe('Meteor Storm==10');
    expect(skill.isMatk).toBe(true);
    expect(skill.element).toBe(ElementType.Fire);
    expect(skill.formula({ skillLevel: 10 } as any)).toBe(125);
    // The client's "Golpes" column, level 1 through 10.
    const hits = (lv: number) => (skill.totalHit as any)({ skillLevel: lv });
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(hits)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('matches the Arcano version of Meteoro Escarlate field for field', () => {
    const mine = atk(superNovice, 'Crimson Rock');
    const theirs = atk(arcano, 'Crimson Rock');

    expect(mine, 'Crimson Rock missing from atkSkills').toBeDefined();
    for (const key of ['value', 'acd', 'fct', 'vct', 'cd', 'isMatk', 'element', 'hit']) {
      expect(mine[key], key).toEqual(theirs[key]);
    }

    const input: any = { model: { level: 200 }, skillLevel: 5 };
    expect(mine.formula(input)).toBe(7400); // (700 + 5*600) * (200/100)
    expect(mine.formula(input)).toBe(theirs.formula(input));
  });

  describe('Meteoro Escarlate is gated on the item that grants it', () => {
    const requires = (granted: number | undefined) =>
      atk(superNovice, 'Crimson Rock').verifyItemFn({
        totalBonus: granted === undefined ? {} : { enable_skill__2211: granted },
        skillLevel: 5,
      } as any);

    it('asks for the set when nothing grants it', () => {
      expect(requires(undefined)).toBe('Boina Escarlate-OS + Rutilus-OS');
    });

    it('still asks when the grant is below the level being calculated', () => {
      expect(requires(3)).toBe('Boina Escarlate-OS + Rutilus-OS');
    });

    it('lets it through once the grant covers the level', () => {
      expect(requires(5)).toBe('');
    });

    it('does not gate the two learned skills', () => {
      expect(atk(superNovice, 'Storm Gust').verifyItemFn).toBeUndefined();
      expect(atk(superNovice, 'Meteor Storm').verifyItemFn).toBeUndefined();
    });

    it('the Arcano keeps its ungated copy', () => {
      expect(atk(arcano, 'Crimson Rock').verifyItemFn).toBeUndefined();
    });
  });

  it('leaves the rest of the Super Novice kit alone', () => {
    for (const name of ['Fire Bolt', 'Lord of Vermilion', 'Gravitational Field', 'Psychic Wave', 'Soul Expansion']) {
      expect(atk(superNovice, name), name).toBeDefined();
    }
  });
});
