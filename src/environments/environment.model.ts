export interface EnvironmentModel {
  production: boolean;
  roBackendUrl: string;
  ragassetsUrl: string;
  shortenerUrl: string;
  /** Public MCP endpoint agents connect to (see mcp/). */
  mcpUrl: string;
  /**
   * Shared issue tracker (issues.latam-tools.com.br). This is where the "Ajude o
   * simulador" recordings go — they used to live in this project's own
   * `replay_submissions` collection.
   */
  issuesProjectId: string;
  /**
   * Firebase web API key. Public by design — it only identifies the project;
   * what the browser may do is decided by the security rules.
   */
  issuesApiKey: string;
  /** Tracker base URL, used to build the report and follow links. */
  issuesUrl: string;
}
