/**
 * Skill name → LATAM client EFST (status-effect) id, for the *buff* skills whose
 * import must be gated on the buff actually being up during a replay.
 *
 * Merely learning an endow/self-buff must NOT switch it on in an imported build:
 * the replay's learned-skill tree says what the character *can* cast, not what was
 * active. When a skill appears here, the importer only writes its level if the
 * matching EFST id is in the replay's active-status set (see applyLearnedSkills).
 *
 * EFST ids are the LATAM client's, sourced from ragreplaystats' public/db/status.json
 * (id → pt-BR status name) — NOT rAthena master, whose numeric ids can differ:
 *   90  Chamas                    (Endow Blaze / Flame Launcher — fire endow)
 *   91  Geada                     (Frost Weapon — water endow)
 *   92  Ventania                  (Lightning Loader — wind endow)
 *   93  Terremoto                 (Seismic Weapon — earth endow)
 *   114 Encantar com Veneno Mortal (Enchant Deadly Poison)
 *
 * Extend this map with any other self-buff whose "learned ≠ active" (verify the id
 * against status.json before adding — a wrong id silently drops a real buff).
 */
export const SKILL_EFST: Record<string, number | number[]> = {
  'Endow Blaze': 90,
  'Frost Weapon': 91,
  'Lightning Loader': 92,
  'Seismic Weapon': 93,
  'Enchant Deadly Poison': 114,
  'Improve Concentration': 3, // Concentrar
  'Intensification': [717, 1152], // Telecinesia (two client status ids)
};

/**
 * Build a predicate that answers "may this buff/effect skill be imported from the
 * learned tree?" given the replay's active EFST statuses.
 *
 * Positive-confirmation only: a skill imports **only** when it's mapped in
 * SKILL_EFST AND its status was up during the recording. Anything we can't confirm
 * was active — an unmapped skill, or a mapped one whose status never fired — is
 * skipped. Used for the "Habilidades/efeitos ativos" and Buffs columns; the
 * passive "Aprenda para ganhar bônus" list is imported ungated (learned level).
 */
export function makeBuffGate(activeStatuses: Iterable<number>): (skillName: string) => boolean {
  const set = new Set(activeStatuses);
  return (skillName: string) => {
    const efst = SKILL_EFST[skillName];
    if (efst === undefined) return false;
    // A skill may surface under more than one client status id (e.g. Telecinesia
    // is 717 or 1152) — the buff is up if any of them is active.
    return Array.isArray(efst) ? efst.some((id) => set.has(id)) : set.has(efst);
  };
}
