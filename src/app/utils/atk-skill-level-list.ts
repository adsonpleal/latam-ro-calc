/**
 * Every level of an offensive skill, as the rotation's level picker lists them.
 *
 * The label has to keep the skill's **name** as its prefix: `setClassSkill` swaps that
 * prefix for the pt-BR one and preserves whatever follows. Building an entry from the
 * skill's display `label` instead is what put "[V3] All Bloom Lv5 Nv1" in the Magus
 * picker — card mkvqph0HW51cDiRaXxKS — the English name reached the screen because the
 * swap no longer recognised the prefix, and the level was printed twice, in a spelling
 * the app does not use ("Lv", never "Nv").
 *
 * `valuePrefix` defaults to the name, since that is what the engine resolves a stored
 * `"<prefix>==<level>"` against. The rebalance resolver passes the skill's own, which for
 * a variant can carry a suffix the name does not.
 */
export const atkSkillLevelList = (name: string, maxLevel: number, valuePrefix = name): { label: string; value: string }[] =>
  Array.from({ length: maxLevel }, (_, index) => ({ label: `${name} Nv${index + 1}`, value: `${valuePrefix}==${index + 1}` }));
