import { optionLabel, optionValue, toggleSelection, virtualRange } from './selection';

describe('React selection contracts', () => {
  it('keeps falsy primitives and distinguishes object identity from explicit values', () => {
    expect(optionValue(0)).toBe(0);
    expect(optionValue(false)).toBe(false);
    const object = { label: 'Zero', value: 0, id: 3 };
    expect(optionValue(object)).toBe(0);
    expect(optionValue(object, undefined, 'label')).toBe(object);
    expect(optionValue(object, 'id', 'label')).toBe(3);
    expect(optionLabel(false)).toBe('false');
    expect(optionLabel({ value: 0 })).toBe('0');
  });
  it('toggles an object by identity without modifying the current selection', () => {
    const object = { id: 1 };
    const other = { id: 1 };
    const previous = [object];
    expect(toggleSelection(previous, object)).toEqual([]);
    expect(toggleSelection(previous, other)).toEqual([object, other]);
    expect(previous).toEqual([object]);
  });
  it('retains overscan and bounds virtual windows after filtering', () => {
    expect(virtualRange(100, 28, 280, 280)).toEqual({ start: 6, end: 24 });
    expect(virtualRange(2, 28, 280, 280)).toEqual({ start: 2, end: 2 });
    expect(virtualRange(100, 28, 280, -1)).toEqual({ start: 0, end: 14 });
  });
});
