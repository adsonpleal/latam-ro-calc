import type { CharacterBase } from '../jobs/_character-base.abstract';
import type { MainModel } from '../models/main.model';
import { MAIN_STAT_KEYS, TRAIT_KEYS } from '../constants/trait-keys';

/** Shared by the browser restore/class-switch path and MCP build resolution. */
export function normalizeClassLimits(
  model: MainModel,
  character: CharacterBase,
  /**
   * Whether the 275/60 preview caps apply. Off by default, so a build resolved outside the
   * browser — MCP, a share link read by a viewer with Prévias off — lands on the live LATAM
   * caps rather than silently keeping a level LATAM does not have.
   */
  options: { allowPreviewLevels?: boolean } = {},
): void {
  const live = character.minMaxLevelCap;
  const preview = character.previewLevelCap;
  const allowed = options.allowPreviewLevels ? preview : null;
  const min = live.minMaxLevel[0];
  const max = allowed?.minMaxLevel[1] ?? live.minMaxLevel[1];
  const maxJob = allowed?.maxJob ?? live.maxJob;

  // A level inside the preview band but past the live cap is a preview build being read
  // without the allowance, not junk input: it becomes the strongest LATAM character that
  // build can express, rather than resetting to the default. Anything outside both caps is
  // still treated as untrustworthy and reset, which is what MCP build resolution relies on.
  const inPreviewBand = (value: number, liveCap: number, previewCap: number | undefined) =>
    previewCap !== undefined && value > liveCap && value <= previewCap;

  if (inPreviewBand(model.level, max, preview?.minMaxLevel[1])) model.level = max;
  else if (!Number.isFinite(model.level) || model.level < min || model.level > max) {
    model.level = Math.min(max, Math.max(min, 200));
  }

  if (inPreviewBand(model.jobLevel, maxJob, preview?.maxJob)) model.jobLevel = maxJob;
  else if (!Number.isFinite(model.jobLevel) || model.jobLevel < 1 || model.jobLevel > maxJob) model.jobLevel = 1;

  // Preserve the existing replay/share allowance for third/fourth jobs; Algoz's
  // six allocated stats have a real 99 ceiling, distinct from equipment/job bonuses.
  if (character.maxBaseStat < 130) {
    for (const key of MAIN_STAT_KEYS) model[key] = Math.max(1, Math.min(character.maxBaseStat, model[key] || 1));
    for (const key of TRAIT_KEYS) model[key] = 0;
  }
}
