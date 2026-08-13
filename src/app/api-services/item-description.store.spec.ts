import { describe, expect, it } from 'vitest';
import { ItemDescriptionStore } from './item-description.store';
import { itemDescPopoverHtml } from 'src/app/utils';

describe('ItemDescriptionStore', () => {
  it('returns undefined before loading', () => {
    const store = new ItemDescriptionStore();
    expect(store.get(1101)).toBeUndefined();
    expect(store.version).toBe(0);
  });

  it('accepts a numeric or string id — the map arrives with JSON keys', () => {
    const store = new ItemDescriptionStore();
    store.set({ '1101': 'Uma espada.' });
    expect(store.get(1101)).toBe('Uma espada.');
    expect(store.get('1101')).toBe('Uma espada.');
  });

  it('bumps the version on every load, so memoized caches discard', () => {
    const store = new ItemDescriptionStore();
    const inicial = store.version;
    store.set({ '1': 'a' });
    expect(store.version).toBe(inicial + 1);
    store.set({ '1': 'b' });
    expect(store.version).toBe(inicial + 2);
  });

  it('treats null/undefined as an empty map', () => {
    const store = new ItemDescriptionStore();
    store.set(null);
    expect(store.get(1)).toBeUndefined();
  });
});

describe('itemDescPopoverHtml without a description', () => {
  // This is the real state between items-core and items-desc: the popover shows just the
  // name, rather than vanishing or breaking.
  it('renders just the name while the description has not arrived', () => {
    const html = itemDescPopoverHtml({ name: 'Espada' }, undefined);
    expect(html).toContain('Espada');
    expect(html).toContain('item_desc_title');
  });

  it('appends the description once it arrives', () => {
    const html = itemDescPopoverHtml({ name: 'Espada' }, 'Uma espada comum.');
    expect(html).toContain('Espada');
    expect(html).toContain('Uma espada comum.');
  });

  it('returns an empty string when there is no item', () => {
    expect(itemDescPopoverHtml(undefined, undefined)).toBe('');
  });
});

describe('itemDescPopoverHtml with a long description', () => {
  const longa = Array.from({ length: 56 }, (_, i) => `linha ${i}`).join('\n');

  it('does not lay out in columns — the popover scrolls vertically', () => {
    // Long ones used to flow into a second column, which broke reading down the middle.
    // Height is now handled by the popover's `overflow-y: auto`, and
    // ItemDescTooltipHoverDirective keeps it open so the scrollbar is reachable.
    const html = itemDescPopoverHtml({ name: 'X' }, longa);
    expect(html).not.toContain('item_desc_long');
    expect(html).not.toContain('column');
  });

  it('delivers the whole name and description, start to finish', () => {
    // Regression for Chapéu de Kiwawa (401147), the 56-line case.
    const html = itemDescPopoverHtml({ name: 'Chapéu de Kiwawa' }, longa);
    expect(html).toContain('Chapéu de Kiwawa');
    expect(html).toContain('linha 0');
    expect(html).toContain('linha 55');
  });
});
