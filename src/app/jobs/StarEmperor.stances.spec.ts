import { describe, expect, it } from 'vitest';
import { SKILL_META } from 'src/app/skills';
import { SkyEmperor } from './SkyEmperor';
import { StarEmperor } from './StarEmperor';

/**
 * The Mestre Estelar stances, and Postura do Universo in particular (tracker card
 * inOubqxvX1iTTRPxcwJv, which asked for it on the Mestre Celestial).
 *
 * Ownership: bROWiki's "Mestres Estelares" navbox lists Postura do Universo among the
 * Star Emperor skills, and the "Mestres Celestiais" navbox carries no stance at all — so
 * it lives in StarEmperor.ts and the Sky Emperor reaches it by inheriting that list. A
 * replay is no help here: a Sky Emperor recording shows 2583 learned, but a 4th job
 * inherits its 3rd job's whole tree, so that proves reachability and not ownership.
 *
 * Effect: "Todos os atributos +3/+4/+5" per level, from the client description (skill
 * 2583 in the ragassets feed) and the level table on browiki.org/wiki/Postura_do_Universo.
 *
 * Exclusivity: each basic stance's own description says it cannot be combined with the
 * other two. Postura do Universo's client text omits the clause, but the same bROWiki page
 * carries it under Notas — "Não pode ser usada simultaneamente com a Postura Solar,
 * Postura Lunar e Postura Estelar". All of them therefore share one `exclusiveGroup`.
 *
 * Postura Lunar (2575) is deliberately not offered: it grants only HP máx +%, which this
 * calculator does not measure, so it would be a control that changes no number.
 */

const STANCES = ['Solar Stance', 'Stellar Stance', 'Universe Stance'];

/** Turn one active skill on by name and hand back the bonus it contributes. */
function bonusOf(skillName: string, value: number): Record<string, number> {
  const cls = new StarEmperor();
  const index = cls.activeSkills.findIndex((s) => s.name === skillName);
  expect(index).toBeGreaterThanOrEqual(0);

  const activeSkillIds = cls.activeSkills.map(() => 0);
  activeSkillIds[index] = value;

  const { equipAtks } = cls.setLearnSkills({ activeSkillIds, passiveSkillIds: [] }).getSkillBonusAndName();

  return (equipAtks[skillName] ?? {}) as Record<string, number>;
}

describe('Postura do Universo', () => {
  it('is in the skill catalog under its client id and pt-BR label', () => {
    // Without the catalog entry the panel renders the English name and no icon:
    // ro-calculator.component.ts overwrites `label` from here.
    expect(SKILL_META['Universe Stance'].id).toBe(2583);
    expect(SKILL_META['Universe Stance'].label).toBe('Postura do Universo');
    expect(SKILL_META['Universe Stance'].description).toContain('Todos os atributos +5');
  });

  it('raises all six base stats, +3/+4/+5 by level', () => {
    for (const [level, amount] of [[1, 3], [2, 4], [3, 5]] as const) {
      expect(bonusOf('Universe Stance', level)).toEqual({
        str: amount, agi: amount, vit: amount, int: amount, dex: amount, luk: amount,
      });
    }
  });

  it('grants nothing while it is switched off', () => {
    expect(bonusOf('Universe Stance', 0)).toEqual({});
  });

  it('moves no trait stat', () => {
    // "Todos os atributos" is the six base stats; POW/STA/WIS/SPL/CON/CRT are not in it.
    const bonus = bonusOf('Universe Stance', 3);
    for (const trait of ['pow', 'sta', 'wis', 'spl', 'con', 'crt']) {
      expect(bonus[trait]).toBeUndefined();
    }
  });

  it('reaches the Mestre Celestial by inheritance', () => {
    expect(new SkyEmperor().activeSkills.map((s) => s.name)).toContain('Universe Stance');
  });
});

describe('the stances are mutually exclusive', () => {
  it('puts every stance in one exclusive group', () => {
    const cls = new StarEmperor();

    const groups = STANCES.map((name) => {
      const skill = cls.activeSkills.find((s) => s.name === name);
      expect(skill, `${name} is missing from the active skill list`).toBeDefined();
      return skill!.exclusiveGroup;
    });

    // One shared, defined group — this is what onSkillClassChange switches on to turn
    // the others off. A fourth stance added later without it would fail here.
    expect(new Set(groups).size).toBe(1);
    expect(groups[0]).toBeTruthy();
  });

  it('leaves each stance own bonus intact', () => {
    // The group only governs which one may be on, never what it grants.
    expect(bonusOf('Solar Stance', 3)).toEqual({ atkPercent: 5 });
    expect(bonusOf('Stellar Stance', 3)).toEqual({ aspdPercent: 10 });
  });
});
