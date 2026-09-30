import { describe, expect, it } from 'vitest';
import { ArtistPartyBuffs } from './artist-party-buffs';
import { JobBuffs } from './job-buffs';
import { WUG_STRIKE } from '../skills/shared-skills';

const buff = (label: string) => {
  const found = JobBuffs.find((entry) => entry.label === label);
  expect(found, label).toBeDefined();
  return found!;
};

const bonus = (label: string, value: number) => {
  const selected = buff(label).dropdown.find((option) => option.value === value);
  expect(selected, `${label} ${value}`).toBeDefined();
  return selected!.bonus as Record<string, number>;
};

describe('Bard/Dancer party buffs', () => {
  it('exposes the 17 requested buffs and omits the three declined ones', () => {
    expect(ArtistPartyBuffs.map((entry) => entry.label)).toEqual([
      'Assovio', 'Crepúsculo Sangrento', 'Maçãs de Idun', 'Sibilo', 'Beijo da Sorte',
      'Dança Cigana', 'Rufar dos Tambores', 'Anel dos Nibelungos', 'Ode a Siegfried',
      'Sinfonia dos Ventos', 'Canção de Balder', 'Balada Sinfônica', 'Canção de Frigga',
      'Orvalho de Idun', 'Dança com Lobos', 'Murmúrio Perene', 'Interlúdio',
    ]);
    for (const label of ['Controle de Marionete', 'Canção de Alfheim', 'Sibilo de Eir']) {
      expect(JobBuffs.some((entry) => entry.label === label)).toBe(false);
    }
  });

  it('uses the Wiki boundary values and keeps Anel outcomes separate', () => {
    expect(bonus('Assovio', 10)).toMatchObject({ flee: 40, perfectDodge: 5 });
    expect(bonus('Crepúsculo Sangrento', 10).aspdPercent).toBe(20);
    expect(bonus('Maçãs de Idun', 10)).toMatchObject({ hpPercent: 20, healReceived: 20 });
    expect(bonus('Beijo da Sorte', 10)).toMatchObject({ cri: 10, criDmg: 20 });
    expect(bonus('Dança Cigana', 10)).toMatchObject({ spPercent: 20, spCostPercent: -15 });
    expect(bonus('Rufar dos Tambores', 5)).toMatchObject({ atk: 40, def: 75 });
    expect(buff('Anel dos Nibelungos').dropdown.filter((option) => option.isUse)).toHaveLength(11);
    expect(bonus('Anel dos Nibelungos', 5)).toEqual({ allStatus: 15 });
    expect(bonus('Ode a Siegfried', 5)).toMatchObject({ subele_fire: 15, subele_water: 15, statusResist: 25 });
    expect(bonus('Sinfonia dos Ventos', 105).atk).toBe(40);
    expect(bonus('Canção de Balder', 105).defPercent).toBe(57);
    expect(bonus('Balada Sinfônica', 5)).toMatchObject({ mdefPercent: 10, softMdefPercent: 10, subele_ghost: 15, subele_holy: 15 });
    expect(bonus('Canção de Frigga', 5)).toMatchObject({ hpPercent: 25, hpRegenPerSecond: 180 });
    expect(bonus('Orvalho de Idun', 105).hpPercent).toBe(20);
    expect(bonus('Dança com Lobos', 5)).toMatchObject({ range: 5, fctPercent: 70, aspdPercent: 25, wugSkillRatio: 250 });
    expect(bonus('Murmúrio Perene', 105).m_my_element_all).toBe(25);
    expect(bonus('Interlúdio', 5).res).toBe(30);
    expect(bonus('Interlúdio', 10).res).toBe(45);
    expect(buff('Interlúdio').dropdown.map((option) => option.label)).toEqual([
      '-', 'Solo Nv 1', 'Solo Nv 2', 'Solo Nv 3', 'Solo Nv 4', 'Solo Nv 5',
      'Dueto Nv 1', 'Dueto Nv 2', 'Dueto Nv 3', 'Dueto Nv 4', 'Dueto Nv 5',
    ]);
  });

  it('adds Dança com Lobos to the Worg skill ratio only', () => {
    const base = { skillLevel: 5, totalBonus: {} } as unknown as Parameters<typeof WUG_STRIKE.formula>[0];
    expect(WUG_STRIKE.formula(base)).toBe(1000);
    expect(WUG_STRIKE.formula({ ...base, totalBonus: bonus('Dança com Lobos', 5) } as unknown as typeof base)).toBe(1250);
  });
});
