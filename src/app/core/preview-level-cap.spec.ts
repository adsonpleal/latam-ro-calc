/**
 * The 275/60 level cap, offered as a **Prévia** beside LATAM's live 250/50.
 *
 * It is a cap change rather than a data import because the data was already here: every
 * fourth-job class carries real `jobBonusTable` and `TraitBonusTable` rows through job
 * level 59, and `BaseStateCalculator` already accumulates trait points to 275. The tests
 * below pin that, since the whole change rests on it — if the job tables were padding
 * instead of data, raising `maxJob` would hand the player ten empty levels.
 *
 * Base HP/SP is the one figure with no row above 250. The clamp predates this preview and
 * stays; `HP_SP_TABLE_LAST_LEVEL` says why it cannot be raised with the cap.
 */
import { describe, expect, it } from 'vitest';
import {
  JOB_4_MAX_JOB_LEVEL,
  JOB_4_MIN_MAX_LEVEL,
  JOB_4_PREVIEW_MAX_JOB_LEVEL,
  JOB_4_PREVIEW_MIN_MAX_LEVEL,
} from '../app-config';
import { HP_SP_TABLE_LAST_LEVEL } from './hp-sp-calculator';
import { normalizeClassLimits } from './class-limits';
import { BaseStateCalculator } from './base-state-calculator';
import type { CharacterBase } from '../jobs/_character-base.abstract';
import type { MainModel } from '../models/main.model';
import { DragonKnight } from '../jobs/DragonKnight';
import { ArchMage } from '../jobs/ArchMage';
import { Meister } from '../jobs/Meister';
import { Inquisitor } from '../jobs/Inquisitor';
import { SpiritHandler } from '../jobs/SpiritHandler';
import { NightWatch } from '../jobs/NightWatch';
import { RuneKnight } from '../jobs/RuneKnight';
import { Taekwondo } from '../jobs/Taekwondo';

const FOURTH = [
  ['DragonKnight', () => new DragonKnight()],
  ['ArchMage', () => new ArchMage()],
  ['Meister', () => new Meister()],
  ['Inquisitor', () => new Inquisitor()],
  ['SpiritHandler', () => new SpiritHandler()],
  ['NightWatch', () => new NightWatch()],
] as const;

const model = (level: number, jobLevel: number) => ({ level, jobLevel } as MainModel);

describe('275/60 preview level cap', () => {
  it.each(FOURTH)('offers %s the expansion caps', (_label, make) => {
    const character = make() as unknown as CharacterBase;

    expect(character.minMaxLevelCap).toMatchObject({ minMaxLevel: JOB_4_MIN_MAX_LEVEL, maxJob: JOB_4_MAX_JOB_LEVEL });
    expect(character.previewLevelCap).toEqual({
      minMaxLevel: JOB_4_PREVIEW_MIN_MAX_LEVEL,
      maxJob: JOB_4_PREVIEW_MAX_JOB_LEVEL,
    });
  });

  it('offers it to no one else', () => {
    // kRO's expansion raised the fourth-job 250/50. A third job stays at 200 and a
    // pre-third at 99, and neither gains a preview cap it has no content for.
    expect((new RuneKnight() as unknown as CharacterBase).previewLevelCap).toBeNull();
    expect((new Taekwondo() as unknown as CharacterBase).previewLevelCap).toBeNull();
  });

  it('has real job-bonus rows behind the ten new job levels', () => {
    // The reason this is a cap change and not a data import. `_job-tier.ts` already notes
    // the tables are padded to row 70, so "a row exists" proves nothing — what matters is
    // that the rows between 51 and 60 still CHANGE. 17 of the 20 classes grow a trait
    // bonus in there; Shinkiro and Shiranui grow a main stat instead.
    const grows = (table: Record<number, number[]>) =>
      [51, 52, 53, 54, 55, 56, 57, 58, 59, 60].some((lv) => table[lv] && String(table[lv]) !== String(table[50]));

    for (const [label, make] of FOURTH) {
      const character = make() as any;
      expect(
        grows(character.JobBonusTable) || grows(character.TraitBonusTable),
        `${label} gains nothing between job 51 and 60`,
      ).toBe(true);
    }
  });

  it('accumulates trait points all the way to 275', () => {
    // 7 at level 200, +3 per level and +4 more on every fifth. Already in place before this
    // preview, which is why the cap raise adds no point math.
    const total = (level: number) => new BaseStateCalculator().setLevel(level).calculate().summary.totalTraitPoint;

    expect(total(200)).toBe(7);
    expect(total(250)).toBe(7 + 3 * 50 + 4 * 10);
    expect(total(275)).toBe(7 + 3 * 75 + 4 * 15);
    expect(total(275)).toBeGreaterThan(total(250));
  });

  it('keeps a build inside whichever cap applies', () => {
    const dk = new DragonKnight() as unknown as CharacterBase;

    const preview = model(275, 60);
    normalizeClassLimits(preview, dk, { allowPreviewLevels: true });
    expect(preview).toMatchObject({ level: 275, jobLevel: 60 });

    // The same build with Prévias off becomes the strongest LATAM character it can be,
    // rather than resetting to 200/1 — it is the same build as far as LATAM can express it.
    const live = model(275, 60);
    normalizeClassLimits(live, dk);
    expect(live).toMatchObject({ level: JOB_4_MIN_MAX_LEVEL[1], jobLevel: JOB_4_MAX_JOB_LEVEL });

    // A third job never reaches either cap, with or without the allowance.
    const thirdJob = model(275, 60);
    normalizeClassLimits(thirdJob, new RuneKnight() as unknown as CharacterBase, { allowPreviewLevels: true });
    expect(thirdJob.level).toBe(200);
  });

  it('still resets a level outside both caps instead of clamping it', () => {
    // The distinction the preview band rests on, and the contract MCP build resolution
    // pins in mcp/src/engine/parity.spec.ts: 260 is a preview build read without the
    // allowance and becomes 250, while 999 is untrustworthy input and becomes the default.
    const dk = new DragonKnight() as unknown as CharacterBase;

    const inBand = model(260, 55);
    normalizeClassLimits(inBand, dk);
    expect(inBand).toMatchObject({ level: 250, jobLevel: 50 });

    const nonsense = model(999, 999);
    normalizeClassLimits(nonsense, dk, { allowPreviewLevels: true });
    expect(nonsense).toMatchObject({ level: 200, jobLevel: 1 });
  });

  it('leaves the preview cap out of the default allowance', () => {
    // MCP build resolution and a share link opened with Prévias off both go through the
    // default, so the default has to be the live cap.
    const resolved = model(260, 55);
    normalizeClassLimits(resolved, new DragonKnight() as unknown as CharacterBase);

    expect(resolved).toMatchObject({ level: 250, jobLevel: 50 });
  });

  it('plateaus base HP/SP at the last level the table has a row for', () => {
    // Not a choice made for this preview: no source publishes base HP/SP above 250, so the
    // clamp stays and is stated instead of being filled with a guess.
    expect(HP_SP_TABLE_LAST_LEVEL).toBe(JOB_4_MIN_MAX_LEVEL[1]);
    expect(HP_SP_TABLE_LAST_LEVEL).toBeLessThan(JOB_4_PREVIEW_MIN_MAX_LEVEL[1]);
  });
});
