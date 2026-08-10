import { describe, expect, it } from 'vitest';
import { ItemDescriptionStore } from 'src/app/api-services/item-description.store';
import { ItemDescTooltipPipe } from './item-desc-tooltip.pipe';

const items = { 1101: { name: 'Espada' } } as any;

describe('ItemDescTooltipPipe', () => {
  it('mostra só o nome enquanto as descrições não chegaram', () => {
    const store = new ItemDescriptionStore();
    const pipe = new ItemDescTooltipPipe(store);

    const html = pipe.transform(1101, items, store.version);
    expect(html).toContain('Espada');
    expect(html).not.toContain('Uma espada');
  });

  it('passa a incluir a descrição quando ela chega', () => {
    // Regressão: o pipe é puro e memoiza por id. Sem descartar o cache na troca de
    // versão, o tooltip ficava preso no valor calculado antes do items-desc — era
    // exatamente o sintoma nos slots de visual e de sombra.
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
