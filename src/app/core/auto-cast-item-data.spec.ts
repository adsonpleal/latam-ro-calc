import { describe, expect, it } from 'vitest';
import { ITEM_AUTO_CASTS } from './auto-cast-item-data';

describe('Renegado and Mandraque replay-backed item auto-casts', () => {
  it('keeps the independently rolled Competidor Poring bolts separate', () => {
    expect(ITEM_AUTO_CASTS[420820].map((rule) => [rule.skillId, rule.chance, rule.roll])).toEqual([
      [19, 7, 'independent'],
      [14, 7, 'independent'],
      [20, 7, 'independent'],
    ]);
  });

  it('captures every direct-damage item source observed in the selected builds', () => {
    expect(Object.keys(ITEM_AUTO_CASTS).map(Number)).toEqual(expect.arrayContaining([
      1185, 24527, 24728, 510019, 510040, 510034, 300006, 27305, 420820, 700132,
    ]));
  });

  it('maps every Arco Híbrido arrow combo independently', () => {
    expect(ITEM_AUTO_CASTS[700132].map((rule) => [rule.conditions?.[0], rule.skillId, rule.skillLevel, rule.chance])).toEqual([
      ['AMMO_ID[1751]', 2038, 5, 10],
      ['AMMO_ID[1752]', 2211, 3, 10],
      ['AMMO_ID[1754]', 2447, 3, 10],
      ['AMMO_ID[1755]', 2214, 3, 10],
      ['AMMO_ID[1756]', 2216, 3, 10],
      ['AMMO_ID[1757]', 2202, 3, 10],
      ['AMMO_ID[1762]', 2450, 3, 10],
      ['AMMO_ID[1773]', 2449, 3, 10],
    ]);
  });

  it('keeps chained Ritualística damage out of the direct basic-attack catalog', () => {
    expect(ITEM_AUTO_CASTS[510034]).toEqual([
      expect.objectContaining({ skillId: 2450, chance: 7, trigger: 'melee-physical-hit' }),
    ]);
  });
});
