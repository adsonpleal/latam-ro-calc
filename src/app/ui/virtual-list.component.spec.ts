import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { virtualRange } from './virtual-list.component';

describe('fixed-row list window', () => {
  it('keeps large lists bounded and covers the visible rows while scrolling', () => {
    for (const top of [0, 28, 28000, 279700]) {
      const range = virtualRange(10000, 28, 300, top);
      expect(range.end - range.start).toBeLessThanOrEqual(19);
      expect(range.start * 28).toBeLessThanOrEqual(top);
      expect(range.end * 28).toBeGreaterThanOrEqual(Math.min(280000, top + 300));
    }
  });
  it('clamps an empty or filtered list after scrolling', () => {
    expect(virtualRange(0, 28, 300, 28000)).toEqual({ start: 0, end: 0 });
    expect(virtualRange(2, 28, 300, 28000)).toEqual({ start: 2, end: 2 });
  });
});
