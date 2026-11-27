import { describe, expect, it } from 'vitest';
import { Acolyte } from './Acolyte';
import { Sura } from './Sura';
import { Inquisitor } from './Inquisitor';
import { getClassDropdownList } from './_class-list';
import { ClassIDEnum } from './_class-name';
import { resolveSkillMeta } from '../skills';
import type { CharacterBase, PassiveSkillModel, SkillModel } from './_character-base.abstract';

/**
 * **"Aprenda para ganhar bônus" must offer every level the client grants.**
 *
 * Tracker card GEVBbRucEKldZGvGSjOb: on the Shura, Explosão Espiritual (id 2332) and
 * Tempestade Espiritual (id 2518) could only be picked at Nv 5 — their dropdowns held the
 * cap and nothing else. Both cap at Nv 5 in the client, so the cap itself was right and
 * levels 1 to 4 were simply absent.
 *
 * Two things went wrong because of that, and only the first is visible:
 *
 *   - a player who learned either skill below the cap had no option to say so;
 *   - the replay import resolves a learned level by taking the **highest** option at or
 *     below it (`calculator-session#applyLearnedSkills`), so a recording with one of
 *     these at Nv 1 to 4 matched no option and imported as *unlearned*.
 *
 * The sweep below is the whole-line rule rather than a two-skill patch, because the card
 * was widened to the Shura's lineage: `Acolyte` (the shared base, not itself playable),
 * `Champion` — "Mestre", which carries the Monk-era skills, there being no `Monk.ts` —
 * `Sura` and `Inquisitor`. Each generation inherits its ancestors' list through
 * `inheritSkills`, so a gap declared once shows up in every class below it; these two
 * were declared in `Sura.ts` and reached the Inquisidor as well.
 *
 * Every level count comes from the client's own skill description, carried in
 * `skill-meta.generated.ts` — the "Nível máximo" header, cross-checked here against the
 * highest row of the same text's per-level table. bROWiki agrees on the two skills the
 * card named: https://browiki.org/wiki/Explosão_Espiritual (Nv 5) and
 * https://browiki.org/wiki/Tempestade_Espiritual (Nv 5).
 */

/** The client's own description text for a skill, or '' when it ships none. */
const clientDescription = (skillName: string) => resolveSkillMeta(skillName)?.description ?? '';

/** The client's declared maximum for a skill, read from that description. */
function clientMaxLevel(skillName: string): number | undefined {
  const header = clientDescription(skillName).match(/N[íi]vel m[áa]ximo: \^\w{6}(\d+)/);

  return header ? Number(header[1]) : undefined;
}

/** The selectable levels of a dropdown, with the "-" (0) entry dropped. */
function offeredLevels(skill: PassiveSkillModel): number[] {
  return skill.dropdown
    .filter((option) => option.isUse !== false)
    .map((option) => option.skillLv ?? option.value)
    .filter((level) => level > 0)
    .sort((a, b) => a - b);
}

const passiveOf = (char: CharacterBase, name: string) => {
  const skill = char.passiveSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`passive skill not found: ${name}`);
  return skill;
};

const LINE_IDS: number[] = [ClassIDEnum.Champion, ClassIDEnum.Sura, ClassIDEnum.Inquisitor];

const MONK_LINE = [
  // Acolyte owns Curar and Flagelo do Mal, which every class below it shows, but it has no
  // CLASS_ORDER row — it is not playable — so it is the one generation built by hand.
  { label: 'Noviço (base)', char: new Acolyte() as CharacterBase },
  ...getClassDropdownList()
    .filter((entry) => LINE_IDS.includes(entry.value))
    .map((entry) => ({ label: entry.label, char: entry.instant })),
];

/** Every dropdown-backed bonus skill of the line, tagged with the class it reached. */
const bonusSkills = MONK_LINE.flatMap(({ label, char }) =>
  char.passiveSkills
    .filter((skill) => skill.inputType === 'dropdown')
    .map((skill) => ({ where: `${label}/${skill.name}`, name: skill.name, skill })),
);

const bonusSkillNames = [...new Set(bonusSkills.map((entry) => entry.name))];

describe('the monk line offers every level in Aprenda para ganhar bônus', () => {
  // Driven off every class, not just the distinct names: a gap declared in one generation
  // has to be caught in each generation that inherits it.
  it.each(bonusSkills)('$where offers 1 to the client maximum, with no gaps', ({ name, skill }) => {
    const max = clientMaxLevel(name);

    expect(max, `${name} has no "Nível máximo" in the client description`).toBeDefined();
    expect(offeredLevels(skill)).toEqual(Array.from({ length: max! }, (_, index) => index + 1));
  });

  // Guards the guard: the sweep is driven off `passiveSkills`, so a refactor that emptied
  // the lists — or renamed `inputType` — would leave it asserting nothing.
  it('actually finds the line’s bonus skills to check', () => {
    expect(bonusSkills.length).toBeGreaterThanOrEqual(39);
  });

  // The "Nível máximo" header is the figure the sweep trusts; where the same description
  // also prints a per-level table, the two must agree, or the header is being misread.
  // One case per distinct skill — the header does not vary by class.
  it.each(bonusSkillNames)('%s agrees with the client’s own level table', (name) => {
    const rows = [...clientDescription(name).matchAll(/\[Nv (\d+)\]/g)].map((match) => Number(match[1]));

    if (!rows.length) return; // Curar prints no per-level table.
    expect(Math.max(...rows)).toBe(clientMaxLevel(name));
  });
});

