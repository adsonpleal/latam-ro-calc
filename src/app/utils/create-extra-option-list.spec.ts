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

  it('rolls SP in steps of 10 up to 1000, keeping every old 20-step value', () => {
    // Botas Desconhecidas roll SP +10~300, Capas Desconhecidas SP +50~1.000.
    const sp = amounts(leaves('SP'), 'sp');
    expect(Math.min(...sp)).toBe(10);
    expect(Math.max(...sp)).toBe(1000);
    expect(new Set(sp).size).toBe(100);
    for (let v = 20; v <= 400; v += 20) expect(sp).toContain(v);
  });
});

/**
 * The ranged-damage roll, reported as absent from the Bônus Aleatórios of both ordinary and
 * shadow gear. It was never absent: it sat under "Longo Alcance", a literal port of the
 * English "Long Range" that matches neither the client nor the rest of the app, so nobody
 * looking for it found it. The client calls the roll "Dano físico a distância +N%"
 * (AddRandomOptionNameTable_ptBR, RANGE_ATTACK_DAMAGE_TARGET).
 */
describe('createExtraOptionList — ranged damage roll', () => {
  /** Every leaf in the whole tree, with the labels of the groups it sits under. */
  const allLeaves = (() => {
    const out: { label: string; value: string; path: string[] }[] = [];
    const walk = (nodes: any[], path: string[]) => {
      for (const node of nodes) {
        if (node.children?.length) walk(node.children, [...path, node.label]);
        else if (node.value) out.push({ label: node.label, value: node.value, path });
      }
    };
    walk(list as any[], []);

    return out;
  })();
  const span = (prop: string) => allLeaves.filter((leaf) => leaf.value.startsWith(`${prop}:`))
    .map((leaf) => Number(leaf.value.split(':')[1])).sort((a, b) => a - b);

  it('is named the way the client names it', () => {
    // The group already says "Físico", and the melee roll beside it already drops that
    // prefix ("Corpo a corpo"), so the roll itself reads "À distância" — the same name
    // bonus-key-label and the Resumo de Batalha give the key.
    const ranged = allLeaves.filter((leaf) => leaf.value.startsWith('range:'));
    expect(new Set(ranged.map((leaf) => leaf.path[0]))).toEqual(new Set(['Físico']));
    expect(ranged.map((leaf) => leaf.label)).toContain('À distância +12 %');
    expect(allLeaves.filter((leaf) => leaf.label.includes('Longo Alcance'))).toEqual([]);
  });

  it('offers +1% to +30%, the same span as the melee roll beside it', () => {
    const expected = Array.from({ length: 30 }, (_, k) => k + 1);
    expect(span('range')).toEqual(expected);
    expect(span('melee')).toEqual(expected);
  });
});
