/**
 * Transport-level contract: what a real MCP client sees over HTTP.
 *
 * Ported from the old mcp/src/http.spec.ts, which had to stand up a node:http server on a
 * real socket. The Worker handler takes a Request and returns a Response, so the whole
 * thing is now a function call — which also makes the Host check testable directly,
 * instead of having to reach for node:http because `Host` is a forbidden header in fetch.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { handleMcp, McpEnv } from './handler';

/**
 * Serves src/assets/ the way the deployed ASSETS binding serves the built site — including
 * the content-type, which the loader checks in order to catch the SPA fallback.
 */
const env: McpEnv = {
  ASSETS: {
    async fetch(request: Request): Promise<Response> {
      const path = new URL(request.url).pathname.replace(/^\/assets\//, '');
      try {
        const body = readFileSync(join('src/assets', path), 'utf8');
        return new Response(body, { status: 200, headers: { 'content-type': 'application/json' } });
      } catch {
        return new Response('not found', { status: 404 });
      }
    },
  },
};

const ctx = { waitUntil: () => undefined, passThroughOnException: () => undefined } as unknown as ExecutionContext;

const call = (request: Request) => handleMcp(request, env, ctx);

const rpc = (body: unknown, headers: Record<string, string> = {}) =>
  call(
    new Request('https://simulador.latam-tools.com.br/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
      body: JSON.stringify(body),
    }),
  );

describe('health', () => {
  it('reports the loaded dataset', async () => {
    const res = await call(new Request('https://simulador.latam-tools.com.br/mcp/healthz'));
    expect(res.status).toBe(200);
    // 17081 is the union of the two item sets: the 10503 distinct ids in items-core plus
    // the 6578 LATAM ids with no calculator record. It is the number the EC2 server
    // reported off the raw JSONs, so it holding here is what proves the derived data
    // pipeline lost nothing on the way.
    await expect(res.json()).resolves.toMatchObject({ ok: true, items: 17081, classes: 40 });
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

  it('serves a description, which lives in its own lazily-fetched artifact', async () => {
    const res: any = await (
      await rpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'item_description', arguments: { id: 20940 } } })
    ).json();
    expect(JSON.parse(res.result.content[0].text).description).toBeTruthy();
  });
});

describe('transport guards', () => {
  it('rejects GET and DELETE — stateless mode has no stream to resume', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await call(new Request('https://simulador.latam-tools.com.br/mcp', { method }));
      expect(res.status).toBe(405);
      await expect(res.json()).resolves.toMatchObject({ jsonrpc: '2.0', error: { code: -32000 } });
    }
  });

  it('rejects an unknown Host', async () => {
    const res = await call(
      new Request('https://evil.example.com/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'tools/list' }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it('rejects a disallowed Origin but allows requests without one', async () => {
    // Native/CLI MCP clients send no Origin at all; rejecting those would break the
    // primary use case.
    expect((await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/list' })).status).toBe(200);
    expect((await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/list' }, { Origin: 'https://evil.example.com' })).status).toBe(403);
  });

  it('answers preflight with the headers browser clients need', async () => {
    const res = await call(
      new Request('https://simulador.latam-tools.com.br/mcp', { method: 'OPTIONS', headers: { Origin: 'https://claude.ai' } }),
    );
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('https://claude.ai');
    // Omitting this makes browser clients fail preflight with a confusing CORS error
    // instead of a protocol one.
    expect(res.headers.get('access-control-allow-headers')).toContain('MCP-Protocol-Version');
    expect(res.headers.get('vary')).toBe('Origin');
  });

  it('404s an unknown path under /mcp', async () => {
    const res = await call(new Request('https://simulador.latam-tools.com.br/mcp/nope'));
    expect(res.status).toBe(404);
  });

  it('answers an empty body with a parse error, not a 500', async () => {
    // The SDK falls back to req.json() when parsedBody is undefined, on a stream this
    // handler has already drained — which throws deep inside the transport.
    const res = await call(
      new Request('https://simulador.latam-tools.com.br/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '',
      }),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ jsonrpc: '2.0', error: { code: -32700 } });
  });

  it('refuses a body over the 256 KB cap', async () => {
    const res = await call(
      new Request('https://simulador.latam-tools.com.br/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 8, method: 'tools/list', params: { pad: 'x'.repeat(300 * 1024) } }),
      }),
    );
    expect(res.status).toBe(413);
  });
});
