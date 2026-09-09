import { describe, expect, it } from 'vitest';
import { collectChanceSources } from './calculator-controller';
import { INSTINTO_ID, INSTINTO_NAME, solveInstintoBuild } from './__tests__/instinto-build';

/**
 * Bug report (tracker k74xfIkeTP75HuunmKY9, glenhari): ticking "Instinto" did not reduce
 * the variable cast. It went further than the cast window — the proc reached the damage
 * and nothing else, so the whole character sheet ignored it: DES stayed at the gear's
 * own bonus and DES2 INT1 never moved, on a proc worth +200 DES.
 *
 * The panel was half-effected, which is what made it hard to read. `atkSummaryForUI` is a
 * lazy getter over the damage calculator, and `recalcExtraBonus` leaves that calculator
 * holding the proc's bonuses — so ATQ Status DID move while everything the Calculator
 * cached during the base pass (stats, casting, hit/flee, defences, HP/SP) did not.
 *
 * The rule these tests hold: with an effect ticked, every figure describing the character
 * is the effected one. The damage figures are the exception, and deliberately so — the
 * damage panel prints base and effected as a pair ("Sem efeitos"), so `dmg` keeps both.
 */

/** DES low enough that DES×2 + INT lands short of the 530 that zeroes the variable cast,
 *  which is the state the report was filed from. */
const REPORTED_DEX = 79;

const solve = (selectedChances: string[]) => solveInstintoBuild({ dex: REPORTED_DEX, selectedChances }).calc;

describe('a ticked chance reaches the character sheet', () => {
  const off = solve([]).getTotalSummary();
  const on = solve([INSTINTO_NAME]).getTotalSummary();

  it('adds the proc to the stat the panel shows', () => {
    expect(off.dex).toBe(24);
    expect(on.dex).toBe(224);
  });

  it('moves DES2 INT1 by twice the DES the proc grants', () => {
    expect(on.calc.dex2int1).toBe(off.calc.dex2int1 + 400);
    expect(on.calc.to530).toBe(off.calc.to530 - 400);
  });

  it('zeroes the variable cast once DES2 INT1 passes 530', () => {
    // Short of 530 the build pays part of the variable window; past it, the cast is the
    // fixed half alone. That is the report: "a marcação de instinto não reduz a conj.
    // variável na interface".
    expect(off.calc.dex2int1).toBeLessThan(530);
    expect(on.calc.dex2int1).toBeGreaterThan(530);

    expect(off.calcSkill.castPeriod).toBeGreaterThan(off.calcSkill.fct);
    expect(on.calcSkill.castPeriod).toBe(on.calcSkill.fct);
  });

  it('carries the proc into the other DES-driven figures', () => {
    expect(on.calc.totalAspd).toBeGreaterThan(off.calc.totalAspd);
    expect(on.calc.hitPerSecs).toBeGreaterThan(off.calc.hitPerSecs);
    expect(on.calc.totalHit).toBeGreaterThan(off.calc.totalHit);
    // DES feeds soft MDEF (INT + VIT/5 + DES/5 + nível/4), so the defence block has to be
    // solved against the proc too — it is the one figure here that comes from a second
    // computeDefenses pass rather than from the effected damage pass.
    expect(on.calc.softMdef).toBeGreaterThan(off.calc.softMdef);
  });

  it('agrees with the ATQ rows, which always did reflect the proc', () => {
    // The half that already worked, pinned so the two halves can't drift apart again.
    expect(on.calc.totalStatusAtk).toBeGreaterThan(off.calc.totalStatusAtk);
  });

  it('leaves the base damage figures alone, so "Sem efeitos" still means it', () => {
    expect(on.dmg.skillMinDamage).toBe(off.dmg.skillMinDamage);
    expect(on.dmg.skillMaxDamage).toBe(off.dmg.skillMaxDamage);
    expect(on.dmg.effectedSkillDamageMin).toBeGreaterThan(on.dmg.skillMinDamage);
  });

  it('restores the base sheet when the effect is unticked', () => {
    // The toggle's fast path: it never re-runs the base pass, so unticking has to fall
    // back to the state the last full solve left rather than to a recomputed one.
    const calc = solve([INSTINTO_NAME]);
    expect(calc.getTotalSummary().dex).toBe(224);

    calc.setSelectedChances([]).recalcExtraBonus('Focused Arrow Strike==5');

    expect(calc.getTotalSummary().dex).toBe(24);
    expect(calc.getTotalSummary().calc.dex2int1).toBe(off.calc.dex2int1);
  });
});

describe('collectChanceSources', () => {
  const chanceList = solve([]).chanceList;

  it('keys the ticked chances by the item that grants them', () => {
    expect(collectChanceSources(chanceList, [INSTINTO_NAME])).toEqual({
      [`chance_${INSTINTO_ID}`]: { dex: 200 },
    });
  });

  it('ignores the ones nobody ticked', () => {
    expect(collectChanceSources(chanceList, [])).toEqual({});
  });
});
