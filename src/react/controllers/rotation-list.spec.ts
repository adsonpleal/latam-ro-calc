import { describe, expect, it } from 'vitest';
import { RotationListComponent } from './rotation-list';
import { MAX_ROTATION_LENGTH } from '../../app/core/rotation';
import { RotationEntryView } from '../../app/layout/pages/ro-calculator/battle-hud/rotation-view';
import { DEFAULT_CATALOG } from '../../app/i18n';
import { translate } from '../../app/core/i18n';

const text = (key: string, params?: Record<string, string | number>) => translate(DEFAULT_CATALOG, key, params);

/**
 * A list holding `rotation`, with the accumulation of each row beside it — the two halves
 * of an entry, which the panel keeps in step by position (`MainModel.rotationStacks`).
 * Only the fields the list's own arithmetic reads are filled; the rest is the engine's.
 */
function list(rotation: string[], stacks: number[]) {
  const vm = new RotationListComponent(text);
  vm.rotation = rotation;
  vm.entries = rotation.map((value, index) => ({ value, stackCount: stacks[index] } as RotationEntryView));
  const emitted: { rotation: string[]; stacks: number[] }[] = [];
  vm.rotationChange.subscribe((change) => emitted.push(change));

  return { vm, emitted };
}

describe('duplicating a rotation entry (card UN4v6VjMMk6WkpFDDcuH)', () => {
  it('lands the copy directly after the entry it came from', () => {
    const { vm, emitted } = list(['Chute Solar==7', 'Chute Lunar==5', 'Chute Estelar==3'], [0, 0, 0]);

    vm.duplicate(1);

    expect(emitted[0].rotation).toEqual(['Chute Solar==7', 'Chute Lunar==5', 'Chute Lunar==5', 'Chute Estelar==3']);
  });

  // The level travels inside the entry's value, so a copy that kept the position but took
  // the catalog's default level would be a different skill use at the same place.
  it('carries the entry whole: its level and its accumulation', () => {
    const { vm, emitted } = list(['Explosão de Fogo==10', 'Chuva de Meteoros==4'], [3, 9]);

    vm.duplicate(0);

    expect(emitted[0].rotation).toEqual(['Explosão de Fogo==10', 'Explosão de Fogo==10', 'Chuva de Meteoros==4']);
    expect(emitted[0].stacks).toEqual([3, 3, 9]);
  });

  it('copies the entry that was clicked, not the first use of the same skill', () => {
    const { vm, emitted } = list(['Chute Solar==7', 'Chute Solar==7'], [2, 8]);

    vm.duplicate(1);

    expect(emitted[0].stacks).toEqual([2, 8, 8]);
  });

  it('leaves a rotation at the limit alone, as the add button does', () => {
    const rotation = Array.from({ length: MAX_ROTATION_LENGTH }, (_, index) => `Chute Solar==${index + 1}`);
    const { vm, emitted } = list(rotation, rotation.map(() => 0));

    vm.duplicate(0);

    expect(emitted).toEqual([]);
  });

  it('still copies the entry that fills the last free slot', () => {
    const rotation = Array.from({ length: MAX_ROTATION_LENGTH - 1 }, (_, index) => `Chute Solar==${index + 1}`);
    const { vm, emitted } = list(rotation, rotation.map(() => 0));

    vm.duplicate(0);

    expect(emitted[0].rotation).toHaveLength(MAX_ROTATION_LENGTH);
  });

  it('ignores a row that is not there', () => {
    const { vm, emitted } = list(['Chute Solar==7'], [0]);

    vm.duplicate(3);

    expect(emitted).toEqual([]);
  });
});

/**
 * Whether the row prints its share of the cycle.
 *
 * A figure that can only read 100,0% says nothing, which is why a lone tile goes without —
 * but a tile with an auto-conjuração glued under it no longer reads 100,0%: the proc takes
 * a slice of its own, and the pair only makes sense with both figures on screen.
 */
describe('the share column', () => {
  const listing = (entries: any[]) => Object.assign(new RotationListComponent(text), { entries });

  it('stays hidden on a lone tile, which is all of the damage by definition', () => {
    expect(listing([{ autoCasts: [] }]).showsContribution).toBe(false);
  });

  it('shows once there is a second tile to share with', () => {
    expect(listing([{ autoCasts: [] }, { autoCasts: [] }]).showsContribution).toBe(true);
  });

  it('shows on a lone tile that fires an auto-conjuração', () => {
    expect(listing([{ autoCasts: [{ key: 'item-491119-5429' }] }]).showsContribution).toBe(true);
  });
});
