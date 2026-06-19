import { describe, expect, it } from 'vitest';
import { getGradeList, toGradeList } from './to-grade-list';

describe('toGradeList', () => {
  it('builds labelled, lower-cased grade options sorted descending', () => {
    expect(toGradeList(['A', 'B', 'C'])).toEqual([
      { label: 'Grau C', value: 'c' },
      { label: 'Grau B', value: 'b' },
      { label: 'Grau A', value: 'a' },
    ]);
  });

  it('returns an empty list for empty input', () => {
    expect(toGradeList([])).toEqual([]);
  });
});

describe('getGradeList', () => {
  it('returns the fixed ungrade..A option set', () => {
    const list = getGradeList();
    expect(list).toHaveLength(5);
    expect(list[0]).toEqual({ label: 'Sem Grau', value: '' });
    expect(list.map((g) => g.value)).toEqual(['', 'D', 'C', 'B', 'A']);
  });
});
