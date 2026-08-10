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

describe('itemDescPopoverHtml com descrição longa', () => {
  const longa = Array.from({ length: 56 }, (_, i) => `linha ${i}`).join('\n');

  it('não diagrama em colunas — o popover rola na vertical', () => {
    // As longas já fluíram para uma segunda coluna, o que partia a leitura no meio.
    // Hoje quem cuida da altura é o `overflow-y: auto` do popover, e o
    // ItemDescTooltipHoverDirective o mantém aberto para a rolagem ser alcançável.
    const html = itemDescPopoverHtml({ name: 'X' }, longa);
    expect(html).not.toContain('item_desc_long');
    expect(html).not.toContain('column');
  });

  it('entrega nome e descrição inteiros, do início ao fim', () => {
    // Regressão do Chapéu de Kiwawa (401147), o caso das 56 linhas.
    const html = itemDescPopoverHtml({ name: 'Chapéu de Kiwawa' }, longa);
    expect(html).toContain('Chapéu de Kiwawa');
    expect(html).toContain('linha 0');
    expect(html).toContain('linha 55');
  });
});
