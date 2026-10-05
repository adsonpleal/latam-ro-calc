import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Monster } from '../../domain/monster';
import { DamageCalculator } from '../../core/damage-calculator';
import { loadReplayFixture } from './load-fixture';

const replay = decodeReplay(loadReplayFixture('freya-schulang-ted.rrf'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));

describe('Ted — Freyja/Schulang reduction and Aliviar', () => {
  it('records both level-185 variants casting Aliviar level 1, including Freyja', () => {
    // These are the quest variants 21316/21317, not the repeatable-instance targets
    // 21360/21361. The fixture establishes the cast; 90% is Ted's explicit report.
    const casts = replay.skillUses.filter((cast) => cast.skillId === 771);
    expect(casts).toHaveLength(2);
    expect(casts.map((cast) => [replay.entities.get(cast.source)?.view, cast.skillLevel])).toEqual([[21316, 1], [21317, 1]]);
    expect(casts.map((cast) => cast.source === cast.target)).toEqual([true, true]);
    expect(replay.statusEvents.filter((event) => event.isOn && event.statusId === 1166).map((event) => event.aid))
      .toEqual(casts.map((cast) => cast.source));
  });

  it('applies Freyja’s 90% reduction and the chosen Aliviar level independently', () => {
    const reduce = (level: number) => {
      const calc: any = new DamageCalculator();
      calc.monster = new Monster().setData(monsters[21361], level);
      // A controlled input, not a claim of matching this party recording's damage.
      return calc.applyAuraReduction(1_000_000);
    };
    expect(reduce(0)).toBe(100_000);
    expect(reduce(1)).toBe(90_000);
    expect(reduce(8)).toBe(20_000);
    expect(reduce(10)).toBe(100_000); // saved Betelgeuse level cannot follow onto Freyja
  });
});
