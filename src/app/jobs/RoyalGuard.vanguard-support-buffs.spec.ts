import { describe, expect, it } from 'vitest';
import { ImperialGuard } from './ImperialGuard';
import { RoyalGuard } from './RoyalGuard';
import { SKILL_META } from '../skills/skill-meta.generated';

/**
 * Proteção da Vanguarda and Prestígio Divino — the two Royal Guard support buffs, held to
 * bROWiki's tables, which is where their magnitudes live: the client description prints
 * only the Rage Point chance/limit and Prestige's duration, never the DEF or the HP.
 *
 *   Proteção da Vanguarda (2313)  https://browiki.org/wiki/Proteção_da_Vanguarda
 *     HP máx. +3%/lv, DEF +2%/lv (a percentage of equipment DEF, i.e. defPercent)
 *   Prestígio Divino (2318)       https://browiki.org/wiki/Prestígio_Divino
 *     DEF = [(lv × 15) + (Aura Sagrada lv × 10)] × (nv. base ÷ 100)
 *
 * The wiki's Prestige column (+15 … +75) is that formula at base level 100, so pinning the
 * column alone would hide the base-level term and leave the skill half strength on the
 * level-200 characters the class is actually played at. The cases below pin the formula.
 */

const activeOf = (char: RoyalGuard, name: string) => {
  const skill = char.activeSkills.find((s) => s.name === name);
  if (!skill) throw new Error(`active skill not found: ${name}`);
  return skill;
};

/** The dropdown as a level -> bonus table, dropping the "-" (off) option. */
const tableOf = (name: string) =>
  activeOf(new ImperialGuard(), name)
    .dropdown.filter((o) => o.isUse)
    .map((o) => ({ level: o.value, ...(o.bonus as Record<string, number>) }))
    .sort((a, b) => a.level - b.level);

/** Run the class hook the way the engine does, with Prestige used at `prestigeLv`. */
const defFromPrestige = (prestigeLv: number, baseLevel: number): number => {
  const char = new RoyalGuard();
  (char as any).bonuses = {
    activeSkillNames: new Set<string>(),
    usedSkillMap: new Map<string, number>(prestigeLv ? [['Prestige', prestigeLv]] : []),
  };

  const totalBonus: any = {};
  char.setAdditionalBonus({ totalBonus, weapon: { data: { typeName: 'spear' } }, model: { level: baseLevel } } as any);

  return totalBonus.def ?? 0;
};

describe('Proteção da Vanguarda — HP máx. +3% and equipment DEF +2% per level', () => {
  // The wiki says "aumenta a DEF dos equipamentos" and tabulates a percentage, so this is
  // defPercent — the key the engine applies over (equipment DEF + refine DEF). The absence
  // of a flat `def` key is part of the assertion: toEqual fails on an extra key.
  it('covers all five levels, with bROWiki’s table', () => {
    expect(tableOf('Vanguard Force')).toEqual([
      { level: 1, hpPercent: 3, defPercent: 2 },
      { level: 2, hpPercent: 6, defPercent: 4 },
      { level: 3, hpPercent: 9, defPercent: 6 },
      { level: 4, hpPercent: 12, defPercent: 8 },
      { level: 5, hpPercent: 15, defPercent: 10 },
    ]);
  });
});

describe('Prestígio Divino — DEF scales with skill level and base level', () => {
  // At base level 100 the base-level term is 1, so the formula reproduces the wiki column.
  it('reproduces bROWiki’s column at base level 100', () => {
    expect([1, 2, 3, 4, 5].map((lv) => defFromPrestige(lv, 100))).toEqual([15, 30, 45, 60, 75]);
  });

  it('doubles at base level 200, where the class is played', () => {
    expect(defFromPrestige(5, 200)).toBe(150);
  });

  it('truncates the base-level term, as the server int-casts it', () => {
    // 3 x 15 x 2.43 = 109.35
    expect(defFromPrestige(3, 243)).toBe(109);
  });

  it('grants nothing while the buff is off', () => {
    expect(defFromPrestige(0, 200)).toBe(0);
  });
});

describe('both buffs reach the Imperial Guard and keep older saves addressable', () => {
  // They are appended, never inserted: a positional save written before they existed
  // addresses every other control by the same index it always did. The Imperial Guard is
  // what forces this — its own controls are pushed after the Royal Guard's list.
  it('appends them last on both classes, after the final job’s own controls', () => {
    for (const char of [new RoyalGuard(), new ImperialGuard()]) {
      const names = char.activeSkills.map((s) => s.name);
      expect(names.slice(-2)).toEqual(['Vanguard Force', 'Prestige']);
    }
    expect(new ImperialGuard().activeSkills.map((s) => s.name).slice(0, -2)).toContain('Guard Stance');
  });

  it('still matches a save taken before the two were added', () => {
    const char = new ImperialGuard();
    const current = char.activeSkills.length;
    expect(char.matchesSavedSkillCount('active', current)).toBe(true);
    expect(char.matchesSavedSkillCount('active', current - 2)).toBe(true);
    expect(char.matchesSavedSkillCount('active', current - 3)).toBe(false);
  });

  // Appending past the base getter means these two skip its sortSkill pass, so they have to
  // carry that order themselves. They got it wrong once — written high-to-low with "-" last,
  // while sortSkill actually yields "-" first — which showed up as the only two dropdowns in
  // the panel ordered differently from their neighbours.
  it('orders its levels exactly like a dropdown the base getter sorted', () => {
    const char = new ImperialGuard();
    const labels = (name: string) => activeOf(char, name).dropdown.map((o) => o.label);
    const neighbour = labels('Guard Stance');

    expect(neighbour).toEqual(['-', 'Nv 5', 'Nv 4', 'Nv 3', 'Nv 2', 'Nv 1']);
    expect(labels('Vanguard Force')).toEqual(neighbour);
    expect(labels('Prestige')).toEqual(neighbour);
  });
});

// The picker shows the catalog's pt-BR label, not the English `label` in the class, so a
// missing catalog entry would render these two as bare English names.
describe('the skill catalog carries both, under the names the LATAM client uses', () => {
  it.each([
    ['Vanguard Force', 2313, 'Proteção da Vanguarda'],
    ['Prestige', 2318, 'Prestígio Divino'],
  ])('%s is id %i, labelled "%s"', (name, id, label) => {
    expect(SKILL_META[name]).toMatchObject({ id, label });
  });
});
