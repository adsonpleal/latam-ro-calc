import { describe, expect, it } from 'vitest';
import { loadDatasetFromDisk } from '../../../mcp/src/data/dataset.node';
import { resolveBuild } from '../../../mcp/src/engine/build-input';
import { solve } from '../../../mcp/src/engine/solve';
import { JACK_FROST } from '../skills/shared-skills';

/**
 * Esquife de Gelo applies its ratio **once** per cast — card KaCJQE0Ih0EOde341dmu.
 *
 * The catalog had the Calafrio entry on `hit: 4` (the column split over four printed
 * packets) and the Normal entry on `totalHit: 4` (the column applied four times), so the
 * Calafrio cast simulated right while the Normal cast simulated at four times the game.
 *
 * What settles it is the measurement, not the client table: the reporter cast both on a
 * Dummy - Grande with the build below and read 47.535 and 79.990 off the screen. A single
 * ATQM column would not have been enough on its own — bROWiki writes Zero Absoluto's as
 * "700% × 5 cristais" where the client prints one column too. Esquife de Gelo's page
 * describes a single damage effect and marks no such multiplier.
 *
 * @see https://browiki.org/wiki/Esquife_de_Gelo
 * @see https://issues.latam-tools.com.br/t/KaCJQE0Ih0EOde341dmu
 */

const dataset = loadDatasetFromDisk();
const DUMMY_GRANDE = 21066;

/** The reporter's build (share link BGZhPV), Arcano 138/41, Amp. Mística + Maestria Arcana. */
const PRESET: Record<string, unknown> = {
  class: 6, level: 138, jobLevel: 41,
  str: 1, agi: 25, vit: 70, int: 112, dex: 116, luk: 1,
  weapon: 2013, weaponEnchant1: 4712, weaponEnchant2: 4796,
  headUpper: 401250, headLower: 420820,
  armor: 450076, armorRefine: 9,
  garment: 480017, garmentRefine: 9,
  boot: 470019, bootRefine: 9,
  accLeft: 28566, accRight: 490018,
  shadowWeapon: 24390, shadowArmor: 24387, shadowShield: 24388,
  shadowBoot: 24389, shadowEarring: 24391, shadowPendant: 24392,
  activeSkillMap: { 'Mystical Amplification': 10, 'Recognized Spell': 1 },
  passiveSkillMap: { 'Safety Wall': 10, 'Mystical Amplification': 10, 'Recognized Spell': 5 },
};

/** What one cast deals, the way the rotation row adds it up: the packet times its count. */
function cast(skill: string) {
  const build = resolveBuild({ preset: { ...PRESET, selectedAtkSkill: skill } } as never, dataset);
  const damage = solve(build, dataset, dataset.monsters[DUMMY_GRANDE]).damageSummary as Record<string, number>;

  return {
    perCast: damage.skillMinDamage * damage.skillTotalHit,
    ratio: damage.baseSkillDamage,
    totalHit: damage.skillTotalHit,
    hit: damage.skillHit,
  };
}

describe('Esquife de Gelo deals its client ratio once per cast', () => {
  // The two columns of the client's table at Nv5, scaled by base 138: 2.500% and 4.200%.
  // `measured` is what the game printed, read off the screen — hence the last digits.
  it.each([
    { skill: 'Jack Frost==5', ratio: 3449, simulated: 47_584, measured: 47_535 },
    { skill: 'Jack Frost Frost==5', ratio: 5796, simulated: 79_980, measured: 79_990 },
  ])('$skill simulates the figure the game dealt', ({ skill, ratio, simulated, measured }) => {
    const result = cast(skill);

    expect(result).toMatchObject({ ratio, totalHit: 1, hit: 4, perCast: simulated });
    expect(Math.abs(result.perCast - measured) / measured).toBeLessThan(0.002);
  });

  // Major Auto Spell Shadow Armor (24728) auto-casts the same skill off this copy, which
  // drifted from the Warlock's entries once already.
  it('keeps the auto-cast copy on the same hit shape', () => {
    expect(JACK_FROST.hit).toBe(4);
    expect(JACK_FROST.totalHit).toBeUndefined();
  });
});
