/**
 * Two rows of the rotation's skill picker must never read the same.
 *
 * Reported by Cctavio: the Royal Guard's picker listed "Disparo Perfurante" twice and the
 * two rows computed different damage, with nothing on screen saying which was which. The
 * cause is structural rather than specific to that skill — the picker shows the client's
 * localized name, looked up by `AtkSkillModel.name`, and several catalog entries may share
 * one `name`. So the guard below is over every class, not over Disparo Perfurante.
 *
 * A collision has exactly two honest fixes, and the failure message says which applies:
 * the two entries are really one skill and belong merged (Disparo Perfurante was that
 * case, the stale pre-rebalance ratio hiding behind the current one), or they are genuine
 * variants and the one that varies needs a `labelSuffix` naming the state it describes.
 * Appending the element happens on its own, and only for a repeated name — see
 * `disambiguateAtkSkillLabels`.
 */
import { describe, expect, it } from 'vitest';
import { CLASS_CTOR_BY_ID } from '../jobs/_class-list';
import { AtkSkillModel, CharacterBase } from '../jobs/_character-base.abstract';
import { ElementType } from '../constants/element-type.const';
import { resolveSkillMeta } from '../skills';
import { disambiguateAtkSkillLabels } from './atk-skill-picker-label';

/**
 * The picker's own labelling, reproduced over a class's catalog: the client's pt-BR name
 * in place of the English one, then the disambiguation the module owns. The one step not
 * reproduced is `labelKey`, which replaces the whole label with a translated string and
 * is read from the session's own catalog.
 */
const pickerLabels = (cls: CharacterBase, withPreviews = false): { label: string; value: string }[] => {
  const catalog = (cls.getAtkSkills('current') as AtkSkillModel[]).filter((skill) => withPreviews || !skill.preview);
  const localized = catalog.map((skill) => {
    const meta = resolveSkillMeta(skill.name);
    const named = meta && !(skill.preview && !skill.labelSuffix) ? (meta.label ?? skill.label) : skill.label;

    return { ...skill, label: named };
  });

  return disambiguateAtkSkillLabels(localized).map(({ label, value }) => ({ label, value }));
};

const duplicatesOf = (rows: { label: string; value: string }[]): string[] => {
  const byLabel = new Map<string, string[]>();
  for (const row of rows) byLabel.set(row.label, [...(byLabel.get(row.label) ?? []), row.value]);

  return [...byLabel].filter(([, values]) => values.length > 1).map(([label, values]) => `"${label}" <- ${values.join(' + ')}`);
};

describe('the rotation picker', () => {
  for (const [classId, Ctor] of Object.entries(CLASS_CTOR_BY_ID)) {
    const cls = new Ctor() as CharacterBase;

    it(`offers no two rows with the same label — ${cls.constructor.name}`, () => {
      expect(duplicatesOf(pickerLabels(cls)), `class ${classId}`).toEqual([]);
    });

    it(`keeps them apart with the previews shown too — ${cls.constructor.name}`, () => {
      expect(duplicatesOf(pickerLabels(cls, true)), `class ${classId}`).toEqual([]);
    });
  }
});

describe('the disambiguation itself', () => {
  it('appends an element only to a name that repeats', () => {
    const rows = disambiguateAtkSkillLabels([
      { label: 'Adoramus', element: ElementType.Holy },
      { label: 'Adoramus', element: ElementType.Neutral },
      { label: 'Judex', element: ElementType.Holy },
    ]);

    expect(rows.map((row) => row.label)).toEqual(['Adoramus - Sagrado', 'Adoramus - Neutro', 'Judex']);
  });

  it('prefers an explicit labelSuffix, which is the only thing that splits one element', () => {
    const rows = disambiguateAtkSkillLabels([
      { label: 'Lança Congelante', element: ElementType.Water },
      { label: 'Lança Congelante', element: ElementType.Water, labelSuffix: 'em Evasão Aquática' },
    ]);

    // The suffixed row takes its suffix; the other still carries its element, because the
    // repeated-name reading is of the localized names, before any suffix is applied. Both
    // rows end up saying something different, which is the whole requirement.
    expect(rows.map((row) => row.label)).toEqual(['Lança Congelante - Água', 'Lança Congelante (em Evasão Aquática)']);
  });

  it('leaves a name that never repeats exactly as the client writes it', () => {
    expect(disambiguateAtkSkillLabels([{ label: 'Disparo Perfurante' }])).toEqual([{ label: 'Disparo Perfurante' }]);
  });
});
