import { describe, expect, it } from 'vitest';
import { ItemDescriptionStore } from './item-description.store';
import { itemDescPopoverHtml } from 'src/app/utils';

describe('ItemDescriptionStore', () => {
  it('devolve undefined antes da carga', () => {
    const store = new ItemDescriptionStore();
    expect(store.get(1101)).toBeUndefined();
    expect(store.version).toBe(0);
  });

  it('aceita id numérico ou string — o mapa vem com chaves de JSON', () => {
    const store = new ItemDescriptionStore();
    store.set({ '1101': 'Uma espada.' });
    expect(store.get(1101)).toBe('Uma espada.');
    expect(store.get('1101')).toBe('Uma espada.');
  });

  it('incrementa a versão a cada carga, para os caches memoizados descartarem', () => {
    const store = new ItemDescriptionStore();
    const inicial = store.version;
    store.set({ '1': 'a' });
    expect(store.version).toBe(inicial + 1);
    store.set({ '1': 'b' });
    expect(store.version).toBe(inicial + 2);
  });

  it('trata null/undefined como mapa vazio', () => {
    const store = new ItemDescriptionStore();
    store.set(null);
    expect(store.get(1)).toBeUndefined();
  });
});

describe('itemDescPopoverHtml sem descrição', () => {
  // É o estado real entre items-core e items-desc: o popover mostra só o nome,
  // em vez de sumir ou quebrar.
  it('renderiza só o nome quando a descrição ainda não chegou', () => {
    const html = itemDescPopoverHtml({ name: 'Espada' }, undefined);
    expect(html).toContain('Espada');
    expect(html).toContain('item_desc_title');
  });

  it('acrescenta a descrição quando ela chega', () => {
    const html = itemDescPopoverHtml({ name: 'Espada' }, 'Uma espada comum.');
    expect(html).toContain('Espada');
    expect(html).toContain('Uma espada comum.');
  });

  it('devolve string vazia quando não há item', () => {
    expect(itemDescPopoverHtml(undefined, undefined)).toBe('');
  });
});
