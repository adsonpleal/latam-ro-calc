import { expect, it } from 'vitest';
import { JobBuffs } from './job-buffs';
import { SKILL_ID_BY_NAME } from '../skills';
import { skillDescHtml } from '../utils/pretty-item-desc';

it('uses the game client description for every shared buff and every skill option', () => {
  const missing: string[] = [];
  for (const buff of JobBuffs) {
    const skillId = buff.icon ?? SKILL_ID_BY_NAME[buff.name];
    if (!skillDescHtml(skillId)) missing.push(`${buff.label} (${skillId ?? 'no skill ID'})`);
    for (const option of buff.dropdown) {
      if (option.icon && !skillDescHtml(option.icon)) missing.push(`${buff.label}: ${option.label} (${option.icon})`);
    }
  }
  expect(missing).toEqual([]);
  expect(skillDescHtml(319)).toContain('Assovio<br>Nível máximo');
});
