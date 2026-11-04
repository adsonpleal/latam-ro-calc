import { describe, expect, it } from 'vitest';
import { ImperialGuard } from 'src/app/jobs/ImperialGuard';
import { calcSkillAspd } from 'src/app/utils/calc-skill-aspd';
import { Worn, wornBonus } from './__tests__/worn-bonus';

/**
 * 491111 Colar Consagrado: Coragem and the `Recarga de [Crux Tempestas]` of its
 * `Conjunto [Espada Vivatus Fides]` (500027) — the one clause of that block the record
 * was missing, so the skill simulated on its full cooldown with the pair equipped.
 *
 * Source: the necklace's pt-BR client description (latam-items.json, 491111), confirmed
 * by the dpRO entry for the same id:
 *
 *   Conjunto [Espada Vivatus Fides]
 *   Recarga de [Luz da Criação] -1 segundo.
 *   Arma com refino +10 ou mais:
 *     Recarga de [Crux Tempestas] 0,7 segundos. / Dano de [Crux Tempestas] +10%.
 *   Arma Grau C ou mais:
 *     FEI e S.ATQM +5. / Dano de [Crux Tempestas] +10% adicional.
 *
 * **The client prints that cooldown line without its minus sign**, in all three languages,
 * and every published source repeats the string verbatim. It is read as a reduction
 * because every other cooldown clause of this same record spells one out — the Luz da
 * Criação line two lines above, and `Recarga de [Corte e Massacre] -0,15 segundos` in the
 * Bastarda block — and because the clause sits in a block of pure upgrades gated behind a
 * +10 refine, where a penalty would make no sense.
 *
 * The 4,5 s it comes off is Crux Tempestas's own cooldown, which bROWiki gives as
 * `Recarga 4,5 segundos` for IG_CROSS_RAIN (5267).
 *
 * The two damage steps of the same block are table-tested for the whole family in
 * ragassets-october-items.spec.ts, so they are not repeated here.
 */

const COLAR = 491111;
const ESPADA = 500027;
/** Another Vivatus Fides weapon, whose block on the same necklace is a different skill. */
const BASTARDA = 600018;

const worn = (p: Worn) => wornBonus({ accLeft: COLAR, ...p });

const stat = (t: Record<string, number>, key: string) => t[key] ?? 0;

const AT_9 = worn({ weapon: ESPADA, weaponRefine: 9 });
const AT_10 = worn({ weapon: ESPADA, weaponRefine: 10 });

describe('Conjunto [Espada Vivatus Fides]', () => {
  it('cuts 0,7 s off Crux Tempestas once the sword reaches +10', () => {
    expect(stat(AT_10, 'cd__5267')).toBe(0.7);
  });

  it('gives nothing below +10, nor with the necklace alone', () => {
    expect(stat(AT_9, 'cd__5267')).toBe(0);
    expect(stat(worn({}), 'cd__5267')).toBe(0);
  });

  it('ignores another Vivatus Fides weapon at the same refine', () => {
    const bastarda = worn({ weapon: BASTARDA, weaponRefine: 10 });

    expect(stat(bastarda, 'cd__5267')).toBe(0);
    // The Bastarda's own block still fires, so the gate is the weapon id and not the refine.
    expect(stat(bastarda, 'cd__5208')).toBe(0.15);
  });

  it('cuts 1 s off Luz da Criação with the sword on, over the sword\'s own 0,5 s', () => {
    expect(stat(worn({ weapon: ESPADA }), 'cd__2321')).toBe(1);
    expect(stat(AT_9, 'cd__2321')).toBe(1.5);
  });

  it('adds FEI and S.ATQM +5 at grade C', () => {
    const gradeC = worn({ weapon: ESPADA, weaponGrade: 'C' });

    expect([stat(gradeC, 'spl'), stat(gradeC, 'sMatk')]).toEqual([5, 5]);
  });
});

describe('Crux Tempestas fires 0,7 s sooner with the set on', () => {
  const crossRain = new ImperialGuard().atkSkills.find(s => s.name === 'Cross Rain');

  const aspdOf = (totalEquipStatus: Record<string, number>) =>
    calcSkillAspd({ skillData: crossRain, totalEquipStatus: totalEquipStatus as any, status: { totalDex: 0, totalInt: 0 } as any, skillLevel: 10 });

  /**
   * item.json keys the reduction by skill **id**, while the catalog knows the skill by its
   * English name — `calcSkillAspd` bridges the two through `SKILL_ID_BY_NAME`. That hop is
   * what this case pins; the generic cooldown arithmetic belongs to calc-skill-aspd.spec.ts.
   */
  it('takes the reduction off the skill cooldown, and off the hit period', () => {
    expect(aspdOf(AT_9).reducedCd).toBe(4.5);
    expect(aspdOf(AT_10).reducedCd).toBe(3.8);
    expect(aspdOf(AT_9).hitPeriod - aspdOf(AT_10).hitPeriod).toBeCloseTo(0.7, 5);
  });
});
