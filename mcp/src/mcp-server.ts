import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Dataset } from './data/dataset';
import { registerDiscoveryTools } from './tools/discovery';
import { registerBridgeTools, registerCalculationTools } from './tools/calculate';

/**
 * A fresh McpServer per request. Registration is microseconds — the expensive state
 * (the dataset and its indexes) is shared read-only and never rebuilt.
 */
export function createMcpServer(dataset: Dataset): McpServer {
  const server = new McpServer(
    { name: 'ro-calc-latam', version: '1.0.0' },
    {
      instructions:
        'Simulador de dano de Ragnarok Online LATAM. Fluxo típico: list_classes → list_skills → search_items → calculate. ' +
        'Toda ferramenta que recebe uma build aceita um link do simulador em `build.share`, com overrides esparsos por cima — ' +
        'então, se a pessoa colar um link, use-o direto em vez de remontar a build. ' +
        'Devolva sempre o `share` do resultado para que ela possa abrir e conferir no simulador.',
    },
  );

  registerDiscoveryTools(server, dataset);
  registerCalculationTools(server, dataset);
  registerBridgeTools(server, dataset);

  return server;
}
