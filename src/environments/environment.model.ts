export interface EnvironmentModel {
  production: boolean;
  roBackendUrl: string;
  ragassetsUrl: string;
  shortenerUrl: string;
  /** Public MCP endpoint agents connect to (see mcp/). */
  mcpUrl: string;
  /**
   * Rastreador de issues compartilhado (issues.latam-tools.com.br). É para lá
   * que vão as gravações do "Ajude o simulador" — antes elas ficavam na coleção
   * `replay_submissions` deste próprio projeto.
   */
  issuesProjectId: string;
  /**
   * Chave web do Firebase. Pública por natureza — ela só identifica o projeto;
   * o que o navegador pode fazer é decidido pelas regras de segurança.
   */
  issuesApiKey: string;
  /** Base do rastreador, para montar os links de reportar e acompanhar. */
  issuesUrl: string;
}
