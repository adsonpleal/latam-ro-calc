import { describe, expect, it, vi } from 'vitest';
import { shortenUrl } from './shorten-url';

describe('shortenUrl', () => {
  const longUrl = 'https://simulador.latam-tools.com.br/#/?customItem=example';
  const service = 'https://short.latam-tools.com.br';

  it('uses the shortener result for a custom-item link', async () => {
    const mocked = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ short_url: `${service}/abc123` }), { status: 200 }));
    expect(await shortenUrl(longUrl, service)).toBe(`${service}/abc123`);
    expect(mocked).toHaveBeenCalledWith(`${service}/api/links`, expect.objectContaining({
      method: 'POST', body: JSON.stringify({ url: longUrl }),
    }));
    mocked.mockRestore();
  });

  it('keeps the complete link when the service is unavailable', async () => {
    const mocked = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'));
    expect(await shortenUrl(longUrl, service)).toBe(longUrl);
    mocked.mockRestore();
  });
});
