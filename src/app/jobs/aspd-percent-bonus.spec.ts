import { describe, expect, it } from 'vitest';
import { ASPD_CAP } from 'src/app/utils';
import { SuperNovice } from './SuperNovice';

/**
 * "Vel.Atq %" — the percentage attack-speed bonus, and the one property it owes the
 * player: more of it never means less VelAtq.
 *
 * `calcAspd` spends a percentage bonus on the room left between the build's own base
 * VelAtq and 195. A build with enough AGI runs past 195 unaided, and that distance used
 * to be read as a signed difference: it went negative, the bonus scaled it, and equipment
 * that ADDS attack speed took VelAtq away. Reported as "ASPD não aumenta ao colocar carta
 * Cenere no manto replicador +11" (tracker n6vaoExfL7IRa7yRsDWb) — the card pays 2% per 10
 * base AGI plus another 15% through the cape's own set clause, and the pair read one point
 * SLOWER than wearing no card at all.
 *
 * The figures below are the reported build's own: 281 total AGI, 101 DES, a katar and a
 * Poção da Concentração, at the +50% the cape carries alone and the +115% it carries with
 * the card. Before the clamp those read 193 and 192.
 */

/** Minimal Weapon stub for calcAspd: it only reads `.data` and `.isAllowShield()`. */
const weaponOf = (subTypeName: string) =>
  ({ data: { subTypeName, rangeType: 'melee' }, isAllowShield: () => true } as any);

/** The real calcAspd, with only the percentage bonus and AGI varying. */
const aspdAt = (aspdPercent: number, totalAgi: number, totalDex = 101) =>
  new SuperNovice().calcAspd({
    weapon: weaponOf('Katar'),
    weapon2: undefined as any,
    isEquipShield: false,
    aspd: 0,
    aspdPercent,
    totalAgi,
    totalDex,
    potionAspds: [645], // Poção da Concentração, +4 — the reported build had one running
    potionAspdPercent: 0,
    skillAspd: 0,
    skillAspdPercent: 0,
    decreaseSkillAspdPercent: 0,
  });

describe('a percentage attack-speed bonus is never a penalty', () => {
  it('does not lower VelAtq on the reported build, whose base already passes the ceiling', () => {
    expect(aspdAt(0, 281)).toBe(ASPD_CAP);
    expect(aspdAt(50, 281)).toBe(ASPD_CAP); // the cape alone
    expect(aspdAt(115, 281)).toBe(ASPD_CAP); // the cape plus the card and its set clause
  });

  it('stays monotonic across the whole range, at every AGI', () => {
    for (const agi of [1, 60, 100, 150, 200, 250, 281, 400]) {
      let previous = aspdAt(0, agi);
      for (let percent = 5; percent <= 200; percent += 5) {
        const current = aspdAt(percent, agi);
        expect(current, `AGI ${agi}, Vel.Atq +${percent}%`).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    }
  });
});

describe('below the ceiling the bonus still buys its share of the distance', () => {
  // The clamp must not flatten the case it does not apply to: at 100 AGI this build sits
  // under 195, so a percentage still converts into points.
  it('pays out on a build with room left', () => {
    expect(aspdAt(50, 100)).toBeGreaterThan(aspdAt(0, 100));
    expect(aspdAt(100, 100)).toBeGreaterThan(aspdAt(50, 100));
  });

  it('never exceeds the VelAtq cap', () => {
    expect(aspdAt(500, 100)).toBe(ASPD_CAP);
  });
});
