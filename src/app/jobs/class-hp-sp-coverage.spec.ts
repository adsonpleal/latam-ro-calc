/**
 * Every class offered in the calculator's dropdown must resolve to an entry in
 * hp_sp_table.json, otherwise MaxHP/MaxSP are silently wrong.
 *
 * HpSpCalculator.setClass does:
 *     const dataIdx = this.hpSpTable.findIndex((a) => a.jobs[cClass.className]);
 * and calculate() then reads `this.hpSpTable[dataIdx].baseHp[...]`. A class with no
 * entry yields dataIdx = -1, so that read throws — straight into the swallowed
 * `catch` in calculate(), leaving the previous HP/SP on screen with only a console
 * error. This spec is the guard: a job registered in _class-list.ts without matching
 * HP/SP data fails here instead of degrading silently in the UI.
 *
 * Added alongside unhiding the Expanded 4th classes (Sky Emperor, Soul Ascetic,
 * Shinkiro, Shiranui, Night Watch, Hyper Novice), which now ship in the LATAM GRF.
 *
 * The table is read with fs rather than imported: tsconfig has no resolveJsonModule.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { getClassDropdownList } from './_class-list';

interface HpSpRecord {
  jobs: Record<string, boolean>;
  baseHp: Record<string, number>;
  baseSp: Record<string, number>;
}

const HP_SP_TABLE: HpSpRecord[] = JSON.parse(
  readFileSync(resolve(process.cwd(), 'src/assets/demo/data/hp_sp_table.json'), 'utf8'),
);

const recordFor = (className: string): HpSpRecord | undefined =>
  HP_SP_TABLE[HP_SP_TABLE.findIndex((a) => a.jobs[className])];

describe('hp_sp_table coverage for every selectable class', () => {
  const classes = getClassDropdownList().map((c) => ({ id: c.value, className: c.instant.className }));

  it('covers every class in the dropdown list', () => {
    const uncovered = classes.filter((c) => recordFor(c.className) === undefined);
    expect(uncovered).toEqual([]);
  });

  it.each(classes)('$className ($id) has gap-free base HP and SP curves', ({ className }) => {
    const rec = recordFor(className);
    expect(rec, `no hp_sp_table entry for ${className}`).toBeDefined();

    // Each curve is checked over its own level span rather than a shared one:
    // baseHp and baseSp legitimately end at different levels (GuillotineCross has
    // HP up to 201 but SP only to 200, and level 201 is unreachable for a 3rd
    // class anyway). What must hold is that neither curve has a hole in the middle,
    // since calculate() indexes it directly at the character's level.
    for (const curve of ['baseHp', 'baseSp'] as const) {
      const levels = Object.keys(rec![curve]).map(Number);
      expect(levels.length, `${className} ${curve} is empty`).toBeGreaterThan(0);

      for (let lv = Math.min(...levels); lv <= Math.max(...levels); lv++) {
        expect(typeof rec![curve][lv], `${className} ${curve} missing level ${lv}`).toBe('number');
      }
    }
  });
});
