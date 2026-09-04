import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Dataset } from './data/dataset';
import { registerDiscoveryTools } from './tools/discovery';
import { registerBridgeTools, registerCalculationTools } from './tools/calculate';

/**
 * Keeps AJV out of the request path.
 *
 * The SDK constructs `new AjvJsonSchemaValidator()` per `McpServer` — which here means per
 * request — and that constructor builds an Ajv instance and registers its formats, even
 * though the only thing that ever calls the validator is elicitation's `requestedSchema`.
 * We register no `outputSchema` and never elicit, so passing one explicitly skips that work
 * on every POST.
 *
 * It does NOT shrink the bundle: the SDK's import of the provider is static and referenced,
 * so esbuild keeps Ajv either way. Workers would refuse to run its codegen (`new Function`
 * is blocked), which is another reason never to reach it.
 *
 * It throws rather than returning `valid` so that adding an `outputSchema` later fails
 * loudly here instead of silently skipping validation.
 */
const unreachableValidator = {
  getValidator() {
    throw new Error(
      'Validação de JSON Schema não está disponível: nenhuma ferramenta declara outputSchema ' +
        'e elicitation não é usada. Se isso mudou, registre um validador compatível com Workers ' +
        '(@modelcontextprotocol/sdk/validation/cfworker).',
    );
  },
};

/**
 * A fresh McpServer per request. Registration is microseconds — the expensive state
 * (the dataset and its indexes) is shared read-only and never rebuilt.
 */
export function createMcpServer(dataset: Dataset): McpServer {
  const server = new McpServer(
    { name: 'ro-calc-latam', version: '1.0.0' },
    {
      jsonSchemaValidator: unreachableValidator as any,
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
