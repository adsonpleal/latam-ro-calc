import { describe, expect, it } from 'vitest';
import { DamageCalculator } from './damage-calculator';

/**
 * RES / RESM — the target-side reduction, pinned against bROWiki instead of against the
 * engine's own arithmetic.
 *
 * https://browiki.org/wiki/Talentos, section "Redução do dano físico por TEN":
 *
 *   "Antes de calcular a Defesa Física, a Tenacidade (TEN) reduz o dano físico normal
 *    recebido em valores porcentuais (%). O Dano físico final × [{(TEN do Alvo ÷ (TEN do
 *    Alvo + 400)) × 80} ÷ 100] é subtraído do dano físico final. A redução é limitada em
 *    50%."
 *
 * and the identical sentence for TENM / RESM one section below. LATAM calls the two stats
 * RES and RESM (SP 227/228 in the status window); bROWiki calls them TEN and TENM.
 *
 * Two things this file exists to hold:
 *
 * 1. **The formula.** `(2000 + RES) / (2000 + RES × 5)`, inherited from the fork, is
 *    algebraically the same expression as bROWiki's — 1 − 4r/(2000 + 5r) = 1 − 0,8r/(400 + r).
 *    The old test asserted the code against a copy of itself, so a rewrite of the constants
 *    would have passed. Here the expectations are the wiki's words evaluated independently.
 *
 * 2. **The 50% cap**, which the engine did not have. It only starts to bind at RES 667,
 *    and the highest RES in monster.json today is 600 (Lava Golem of Fire, 21559), so
 *    adding it changed nothing for any target the calculator can currently pick.
 *
 * Neither has ever been checked against a replay: every fixture in
 * `src/app/replay/__tests__/fixtures/` targets a training dummy with res = mres = 0. The
 * Betelgeuse recording on tracker card `qpFtVdQx1bxY4PTJ3pVS` is the first against a
 * high-RES target, and it cannot settle it — a full party's buffs, six damage-taken
 * debuffs on the boss and an unknown Aliviar level leave three unknowns for one equation.
 */

/** bROWiki's sentence, transcribed: the fraction of damage that survives RES/RESM. */
function browikiMultiplier(res: number): number {
  const reductionPercent = ((res / (res + 400)) * 80) / 100;

  return 1 - Math.min(0.5, reductionPercent);
}

/** A calculator with just enough shape for getPhisicalDefData/getMagicalDefData. */
function makeCalc(bonus: Record<string, number> = {}) {
  const dc: any = new DamageCalculator();
  dc.monster = { data: { def: 0, softDef: 0, res: 0, mdef: 0, mres: 0 }, race: 'formless', type: 'normal' };
  dc.totalBonus = { monster_res: 0, monster_mres: 0, p_pene_race_all: 0, p_pene_class_all: 0, m_pene_race_all: 0, m_pene_class_all: 0, pene_res: 0, pene_mres: 0, ...bonus };

  return dc;
}

const physicalMultiplier = (res: number, bonus: Record<string, number> = {}) => {
  const dc = makeCalc(bonus);
  dc.monster.data.res = res;

  return dc.getPhisicalDefData().resReduction;
};

const magicalMultiplier = (mres: number, bonus: Record<string, number> = {}) => {
  const dc = makeCalc(bonus);
  dc.monster.data.mres = mres;

  return dc.getMagicalDefData().mresReduction;
};

describe('RES reduction matches bROWiki', () => {
  // 346 and 500 are Betelgeuse's DEF and RES; 600 is the highest RES in monster.json.
  for (const res of [0, 50, 100, 200, 300, 346, 400, 500, 550, 600, 666]) {
    it(`RES ${res} → ×${browikiMultiplier(res).toFixed(6)}`, () => {
      expect(physicalMultiplier(res)).toBeCloseTo(browikiMultiplier(res), 10);
    });
  }

  it('RES 0 leaves the damage untouched', () => {
    expect(physicalMultiplier(0)).toBe(1);
  });

  it('RES 500 (Betelgeuse) removes 44,44% of the damage', () => {
    expect(physicalMultiplier(500)).toBeCloseTo(0.555556, 6);
  });
});

describe('RES reduction is capped at 50%, as bROWiki states', () => {
  it('holds at exactly half from RES 667 up, instead of drifting toward 80%', () => {
    // Without the cap the inherited form gives 0,4286 at RES 1000 and 0,3333 at 2000.
    expect(physicalMultiplier(667)).toBeCloseTo(0.5, 10);
    expect(physicalMultiplier(1000)).toBeCloseTo(0.5, 10);
    expect(physicalMultiplier(2000)).toBeCloseTo(0.5, 10);
  });

  it('is still uncapped just below the crossing point (RES 666)', () => {
    expect(physicalMultiplier(666)).toBeGreaterThan(0.5);
  });
});

describe('RESM reduction is the same sentence on the magical path', () => {
  for (const mres of [0, 100, 500, 600]) {
    it(`RESM ${mres} → ×${browikiMultiplier(mres).toFixed(6)}`, () => {
      expect(magicalMultiplier(mres)).toBeCloseTo(browikiMultiplier(mres), 10);
    });
  }

  it('is capped at 50% too', () => {
    expect(magicalMultiplier(2000)).toBeCloseTo(0.5, 10);
  });
});

describe('Penetrar Res lowers the RES that reaches the formula', () => {
  it('50% penetration on RES 500 leaves 250, i.e. bROWiki at 250', () => {
    expect(physicalMultiplier(500, { pene_res: 50 })).toBeCloseTo(browikiMultiplier(250), 10);
  });

  it('penetration is clamped at 50%, so 80% still only halves the RES', () => {
    expect(physicalMultiplier(500, { pene_res: 80 })).toBeCloseTo(browikiMultiplier(250), 10);
  });
});
