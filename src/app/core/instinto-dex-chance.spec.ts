import { describe, expect, it } from 'vitest';
import { Calculator } from './calculator';
import { CalculatorController } from './calculator-controller';
import { INSTINTO_NAME, solveInstintoBuild } from './__tests__/instinto-build';

/**
 * Bug report (shared build BuRRO0): on a Windhawk running Ilimitar (No Limits 5) +
 * Ventos Sinistros (Calamity Gale), checking the "Instinto" effect — item 4879
 * (Hawkeye), script `chance__dex: 200` - made Tiro Preciso damage DROP by ~60%.
 *
 * The chance itself is innocent: a pure +200 DES on a bow build can only raise ATQ
 * Status and ATQ da Arma. What actually happened is that `prepareAllItemBonus()`
 * runs more than once per solve (ro-calculator.component.ts's
 * calculateToSelectedMonsters() re-runs it per target and once more to restore the
 * main one), and Windhawk.setAdditionalBonus() backed Ilimitar's ranged bonus out
 * of `range` on EVERY pass while `clearSupersededBonusSource` made the source stop
 * contributing after the first — so range went 767 -> 417 (correct) -> 67 (wrong).
 * The "Efeitos" checkbox handler then recalculated off that degraded state.
 */

/** The DES the build was shared with. `chance-affects-stat-summary.spec.ts` solves the
 *  same gear at a lower DES, where the cast window still has room to move. */
const SHARED_BUILD_DEX = 130;

const solveWithInput = (selectedChances: string[]) => solveInstintoBuild({ dex: SHARED_BUILD_DEX, selectedChances });

const solve = (selectedChances: string[]) => solveWithInput(selectedChances).calc;

const rangeOf = (calc: Calculator) => (calc as any).totalEquipStatus.range as number;

describe('Instinto (chance__dex +200) on a Windhawk bow build', () => {
  it('is offered as a selectable chance', () => {
    expect(solve([]).chanceList.map((c) => c.name)).toContain(INSTINTO_NAME);
  });

  it('keeps the ranged bonus stable across repeated prepareAllItemBonus() passes', () => {
    const calc = solve([]);
    const solved = rangeOf(calc);

    // calculateToSelectedMonsters() re-prepares the calculator once per selected
    // target plus once to restore the main one. Each pass must land on the same
    // ranged bonus — Ilimitar can only be superseded once.
    calc.prepareAllItemBonus().calcAllAtk();
    expect(rangeOf(calc)).toBe(solved);

    calc.prepareAllItemBonus().calcAllAtk();
    expect(rangeOf(calc)).toBe(solved);
  });

  it('keeps the ranged bonus stable across repeated solveSkill() passes', () => {
    // The attack-rotation path: one loaded build re-solved once per skill in the
    // rotation, reaching the same compounding-mutation hazard as the test above through
    // CalculatorController.solveSkill instead of a bare prepareAllItemBonus().
    //
    // A guard, not a reproduction: this passes with or without solveSkill's bonus-source
    // re-seed, because Windhawk reads the source map instead of re-subtracting a fixed
    // 350. It exists so that stops being luck — a job that regresses to the fixed-amount
    // form fails here, and the rotation is what makes that regression expensive.
    const { calc, input } = solveWithInput([]);
    const controller = new CalculatorController();
    const solved = rangeOf(calc);

    // Alternate skills the way a real rotation does; Ilimitar's ranged bonus can only
    // be superseded once, no matter how many skills the rotation walks through.
    for (const skill of ['Aimed Bolt==5', 'Focused Arrow Strike==5', 'Arrow Storm==10', 'Focused Arrow Strike==5']) {
      controller.solveSkill(calc, input, skill);
      expect(rangeOf(calc)).toBe(solved);
    }
  });

  it('raises Tiro Preciso damage instead of lowering it', () => {
    const calc = solve([INSTINTO_NAME]);
    const dmg = calc.getTotalSummary().dmg;

    expect(calc.selectedChanceList).toEqual([INSTINTO_NAME]);
    expect(dmg.effectedSkillDamageMax).toBeGreaterThan(dmg.skillMaxDamage);
    expect(dmg.effectedSkillDamageMin).toBeGreaterThan(dmg.skillMinDamage);
  });

  it('raises basic-attack damage too', () => {
    const dmg = solve([INSTINTO_NAME]).getTotalSummary().dmg;

    expect(dmg.effectedBasicDamageMax).toBeGreaterThan(dmg.basicMaxDamage);
    expect(dmg.effectedBasicDamageMin).toBeGreaterThan(dmg.basicMinDamage);
  });

  it('raises damage through the "Efeitos" checkbox fast path, after the extra prepare passes', () => {
    // Reproduces the reported flow: the build is solved, calculateToSelectedMonsters()
    // re-prepares it, and only then does the user tick the checkbox — which calls
    // setSelectedChances(...).recalcExtraBonus(skill) on that already-prepared calculator.
    const calc = solve([]);
    const base = calc.getTotalSummary().dmg.skillMinDamage;

    calc.prepareAllItemBonus().calcAllAtk();
    calc.setSelectedChances([INSTINTO_NAME]).recalcExtraBonus('Focused Arrow Strike==5');

    expect(calc.getTotalSummary().dmg.effectedSkillDamageMin).toBeGreaterThan(base);
  });
});
