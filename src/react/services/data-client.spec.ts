import { DataClient, DescriptionStore } from './data-client';
import { DataManifest } from '../../app/core/data-manifest';
import { skillDescHtml } from '../../app/utils/pretty-item-desc';
import { SKILL_DESC_BY_ID } from '../../app/skills';

describe('React data loading', () => {
  it('adopts preload promises without issuing duplicate requests', async () => {
    const items = Promise.resolve({ 1: { name: 'Item' } });
    const fetcher = vi.fn();
    const client = new DataClient({ inFlight: { itemsCore: items } }, undefined, fetcher);
    expect(client.load('itemsCore')).toBe(items);
    expect(client.load('itemsCore')).toBe(items);
    await expect(client.load('itemsCore')).resolves.toEqual({ 1: { name: 'Item' } });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not start descriptions until core resolves and preserves custom descriptions', async () => {
    let finish!: (value: unknown) => void;
    const items = new Promise(resolve => { finish = resolve; });
    const manifest = { base: 'assets/data/', files: { itemsDesc: 'descriptions.json' } } as unknown as DataManifest;
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ '1': 'Official' })));
    const descriptions = new DescriptionStore();
    descriptions.upsert(1_000_000_000_001, 'Custom');
    const client = new DataClient({ manifest, inFlight: { itemsCore: items } }, descriptions, fetcher);
    const loading = client.loadDescriptions();
    expect(fetcher).not.toHaveBeenCalled();
    finish({});
    await loading;
    expect(client.loadDescriptions()).toBe(loading);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('assets/data/descriptions.json');
    expect(descriptions.get(1)).toBe('Official');
    expect(descriptions.get(1_000_000_000_001)).toBe('Custom');
    expect(descriptions.getSnapshot()).toBe(2);
  });
  it('rejects an HTTP error instead of presenting it as a dataset', async () => {
    const client = new DataClient({}, undefined, async () => new Response('failure', { status: 503 }));
    await expect(client.load('itemsCore')).rejects.toThrow('HTTP 503');
  });
  it('refreshes descriptions once and does not keep a skill tooltip cached as empty', async () => {
    const id = 999_999;
    expect(skillDescHtml(id)).toBe('');
    const manifest = { base: 'assets/data/', files: { skillDescriptions: 'skills.json' } } as unknown as DataManifest;
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ [id]: 'Descrição da habilidade' })));
    const descriptions = new DescriptionStore();
    const changed = vi.fn();
    descriptions.subscribe(changed);
    const client = new DataClient({ manifest }, descriptions, fetcher);
    const loading = client.loadSkillDescriptions();
    expect(client.loadSkillDescriptions()).toBe(loading);
    await loading;
    expect(skillDescHtml(id)).toBe('Descrição da habilidade');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    delete SKILL_DESC_BY_ID[id];
  });
  it('allows a failed manifest request to be retried', async () => {
    const manifest = { base: 'assets/data/', files: { itemsCore: 'items.json' } } as unknown as DataManifest;
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response('failure', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(manifest)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ item: 'loaded' })));
    const client = new DataClient({}, undefined, fetcher);
    await expect(client.load('itemsCore')).rejects.toThrow('HTTP 503');
    await expect(client.load('itemsCore')).resolves.toEqual({ item: 'loaded' });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
