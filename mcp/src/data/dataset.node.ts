/**
 * Loading the dataset from disk, for specs and local tooling only.
 *
 * The Worker never runs this — it reads the same artifacts through the ASSETS binding
 * (`worker/mcp/data.ts`). This exists so a spec can build a real Dataset without a Worker
 * runtime, and it deliberately reads the *generated* `src/assets/data/` rather than the
 * hand-edited `src/assets/demo/data/`: the point is that specs exercise the same bytes the
 * deployment serves, so a field pruned by the generator fails a test here rather than in
 * production. Resolution goes through the manifest for the same reason.
 *
 * `vitest.config.ts` regenerates the artifacts when they are missing or stale, so every
 * `vitest` entry point has them — not just `pnpm test`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataKey, DataManifest, manifestPath } from 'src/app/core/data-manifest';
import { buildDataset, Dataset, DatasetSources } from './dataset';

/**
 * The on-disk stand-in for the site root: manifest paths are root-relative (`assets/data/…`)
 * because that is what the browser and the ASSETS binding both resolve against.
 */
const SITE_ROOT = 'src';

function readJson<T>(path: string): T {
  try {
    return JSON.parse(readFileSync(join(SITE_ROOT, path), 'utf8')) as T;
  } catch (error) {
    throw new Error(`Não consegui ler ${join(SITE_ROOT, path)}. Rode \`pnpm data:dev\` para gerar os artefatos. (${error})`);
  }
}

export function loadDatasetFromDisk(): Dataset {
  const manifest = readJson<DataManifest>('assets/data-manifest.json');
  const read = <T>(key: DataKey): T => readJson<T>(manifestPath(manifest, key));

  const sources: DatasetSources = {
    items: read('itemsCore'),
    latamExtra: read('latamExtra'),
    monsters: read('monsters'),
    latamMonsters: read('latamMonsters'),
    hpSpTable: read('hpsp'),
    classes: read('classes'),
  };

  // Lazily, like the Worker: the description map is ~7 MB, six spec files build a dataset
  // at module scope, and most of them never ask for a description. buildDataset memoizes
  // the promise, so a spec that does ask still parses it once.
  return buildDataset(sources, async () => read<Record<string, string>>('itemsDescMcp'));
}
