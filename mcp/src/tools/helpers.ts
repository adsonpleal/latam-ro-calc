/** Shared plumbing for tool handlers. */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** MCP tool results carry text content; ours is always JSON. */
export const json = (payload: unknown, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 1) }],
  ...(isError ? { isError: true as const } : {}),
});

/** Turn a thrown error into a tool result rather than a transport-level failure, so the
 *  agent can read what went wrong and correct its arguments. */
export const fail = (error: unknown) => json({ error: error instanceof Error ? error.message : String(error) }, true);

/** Drop undefined entries so they don't serialize as noise. */
export const compact = <T extends Record<string, any>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

/**
 * Register a tool whose errors become readable JSON results. The specs parse
 * `data.error`, which the SDK's default text error would not produce.
 */
export function registerJsonTool<A>(
  server: McpServer,
  name: string,
  config: Parameters<McpServer['registerTool']>[1],
  handler: (args: A) => unknown | Promise<unknown>,
): void {
  server.registerTool(name, config as any, (async (args: A) => {
    try {
      return await handler(args);
    } catch (error) {
      return fail(error);
    }
  }) as any);
}

/** The paginated envelope every search tool returns, including the "there's more" hint. */
export const paged = <T, R>(key: string, total: number, rows: T[], offset: number, map: (row: T) => R) => {
  const shown = rows.length;
  const rest = total - offset - shown;
  return {
    total,
    shown,
    offset,
    [key]: rows.map(map),
    ...(rest > 0 ? { hint: `Mais ${rest} resultados: use offset=${offset + shown}.` } : {}),
  };
};

/** Footer for a tool that stopped early on its iteration budget (util/budget.ts). */
export const truncatedNote = (done: number, total: number, noun: string) =>
  done < total ? { truncated: true as const, note: `Limite de cálculos atingido após ${done} de ${total} ${noun}.` } : {};
