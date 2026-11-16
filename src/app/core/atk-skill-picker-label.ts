import { elementPtBr } from 'src/app/constants/monster-i18n';

/**
 * What the rotation's skill picker shows on a row, and the rule that keeps two rows from
 * showing the same thing.
 *
 * The picker renders `AtkSkillModel.label`, which the session replaces with the client's
 * own localized skill name — looked up by the entry's `name`. Several catalog entries can
 * legitimately share one `name`: a ground skill's initial burst against its continuous
 * field, Adoramus cast as Sagrado against Neutro, Garra de Tigre on its own against the
 * same skill after Ruína. All of those collapse to one localized name, and a picker that
 * offers the same words twice with different damage behind each row is unreadable — that
 * is exactly what Cctavio reported for Disparo Perfurante.
 *
 * Two disambiguators, in order:
 *
 * 1. `labelSuffix`, appended as " (suffix)". Always wins, because it is the entry's own
 *    statement of what tells it apart, and it is the only one that can split variants
 *    sharing a name *and* an element.
 * 2. The entry's element, appended as " - Elemento", and only for a name that actually
 *    repeats. A single Adoramus row would read worse for carrying " - Sagrado".
 *
 * An entry that collides and offers neither is a catalog bug, not something to paper over
 * here: `atk-skill-picker-label.spec.ts` fails on it with the class and the two values.
 */
export interface AtkSkillLabelOption {
  label: string;
  labelSuffix?: string;
  element?: string;
}

/** The localized labels of one class's offensive skills, disambiguated in place. */
export function disambiguateAtkSkillLabels<T extends AtkSkillLabelOption>(skills: T[]): T[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const skill of skills ?? []) {
    if (seen.has(skill.label)) repeated.add(skill.label);
    seen.add(skill.label);
  }

  return (skills ?? []).map((skill) => {
    if (skill.labelSuffix) return { ...skill, label: `${skill.label} (${skill.labelSuffix})` };

    return repeated.has(skill.label) && skill.element
      ? { ...skill, label: `${skill.label} - ${elementPtBr(skill.element)}` }
      : skill;
  });
}
