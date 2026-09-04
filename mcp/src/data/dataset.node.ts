/**
 * Loading the dataset from disk, for specs and local tooling only.
 *
 * The Worker never runs this — it reads the same artifacts through the ASSETS binding
 * (`worker/mcp/data.ts`). This exists so a spec can build a real Dataset without a Worker
 * runtime, and it deliberately reads the *generated* `src/assets/data/` rather than the
 * hand-edited `src/assets/demo/data/`: the whole point is that specs exercise the same
 * bytes the deployment serves, so a field pruned by the generator fails a test here rather
 * than in production.
 *
 * `pnpm test` regenerates them first, so the files are always present and current.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDataset, Dataset, DatasetSources } from './dataset';

/** Where `tools/build-web-data.mjs` writes its unhashed (dev) output. */
export const GENERATED_DATA_DIR = 'src/assets/data';

function readJson<T>(dir: string, file: string): T {
  try {
    return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
  } catch (error) {
    throw new Error(
      `Não consegui ler ${join(dir, file)}. Rode \`pnpm data:dev\` para gerar os artefatos. (${error})`,
    );
  }
}

export function loadDatasetFromDisk(dataDir: string = GENERATED_DATA_DIR): Dataset {
  const sources: DatasetSources = {
    items: readJson(dataDir, 'items-core.json'),
    itemsMcp: readJson(dataDir, 'items-mcp.json'),
    latamExtra: readJson(dataDir, 'latam-extra.json'),
    monsters: readJson(dataDir, 'monsters.json'),
    latamMonsters: readJson(dataDir, 'latam-monsters.json'),
    hpSpTable: readJson(dataDir, 'hpsp.json'),
    classes: readJson(dataDir, 'classes.json'),
  };

  // Read eagerly here: on disk it costs a few milliseconds, and a spec that awaits a
  // description should not be the thing that discovers the file is missing.
  const descriptions = readJson<Record<string, string>>(dataDir, 'items-desc-mcp.json');

  return buildDataset(sources, async () => descriptions);
}
