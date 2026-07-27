/**
 * Entry point: load the dataset once, then serve MCP over Streamable HTTP.
 */
import { config } from './config';
import { loadDataset } from './data/dataset';
import { createHttpServer } from './http';

const started = Date.now();
const dataset = loadDataset(config.dataDir);
const rss = Math.round(process.memoryUsage().rss / 1024 / 1024);

console.log(
  `[ro-mcp] dataset carregado em ${Date.now() - started}ms — ` +
    `${dataset.itemIndex.size} itens (${Object.keys(dataset.items).length} com dados), ` +
    `${dataset.monsterIndex.size} monstros, ${dataset.classes.list().length} classes (RSS ${rss} MB)`,
);

const server = createHttpServer(dataset);
server.listen(config.port, () => {
  console.log(`[ro-mcp] ouvindo em http://127.0.0.1:${config.port}${''} (MCP em /mcp, saúde em /healthz)`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[ro-mcp] ${signal} recebido, encerrando.`);
    server.close(() => process.exit(0));
  });
}
