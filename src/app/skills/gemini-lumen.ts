import type { AtkSkillModel } from '../jobs/_character-base.abstract';
import type { AutoCastSource } from '../models/auto-cast.model';
import { ElementType } from '../constants/element-type.const';

// Client ratios; independent rolls and physical weapon element:
// https://browiki.org/wiki/Gemini_Lumen
export const geminiLight = (magical: boolean): AtkSkillModel => ({
  name: 'Duple Light', label: magical ? 'Gemini Lumen (luz mágica)' : 'Gemini Lumen (luz física)',
  value: 'Duple Light==10', acd: 0, fct: 0, vct: 0, cd: 0,
  isMatk: magical, isMelee: false, ...(magical ? { element: ElementType.Neutral } : {}), totalHit: 1,
  formula: ({ skillLevel }) => magical ? 400 + 40 * skillLevel : 150 + 15 * skillLevel,
});

export function geminiSources(level: number, source: Pick<AutoCastSource, 'key' | 'kind' | 'sourceName' | 'slot' | 'enablingSkillId'>): AutoCastSource[] {
  return [false, true].map((magical) => {
    const skillData = geminiLight(magical);
    return {
      ...source, key: `${source.key}-${magical ? 'magic' : 'physical'}`,
      label: skillData.label,
      skillId: 2054, skillLevel: level, chance: 10 + 2 * level,
      trigger: 'melee-physical-hit', skillData,
      chanceBreakdown: [{ label: magical ? 'Luz mágica' : 'Luz física', value: `${10 + 2 * level}% por golpe corpo a corpo` }],
    };
  });
}
