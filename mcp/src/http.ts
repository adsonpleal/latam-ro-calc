/**
 * Stateless Streamable HTTP.
 *
 * A fresh McpServer + transport per POST. Every tool is a pure function of
 * (dataset, args) — there is no session state worth keeping, and a session table
 * under a MemoryMax cgroup is a slow leak waiting for an OOM kill.
 */
import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config } from './config';
import { Dataset } from './data/dataset';
import { createMcpServer } from './mcp-server';

const MCP_PATH = '/mcp';

const jsonRpcError = (code: number, message: string) => JSON.stringify({ jsonrpc: '2.0', error: { code, message }, id: null });

/**
 * Browser-based clients send Origin and the spec requires validating it. Native and
 * CLI clients send none at all — rejecting those would break the primary use case,
 * so a missing Origin is allowed.
 */
function originAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  return config.allowedOrigins.some((allowed) => origin === allowed || (allowed.startsWith('https://') && origin.endsWith(allowed.replace('https://', '.'))));
}

/** The real DNS-rebinding defence. Origin alone does not cover it. */
function hostAllowed(host: string | undefined): boolean {
  if (!host) return false;
  const name = host.split(':')[0];
  return config.allowedHosts.includes(name);
}

function applyCors(req: IncomingMessage, res: ServerResponse): void {
  const origin = req.headers.origin as string | undefined;
  if (origin && originAllowed(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
  // MCP-Protocol-Version must be listed or browser clients fail preflight with a
  // confusing CORS error rather than a protocol one.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, MCP-Protocol-Version');
  res.setHeader('Access-Control-Max-Age', '86400');
}

const readBody = (req: IncomingMessage): Promise<unknown> =>
  new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 256 * 1024) {
        reject(new Error('Corpo da requisição grande demais.'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : undefined);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });

export function createHttpServer(dataset: Dataset): Server {
  return createServer(async (req, res) => {
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204).end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/healthz') {
      res.writeHead(200, { 'content-type': 'application/json' }).end(
        JSON.stringify({
          ok: true,
          items: dataset.itemIndex.size,
          monsters: dataset.monsterIndex.size,
          classes: dataset.classes.list().length,
          uptimeSec: Math.round(process.uptime()),
          rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
        }),
      );
      return;
    }

    if (url.pathname !== MCP_PATH) {
      res.writeHead(404, { 'content-type': 'application/json' }).end(jsonRpcError(-32001, 'Not found.'));
      return;
    }

    if (!hostAllowed(req.headers.host)) {
      res.writeHead(403, { 'content-type': 'application/json' }).end(jsonRpcError(-32000, 'Host não permitido.'));
      return;
    }

    if (req.headers.origin && !originAllowed(req.headers.origin as string)) {
      res.writeHead(403, { 'content-type': 'application/json' }).end(jsonRpcError(-32000, 'Origin não permitida.'));
      return;
    }

    // Stateless mode has no stream to resume and no session to delete, so GET and
    // DELETE are as unsupported as anything else that isn't a POST.
    if (req.method !== 'POST') {
      res.writeHead(405, { 'content-type': 'application/json', allow: 'POST, OPTIONS' }).end(jsonRpcError(-32000, 'Method not allowed.'));
      return;
    }

    const server = createMcpServer(dataset);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      const body = await readBody(req);
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (error) {
      console.error('[ro-mcp] erro ao tratar requisição', error);
      if (!res.headersSent) {
        res.writeHead(400, { 'content-type': 'application/json' }).end(jsonRpcError(-32700, 'Requisição inválida.'));
      }
    }
  });
}
