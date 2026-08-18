import { beforeEach, describe, expect, it } from 'vitest';
import { calcDmgDps } from './calc-dmg-dps';
import { calcSkillAspd } from './calc-skill-aspd';

// Build a fully-zeroed equipment summary; the function reads acd/vct/fct/etc as
// numbers, so every field a calculation touches must exist to avoid NaN.
const zeroEquip = () =>
  ({
    acd: 0,
    vct: 0,
    vct_inc: 0,
    fct: 0,
    fctPercent: 0,
    vctBySkill: 0,
    releasedSkill: 0,
  } as any);

const zeroStatus = () => ({ totalDex: 0, totalInt: 0 } as any);

const skill = (over: Record<string, any> = {}) =>
  ({ name: 'TestSkill', acd: 1, fct: 0, vct: 0, cd: 0, hitEveryNSec: 0, ...over } as any);

describe('calcSkillAspd', () => {
  let equip: any;
  let status: any;

  beforeEach(() => {
    equip = zeroEquip();
    status = zeroStatus();
  });

  it('with no reductions, after-cast delay drives the hit period', () => {
    const r = calcSkillAspd({ skillData: skill({ acd: 1 }), totalEquipStatus: equip, status, skillLevel: 5 });
    expect(r.reducedAcd).toBe(1);
    expect(r.reducedVct).toBe(0);
    expect(r.reducedFct).toBe(0);
    expect(r.hitPeriod).toBe(1);
    expect(r.totalHitPerSec).toBe(1);
  });

  it('global ACD reduction shortens the after-cast delay', () => {
    equip.acd = 50; // 50% acd reduction
    const r = calcSkillAspd({ skillData: skill({ acd: 1 }), totalEquipStatus: equip, status, skillLevel: 5 });
    expect(r.reducedAcd).toBe(0.5);
    expect(r.hitPeriod).toBe(0.5);
    expect(r.totalHitPerSec).toBe(2);
  });

  it('releasedSkill zeroes cast, cooldown and fixed-cast times', () => {
    const r = calcSkillAspd({
      skillData: skill({ acd: 1, cd: 5, fct: 2, vct: 3 }),
      totalEquipStatus: { ...equip, releasedSkill: 1 },
      status,
      skillLevel: 5,
    });
    expect(r.reducedCd).toBe(0);
    expect(r.reducedVct).toBe(0);
    expect(r.reducedFct).toBe(0);
  });

  it('keeps the client row intact through releasedSkill, so the UI can show what was reduced', () => {
    const skillData = skill({ acd: 1, cd: 5, fct: 2, vct: 3 });
    const plain = calcSkillAspd({ skillData, totalEquipStatus: equip, status, skillLevel: 5 });
    const released = calcSkillAspd({ skillData, totalEquipStatus: { ...equip, releasedSkill: 1 }, status, skillLevel: 5 });
    const clientRow = { clientAcd: 1, clientCd: 5, clientFct: 2, clientVct: 3 };

    expect(plain).toMatchObject(clientRow);
    expect(released).toMatchObject(clientRow);
  });

  // What the "Detalhes da habilidade" popover puts side by side: the client's published
  // row against the same skill after this character's reductions.
  it('reports the client row untouched while the reduced values shrink around it', () => {
    equip.acd = 50;
    equip.vct = 20;
    status.totalDex = 120;
    status.totalInt = 100;
    const r = calcSkillAspd({ skillData: skill({ acd: 1, cd: 5, fct: 2, vct: 3 }), totalEquipStatus: equip, status, skillLevel: 5 });

    expect({ clientAcd: r.clientAcd, clientVct: r.clientVct, clientFct: r.clientFct, clientCd: r.clientCd })
      .toEqual({ clientAcd: 1, clientVct: 3, clientFct: 2, clientCd: 5 });
    expect(r.reducedAcd).toBe(0.5);
    expect(r.reducedVct).toBeLessThan(r.clientVct);
    expect(r.reducedVct).toBeGreaterThan(0);
  });

  it('reports the client row at the requested level, not at level 1', () => {
    const r = calcSkillAspd({
      skillData: skill({ cd: (lv: number) => [2.5, 2.3, 2.1, 1.9, 1.7][lv - 1] }),
      totalEquipStatus: equip,
      status,
      skillLevel: 4,
    });

    // The level travels with the row so the popover can label it, like the game's "Nv." column.
    expect(r.clientCd).toBe(1.9);
    expect(r.skillLevel).toBe(4);
  });

  it('resolves function-valued timings against the skill level', () => {
    const r = calcSkillAspd({
      skillData: skill({ acd: (lv: number) => lv * 0.4 }),
      totalEquipStatus: equip,
      status,
      skillLevel: 5,
    });
    // acd(5) = 2.0, no reduction -> reducedAcd 2
    expect(r.acd).toBe(2);
    expect(r.reducedAcd).toBe(2);
  });

  it('hitEveryNSec skills use the channel interval as the cast period', () => {
    const r = calcSkillAspd({
      skillData: skill({ acd: 1, hitEveryNSec: 0.5 }),
      totalEquipStatus: equip,
      status,
      skillLevel: 5,
    });
    // block period is forced to 0 for channelled skills; cast period == interval
    expect(r.castPeriod).toBe(0.5);
    expect(r.hitPeriod).toBe(0.5);
    expect(r.totalHitPerSec).toBe(2);
  });

  it('per-skill cooldown reduction lowers the reported cooldown', () => {
    // item.json keys reductions by skill id; Arrow Storm = 2233.
    const r = calcSkillAspd({
      skillData: skill({ name: 'Arrow Storm', acd: 0, cd: 5 }),
      totalEquipStatus: { ...equip, cd__2233: 2 },
      status,
      skillLevel: 5,
    });
    expect(r.reducedCd).toBe(3);
  });

  // Reported by Ted: Firmamento (All in the Sky, recarga 60s) read its DPS at the basic
  // ASPD rate. `totalHitPerSec` was floored to one decimal, so 1/61 came out as 0 — and a
  // falsy rate is what damage-calculator.ts treats as "no cast data", substituting
  // basicAspd.hitsPerSec (2/s for a skill that fires once a minute).
  it('reports a real rate for a skill on a one-minute recarga', () => {
    const r = calcSkillAspd({ skillData: skill({ acd: 0, cd: 60, fct: 1 }), totalEquipStatus: equip, status, skillLevel: 10 });

    expect(r.hitPeriod).toBe(61);
    expect(r.totalHitPerSec).toBeGreaterThan(0);
    expect(r.totalHitPerSec).toBeCloseTo(1 / 61, 4);
  });

  // The rate exists to divide a skill's damage over its own cycle. Pinned end to end
  // through calcDmgDps, which is what damage-calculator.ts feeds it into: a 58,7M burst
  // once every 61s is ~962k/s, not the 117M the ASPD fallback produced.
  it('divides the damage of a long-recarga skill over its own cycle', () => {
    const r = calcSkillAspd({ skillData: skill({ acd: 0, cd: 60, fct: 1 }), totalEquipStatus: equip, status, skillLevel: 10 });
    const damage = 58_722_564;
    const dps = calcDmgDps({ min: damage, max: damage, cri: 0, criDmg: 0, hitsPerSec: r.totalHitPerSec, accRate: 100 });

    expect(dps).toBeCloseTo(damage / r.hitPeriod, -3);
  });

  // The same precision that rescues the slow skills also stops understating the fast
  // ones: a 0,35s hit period is 2,857 uses/s, which one decimal reported as 2,8.
  it('keeps a fast rate exact instead of truncating it to a tenth', () => {
    equip.acd = 65;
    const r = calcSkillAspd({ skillData: skill({ acd: 1 }), totalEquipStatus: equip, status, skillLevel: 5 });

    expect(r.hitPeriod).toBe(0.35);
    expect(r.totalHitPerSec).toBeCloseTo(1 / 0.35, 4);
  });

  // Characterization: locks every per-skill timing reduction, each keyed by the
  // skill ID (`cd__<id>`, `vct__<id>`, ...). Arrow Storm = 2233.
  it('locks all six per-skill timing reductions keyed by skill id', () => {
    const r = calcSkillAspd({
      skillData: skill({ name: 'Arrow Storm', acd: 1, cd: 5, fct: 2, vct: 3 }),
      totalEquipStatus: {
        ...equip,
        'cd__2233': 1,
        'vct__2233': 20, // 20% variable-cast reduction
        'fix_vct__2233': 0.5, // 0.5s fixed variable-cast reduction
        'fct__2233': 0.4,
        'fctPercent__2233': 10, // 10% fixed-cast reduction
        'acd__2233': 0.2,
      },
      status,
      skillLevel: 10,
    });
    expect(r.reducedCd).toBe(4); // 5 - 1
    expect(r.reducedVct).toBe(2); // (3 - 0.5) * 0.8
    expect(r.reducedFct).toBe(1.4401); // (2 - 0.4) * 0.9, rounded up at 4dp by roundUp
    expect(r.reducedAcd).toBe(0.8); // 1 - 0.2
  });
});
