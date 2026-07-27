/**
 * Short links are the form the app's share dialog hands out, so resolving them is the
 * primary "paste a link to your agent" path.
 */
import { AddressInfo } from 'node:net';
import { createServer, Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { resolveShortLink } from './share';

let server: Server;
let base: string;
const TOKEN = 'N4IgxgNghgzjIC4AsAmArAdgDQggUwDc8JEUAGMnAKwHsAjAGUOMTUpBgBcAnRAR';

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url?.startsWith('/ok')) {
      res.writeHead(302, { location: `${base}/app/#/?b=${TOKEN}` }).end();
    } else if (req.url?.startsWith('/relative')) {
      res.writeHead(301, { location: `/app/#/?b=${TOKEN}` }).end();
    } else if (req.url?.startsWith('/elsewhere')) {
      res.writeHead(302, { location: 'https://example.com/not-a-simulation' }).end();
    } else {
      res.writeHead(200, { 'content-type': 'text/html' }).end('<html>app</html>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('resolveShortLink', () => {
  it('recovers the token from the redirect target', async () => {
    // Regression: with `redirect: 'follow'` fetch drops the #fragment from res.url and
    // leaves no Location header behind, so the token was lost on every short link.
    await expect(resolveShortLink(`${base}/ok`)).resolves.toBe(`${base}/app/#/?b=${TOKEN}`);
  });

  it('resolves a relative Location against the short URL', async () => {
    await expect(resolveShortLink(`${base}/relative`)).resolves.toBe(`${base}/app/#/?b=${TOKEN}`);
  });

  it('rejects a link that does not point at a simulation', async () => {
    await expect(resolveShortLink(`${base}/elsewhere`)).rejects.toThrow(/não aponta para uma simulação/);
  });
});
