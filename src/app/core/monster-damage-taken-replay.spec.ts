import { readFileSync } from 'node:fs';
import { decodeReplay } from 'rrfparser';
import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants/element-type.const';
import { Monster } from '../domain/monster';
import { loadReplayFixture } from '../replay/__tests__/load-fixture';
import { calculateMonsterDamageTaken, IncomingDamageProfile } from './monster-damage-taken';

// The audit retains source URLs and SHA-256 hashes for the public Recap files.
// It records packets independently of the calculator; party members' equipment,
// NPC skill levels and difficulty ATK/MATK are not inferred from damage values.
const audit = JSON.parse(readFileSync('docs/damage-taken-replay-audit.json', 'utf8'));
const replay = decodeReplay(loadReplayFixture('sc-betelgeuse-fawxx.rrf'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const monster = new Monster().setData(monsters[20994]);
const profile: IncomingDamageProfile = {
  attacker: monster.attackProfile!,
  defender: { hp: 112624, def: 1727, softDef: 229, mdef: 335, softMdef: 187,
    res: 126, mres: 73, bonus: {}, armorElement: ElementType.Neutral },
};
const incoming = replay.damage.filter(packet => packet.target === replay.sessionInfo.aid
  && replay.entities.get(packet.source)?.view === 20994);

describe('Betelgeuse incoming Recap evidence — partial validation', () => {
  it('matches five consecutive unshielded Aura ticks at roughly one-second intervals', () => {
    const ticks = incoming.filter(packet => packet.skillId === 783 && packet.time >= 87456);
    expect(ticks.map(packet => Number(packet.damage))).toEqual([10000, 10000, 10000, 10000, 10000]);
    const prediction = calculateMonsterDamageTaken(profile, 783)!;
    for (const tick of ticks) expect(Number(tick.damage)).toBe(prediction.max);
    for (let i = 1; i < ticks.length; i++) {
      expect(ticks[i].time - ticks[i - 1].time).toBeGreaterThan(950);
      expect(ticks[i].time - ticks[i - 1].time).toBeLessThan(1050);
    }
  });

  it('retains the shielded Aura tick and the misses instead of treating them as formula matches', () => {
    const firstTick = incoming.find(packet => packet.skillId === 783)!;
    expect(Number(firstTick.damage)).toBe(3688);
    // EFST_KYRIE ends at that tick; its remaining absorption is not in the packet.
    expect(replay.statusEvents.some(event => event.aid === replay.sessionInfo.aid
      && event.statusId === 19 && !event.isOn && event.time === firstTick.time)).toBe(true);
    expect(incoming.filter(packet => packet.skillId === 768).map(packet => Number(packet.damage))).toEqual([0, 0]);
  });

  it('uses the 15-hit Meteor packet structure recorded in three independent sessions', () => {
    expect(audit.skills[83]).toMatchObject({ packets: 15, displayedHitCounts: [15] });
    const packets = audit.replays.flatMap((entry: any) => entry.recorderDamage)
      .filter((packet: any) => packet.skillId === 83);
    expect(packets.map((packet: any) => [packet.damage, packet.hits])).toEqual([[25725, 15], [41460, 15]]);
    const prediction = calculateMonsterDamageTaken(profile, 83)!;
    for (const packet of packets) expect(prediction.hits).toBe(packet.hits);
    // Matching a hit count does not validate the MATK multiplier or reductions.
  });

  it('rounds Comet totals per displayed hit while applying defenses once', () => {
    const packet = incoming.find(entry => entry.skillId === 708)!;
    expect([Number(packet.damage), packet.hits]).toEqual([76780, 20]);
    expect(audit.skills[708]).toMatchObject({ positivePackets: 54, displayedHitCounts: [20] });
    const p = structuredClone(profile);
    p.attacker.magicAttack = { minimum: 100, maximum: 200 };
    Object.assign(p.defender, { mdef: 0, softMdef: 23, mres: 0 });
    // One defense subtraction: 4500 - 23, then floor(total / 20) * 20.
    expect(calculateMonsterDamageTaken(p, 708)).toMatchObject({ min: 4460, max: 8960, hits: 1 });
    // This pins packet rounding, not an exact match of the 76780 damage value:
    // the replay does not give the Comet center or every defensive buff value.
  });
});
