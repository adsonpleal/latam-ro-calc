import { describe, expect, it, vi } from 'vitest';
import { chooseSelection, filteredRows, optionLabel, optionValue, toggleAllSelection } from '../../react/ui/selection';
import { sameRow, tablePage } from '../../react/ui/table-values';

// Fixtures drive the pure contracts shared by the React controls. Parent writes do not emit actions.
class SelectionFixture {
  value: any; options: any[] = []; optionLabel = ''; optionValue = ''; group = false; query = ''; disabled = false;
  changed = (_value: any) => {};
  constructor(public multiple: boolean, readonly kind: string) {}
  registerOnChange(fn: (value: any) => void) { this.changed = fn; }
  writeValue(value: any) { this.value = value; }
  ngOnChanges() {}
  setDisabledState(value: boolean) { this.disabled = value; }
  get rows() { return filteredRows(this.options, this.query, this.group); }
  get selectedOption() { return this.options.find(option => optionValue(option, this.optionValue, this.optionLabel) === this.value); }
  get label() { return optionLabel(this.selectedOption, this.optionLabel); }
  onFilter(value: string) { this.query = value; }
  choose(option: any, _event: Event) {
    if (this.disabled || option?.disabled) return;
    this.value = chooseSelection(this.value, option, this.multiple, this.kind !== 'dropdown', this.disabled, this.optionValue, this.optionLabel);
    this.changed(this.value);
  }
  toggleAll(_event: Event) { this.value = toggleAllSelection(this.value, this.rows, this.optionValue, this.optionLabel); this.changed(this.value); }
  clear(_event: Event) { this.value = this.multiple ? [] : null; this.changed(this.value); }
}
class TableFixture {
  paginator = false; rows = 10; value: any[] = []; first = 0; dataKey: string; selection: any;
  get state() { return tablePage(this.value, this.rows, this.first, this.paginator); }
  get pageCount() { return this.state.pageCount; }
  get pages() { return this.state.pages; }
  get start() { return this.state.start; }
  get displayed() { return this.state.displayed; }
  go(page: number) { this.first = Math.max(0, Math.min(this.pageCount - 1, page)) * Math.max(1, this.rows); }
  selected(row: any) { return sameRow(this.selection, row, this.dataKey); }
  choose(row: any) { this.selection = this.selected(row) ? null : row; }
}
const event = new Event('click');
function select(multiple = false, kind = 'dropdown') { return new SelectionFixture(multiple, kind); }

describe('selection forms contract', () => {
  it('preserves false and zero values and never emits a writeValue back to forms', () => {
    const control = select(); const changed = vi.fn();
    control.registerOnChange(changed);
    control.options = [{ label: 'Não', value: false }, { label: 'Zero', value: 0 }];
    control.ngOnChanges();
    control.writeValue(false);
    expect(control.label).toBe('Não');
    expect(changed).not.toHaveBeenCalled();
    control.choose(control.options[1], event);
    expect(control.value).toBe(0);
    expect(changed).toHaveBeenCalledWith(0);
  });

  it('retains object identity with an explicit label and key identity with optionValue', () => {
    const control = select();
    const option = { name: 'Item', id: 17, value: 'internal metadata' };
    control.optionLabel = 'name'; control.options = [option]; control.ngOnChanges();
    control.choose(option, event);
    expect(control.value).toBe(option);
    control.optionValue = 'id'; control.choose(option, event);
    expect(control.value).toBe(17);
    expect(control.selectedOption).toBe(option);
  });

  it('filters grouped choices without losing selections and skips disabled choices on toggle all', () => {
    const control = select(true);
    control.group = true;
    control.options = [{ label: 'Grupo', items: [{ label: 'A', value: 1 }, { label: 'AB', value: 2, disabled: true }, { label: 'B', value: 3 }] }];
    control.ngOnChanges(); control.writeValue([3]); control.onFilter('a'); control.toggleAll(event);
    expect(control.value).toEqual([3, 1]);
    expect(control.rows.map(row => row.option.label)).toEqual(['Grupo', 'A', 'AB']);
    control.toggleAll(event); expect(control.value).toEqual([3]);
    control.clear(event); expect(control.value).toEqual([]);
  });

  it('does not change disabled controls or options', () => {
    const control = select(); control.writeValue(4);
    control.choose({ label: 'Blocked', value: 5, disabled: true }, event);
    expect(control.value).toBe(4);
    control.setDisabledState(true); control.choose({ label: 'Other', value: 6 }, event);
    expect(control.value).toBe(4);
  });
});

describe.each(['dropdown', 'listbox', 'buttons'] as const)('%s selection contract', kind => {
  function setup(multiple: boolean) {
    const control = kind === 'dropdown' ? select(multiple)
      : kind === 'listbox' ? select(false, 'listbox') : select(false, 'buttons');
    if ('multiple' in control) control.multiple = multiple;
    const pick = (option: any) => control.choose(option, event);
    return { control, pick };
  }

  it('toggles multiple values without mutating the form value or losing object identity', () => {
    const { control, pick } = setup(true);
    const selected = { name: 'Item' };
    const original = [false, selected];
    const changed = vi.fn();
    control.registerOnChange(changed);
    control.writeValue(original);
    pick({ label: 'Zero', value: 0 });
    expect(control.value).toEqual([false, selected, 0]);
    expect(control.value[1]).toBe(selected);
    pick({ label: 'Não', value: false });
    expect(control.value).toEqual([selected, 0]);
    expect(original).toEqual([false, selected]);
    expect(changed).toHaveBeenCalledTimes(2);
    control.setDisabledState(true);
    pick({ label: 'Zero', value: 0 });
    expect(control.value).toEqual([selected, 0]);
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('preserves each control\'s single-selection behavior when choosing the current option again', () => {
    const { control, pick } = setup(false);
    const option = { label: 'Zero', value: 0 };
    pick(option);
    expect(control.value).toBe(0);
    pick(option);
    expect(control.value).toBe(kind === 'dropdown' ? 0 : null);
  });
});

describe('table pagination and selection', () => {
  it('keeps an empty result on the first offset without advertising a nonexistent page', () => {
    const table = new TableFixture();
    table.paginator = true; table.rows = 2; table.value = [1, 2, 3];
    table.go(1);
    table.value = [];
    expect(table.pageCount).toBe(0);
    expect(table.pages).toEqual([]);
    expect(table.start).toBe(0);
    expect(table.displayed).toEqual([]);
    table.go(-1);
    expect(table.first).toBe(0);
    table.value = [1];
    expect(table.pages).toEqual([0]);
    expect(table.displayed).toEqual([1]);
  });

  it('clamps the current page when filtering and recognizes refreshed objects by their key', () => {
    const table = new TableFixture();
    table.paginator = true; table.rows = 2; table.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
    table.go(1); expect(table.displayed).toEqual([{ id: 3 }]);
    table.value = [{ id: 2 }]; expect(table.start).toBe(0); expect(table.displayed).toEqual([{ id: 2 }]);
    table.dataKey = 'id'; table.selection = { id: 2 }; expect(table.selected(table.value[0])).toBe(true);
    table.choose(table.value[0]); expect(table.selection).toBeNull();
  });
});
