import '@angular/compiler';
import { ElementRef, ViewContainerRef } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { UiSelectComponent } from './select.component';
import { UiOverlayService } from './overlay.service';
import { UiTableComponent } from './table.component';
import { UiListboxComponent } from './listbox.component';
import { UiSelectButtonComponent } from './primitives';

const event = new Event('click');
function select(multiple = false) {
  return new UiSelectComponent(new ElementRef({ tagName: multiple ? 'APP-UI-MULTI-SELECT' : 'APP-UI-DROPDOWN' }), {} as UiOverlayService, {} as ViewContainerRef);
}

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
      : kind === 'listbox' ? new UiListboxComponent() : new UiSelectButtonComponent();
    if ('multiple' in control) control.multiple = multiple;
    const pick = (option: any) => control instanceof UiSelectComponent
      ? control.choose(option, event) : control.pick(option, event);
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
    const table = new UiTableComponent();
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
    const table = new UiTableComponent();
    table.paginator = true; table.rows = 2; table.value = [{ id: 1 }, { id: 2 }, { id: 3 }];
    table.go(1); expect(table.displayed).toEqual([{ id: 3 }]);
    table.value = [{ id: 2 }]; expect(table.start).toBe(0); expect(table.displayed).toEqual([{ id: 2 }]);
    table.dataKey = 'id'; table.selection = { id: 2 }; expect(table.selected(table.value[0])).toBe(true);
    table.choose(table.value[0]); expect(table.selection).toBeNull();
  });
});
