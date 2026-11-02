import { describe, expect, it } from 'vitest';
import {
  MAX_ROTATION_TABS,
  RotationTabsModel,
  activeRotationTab,
  addRotationTab,
  mapRotationTabs,
  normalizeRotationTabs,
  readRotationTabs,
  removeRotationTab,
  selectRotationTab,
  syncRotationTabs,
  writeRotationTabs,
} from './rotation-tabs';

/**
 * The strip's contract, stated once: the active tab is the plain `rotation`, the stored
 * `rotationTabs` is empty while there is only one, and nothing outside the strip moves.
 */
const build = (over: Partial<RotationTabsModel> = {}): RotationTabsModel => ({
  rotation: ['Solar Kick==7'],
  rotationStacks: [],
  rotationTabs: [],
  rotationTab: 0,
  ...over,
});

describe('a build with no strip', () => {
  it('reads as the single rotation it holds', () => {
    expect(readRotationTabs(build())).toEqual([{ rotation: ['Solar Kick==7'], stacks: [] }]);
    expect(activeRotationTab(build())).toBe(0);
  });

  // The migration: every build saved before the strip existed arrives exactly like this.
  it('reads as one empty tab when it has no rotation either', () => {
    expect(readRotationTabs({})).toEqual([{ rotation: [], stacks: [] }]);
  });
});

describe('adding a rotation', () => {
  it('appends an empty one and switches to it, parking the one being edited', () => {
    const model = build({ rotation: ['Solar Kick==7', '__basic'], rotationStacks: [2, null] });

    expect(addRotationTab(model)).toBe(true);

    expect(model.rotation).toEqual([]);
    expect(model.rotationTab).toBe(1);
    expect(readRotationTabs(model)).toEqual([
      { rotation: ['Solar Kick==7', '__basic'], stacks: [2, null] },
      { rotation: [], stacks: [] },
    ]);
  });

  it('refuses past the cap', () => {
    const model = build();
    for (let i = 1; i < MAX_ROTATION_TABS; i++) expect(addRotationTab(model)).toBe(true);

    expect(readRotationTabs(model)).toHaveLength(MAX_ROTATION_TABS);
    expect(addRotationTab(model)).toBe(false);
    expect(readRotationTabs(model)).toHaveLength(MAX_ROTATION_TABS);
  });
});

describe('switching between rotations', () => {
  it('each tab keeps its own rotation across the switch', () => {
    const model = build({ rotation: ['Solar Kick==7'] });
    addRotationTab(model);
    // Fill the new tab the way the panel does: straight onto the live rotation.
    model.rotation = ['Lunar Eclipse==7', 'Sunset Blast==5'];
    model.rotationStacks = [1, 3];

    expect(selectRotationTab(model, 0)).toBe(true);
    expect(model.rotation).toEqual(['Solar Kick==7']);

    expect(selectRotationTab(model, 1)).toBe(true);
    expect(model.rotation).toEqual(['Lunar Eclipse==7', 'Sunset Blast==5']);
    expect(model.rotationStacks).toEqual([1, 3]);
  });

  it('is a no-op on the tab already open, and on one that is not there', () => {
    const model = build();
    addRotationTab(model);

    expect(selectRotationTab(model, 1)).toBe(false);
    expect(selectRotationTab(model, 2)).toBe(false);
    expect(selectRotationTab(model, -1)).toBe(false);
  });

  // The slot `rotationTabs` holds for the active tab is deliberately stale: everything
  // that writes `rotation` would otherwise have to remember to update it too.
  it('reads the active tab from the live rotation, not from its stored copy', () => {
    const model = build();
    addRotationTab(model);
    model.rotation = ['Flash Combo==5'];

    expect(readRotationTabs(model)[1].rotation).toEqual(['Flash Combo==5']);
  });
});

