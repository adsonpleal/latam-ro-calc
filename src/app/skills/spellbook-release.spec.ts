import { describe, expect, it } from 'vitest';
import { ArchMage } from '../jobs/ArchMage';
import { Warlock } from '../jobs/Warlock';
import { AtkSkillModel } from '../jobs/_character-base.abstract';
import { calcSkillAspd } from '../utils/calc-skill-aspd';
import { resolveSkillById, SKILL_ID_BY_NAME } from './index';
import { MEMORIZABLE_SKILL_IDS } from './spellbook';

/**
 * [Lançar Magia] (Release) fires what [Memorizar] put away, so the spell costs no cast
 * and no recarga. The toggle is a Warlock one and every later class inherits it, which
 * is how a fourth-class Magus skill ended up with its recarga zeroed too — card
 * yZwUijZVK81HxNrvkVrV, "Espíritos Ancestrais de Magus está aparecendo sem Recarga".
 *
 * The gate is the Grimório: `skills/spellbook.ts` carries the ten the client ships and
 * where each one comes from.
 */

const aspdOf = (skillData: AtkSkillModel, released: boolean, skillLevel: number) =>
  calcSkillAspd({
    skillData,
    totalEquipStatus: { acd: 0, vct: 0, vct_inc: 0, fct: 0, fctPercent: 0, vctBySkill: 0, releasedSkill: released ? 1 : 0 } as any,
    status: { totalDex: 0, totalInt: 0 } as any,
    skillLevel,
  });

const atkSkill = (instance: { getAtkSkills: (version: 'current') => AtkSkillModel[] }, name: string): AtkSkillModel => {
  const found = instance.getAtkSkills('current').find((entry) => entry.name === name);
  expect(found, `${name} is missing from the catalog`).toBeDefined();

  return found!;
};

describe('the spells [Memorizar] can store', () => {
  it('is the ten Grimórios the client ships, and nothing above the Warlock', () => {
    expect([...MEMORIZABLE_SKILL_IDS].sort((a, b) => a - b)).toEqual([83, 85, 89, 2204, 2210, 2211, 2213, 2214, 2216, 2217]);
  });

  // Each id must still be a skill this build knows, so a catalog renumbering cannot leave
  // the list pointing at nothing while every assertion below keeps passing.
  it('names a skill the catalog knows, one per id', () => {
    const labels = [...MEMORIZABLE_SKILL_IDS].map((id) => resolveSkillById(id)?.name);

    expect(labels).not.toContain(undefined);
  });

  it('does not include Espíritos Ancestrais, which has no Grimório', () => {
    expect(SKILL_ID_BY_NAME['Soul Vulcan Strike']).toBe(5220);
    expect(MEMORIZABLE_SKILL_IDS.has(5220)).toBe(false);
  });
});

describe('[Lançar Magia] and the recarga of a Magus skill', () => {
  const soulVulcan = atkSkill(new ArchMage() as any, 'Soul Vulcan Strike');

  // The client's own row for 5220: fixa 1s, variável 3s, pós 0,5s, recarga 0,7s.
  it.each([1, 2, 3, 4, 5])('keeps the 0,7 s recarga at Nv%i with the toggle on', (level) => {
    expect(aspdOf(soulVulcan, true, level).reducedCd).toBe(0.7);
  });

  it('leaves its cast times alone too — the spellbook never held it', () => {
    const released = aspdOf(soulVulcan, true, 5);

    expect({ fct: released.reducedFct, vct: released.reducedVct }).toEqual({ fct: 1, vct: 3 });
    expect(released.hitPeriod).toBe(aspdOf(soulVulcan, false, 5).hitPeriod);
  });
});

describe('[Lançar Magia] and a spell the Warlock did memorize', () => {
  const comet = atkSkill(new Warlock() as any, 'Comet');

  it('still releases Cometa with no cast and no recarga', () => {
    const released = aspdOf(comet, true, 5);

    expect({ cd: released.reducedCd, fct: released.reducedFct, vct: released.reducedVct }).toEqual({ cd: 0, fct: 0, vct: 0 });
  });

  it('and the client row it is compared against survives untouched', () => {
    const plain = aspdOf(comet, false, 5);
    const released = aspdOf(comet, true, 5);

    expect(released.clientCd).toBe(plain.clientCd);
    expect(plain.reducedCd).toBe(plain.clientCd);
  });
});
