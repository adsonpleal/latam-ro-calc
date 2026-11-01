import { describe, expect, it } from 'vitest';
import { SKILL_META } from '../skills/skill-meta.generated';
import type { SkillFormulaVersion } from '../skills/skill-formula-version';
import { ShadowCross } from './ShadowCross';

/**
 * Adulterar Veneno (Potent Venom, 5290) — how much TEN it ignores, per level and per
 * formula version. Tracker card Uab4g4EkJnqlxV3McjdB (reported by Ametsuky).
 *
 * The 28/10/2026 patch cut it from 3% to 2% per level (30% -> 20% at Nv10). Two sources:
 *  - LATAM's notice "Rebalanceamento de habilidades: Edição 1" (29/10/2026),
 *    https://ro.gnjoyamericas.com/pt/news/notice/446 — "Antes: Ignora 30%", "Agora: Ignora 20%";
 *  - the 28/10/2026 client description, transcribed in skill-meta.generated.ts.
 * `pre-rebalance` keeps the 3% the replay specs recorded before the patch.
 */
const peneResOf = (level: number, skillFormulaVersion?: SkillFormulaVersion): number => {
  const c = new ShadowCross();
  (c as any).bonuses = {
    activeSkillNames: new Set(level ? ['Potent Venom'] : []),
    learnedSkillMap: new Map(),
    usedSkillMap: new Map(level ? [['Potent Venom', level]] : []),
  };
  const totalBonus: any = {};
  c.setAdditionalBonus({ totalBonus, weapon: { isType: () => false }, model: { skillFormulaVersion } } as any);
  return totalBonus.pene_res ?? 0;
};

/** "[Nv N]: X%" rows of the client's "Nível l TEN ignorada l Duração" table. */
const clientTable = (): number[] =>
  [...SKILL_META['Potent Venom'].description.matchAll(/\[Nv (\d+)\]: \^777777(\d+)%/g)].map((m) => Number(m[2]));

describe('Adulterar Veneno — TEN ignored', () => {
  it('the client description lists 2% per level, 20% at Nv10', () => {
    expect(clientTable()).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
  });

  it.each([undefined, 'current', 'rebalance-2026-02'] as const)('reproduces the client table under %s', (version) => {
    const engine = Array.from({ length: 10 }, (_, i) => peneResOf(i + 1, version));
    expect(engine).toEqual(clientTable());
  });

  it('Nv5 ignores 10% and Nv10 20% on the LATAM baseline', () => {
    expect(peneResOf(5)).toBe(10);
    expect(peneResOf(10)).toBe(20);
  });

  it('pre-rebalance keeps 3% per level (15% at Nv5, 30% at Nv10)', () => {
    expect(peneResOf(5, 'pre-rebalance')).toBe(15);
    expect(peneResOf(10, 'pre-rebalance')).toBe(30);
  });

  it('grants nothing when it is off', () => {
    expect(peneResOf(0)).toBe(0);
    expect(peneResOf(0, 'pre-rebalance')).toBe(0);
  });
});
