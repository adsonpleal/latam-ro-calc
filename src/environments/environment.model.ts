export interface EnvironmentModel {
  production: boolean;
  roBackendUrl: string;
  ragassetsUrl: string;
  shortenerUrl: string;
  /** Public MCP endpoint agents connect to (see mcp/). */
  mcpUrl: string;
  /** Firebase project holding the community .rrf submissions (see firestore.rules). */
  firebaseProjectId: string;
  /**
   * Firebase web API key. Public by design — it only identifies the project;
   * what the browser may do is decided by the security rules.
   */
  firebaseApiKey: string;
}