describe('removing a rotation', () => {
  it('collapses the strip away once a single rotation is left', () => {
    const model = build();
    addRotationTab(model);
    model.rotation = ['Lunar Eclipse==7'];

    expect(removeRotationTab(model, 1)).toBe(true);

    expect(model.rotation).toEqual(['Solar Kick==7']);
    expect(model.rotationTabs).toEqual([]);
    expect(model.rotationTab).toBe(0);
  });

  it('moves to the tab on the left when the one being edited is closed', () => {
    const model = build();
    addRotationTab(model);
    model.rotation = ['Lunar Eclipse==7'];
    addRotationTab(model);
    model.rotation = ['Sunset Blast==5'];

    expect(removeRotationTab(model, 2)).toBe(true);

    expect(model.rotationTab).toBe(1);
    expect(model.rotation).toEqual(['Lunar Eclipse==7']);
  });

  it('keeps the rotation being edited when a tab before it goes', () => {
    const model = build();
    addRotationTab(model);
    model.rotation = ['Lunar Eclipse==7'];

    expect(removeRotationTab(model, 0)).toBe(true);

    expect(model.rotation).toEqual(['Lunar Eclipse==7']);
  });

  it('never leaves the strip empty', () => {
    const model = build();

    expect(removeRotationTab(model, 0)).toBe(false);
    expect(model.rotation).toEqual(['Solar Kick==7']);
  });
});

describe('mapRotationTabs', () => {
  it('rewrites every tab, the parked ones included, and stays on the open one', () => {
    const model = build();
    addRotationTab(model);
    model.rotation = ['Lunar Eclipse==7', '__basic'];

    mapRotationTabs(model, (tab) => ({ rotation: tab.rotation.filter((value) => value === '__basic'), stacks: [] }));

    expect(model.rotationTab).toBe(1);
    expect(readRotationTabs(model)).toEqual([
      { rotation: [], stacks: [] },
      { rotation: ['__basic'], stacks: [] },
    ]);
  });
});

describe('what a stored strip is allowed to be', () => {
  it('drops a strip of one: the plain rotation already says it', () => {
    expect(normalizeRotationTabs([{ rotation: ['Solar Kick==7'], stacks: [] }], 0)).toEqual({ tabs: [], tab: 0 });
  });

  it('drops junk entries and keeps the rest', () => {
    const { tabs } = normalizeRotationTabs([
      { rotation: ['Solar Kick==7', 42, '', null], stacks: [2] },
      { rotation: 'not an array', stacks: 'neither' },
    ], 1);

    expect(tabs).toEqual([
      { rotation: ['Solar Kick==7'], stacks: [2] },
      { rotation: [], stacks: [] },
    ]);
  });

  // NaN is the panel's "no accumulation", and a JSON round trip turns it into null.
  it('normalises a stack that is not a finite number to null', () => {
    expect(normalizeRotationTabs([{ stacks: [1, null, 'x', NaN] }, {}], 0).tabs[0].stacks)
      .toEqual([1, null, null, null]);
  });

  it('caps the count and clamps an index pointing nowhere', () => {
    const many = Array.from({ length: MAX_ROTATION_TABS + 5 }, () => ({ rotation: ['__basic'], stacks: [] }));

    expect(normalizeRotationTabs(many, 999)).toEqual({
      tabs: many.slice(0, MAX_ROTATION_TABS),
      tab: MAX_ROTATION_TABS - 1,
    });
    expect(normalizeRotationTabs(many, 'nonsense').tab).toBe(0);
    expect(normalizeRotationTabs(many, -3).tab).toBe(0);
  });

  it('reads a strip that is not an array at all as no strip', () => {
    expect(normalizeRotationTabs('nope', 2)).toEqual({ tabs: [], tab: 0 });
  });
});

describe('writeRotationTabs', () => {
  it('clamps an index past the end rather than losing the rotation', () => {
    const model = build();
    writeRotationTabs(model, [{ rotation: ['a'], stacks: [] }, { rotation: ['b'], stacks: [] }], 9);

    expect(model.rotation).toEqual(['b']);
    expect(model.rotationTab).toBe(1);
  });

  it('copies rather than aliases, so editing the live rotation cannot reach a parked tab', () => {
    const model = build();
    const tabs = [{ rotation: ['a'], stacks: [] }, { rotation: ['b'], stacks: [] }];
    writeRotationTabs(model, tabs, 0);

    model.rotation.push('c');

    expect(readRotationTabs(model)[1].rotation).toEqual(['b']);
    expect(tabs[0].rotation).toEqual(['a']);
  });
});

describe('syncRotationTabs', () => {
  it('writes the live rotation into the tab it is being edited in', () => {
    const model = build();
    addRotationTab(model);
    model.rotation = ['Flash Combo==5'];

    syncRotationTabs(model);

    expect(model.rotationTabs[1].rotation).toEqual(['Flash Combo==5']);
  });

  it('leaves a build with a single rotation alone', () => {
    const model = build();
    syncRotationTabs(model);

    expect(model.rotationTabs).toEqual([]);
  });
});
