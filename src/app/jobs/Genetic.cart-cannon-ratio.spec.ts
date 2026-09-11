import { describe, expect, it } from 'vitest';
import { AtkSkillFormulaInput, AtkSkillModel } from './_character-base.abstract';
import { Genetic } from './Genetic';

/**
 * Canhão de Prótons (Cart Cannon, 2477) — the ratio, by level of Aprimorar Carrinho.
 *
 * The client's table gives two of the three terms outright:
 *
 *   Nível l Área l ATQ l Nv. de Aprimorar Carrinho
 *   [Nv 1]: 3x3 l   250% l +20%
 *   [Nv 5]: 7x7 l 1.250% l +100%
 *
 * so 250% per level of the skill, plus 20% per level of the skill for each level of
 * Aprimorar Carrinho. For INT it says only "O dano é afetado pela INT", with no figure —
 * and that is the term the engine had wrong: it carried a flat `INT x 2`, while rAthena's
 * own implementation divides it by `(6 - Aprimorar Carrinho)`:
 *
 *   skillratio += -100 + (250 + 20 * remodeling) * skill_lv + 2 * int / (6 - remodeling);
 *
 * The two agree at Aprimorar Carrinho 5, where the divisor is 1 — which is every build on
 * the tracker, and why `Genetic.cart-cannon-gear-states.spec.ts` reproduces its recording
 * to the unit either way. Below that the old code overpaid, by 2x INT at Aprimorar
 * Carrinho 4 down to 5/6 of an INT-doubling at Aprimorar Carrinho 0.
 *
 * rAthena is the authority here only because the client states no arithmetic for this
 * term; where the client does state something it wins (CLAUDE.md), which is why the 250
 * and the 20 above are taken from its table and not from the same rAthena line.
 */

const BASE_LEVEL = 100; // x baseLevel/100 = x1, so the ratio reads as the client's %
const TOTAL_INT = 120;

/** The class with an empty skill state, then Aprimorar Carrinho set to `remodeling`. */
function withRemodeling(remodeling: number): Genetic {
  const cls = new Genetic();
  (cls as any).bonuses = {
    activeSkillNames: new Set<string>(),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>([['Cart Remodeling', remodeling]]),
    usedSkillMap: new Map<string, number>(),
  };
  return cls;
}

function ratioOf(cls: Genetic, skillLevel: number, totalInt = TOTAL_INT): number {
  const skill = cls.atkSkills.find((s: AtkSkillModel) => s.name === 'Cart Cannon');
  if (!skill) throw new Error('atk skill not found: Cart Cannon');
  const input = {
    model: { level: BASE_LEVEL, ammo: 0 },
    skillLevel,
    status: { totalInt },
    monster: { isElement: () => false },
  } as unknown as AtkSkillFormulaInput;

  // The server int-casts the ratio; see [[skill-ratio-truncation]].
  return Math.floor(skill.formula(input));
}

describe('Canhão de Prótons — 250% por nível, mais 20% por nível de Aprimorar Carrinho', () => {
  it.each([
    { remodeling: 0, porNivel: 250 },
    { remodeling: 1, porNivel: 270 },
    { remodeling: 2, porNivel: 290 },
    { remodeling: 3, porNivel: 310 },
    { remodeling: 4, porNivel: 330 },
    { remodeling: 5, porNivel: 350 },
  ])('Aprimorar Carrinho $remodeling -> $porNivel% por nível', ({ remodeling, porNivel }) => {
    const cls = withRemodeling(remodeling);
    // INT 0 drops the third term, leaving the two the client's table states.
    for (const lv of [1, 2, 3, 4, 5]) {
      expect(ratioOf(cls, lv, 0)).toBe(lv * porNivel);
    }
  });
});

describe('Canhão de Prótons — o termo de INT é dividido por (6 - Aprimorar Carrinho)', () => {
  it.each([
    { remodeling: 0, divisor: 6 },
    { remodeling: 1, divisor: 5 },
    { remodeling: 2, divisor: 4 },
    { remodeling: 3, divisor: 3 },
    { remodeling: 4, divisor: 2 },
    { remodeling: 5, divisor: 1 },
  ])('Aprimorar Carrinho $remodeling -> INT x 2 / $divisor', ({ remodeling, divisor }) => {
    const cls = withRemodeling(remodeling);
    const semInt = ratioOf(cls, 5, 0);
    expect(ratioOf(cls, 5, TOTAL_INT) - semInt).toBe(Math.floor((2 * TOTAL_INT) / divisor));
  });

  /**
   * The case the recordings cannot reach and the old code got wrong: at Aprimorar Carrinho
   * 5 the divisor is 1 and nothing changes, so only a build below that shows the bug.
   */
  it('só coincide com INT x 2 no nível máximo de Aprimorar Carrinho', () => {
    expect(ratioOf(withRemodeling(5), 5) - ratioOf(withRemodeling(5), 5, 0)).toBe(2 * TOTAL_INT);
    expect(ratioOf(withRemodeling(4), 5) - ratioOf(withRemodeling(4), 5, 0)).toBe(TOTAL_INT);
    expect(ratioOf(withRemodeling(0), 5) - ratioOf(withRemodeling(0), 5, 0)).toBe(40);
  });
});
