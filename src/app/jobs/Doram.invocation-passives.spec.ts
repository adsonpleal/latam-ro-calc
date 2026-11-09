import { describe, expect, it } from 'vitest';
import { Doram } from './Doram';
import { SpiritHandler } from './SpiritHandler';
import { SKILL_META } from '../skills/skill-meta.generated';

/**
 * The "Invocação" family, completed. Only the Fauna branch was registered — `Sprit Of Life`,
 * the client's own typo — while the Selva and Maré branches were absent from the Invocador
 * and the Animista alike, which is what card T7UVxhArHcwjN9RcSbH6 reported.
 *
 * The client (`skills.json` from the LATAM client read on 14/09/2026) and bROWiki
 * (https://browiki.org/wiki/Invocador) both put one capstone on each of the three paths:
 *
 *   Invocação da Fauna   SU_SPIRITOFLIFE 5052   Fauna   (already here)
 *   Invocação da Selva   SU_SPIRITOFLAND 5054   Selva
 *   Invocação das Marés  SU_SPIRITOFSEA  5056   Maré
 *
 * The absence of a bonus on the two new ones is part of what these cases pin, not an
 * omission: the Maré one moves heal amounts, a buff duration and a cooldown, and the Selva
 * one gives ATQM for the 3 seconds after a Floresta cast. Doram.ts says why neither becomes
 * a standing modifier. Should a source ever put a number on them, this is what has to change.
 */

const passiveOf = (char: Doram, name: string) => {
  const skill = char.passiveSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`passive skill not found: ${name}`);
  return skill;
};

const CLASSES: [string, () => Doram][] = [
  ['Invocador', () => new Doram()],
  ['Animista', () => new SpiritHandler()],
];

describe.each(CLASSES)('%s', (_className, make) => {
  it.each(['Spirit Of Land', 'Spirit Of Sea'])('offers %s as a one-level learned skill', (name) => {
    expect(passiveOf(make(), name).dropdown).toEqual([
      { label: 'Sim', value: 1, skillLv: 1, isUse: true },
      { label: 'Não', value: 0, isUse: false },
    ]);
  });

  it('gives the family the same shape it has in the client: three capstones, one per path', () => {
    const names = make().passiveSkills.map((s) => s.name);
    expect(names).toContain('Sprit Of Life');
    expect(names).toContain('Spirit Of Land');
    expect(names).toContain('Spirit Of Sea');
  });

  // They are appended, never inserted: a positional save written before they existed
  // addresses every other control by the same index it always did. The Animista is what
  // forces this — its own passives are pushed after the Invocador's list.
  it('appends them last, after the final job’s own controls', () => {
    expect(make().passiveSkills.map((s) => s.name).slice(-2)).toEqual(['Spirit Of Land', 'Spirit Of Sea']);
  });

  it('still matches a save taken before the two were added', () => {
    const char = make();
    const current = char.passiveSkills.length;
    expect(char.matchesSavedSkillCount('passive', current)).toBe(true);
    expect(char.matchesSavedSkillCount('passive', current - 2)).toBe(true);
    expect(char.matchesSavedSkillCount('passive', current - 3)).toBe(false);
  });
});

it('keeps the Animista’s own passives addressable by the indices they already had', () => {
  // The three 4th-job passives sit where inheritSkills put them, ahead of the appended pair.
  const names = new SpiritHandler().passiveSkills.map((s) => s.name);
  expect(names.slice(-5)).toEqual([
    'Commune with Chulho',
    'Commune with Hyunrok',
    'Mystical Creature Mastery',
    'Spirit Of Land',
    'Spirit Of Sea',
  ]);
});

// The panel shows the catalog's pt-BR label, not the English `label` in the class, so a
// missing catalog entry would render these as bare English names.
describe('the skill catalog carries both, under the names the LATAM client uses', () => {
  it.each([
    ['Spirit Of Land', 5054, 'Invocação da Selva'],
    ['Spirit Of Sea', 5056, 'Invocação das Marés'],
  ])('%s is id %i, labelled "%s"', (name, id, label) => {
    expect(SKILL_META[name]).toMatchObject({ id, label });
  });

  it('leaves the sibling’s client typo alone', () => {
    // `Sprit Of Life` is how the client spelled the English name in parentheses, and
    // item data and the Picky Peck / Cometas Lunáticos bonus both key off it.
    expect(SKILL_META['Sprit Of Life']).toMatchObject({ id: 5052, label: 'Invocação da Fauna' });
  });
});
