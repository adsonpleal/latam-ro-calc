import { describe, expect, it } from 'vitest';
import { getClassDropdownList } from './_class-list';
import { SKILL_FORMULA_VERSION_OPTIONS } from '../skills/skill-formula-version';

/**
 * Skill levels read "Nv" everywhere in the UI — tracker card PhvG87woXBE8ewftVqzH.
 *
 * The calculator used both spellings at once: the battle HUD, the saved simulations and
 * the monster picker said "Nv", while the skill level pickers still said "Lv". Only one
 * of the two is Portuguese, so "Nv" is the one that stays.
 *
 * Two label families reach the screen and both are covered here:
 *
 *   - a skill's `dropdown` labels, which render verbatim ("Nv 5");
 *   - a skill's `levelList` labels, where ro-calculator.component.ts swaps only the
 *     English skill-name prefix for the pt-BR one and keeps the rest, so "Wild Fire Lv1"
 *     used to reach the user as "Fogo Selvagem Lv1".
 *
 * A skill's own top-level `label` is deliberately not checked: `localize` replaces it
 * wholesale with the catalog's pt-BR name, so its English text never reaches the screen.
 *
 * Note for whoever adds a class: rotation-view.ts strips the level off a label with
 * /\s*Nv\d+.*$/ before printing it, and prints the level separately. A label that goes
 * back to "Lv" would show its level twice in the battle HUD.
 */

const LV = /\bLv\s?\d/;

interface SkillLike {
  name?: string;
  dropdown?: { label?: string }[];
  levelList?: { label?: string }[];
}

const classes = getClassDropdownList().map((c) => ({ id: c.value, label: c.label, instant: c.instant }));

/** Every user-visible level label the class offers, tagged with where it came from. */
function levelLabels(instant: any): { where: string; label: string }[] {
  const lists: [string, SkillLike[]][] = [
    ['passive', instant._passiveSkillList ?? []],
    ['active', instant._activeSkillList ?? []],
    ['atk', instant._atkSkillList ?? []],
  ];

  const out: { where: string; label: string }[] = [];
  for (const [kind, skills] of lists) {
    for (const skill of skills ?? []) {
      for (const entry of skill.dropdown ?? []) {
        if (entry?.label) out.push({ where: `${kind}/${skill.name}/dropdown`, label: entry.label });
      }
      for (const entry of skill.levelList ?? []) {
        if (entry?.label) out.push({ where: `${kind}/${skill.name}/levelList`, label: entry.label });
      }
    }
  }

  return out;
}

describe('skill level labels are pt-BR', () => {
  it.each(classes)('$label ($id) says Nv, never Lv', ({ instant }) => {
    const offenders = levelLabels(instant).filter((l) => LV.test(l.label));

    expect(offenders).toEqual([]);
  });

  // Guards the guard: if the label shape ever changes, the sweep above must not quietly
  // start inspecting nothing.
  it('actually finds level labels to check', () => {
    const total = classes.reduce((sum, c) => sum + levelLabels(c.instant).length, 0);

    expect(total).toBeGreaterThan(1000);
  });

  it('finds the pt-BR spelling in use', () => {
    const nv = classes.flatMap((c) => levelLabels(c.instant)).filter((l) => /\bNv\s?\d/.test(l.label));

    expect(nv.length).toBeGreaterThan(1000);
  });
});

/**
 * The sweep above reads the raw `_atkSkillList`, and that is not what the picker shows:
 * `resolveRebalancedSkill` rebuilds every patched skill's `levelList`, so a catalog read
 * through `getAtkSkills(version)` is the only one the player actually sees.
 *
 * It used to build the entries from the skill's `label`, which carries a level and, on
 * the fourth jobs, a version tag. The Magus picker therefore offered "[V3] All Bloom Lv5
 * Nv1" — English, with the level printed twice — because calculator-session only swaps a
 * prefix it recognises as the skill's name, and "[V3] " is not it. Card
 * mkvqph0HW51cDiRaXxKS, reported by pazzoLino.
 */
describe('rebalanced level labels reach the picker in pt-BR', () => {
  const VERSIONS = SKILL_FORMULA_VERSION_OPTIONS.map((option) => option.value);

  const catalogLabels = (instant: any) =>
    VERSIONS.flatMap((version) =>
      (instant.getAtkSkills(version) as SkillLike[]).flatMap((skill) =>
        (skill.levelList ?? []).map((entry) => ({ where: `${version}/${skill.name}`, label: entry?.label ?? '' })),
      ),
    );

  // Built once: getAtkSkills() is uncached and rebuilds the whole rebalanced catalog per
  // call, and all four of these tests read the same labels.
  const byClass = classes.map((entry) => ({ ...entry, labels: catalogLabels(entry.instant) }));

  it.each(byClass)('$label ($id) offers no "Lv" and no version tag', ({ labels }) => {
    expect(labels.filter((l) => LV.test(l.label) || /^\[V\d\]/.test(l.label))).toEqual([]);
  });

  it('leaves Florescer’s entries where the prefix swap can find them', () => {
    const magus = classes.find((c) => c.label === 'Magus')?.instant;

    for (const version of VERSIONS) {
      const bloom = (magus.getAtkSkills(version) as SkillLike[]).find((s) => s.name === 'All Bloom');
      expect(bloom?.levelList?.map((e) => e!.label), version).toEqual(
        ['All Bloom Nv1', 'All Bloom Nv2', 'All Bloom Nv3', 'All Bloom Nv4', 'All Bloom Nv5'],
      );
    }
  });

  it('keeps a hand-written entry rather than regenerating over it', () => {
    // The job file spells these out because the generated form cannot carry their
    // disambiguator; a rebuild that ignored them would read "Cross Slash Nv1" twice.
    const previews = byClass.flatMap((c) => c.labels).filter((l) => l.label.includes('(Prévia)'));

    expect(previews.length).toBeGreaterThan(0);
  });

  it('actually finds labels to check', () => {
    const total = byClass.reduce((sum, c) => sum + c.labels.length, 0);

    expect(total).toBeGreaterThan(3000);
  });
});
