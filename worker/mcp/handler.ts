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

/**
 * All this handler needs is the assets binding; `initConfig` reads the MCP vars off the
 * same object without the type having to enumerate them.
 */
export type McpEnv = AssetsEnv;

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
export async function handleMcp(request: Request, env: McpEnv, ctx: ExecutionContext): Promise<Response> {
  initConfig(env);

  const url = new URL(request.url);
  // Fixed for the request, so the header block is built once and closed over rather than
  // threaded through every response site.
  const cors = corsHeaders(request.headers.get('origin'));

  /** Re-emit a Response with the CORS headers added; the transport builds its own. */
  const withCors = (res: Response): Response => {
    const merged = new Headers(res.headers);
    for (const [key, value] of Object.entries(cors)) merged.set(key, value);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: merged });
  };

  const problem = (status: number, code: number, message: string, extra: Record<string, string> = {}) =>
    new Response(jsonRpcError(code, message), {
      status,
      headers: { 'content-type': 'application/json', ...cors, ...extra },
    });

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
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
      { status: 200, headers: { 'content-type': 'application/json', ...cors } },
    );
  }

  if (url.pathname !== '/mcp') {
    return problem(404, -32001, 'Not found.');
  }

  if (!hostAllowed(url.hostname)) {
    return problem(403, -32000, 'Host não permitido.');
  }

  const origin = request.headers.get('origin');
  if (origin && !originAllowed(origin)) {
    return problem(403, -32000, 'Origin não permitida.');
  }

  // Stateless mode has no stream to resume and no session to delete, so GET and DELETE
  // are as unsupported as anything else that isn't a POST.
  if (request.method !== 'POST') {
    return problem(405, -32000, 'Method not allowed.', { allow: 'POST, OPTIONS' });
  }

  // Caddy used to cap the body upstream of the process; on Workers the platform limit is
  // 100 MB, so the cap has to live here or it stops existing.
  const tooLarge = () => problem(413, -32700, 'Corpo da requisição grande demais.');
  // `headers.get` returns null when absent, and `Number(null)` is 0 — so the header has to
  // be tested for presence separately, or an unlabelled body silently skips both checks.
  const header = request.headers.get('content-length');
  const declared = header === null ? null : Number(header);
  if (declared !== null && declared > MAX_BODY_BYTES) return tooLarge();

  let body: unknown;
  try {
    const raw = await request.text();
    // A chunked body carries no content-length, so the check above never saw it. Encoding
    // is the only exact byte count, and it is skipped when the header was present —
    // `raw.length` counts UTF-16 units, which is not the same number for pt-BR text.
    if (declared === null && new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return tooLarge();

    // An empty body must be rejected here. Passing `parsedBody: undefined` makes the SDK
    // fall back to `req.json()` on a request whose stream this function already drained,
    // which throws somewhere inside the transport and surfaces as a bare 500.
    if (!raw) return problem(400, -32700, 'Corpo da requisição vazio.');
    body = JSON.parse(raw);
  } catch {
    return problem(400, -32700, 'Requisição inválida.');
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

    return withCors(response);
  } catch (error) {
    console.error('[ro-mcp] erro ao tratar requisição', error);
    return problem(500, -32603, 'Erro interno ao processar a requisição.');
  }
}
