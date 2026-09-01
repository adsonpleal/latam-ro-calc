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

  // Moved out of the Defesa group on 01/09/2026: it reads 0% on nearly every build, so it
  // is a row of the popover the reader opens on purpose. Self only — nothing in the
  // simulator reflects damage, so a PVP target's own resistance to it never applies.
  it('lists the reflected-damage resistance among the flat cuts, self scope only', () => {
    const flat = (scope: 'self' | 'pvp') =>
      buildReductionCategories({ reduceDamageReturn: 12 } as any, 'pvp', scope).find((c) => c.label === 'Redução plana');

    expect(flat('self')?.rows).toEqual([{ label: 'Dano refletido', keys: ['reduceDamageReturn'], percent: 12 }]);
    expect(flat('pvp')).toBeUndefined();
  });

  it('adds the WoE castle layer in woe mode (melee 90, ranged 95, skill 90)', () => {
    const cats = buildReductionCategories({}, 'woe');
    const woe = cats.find((c) => c.label === 'Guerra (WoE)');
    expect(woe?.rows).toEqual([
      { label: 'Físico corpo a corpo', keys: [], percent: 90 },
      { label: 'Físico à distância', keys: [], percent: 95 },
      { label: 'Habilidade', keys: [], percent: 90 },
    ]);
  });

  it('woe-te: the same numbers as woe since the 18/08/2026 patch', () => {
    const woe = buildReductionCategories({}, 'woe-te').find((c) => c.label === 'Guerra (WoE)');
    expect(woe?.rows).toEqual([
      { label: 'Físico corpo a corpo', keys: [], percent: 90 },
      { label: 'Físico à distância', keys: [], percent: 95 },
      { label: 'Habilidade', keys: [], percent: 90 },
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

  describe("scope 'self' — the main-stats popover", () => {
    it('lists Grande alongside Médio', () => {
      // Reported anonymously: Carta Cavaleiro Branco + Carta Cavaleira Khalitzburg grant
      // 25% + 5% against Médio AND Grande, but the popover only ever showed Médio — the
      // row list was the PVP one, where the attacker is always a player (Médio).
      const tamanho = buildReductionCategories({ subsize_m: 30, subsize_l: 30 } as any, 'pvp', 'self')
        .find((c) => c.label === 'Tamanho');

      expect(tamanho?.rows).toEqual([
        { label: 'Médio', keys: ['subsize_m'], percent: 30 },
        { label: 'Grande', keys: ['subsize_l'], percent: 30 },
      ]);
    });

    it('lists Pequeno too, in size order', () => {
      const tamanho = buildReductionCategories(
        { subsize_all: 7, subsize_s: 10, subsize_m: 10, subsize_l: 10 } as any,
        'pvp',
        'self',
      ).find((c) => c.label === 'Tamanho');

      expect(tamanho?.rows.map((r) => r.label)).toEqual(['Todos os tamanhos', 'Pequeno', 'Médio', 'Grande']);
    });

    it('keeps "Todas as raças" out of the PVP rows — it is monster races only', () => {
      // subrace_all is the client's "todas as raças de monstros" and never cuts a player
      // hit (core/pvp.ts, PLAYER_RACES), so the popover must not promise it here either.
      const pvpRaca = buildReductionCategories({ subrace_all: 30 } as any, 'pvp')
        .find((c) => c.label === 'Raça');
      expect(pvpRaca).toBeUndefined();

      // …but it is a real reduction against monsters, so the self scope still lists it.
      const selfRaca = buildReductionCategories({ subrace_all: 30 } as any, 'pvp', 'self')
        .find((c) => c.label === 'Raça');
      expect(selfRaca?.rows).toEqual([{ label: 'Todas as raças', keys: ['subrace_all'], percent: 30 }]);
    });

    it('surfaces monster races the PVP rows drop', () => {
      const raca = buildReductionCategories({ subrace_angel: -20, subrace_demon: 15 } as any, 'pvp', 'self')
        .find((c) => c.label === 'Raça');

      expect(raca?.rows).toEqual([
        { label: 'Demônio', keys: ['subrace_demon'], percent: 15 },
        { label: 'Anjo', keys: ['subrace_angel'], percent: -20 },
      ]);
    });

    it('surfaces the Chefe class row', () => {
      const classe = buildReductionCategories({ subclass_boss: 20 } as any, 'pvp', 'self')
        .find((c) => c.label === 'Classe');

      expect(classe?.rows).toEqual([{ label: 'Chefe', keys: ['subclass_boss'], percent: 20 }]);
    });

    it('still hides them in the default (pvp) scope', () => {
      expect(buildReductionCategories({ subsize_l: 30, subclass_boss: 20 } as any, 'pvp')).toEqual([]);
    });
  });
});
