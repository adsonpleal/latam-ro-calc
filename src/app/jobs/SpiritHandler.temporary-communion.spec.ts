import { describe, expect, it } from 'vitest';
import { Doram } from './Doram';
import { SpiritHandler } from './SpiritHandler';
import { SKILL_META } from '../skills/skill-meta.generated';

/**
 * Aliança Animal — the Animista's own support buff, missing from the active skills list,
 * which is the second half of card T7UVxhArHcwjN9RcSbH6.
 *
 * Two sources, agreeing line for line:
 *
 *   the LATAM client   (`skills.json`, id 5447, read 14/09/2026)
 *     "Aumenta P.ATQ, S.ATQM e C.Mais." · [Nv 1] 30 segundos +3 … [Nv 5] 150 segundos +15
 *   bROWiki            https://browiki.org/wiki/Aliança_Animal
 *     SH_TEMPORARY_COMMUNION 5447, bonus +3 per level, duration 30 s per level
 *
 * So the table is level x 3, and the `toEqual` below is what holds it to exactly two keys:
 * C.Mais (the client's H.Plus, Cura Extra) has no key in this engine, and an extra one
 * appearing here would fail. The duration is not modelled — nothing in the calculation
 * reads how long a buff lasts.
 */

const activeOf = (char: Doram, name: string) => {
  const skill = char.activeSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`active skill not found: ${name}`);
  return skill;
};

/** The dropdown as a level -> bonus table, dropping the "-" (off) option. */
const tableOf = (char: Doram) =>
  activeOf(char, 'Temporary Communion')
    .dropdown.filter((o) => o.isUse)
    .map((o) => ({ level: o.value, ...(o.bonus as Record<string, number>) }))
    .sort((a, b) => a.level - b.level);

describe('Aliança Animal — P.ATQ and S.ATQM +3 per level', () => {
  it('covers all five levels, with the client’s table', () => {
    expect(tableOf(new SpiritHandler())).toEqual([
      { level: 1, pAtk: 3, sMatk: 3 },
      { level: 2, pAtk: 6, sMatk: 6 },
      { level: 3, pAtk: 9, sMatk: 9 },
      { level: 4, pAtk: 12, sMatk: 12 },
      { level: 5, pAtk: 15, sMatk: 15 },
    ]);
  });

  it('grants nothing while the buff is off', () => {
    const off = activeOf(new SpiritHandler(), 'Temporary Communion').dropdown.find((o) => !o.isUse);
    expect(off).toMatchObject({ value: 0 });
    expect(off?.bonus).toBeUndefined();
  });

  // Maestria Mística 10 plus one Pacto is the in-game requirement, and the Invocador has
  // neither skill — the whole Animista branch arrives with the fourth job.
  it('does not reach the Invocador', () => {
    expect(new Doram().activeSkills.map((s) => s.name)).not.toContain('Temporary Communion');
  });
});

describe('it is the last active control, so older saves keep their indices', () => {
  it('appends it after the preview buffs inheritSkills pushes', () => {
    const names = new SpiritHandler().activeSkills.map((s) => s.name);
    expect(names.at(-1)).toBe('Temporary Communion');
    expect(names.slice(0, -1)).toContain('Colors of Hynrok');
  });

  it('still matches a save taken before it was added', () => {
    const char = new SpiritHandler();
    const current = char.activeSkills.length;
    expect(char.matchesSavedSkillCount('active', current)).toBe(true);
    expect(char.matchesSavedSkillCount('active', current - 1)).toBe(true);
    expect(char.matchesSavedSkillCount('active', current - 2)).toBe(false);
  });

  // Appending past the base getter means this one skips its sortSkill pass, so it has to
  // carry that order itself or it would be the only dropdown in the panel ordered
  // differently from its neighbours.
  it('orders its levels exactly like a dropdown the base getter sorted', () => {
    const char = new SpiritHandler();
    const labels = (name: string) => activeOf(char, name).dropdown.map((o) => o.label);

    expect(labels('Arclouse Dash')).toEqual(['-', 'Nv 5', 'Nv 4', 'Nv 3', 'Nv 2', 'Nv 1']);
    expect(labels('Temporary Communion')).toEqual(labels('Arclouse Dash'));
  });
});

// The panel shows the catalog's pt-BR label, not the English `label` in the class.
it('is in the skill catalog as id 5447, labelled "Aliança Animal"', () => {
  expect(SKILL_META['Temporary Communion']).toMatchObject({ id: 5447, label: 'Aliança Animal' });
});
