import { describe, expect, it } from 'vitest';
import { buildReductionCategories } from './reduction-breakdown';

describe('buildReductionCategories', () => {
  it('surfaces only nonzero rows/categories, with drill keys', () => {
    const cats = buildReductionCategories(
      { subrace_player_human: 17, subele_neutral: 20, dmg_taken_all: 5 } as any,
      'pvp',
    );
    const byLabel = Object.fromEntries(cats.map((c) => [c.label, c]));
    expect(Object.keys(byLabel)).toEqual(['Raça', 'Elemento', 'Redução plana']); // no WoE in open pvp
    expect(byLabel['Raça'].rows).toEqual([{ label: 'Humano', keys: ['subrace_player_human'], percent: 17 }]);
    expect(byLabel['Elemento'].rows).toEqual([{ label: 'Neutro', keys: ['subele_neutral'], percent: 20 }]);
    expect(byLabel['Redução plana'].rows).toEqual([{ label: 'Todo o dano', keys: ['dmg_taken_all'], percent: 5 }]);
  });

  it('adds the WoE castle layer in woe mode (skill -70%)', () => {
    const cats = buildReductionCategories({}, 'woe');
    const woe = cats.find((c) => c.label === 'Guerra (WoE)');
    expect(woe?.rows).toEqual([
      { label: 'Físico corpo a corpo', keys: [], percent: 70 },
      { label: 'Físico à distância', keys: [], percent: 70 },
      { label: 'Habilidade', keys: [], percent: 70 },
    ]);
  });

  it('woe-te: melee 0, ranged 20, skill 40', () => {
    const woe = buildReductionCategories({}, 'woe-te').find((c) => c.label === 'Guerra (WoE)');
    expect(woe?.rows).toEqual([
      { label: 'Físico à distância', keys: [], percent: 20 },
      { label: 'Habilidade', keys: [], percent: 40 },
    ]);
  });

  it('lists "todos os tamanhos" and "Médio" as separate size rows', () => {
    // Reported by Luís: only "Médio" ever showed. `subsize_all` was zero on every build
    // because no item.json entry carried the key — see core/__tests__/size-resistance.spec.
    const tamanho = buildReductionCategories({ subsize_all: 43, subsize_m: 25 } as any, 'pvp')
      .find((c) => c.label === 'Tamanho');

    expect(tamanho?.rows).toEqual([
      { label: 'Todos os tamanhos', keys: ['subsize_all'], percent: 43 },
      { label: 'Médio', keys: ['subsize_m'], percent: 25 },
    ]);
  });

  it('labels the physical-only and magical-only size rows apart', () => {
    const tamanho = buildReductionCategories(
      { subsize_m: 25, subsize_m_physical: 15, subsize_all_magical: 3 } as any,
      'pvp',
    ).find((c) => c.label === 'Tamanho');

    expect(tamanho?.rows).toEqual([
      { label: 'Todos os tamanhos (mágico)', keys: ['subsize_all_magical'], percent: 3 },
      { label: 'Médio', keys: ['subsize_m'], percent: 25 },
      { label: 'Médio (físico)', keys: ['subsize_m_physical'], percent: 15 },
    ]);
  });

  it('keeps negative resistances (vulnerabilities) as negative rows', () => {
    const cats = buildReductionCategories({ subrace_angel: -20 } as any, 'pvp');
    // subrace_angel is not a player race, so it never appears in the player-facing rows
    expect(cats).toEqual([]);
  });
});
