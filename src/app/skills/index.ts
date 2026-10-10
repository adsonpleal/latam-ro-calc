import { SKILL_META, SkillMetaEntry, SkillName } from './skill-meta.generated';

export { SKILL_META };
export type { SkillMetaEntry, SkillName };

/**
 * The Skill Catalog — single source of truth for skill localization metadata
 * (id, pt-BR name, description, icon namespace), replacing the former
 * latam-skills.json + latam-skill-desc.json assets.
 *
 * Keyed by the engine's internal skill name (unique). Note that several names
 * can legitimately share one in-game `id`, so only name -> id is unambiguous.
 */

/** Internal skill name -> in-game skill id (icons, descriptions, item.json refs). */
export const SKILL_ID_BY_NAME: Record<string, number> = {};
for (const [name, meta] of Object.entries(SKILL_META) as [string, SkillMetaEntry][]) {
  if (meta.id !== undefined) SKILL_ID_BY_NAME[name] = meta.id;
}

/** Skill id -> pt-BR client description (replaces latam-skill-desc.json). */
export const SKILL_DESC_BY_ID: Record<number, string> = {};
for (const meta of Object.values(SKILL_META) as SkillMetaEntry[]) {
  if (meta.id !== undefined && meta.description) SKILL_DESC_BY_ID[meta.id] = meta.description;
}

/** Browser builds load the prose separately, after the first calculation is visible. */
export function setSkillDescriptions(descriptions: Record<number, string>): void {
  Object.assign(SKILL_DESC_BY_ID, descriptions);
  for (const meta of Object.values(SKILL_META) as SkillMetaEntry[]) {
    if (meta.id !== undefined && descriptions[meta.id]) meta.description = descriptions[meta.id];
  }
}

/** Every in-game skill id known to the catalog (the item.json validator uses this). */
export const VALID_SKILL_IDS = new Set<number>(Object.values(SKILL_ID_BY_NAME));

/** in-game id -> { pt-BR label, iconType }. Several names can share one id; the
 *  first catalog entry wins (used only for display of id-keyed engine data). */
const META_BY_ID: Record<number, { label?: string; iconType?: 'item' | 'skill' }> = {};
for (const meta of Object.values(SKILL_META) as SkillMetaEntry[]) {
  if (meta.id !== undefined && !(meta.id in META_BY_ID)) {
    META_BY_ID[meta.id] = { label: meta.label, iconType: meta.iconType };
  }
}

/** Localization metadata for a skill by its internal name, or undefined if unknown. */
export const resolveSkillMeta = (name: string): SkillMetaEntry | undefined =>
  (SKILL_META as Record<string, SkillMetaEntry>)[name];

/** Display metadata (pt-BR name + icon) for an in-game skill id, for id-keyed
 *  summary/chance rows. Returns undefined when the id has no pt-BR label. */
export const resolveSkillById = (id: number): { id: number; name: string; iconType?: 'item' | 'skill' } | undefined => {
  const m = META_BY_ID[id];
  return m?.label ? { id, name: m.label, iconType: m.iconType } : undefined;
};
