/** Shared plumbing for tool handlers. */

/** MCP tool results carry text content; ours is always JSON. */
export const json = (payload: unknown, isError = false) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 1) }],
  ...(isError ? { isError: true as const } : {}),
});

/** Turn a thrown error into a tool result rather than a transport-level failure, so the
 *  agent can read what went wrong and correct its arguments. */
export const fail = (error: unknown) => json({ error: error instanceof Error ? error.message : String(error) }, true);