describe('the two skills the card named', () => {
  const sura = new Sura();

  // Named outright rather than left to the sweep: the sweep only checks skills that are in
  // the list, so it would stay green if either entry were dropped from it altogether.
  it.each([
    { className: 'Shura', char: sura as CharacterBase },
    { className: 'Inquisidor', char: new Inquisitor() as CharacterBase },
  ])('$className picks Explosão Espiritual and Tempestade Espiritual at any level', ({ char }) => {
    expect(offeredLevels(passiveOf(char, 'Rampage Blast'))).toEqual([1, 2, 3, 4, 5]);
    expect(offeredLevels(passiveOf(char, 'Lightning Ride'))).toEqual([1, 2, 3, 4, 5]);
  });

  it('labels the new levels the way the rest of the panel does', () => {
    // `sortSkill` leaves "-" at the front and orders the levels highest-first. Chakra do
    // Vigor is the reference: same cap, same shape, untouched by this fix.
    const expected = ['-', 'Nv 5', 'Nv 4', 'Nv 3', 'Nv 2', 'Nv 1'];

    expect(passiveOf(sura, 'Gentle Touch - Alive').dropdown.map((option) => option.label)).toEqual(expected);
    expect(passiveOf(sura, 'Rampage Blast').dropdown.map((option) => option.label)).toEqual(expected);
    expect(passiveOf(sura, 'Lightning Ride').dropdown.map((option) => option.label)).toEqual(expected);
  });
});

/**
 * A saved build stores `passiveSkillIds` **positionally** — `getSkillBonusAndName` zips it
 * against `passiveSkills` by index — and `matchesSavedSkillCount` rejects a save whose
 * length no longer matches. Widening a dropdown touches neither, but only as long as the
 * list keeps its order and its length, which is what this block pins.
 */
describe('nothing moves for a build saved before the fix', () => {
  const SURA_BONUS_ORDER = [
    'Heal', 'Demon Bane', 'Dragon Combo', 'Fallen Empire', 'Tiger Cannon', 'Divine Protection',
    'Iron Hand', 'Dodge', 'Vigor Explosion', 'Rising Dragon', 'Gentle Touch - Alive',
    'Gentle Touch - Opposite', 'Rampage Blast', 'Lightning Ride', 'Vigor condensation',
    'Chain Combo', 'Raging Trifecta Blow',
  ];
  const ACTIVE_COUNT = new Sura().activeSkills.length;

  it.each([
    { className: 'Shura', make: () => new Sura(), order: SURA_BONUS_ORDER },
    { className: 'Inquisidor', make: () => new Inquisitor(), order: [...SURA_BONUS_ORDER, 'Will of Faith'] },
  ])('keeps the $className’s bonus list in its saved order and length', ({ make, order }) => {
    const char = make();

    expect(char.passiveSkills.map((skill) => skill.name)).toEqual(order);
    expect(char.matchesSavedSkillCount('passive', order.length)).toBe(true);
  });

  // Nv 5 was the one level a build could already hold, so it is the one that must still
  // produce exactly what it produced before: no stat bonus at all, only a learned level.
  // The new levels 1 to 4 carry no bonus either, which is why no number can move.
  it.each([1, 2, 3, 4, 5])('contributes no stat bonus at Nv %i, only the learned level', (level) => {
    // A fresh Sura per case: setLearnSkills and getSkillBonusAndName both mutate it.
    const sura = new Sura();
    const passiveSkillIds = SURA_BONUS_ORDER
      .map((name) => (name === 'Rampage Blast' || name === 'Lightning Ride' ? level : 0));

    const { equipAtks, masteryAtks, learnedSkillMap } = sura
      .setLearnSkills({ activeSkillIds: new Array(ACTIVE_COUNT).fill(0), passiveSkillIds })
      .getSkillBonusAndName();

    expect(equipAtks).toEqual({});
    expect(masteryAtks).toEqual({});
    expect(learnedSkillMap.get('Rampage Blast')).toBe(level);
    expect(learnedSkillMap.get('Lightning Ride')).toBe(level);
  });
});

/**
 * Mirrors the level resolution of `calculator-session#applyLearnedSkills` — the same copy
 * `RoyalGuard.over-brand-replay.spec.ts` keeps, for the same reason: `pick` is a closure
 * inside a React session method and there is no seam to call it through.
 *
 * These options carry no `skillLv`, so it is the `byVal` branch that answers now; before
 * the fix nothing matched a recorded Nv 1 to 4 and the `ranked` fallback returned 0, which
 * is the value for "never learned".
 */
describe('a replay imports the level it recorded', () => {
  const pick = (dropdown: SkillModel[], level: number): number => {
    if (!level) return 0;
    const byLv = dropdown.find((option) => option.skillLv === level);
    if (byLv) return byLv.value;
    const byVal = dropdown.find((option) => option.value === level);
    if (byVal) return byVal.value;
    const ranked = dropdown
      .filter((option) => option.isUse !== false)
      .map((option) => ({ value: option.value, lv: option.skillLv ?? option.value }))
      .filter((option) => option.lv <= level)
      .sort((a, b) => b.lv - a.lv);

    return ranked.length ? ranked[0].value : 0;
  };

  const sura = new Sura();

  it.each(['Rampage Blast', 'Lightning Ride'])('%s round-trips every recorded level', (name) => {
    const { dropdown } = passiveOf(sura, name);

    for (const level of [1, 2, 3, 4, 5]) {
      expect(pick(dropdown, level), `recorded Nv ${level}`).toBe(level);
    }
  });
});
