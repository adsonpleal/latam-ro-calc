/**
 * How the Worker reaches latam-social for `/s/<token>/og.png`.
 *
 * latam-social is a Worker on this same zone, and a same-zone `fetch()` skips the Workers
 * routed there and lands on the DNS origin — a dead EC2 address — so in production every
 * card timed out into the static cover. The SOCIAL service binding is the fix; these cases
 * pin that it is used whenever it exists, and that the URL keeps the public hostname
 * latam-social checks its Host against.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeBuild } from '../src/app/core/share-codec';
import worker from './index';

const OG_ORIGIN = 'https://social.latam-tools.com.br';
const token = encodeBuild({ class: 4252, level: 285, jobLevel: 70 });
const cardRequest = () => new Request(`https://simulador.latam-tools.com.br/s/${token}/og.png`);

const png = () => new Response(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), { status: 200, headers: { 'content-type': 'image/png' } });

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;

const assets = { fetch: vi.fn(async () => new Response('cover', { status: 200, headers: { 'content-type': 'image/png' } })) };

const envWith = (extra: Record<string, unknown> = {}) => ({ ASSETS: assets, OG_ORIGIN, ...extra }) as any;

beforeEach(() => {
  // `caches.default` exists only in the Workers runtime; an always-missing cache keeps
  // every case on the fetch path.
  vi.stubGlobal('caches', { default: { match: async () => undefined, put: async () => undefined } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('share card upstream', () => {
  it('goes through the SOCIAL binding when it is bound, never the public fetch', async () => {
    const social = { fetch: vi.fn(async () => png()) };
    const globalFetch = vi.fn(async () => png());
    vi.stubGlobal('fetch', globalFetch);

    const res = await worker.fetch(cardRequest(), envWith({ SOCIAL: social }), ctx);

    expect(globalFetch).not.toHaveBeenCalled();
    expect(social.fetch).toHaveBeenCalledOnce();
    const [url, init] = social.fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${OG_ORIGIN}/ro-calc/build.png?b=${token}`);
    expect(init.redirect).toBe('manual');
    expect(res.headers.get('cache-control')).toBe('public, max-age=604800, immutable');
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('falls back to a plain fetch of OG_ORIGIN when there is no binding', async () => {
    const globalFetch = vi.fn(async () => png());
    vi.stubGlobal('fetch', globalFetch);

    const res = await worker.fetch(cardRequest(), envWith(), ctx);

    expect(globalFetch).toHaveBeenCalledOnce();
    const [url, init] = globalFetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${OG_ORIGIN}/ro-calc/build.png?b=${token}`);
    expect(init.redirect).toBe('manual');
    expect(res.headers.get('cache-control')).toBe('public, max-age=604800, immutable');
  });

  it('serves the short-lived cover when the renderer redirects instead of rendering', async () => {
    const social = { fetch: vi.fn(async () => new Response(null, { status: 302, headers: { location: '/ro-calc/cover.png' } })) };

    const res = await worker.fetch(cardRequest(), envWith({ SOCIAL: social }), ctx);

    expect(assets.fetch).toHaveBeenCalledOnce();
    expect(res.headers.get('cache-control')).toBe('public, max-age=300');
  });
});
