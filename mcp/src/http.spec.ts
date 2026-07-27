/**
 * Transport-level contract: what a real MCP client sees over HTTP.
 */
import { AddressInfo } from 'node:net';
import { request, Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadDataset } from './data/dataset';
import { createHttpServer } from './http';

const dataset = loadDataset('src/assets/demo/data');
let server: Server;
let base: string;

const rpc = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  server = createHttpServer(dataset);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://localhost:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe('health', () => {
  it('reports the loaded dataset', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true, items: 17303, classes: 40 });
  });
});

describe('MCP over Streamable HTTP', () => {
  it('initializes and lists tools', async () => {
    const init = await rpc({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'spec', version: '1.0.0' } },
    });
    expect(init.status).toBe(200);
    const initBody: any = await init.json();
    expect(initBody.result.serverInfo.name).toBe('ro-calc-latam');

    const list: any = await (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
    expect(list.result.tools.map((t: any) => t.name)).toContain('calculate');
  });

  it('runs a calculation end to end', async () => {
    const res: any = await (
      await rpc({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'calculate',
          arguments: {
            build: { class: 4261, level: 230, jobLevel: 47, stats: { int: 133, spl: 100, vit: 120 }, atkSkill: 'Poison Burst==5' },
            target: { monsterId: 21077 },
          },
        },
      })
    ).json();
    expect(JSON.parse(res.result.content[0].text).damage.skill.max).toBe(68309);
  });
});

describe('transport guards', () => {
  it('rejects GET and DELETE — stateless mode has no stream to resume', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await fetch(`${base}/mcp`, { method });
      expect(res.status).toBe(405);
      await expect(res.json()).resolves.toMatchObject({ jsonrpc: '2.0', error: { code: -32000 } });
    }
  });

  it('rejects an unknown Host — the actual DNS-rebinding defence', async () => {
    // Not via fetch: `Host` is a forbidden header there, so undici would silently send
    // the real one and the guard would never be exercised.
    const status = await new Promise<number>((resolve, reject) => {
      const req = request(
        {
          host: '127.0.0.1',
          port: (server.address() as AddressInfo).port,
          path: '/mcp',
          method: 'POST',
          headers: { 'content-type': 'application/json', host: 'evil.example.com' },
        },
        (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        },
      );
      req.on('error', reject);
      req.end(JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/list' }));
    });
    expect(status).toBe(403);
  });

  it('rejects a disallowed Origin but allows requests without one', async () => {
    // Native/CLI MCP clients send no Origin at all; rejecting those would break the
    // primary use case.
    expect((await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/list' })).status).toBe(200);
    expect((await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/list' }, { Origin: 'https://evil.example.com' })).status).toBe(403);
  });

  it('answers preflight with the headers browser clients need', async () => {
    const res = await fetch(`${base}/mcp`, { method: 'OPTIONS', headers: { Origin: 'https://claude.ai' } });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://claude.ai');
    // Omitting this makes browser clients fail preflight with a confusing CORS error
    // instead of a protocol one.
    expect(res.headers.get('access-control-allow-headers')).toContain('MCP-Protocol-Version');
    expect(res.headers.get('vary')).toBe('Origin');
  });

  it('404s an unknown path', async () => {
    expect((await fetch(`${base}/nope`)).status).toBe(404);
  });
});
