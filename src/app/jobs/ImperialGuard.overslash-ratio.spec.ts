import { describe, expect, it } from 'vitest';
import { AtkSkillFormulaInput, AtkSkillModel } from './_character-base.abstract';
import { ImperialGuard } from './ImperialGuard';

/**
 * The three Imperial Guard attack skills, held to the base ratio in the client's own
 * pt-BR description — the source of truth for a skill's effect (CLAUDE.md), which the
 * Sigma blog's "[V2]" tables do not describe for LATAM (see the Night Watch and Sky
 * Emperor cases: 6 of 7 and 5 of 6 skills wrong).
 *
 *   Golpe do Destino     (Overslash, 5266)        Nv 1..10   80% x nível
 *   Arremessar Escudo    (Shield Shooting, 5265)  Nv 1..5    600% x nível
 *   Crux Tempestas       (Cross Rain, 5267)       Nv 1..10   150% x nível  (250% com Escudo Divino)
 *
 * **Golpe do Destino was carrying 60**, so a Maestria da Guarda Nv10 build came out
 * ~11% short and a Maestria Nv0 one ~25%. What identifies 80 as the base rather than as
 * "80 already includes some mastery" is the shape of its two siblings: both take the
 * client's number verbatim and add their mastery term on top of it, which is what leaves
 * `skillLevel x (base + mastery x n)` with `base` equal to the client's row in every case
 * but this one.
 *
 * **The mastery terms themselves are not verified here.** The client says only "Afeta o
 * dano de algumas habilidades" for Maestria da Guarda and Perícia com Escudo, with no
 * number, so the per-level figures (x10, x15, x5) still come from the blog and are the
 * open question on this class — a recording of Golpe do Destino at two mastery levels
 * would settle them, the way the replay behind `RoyalGuard.over-brand-replay.spec.ts`
 * settled Lança do Destino. These tests pin the base at mastery 0, where the mastery term
 * drops out and the client's table is the whole answer.
 */

const BASE_LEVEL = 100; // x baseLevel/100 = x1, so the ratio reads as the client's %

/** The class with an empty skill state — every mastery at 0, no toggle active. */
function bare(active: string[] = []): ImperialGuard {
  const cls = new ImperialGuard();
  (cls as any).bonuses = {
    activeSkillNames: new Set<string>(active),
    equipAtks: {},
    masteryAtks: {},
    learnedSkillMap: new Map<string, number>(),
    usedSkillMap: new Map<string, number>(),
  };
  return cls;
}

function ratioOf(cls: ImperialGuard, name: string, skillLevel: number): number {
  const skill = cls.atkSkills.find((s: AtkSkillModel) => s.name === name);
  if (!skill) throw new Error(`atk skill not found: ${name}`);
  const input = {
    model: { level: BASE_LEVEL },
    skillLevel,
    status: { totalPow: 0, totalSpl: 0 },
    equipmentBonus: { shield: { weight: 0, refine: 0 } },
  } as unknown as AtkSkillFormulaInput;

  // The server int-casts the ratio; see [[skill-ratio-truncation]].
  return Math.floor(skill.formula(input));
}

describe('Golpe do Destino — 80% por nível, a tabela do cliente (era 60%)', () => {
  const cls = bare();
  const client = [80, 160, 240, 320, 400, 480, 560, 640, 720, 800];

  it.each(client.map((pct, i) => ({ lv: i + 1, pct })))('Nv $lv -> $pct%', ({ lv, pct }) => {
    expect(ratioOf(cls, 'Overslash', lv)).toBe(pct);
  });

  it('Maestria da Guarda soma por cima da base, não dentro dela', () => {
    const withMastery = bare();
    (withMastery as any).bonuses.learnedSkillMap.set('Spear & Sword Mastery', 10);
    expect(ratioOf(withMastery, 'Overslash', 10)).toBe(10 * (80 + 10 * 10));
  });
});

describe('Arremessar Escudo — 600% por nível', () => {
  const cls = bare();
  // The +500 constant is the engine's own and has no client row; subtracting it isolates
  // the per-level ratio the table does state.
  const client = [600, 1200, 1800, 2400, 3000];

  it.each(client.map((pct, i) => ({ lv: i + 1, pct })))('Nv $lv -> $pct%', ({ lv, pct }) => {
    expect(ratioOf(cls, 'Shield Shooting', lv) - 500).toBe(pct);
  });
});

describe('Crux Tempestas — 150% por nível, 250% com Escudo Divino', () => {
  it('sem Escudo Divino', () => {
    const cls = bare();
    for (const [i, pct] of [150, 300, 450, 600, 750, 900, 1050, 1200, 1350, 1500].entries()) {
      expect(ratioOf(cls, 'Cross Rain', i + 1)).toBe(pct);
    }
  });

  it('com Escudo Divino', () => {
    const cls = bare(['Holy Shield']);
    for (const [i, pct] of [250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 2500].entries()) {
      expect(ratioOf(cls, 'Cross Rain', i + 1)).toBe(pct);
    }
  });
});
