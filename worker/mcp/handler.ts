/**
 * Stateless Streamable HTTP, on Workers.
 *
 * This is `mcp/src/http.ts` with the Node plumbing taken out. The SDK ships a transport
 * built on Request/Response — `WebStandardStreamableHTTPServerTransport`, which the Node
 * one wraps — so the port is the HTTP wrapper, not the protocol: a fresh McpServer and
 * transport per POST, no sessions, nothing to resume.
 *
 * The module is reached only through a dynamic `import()` in worker/index.ts, which is
 * load-bearing. It drags in the whole damage engine (~1.7 MB, ~190 ms to evaluate), and a
 * static import would put that on the startup path of every request the Worker serves —
 * including the crawler-facing /s/* share previews, which today boot almost nothing.
 */
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { config, initConfig } from '../../mcp/src/config';
import { createMcpServer } from '../../mcp/src/mcp-server';
import { AssetsEnv, getDataset, isCold, lastLoadMs } from './data';

export type McpEnv = AssetsEnv & Record<string, unknown>;

const MAX_BODY_BYTES = 256 * 1024;

const jsonRpcError = (code: number, message: string) =>
  JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null });

/**
 * Browser-based clients send Origin and the spec requires validating it. Native and CLI
 * clients send none at all — rejecting those would break the primary use case, so a
 * missing Origin is allowed.
 */
function originAllowed(origin: string | null): boolean {
  if (!origin) return true;
  return config.allowedOrigins.some(
    (allowed) => origin === allowed || (allowed.startsWith('https://') && origin.endsWith(allowed.replace('https://', '.'))),
  );
}

/**
 * Belt-and-braces against DNS rebinding. Cloudflare already routes to this Worker by
 * hostname, so an attacker cannot make a request for someone else's host arrive here —
 * but the check is cheap and the failure mode of dropping it is silent.
 */
const hostAllowed = (hostname: string): boolean => config.allowedHosts.includes(hostname);

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: 'Origin',
    'Access-Control-Allow-Methods': 'POST, GET, DELETE, OPTIONS',
    // MCP-Protocol-Version must be listed or browser clients fail preflight with a
    // confusing CORS error rather than a protocol one.
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id, MCP-Protocol-Version',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && originAllowed(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

/** Re-emit a Response with the CORS headers added; the transport builds its own. */
function withCors(res: Response, origin: string | null): Response {
  const merged = new Headers(res.headers);
  for (const [key, value] of Object.entries(corsHeaders(origin))) merged.set(key, value);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged });
}

const problem = (status: number, code: number, message: string, origin: string | null, extra: Record<string, string> = {}) =>
  new Response(jsonRpcError(code, message), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders(origin), ...extra },
  });

export async function handleMcp(request: Request, env: McpEnv, ctx: ExecutionContext): Promise<Response> {
  initConfig(env);

  const url = new URL(request.url);
  const origin = request.headers.get('origin');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (url.pathname === '/mcp/healthz') {
    // Read `cold` before awaiting: getDataset populates the cache, so asking afterwards
    // would always say warm and the field would never mean anything.
    const cold = isCold();
    const dataset = await getDataset(env);
    return new Response(
      JSON.stringify({
        ok: true,
        items: dataset.itemIndex.size,
        monsters: dataset.monsterIndex.size,
        classes: dataset.classes.list().length,
        cold,
        loadMs: lastLoadMs(),
      }),
      { status: 200, headers: { 'content-type': 'application/json', ...corsHeaders(origin) } },
    );
  }

  if (url.pathname !== '/mcp') {
    return problem(404, -32001, 'Not found.', origin);
  }

  if (!hostAllowed(url.hostname)) {
    return problem(403, -32000, 'Host não permitido.', origin);
  }

  if (origin && !originAllowed(origin)) {
    return problem(403, -32000, 'Origin não permitida.', origin);
  }

  // Stateless mode has no stream to resume and no session to delete, so GET and DELETE
  // are as unsupported as anything else that isn't a POST.
  if (request.method !== 'POST') {
    return problem(405, -32000, 'Method not allowed.', origin, { allow: 'POST, OPTIONS' });
  }

  // Caddy used to cap the body upstream of the process; on Workers the platform limit is
  // 100 MB, so the cap has to live here or it stops existing.
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return problem(413, -32700, 'Corpo da requisição grande demais.', origin);
  }

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return problem(413, -32700, 'Corpo da requisição grande demais.', origin);
    }
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    return problem(400, -32700, 'Requisição inválida.', origin);
  }

  try {
    const dataset = await getDataset(env);
    const server = createMcpServer(dataset);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await server.connect(transport);
    const response = await transport.handleRequest(request, { parsedBody: body });

    // Tear down after the response is on its way rather than before it is built.
    ctx.waitUntil(Promise.allSettled([transport.close(), server.close()]));

    return withCors(response, origin);
  } catch (error) {
    console.error('[ro-mcp] erro ao tratar requisição', error);
    return problem(500, -32603, 'Erro interno ao processar a requisição.', origin);
  }
}
