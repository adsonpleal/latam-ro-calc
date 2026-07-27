export interface EnvironmentModel {
  production: boolean;
  roBackendUrl: string;
  ragassetsUrl: string;
  shortenerUrl: string;
  /** Public MCP endpoint agents connect to (see mcp/). */
  mcpUrl: string;
}
