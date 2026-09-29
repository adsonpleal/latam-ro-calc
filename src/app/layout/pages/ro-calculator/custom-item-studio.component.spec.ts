import '@angular/compiler';
import { describe, expect, it, vi } from 'vitest';
import { of } from 'rxjs';
import { CustomItemStudioComponent } from './custom-item-studio.component';
import { CustomItemLibraryService } from 'src/app/api-services/custom-item-library.service';
import { ItemPickerService } from './item-picker/item-picker.service';

function studio() {
  const picker = { open: vi.fn().mockReturnValue(of({ committed: true, value: 'atk:10' })), close: vi.fn() };
  const component = new CustomItemStudioComponent({ items: [] } as unknown as CustomItemLibraryService, picker as unknown as ItemPickerService);
  component.openCreate();
  return { component, picker };
}

describe('custom item creator editing', () => {
  it('can return to Visual with an unnamed item and keeps a parsed preview', () => {
    const { component } = studio();
    component.setMode('json');
    component.rawScript = '{"atk":["10"],"cri":["7===5"]}';
    component.setMode('visual');
    expect(component.mode).toBe('visual');
    expect(component.rules).toEqual([{ key: 'atk', expression: '10' }, { key: 'cri', expression: '7===5' }]);
    expect(component.previewText).toContain('ATQ +10');
    expect(component.previewText).not.toContain('7===');
    expect(component.diagnostics).toContain('items[0].name: Informe um nome.');
  });

  it('retains unfinished JSON until it can be represented visually', () => {
    const { component } = studio();
    component.setMode('json');
    component.rawScript = '{"atk": [';
    component.setMode('visual');
    expect(component.mode).toBe('json');
    expect(component.rawScript).toBe('{"atk": [');
    expect(component.diagnostics[0]).toContain('JSON:');
  });

  it('enforces the shared socket budget and preserves unaffected defaults', () => {
    const { component } = studio();
    component.changeCapacity('cardCapacity', 1);
    component.changeCapacity('enchantCapacity', 3);
    expect(component.cardCounts.map((option) => option.value)).toEqual([0, 1]);
    expect(component.enchantCounts.map((option) => option.value)).toEqual([0, 1, 2, 3]);
    component.changeCapacity('cardCapacity', 4);
    expect(component.draft.cardCapacity).toBe(1);
    component.draft.defaultBas = ['atk:10', 'atk:20', 'atk:30', 'atk:40', 'atk:50'];
    component.changeCapacity('baCapacity', 5);
    expect(component.attachmentRows[2].views).toHaveLength(5);
    component.changeCapacity('baCapacity', 3);
    expect(component.draft.defaultBas).toEqual(['atk:10', 'atk:20', 'atk:30']);
    expect(component.capacityNotice).toContain('2 BA(s)');
    component.changeCapacity('enchantCapacity', 0);
    component.changeCapacity('cardCapacity', 4);
    expect(component.enchantCounts.map((option) => option.value)).toEqual([0]);
  });

  it('reuses the equipment tree picker for BAs', () => {
    const { component, picker } = studio();
    component.changeCapacity('baCapacity', 1);
    component.pickAttachment('defaultBas', component.attachmentRows[2].views[0], {} as HTMLElement);
    expect(picker.open).toHaveBeenCalledWith(expect.objectContaining({ mode: 'tree', title: 'BA 1' }));
    expect(component.draft.defaultBas).toEqual(['atk:10']);
    expect(component.attachmentRows[2].views[0].filled).toBe(true);
  });

  it('treats an off-hand request as a weapon while preserving its equip destination', () => {
    const { component } = studio();
    component.openCreate('leftWeapon', { slot: 'leftWeapon', compare: true });
    expect(component.draft.kind).toBe('weapon');
    expect(component.context).toEqual({ slot: 'leftWeapon', compare: true });
    expect(component.kindOptions.some((option) => option.value === 'leftWeapon')).toBe(false);
  });
});
