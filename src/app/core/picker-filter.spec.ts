import { describe, expect, it } from 'vitest';
import { ExtraOptionMap } from '../utils/create-extra-option-list';
import { buildFilterIndex, filterOptions, searchOptionLeaves } from './picker-filter';

describe('filterOptions', () => {
  const options = [
    { label: 'Arco de Apoio Certeiro', value: 1748, cardPrefix: '' },
    { label: 'Balestra Ilusional', value: 1745, cardPrefix: '' },
    { label: 'Carta Andarilho', value: 4005, cardPrefix: 'Dir.' },
  ];
  /** The panel builds this once on open; the term is what changes per keystroke. */
  const on = (keys: string[]) => (term: string) => filterOptions(options, term, buildFilterIndex(options, keys));

  it('returns everything for an empty term', () => {
    expect(on(['label'])('   ')).toHaveLength(3);
  });

  it('matches case-insensitively on any of the named keys', () => {
    expect(on(['label', 'value'])('ARCO').map((o) => o.value)).toEqual([1748]);
    // The old picker let people paste an item id into the filter; keep that working.
    expect(on(['label', 'value'])('1745').map((o) => o.value)).toEqual([1745]);
    expect(on(['label', 'cardPrefix', 'value'])('dir.').map((o) => o.value)).toEqual([4005]);
  });

  it('ignores a key the option does not carry', () => {
    expect(on(['label', 'value'])('dir.')).toEqual([]);
  });

  it('does not let a term straddle two fields', () => {
    // The joiner between keys is a character no label contains, so "certeiro1748" (label
    // end + value start) must not match the way a plain concatenation would let it.
    expect(on(['label', 'value'])('certeiro1748')).toEqual([]);
  });
});

describe('searchOptionLeaves', () => {
  it('finds nothing for an empty term', () => {
    expect(searchOptionLeaves(ExtraOptionMap, '')).toEqual({ matches: [], capped: false });
  });

  it('reaches a leaf that is four levels deep in the tree', () => {
    const { matches } = searchOptionLeaves(ExtraOptionMap, 'Pen. Física Demônio 12');
    expect(matches).toHaveLength(1);
    expect(matches[0].value).toBe('p_pene_race_demon:12');
  });

  it('matches on the value as well as the label', () => {
    const { matches } = searchOptionLeaves(ExtraOptionMap, 'criDmg:25');
    expect(matches.map((m) => m.value)).toContain('criDmg:25');
  });

  it('stops at the limit and says so', () => {
    const { matches, capped } = searchOptionLeaves(ExtraOptionMap, 'a', 25);
    expect(matches).toHaveLength(25);
    expect(capped).toBe(true);
  });

  it('does not flag a term that fits under the limit', () => {
    const { capped } = searchOptionLeaves(ExtraOptionMap, 'Esquiva Perfeita +30', 1000);
    expect(capped).toBe(false);
  });
});
