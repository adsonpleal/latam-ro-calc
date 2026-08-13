import { describe, expect, it } from 'vitest';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { ItemDescTooltipPipe } from './item-desc-tooltip.pipe';

const items = { 1101: { name: 'Espada' } } as any;

describe('ItemDescTooltipPipe', () => {
  it('shows just the name while the descriptions have not arrived', () => {
    const store = new ItemDescriptionStore();
    const pipe = new ItemDescTooltipPipe(store);

    const html = pipe.transform(1101, items, store.version);
    expect(html).toContain('Espada');
    expect(html).not.toContain('Uma espada');
  });

  it('starts including the description once it arrives', () => {
    // Regression: the pipe is pure and memoizes by id. Without discarding the cache on a
    // version change, the tooltip stayed stuck on the value computed before items-desc —
    // exactly the symptom seen on the costume and shadow slots.
    const store = new ItemDescriptionStore();
    const pipe = new ItemDescTooltipPipe(store);

    expect(pipe.transform(1101, items, store.version)).not.toContain('Uma espada');

    store.set({ '1101': 'Uma espada comum.' });

    expect(pipe.transform(1101, items, store.version)).toContain('Uma espada comum.');
  });

  it('devolve vazio sem id ou sem mapa de itens', () => {
    const store = new ItemDescriptionStore();
    const pipe = new ItemDescTooltipPipe(store);

    expect(pipe.transform(undefined, items, store.version)).toBe('');
    expect(pipe.transform(1101, undefined, store.version)).toBe('');
  });
});
