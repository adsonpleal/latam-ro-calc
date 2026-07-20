import { describe, expect, it } from 'vitest';
import { createExtraOptionList } from './create-extra-option-list';

/**
 * Random-option ("Bônus Aleatório") picker. Luís: the HP roll stopped at 1000 while the
 * server rolls up to 5000, so a real drop could not be entered. Replay imports already
 * accepted the higher values, which is how the gap showed.
 */

const list = createExtraOptionList();

/**
 * Every selectable leaf of an option group. Short ranges are a flat list of leaves; once a
 * range passes 20 steps the generator buckets it into submenus of 10, so this walks down.
 */
function leaves(groupLabel: string): { label: string; value: string }[] {
  const group = list.find((g: any) => g.label === groupLabel);
  expect(group, `no option group labelled ${groupLabel}`).toBeDefined();
  const walk = (nodes: any[]): any[] =>
    nodes.flatMap((n) => (n.children?.length ? walk(n.children) : n.value ? [n] : []));

  return walk(group.children ?? []);
}

/** Numeric side of a leaf value, which is always "<prop>:<number>". */
const amounts = (nodes: { value: string }[], prop: string) =>
  nodes.filter((n) => n.value.startsWith(`${prop}:`)).map((n) => Number(n.value.split(':')[1]));

describe('createExtraOptionList — HP roll', () => {
  const hp = amounts(leaves('HP'), 'hp');

  it('reaches 5000', () => {
    expect(Math.max(...hp)).toBe(5000);
  });

  it('still starts at 50 and steps by 50', () => {
    expect(Math.min(...hp)).toBe(50);
    expect(hp).toContain(1000); // the old ceiling stays selectable
    expect(hp).toContain(2500);
    expect(new Set(hp.map((v) => v % 50))).toEqual(new Set([0]));
  });

  it('offers every step in the range exactly once', () => {
    expect(hp.length).toBe(100);
    expect(new Set(hp).size).toBe(hp.length);
  });

  it('leaves SP alone', () => {
    // Only the HP roll was reported; SP keeps its 20..400 range.
    const sp = amounts(leaves('SP'), 'sp');
    expect(Math.min(...sp)).toBe(20);
    expect(Math.max(...sp)).toBe(400);
  });
});
