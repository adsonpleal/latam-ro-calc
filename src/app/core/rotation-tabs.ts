/**
 * The rotation strip: "Rotação 1 | Rotação 2 | +". One build keeps several rotations and
 * compares them against the same character, equipment and target by switching tabs —
 * everything outside the strip (stats, equipment, buffs, the opponent) is shared.
 *
 * Only the active tab is live: it is `MainModel.rotation` / `rotationStacks`, the very
 * pair that existed before the strip did, so the engine, the share codec, the MCP server
 * and every rotation spec keep reading the one rotation they always read. `rotationTabs`
 * holds the strip and stays empty while the build has a single rotation — which is what a
 * build saved before this feature decodes to, and what keeps a one-rotation share token
 * identical to the token that build produced before.
 *
 * The active tab's own slot in `rotationTabs` is a stale copy. Keeping it current would
 * mean every writer of `rotation` — the panel, the optimiser, the undo, a class switch —
 * remembering to update it too, and the one that forgets loses the user's rotation.
 * {@link readRotationTabs} refreshes that slot from `rotation` instead, so read the strip
 * through it and never index `rotationTabs` by hand.
 *
 * Framework-free (src/app/core): no Angular/RxJS/PrimeNG, no React, no DOM.
 */
import { MAX_ROTATION_LENGTH, normalizeRotation } from './rotation';

/** One tab: the same ordered pair the live rotation is, entries and accumulation aligned. */
export interface RotationTab {
  rotation: string[];
  stacks: number[];
}

/** The fields of `MainModel` the strip is made of, declared structurally so this module
 *  stays testable with plain literals — the same reason `RotationSkillOption` is. */
export interface RotationTabsModel {
  rotation?: string[];
  rotationStacks?: number[];
  rotationTabs?: RotationTab[];
  rotationTab?: number;
}

/**
 * Hard cap on how many rotations one build keeps. Not a UI policy: the strip arrives from
 * a share token and from localStorage, both attacker-controlled, which is the same reason
 * {@link MAX_ROTATION_LENGTH} exists. Far above comparing a handful of rotations.
 */
export const MAX_ROTATION_TABS = 20;

const emptyTab = (): RotationTab => ({ rotation: [], stacks: [] });

const copyTab = (tab: RotationTab): RotationTab => ({
  rotation: [...(tab?.rotation ?? [])],
  stacks: [...(tab?.stacks ?? [])],
});

const clamp = (value: number, last: number): number => {
  const index = Math.trunc(value);
  return Number.isFinite(index) ? Math.min(Math.max(index, 0), last) : 0;
};

/** Which tab `rotation` is currently holding, clamped into the stored strip. */
export function activeRotationTab(model: RotationTabsModel): number {
  const count = model?.rotationTabs?.length ?? 0;
  return count > 1 ? clamp(model?.rotationTab ?? 0, count - 1) : 0;
}

/** Every tab in strip order, the active one taken from the live `rotation`. Always at
 *  least one: a build with no strip is a build with a single rotation. */
export function readRotationTabs(model: RotationTabsModel): RotationTab[] {
  const stored = model?.rotationTabs ?? [];
  const tabs = stored.length > 1 ? stored.map(copyTab) : [emptyTab()];
  tabs[activeRotationTab(model)] = copyTab({ rotation: model?.rotation, stacks: model?.rotationStacks });
  return tabs;
}

/**
 * Make `tabs[index]` the live rotation and store the rest. A strip of one collapses back
 * to the plain `rotation`, so a build the user took back down to a single rotation leaves
 * no trace of ever having had more.
 */
export function writeRotationTabs(model: RotationTabsModel, tabs: RotationTab[], index: number): void {
  const strip = tabs.length ? tabs : [emptyTab()];
  const active = clamp(index, strip.length - 1);
  model.rotation = [...strip[active].rotation];
  model.rotationStacks = [...strip[active].stacks];
  model.rotationTabs = strip.length > 1 ? strip.map(copyTab) : [];
  model.rotationTab = strip.length > 1 ? active : 0;
}

/**
 * Add an empty rotation at the end of the strip and switch to it, which is what the "+"
 * does. Returns whether anything changed, so the caller only recalculates when it did.
 */
export function addRotationTab(model: RotationTabsModel): boolean {
  const tabs = readRotationTabs(model);
  if (tabs.length >= MAX_ROTATION_TABS) return false;
  tabs.push(emptyTab());
  writeRotationTabs(model, tabs, tabs.length - 1);
  return true;
}

/** Switch to another tab, parking the rotation being edited in the one it came from. */
export function selectRotationTab(model: RotationTabsModel, index: number): boolean {
  const tabs = readRotationTabs(model);
  if (!Number.isInteger(index) || index < 0 || index >= tabs.length || index === activeRotationTab(model)) return false;
  writeRotationTabs(model, tabs, index);
  return true;
}

/**
 * Drop a tab. The strip never goes below one, and closing the tab being edited moves to
 * the one on its left so the panel always has a rotation to draw.
 */
export function removeRotationTab(model: RotationTabsModel, index: number): boolean {
  const tabs = readRotationTabs(model);
  if (tabs.length < 2 || !Number.isInteger(index) || index < 0 || index >= tabs.length) return false;
  const active = activeRotationTab(model);
  tabs.splice(index, 1);
  writeRotationTabs(model, tabs, index < active ? active - 1 : Math.min(active, tabs.length - 1));
  return true;
}

/**
 * Copy the live rotation into the active tab's slot. Nothing reads that slot —
 * {@link readRotationTabs} refreshes it anyway — but everything the build is *stored* as
 * goes out as a plain spread of the model, so without this an autosave, a share token or
 * a saved simulation would carry a stale rotation in the tab it was taken on.
 */
export function syncRotationTabs(model: RotationTabsModel): void {
  if (!model?.rotationTabs?.length) return;
  writeRotationTabs(model, readRotationTabs(model), activeRotationTab(model));
}

/** Replace every tab's entries, keeping the strip and the active tab in place. Used by the
 *  class switch, which has to prune the rotations the new class cannot cast — the parked
 *  ones as much as the live one, or switching to a parked tab resurrects a dead skill. */
export function mapRotationTabs(model: RotationTabsModel, map: (tab: RotationTab) => RotationTab): void {
  writeRotationTabs(model, readRotationTabs(model).map(map), activeRotationTab(model));
}

/**
 * Sanitise the strip a share token, an autosave or a saved simulation carried. This is the
 * one gate a hand-edited token passes through, so junk entries, a count past the cap and
 * an index pointing nowhere are dropped rather than stored.
 */
export function normalizeRotationTabs(rawTabs: unknown, rawIndex: unknown): { tabs: RotationTab[]; tab: number } {
  const entries = Array.isArray(rawTabs) ? rawTabs : [];
  const tabs = entries.slice(0, MAX_ROTATION_TABS).map((entry) => ({
    // No fallback skill, unlike the live rotation: an empty tab is a real state here, the
    // one a freshly added rotation starts in.
    rotation: normalizeRotation(entry?.['rotation']),
    stacks: normalizeStacks(entry?.['stacks']),
  }));

  // A strip of one carries nothing the plain `rotation` does not already say.
  if (tabs.length < 2) return { tabs: [], tab: 0 };
  return { tabs, tab: clamp(Number(rawIndex) || 0, tabs.length - 1) };
}

/** `null` rather than a number is the shape `rotationStacks` already takes after a JSON
 *  round trip, where the panel's "no accumulation" NaN comes back as null. */
function normalizeStacks(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ROTATION_LENGTH).map((value) => (typeof value === 'number' && Number.isFinite(value) ? value : null));
}
