/**
 * Getting the dataset into the Worker.
 *
 * The artifacts are already published as static assets — `tools/build-web-data.mjs` writes
 * them to src/assets/data/ and Angular copies them into the build — so the Worker reads
 * them straight off its own deployment through the ASSETS binding. That is the whole
 * reason this lives in one Worker with the site: `env.ASSETS.fetch()` serves *this
 * deployment's* assets, so the engine and the data it was built against always ship
 * together. Fetching them over public HTTP, or parking them in KV, would reopen a window
 * where the two disagree mid-deploy.
 *
 * Both caches are module globals, which on Workers means per-isolate and shared by every
 * request that isolate goes on to serve. Nothing here runs at module scope: a Worker gets
 * only 400 ms of CPU for startup, and parsing several megabytes would spend it all — done
 * inside `fetch` the same work draws on the request's much larger budget instead.
 */
import { buildDataset, Dataset, DatasetSources } from '../../mcp/src/data/dataset';

export interface AssetsEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

interface DataManifest {
  v: number;
  base: string;
  files: Record<string, string>;
}

/**
 * The ASSETS binding routes on pathname alone, so the host is arbitrary. A fixed one is
 * used rather than the incoming request's: these results are cached for the life of the
 * isolate and reused by later requests, and nothing about them should depend on whichever
 * request happened to warm the cache.
 */
const ASSET_BASE = 'https://assets.invalid';

const MANIFEST_PATH = '/assets/data-manifest.json';

let datasetCache: Promise<Dataset> | undefined;
let descriptionCache: Promise<Record<string, string>> | undefined;

/** Milliseconds the dataset took to load, for /mcp/healthz. */
let loadMs = 0;

async function readJson<T>(env: AssetsEnv, path: string): Promise<T> {
  const res = await env.ASSETS.fetch(new Request(new URL(path, ASSET_BASE), { method: 'GET' }));
  if (!res.ok) throw new Error(`ASSETS ${path} respondeu ${res.status}.`);

  // `not_found_handling: "single-page-application"` answers a missing asset with
  // index.html and a 200, so status alone proves nothing. Without this check a stale
  // manifest surfaces as `Unexpected token '<'` somewhere far from the cause.
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new Error(`ASSETS ${path} devolveu "${type}" em vez de JSON — provável manifesto defasado.`);
  }

  return (await res.json()) as T;
}

const manifestPath = (manifest: DataManifest, key: string): string => {
  const file = manifest.files[key];
  if (!file) throw new Error(`data-manifest.json não tem a chave "${key}".`);
  return `/${manifest.base}${file}`;
};

async function load(env: AssetsEnv): Promise<Dataset> {
  const started = Date.now();
  const manifest = await readJson<DataManifest>(env, MANIFEST_PATH);
  const read = <T>(key: string) => readJson<T>(env, manifestPath(manifest, key));

  const [items, itemsMcp, latamExtra, monsters, latamMonsters, hpSpTable, classes] = await Promise.all([
    read<DatasetSources['items']>('itemsCore'),
    read<DatasetSources['itemsMcp']>('itemsMcp'),
    read<DatasetSources['latamExtra']>('latamExtra'),
    read<DatasetSources['monsters']>('monsters'),
    read<DatasetSources['latamMonsters']>('latamMonsters'),
    read<DatasetSources['hpSpTable']>('hpsp'),
    read<DatasetSources['classes']>('classes'),
  ]);

  const dataset = buildDataset(
    { items, itemsMcp, latamExtra, monsters, latamMonsters, hpSpTable, classes },
    () => getDescriptions(env),
  );
  loadMs = Date.now() - started;
  return dataset;
}

/**
 * The dataset, built once per isolate.
 *
 * A rejection clears the cache: a single bad deploy or transient asset read should not
 * pin a failure for as long as the isolate happens to live.
 */
export function getDataset(env: AssetsEnv): Promise<Dataset> {
  datasetCache ??= load(env).catch((error) => {
    datasetCache = undefined;
    throw error;
  });
  return datasetCache;
}

/**
 * The ~7 MB description map, behind its own promise.
 *
 * Only `get_item` and `item_description` await it, so an isolate that spends its life
 * running `calculate` never downloads or parses it.
 */
export function getDescriptions(env: AssetsEnv): Promise<Record<string, string>> {
  descriptionCache ??= (async () => {
    const manifest = await readJson<DataManifest>(env, MANIFEST_PATH);
    return readJson<Record<string, string>>(env, manifestPath(manifest, 'itemsDescMcp'));
  })().catch((error) => {
    descriptionCache = undefined;
    throw error;
  });
  return descriptionCache;
}

/** True when no request has built the dataset yet — reported by /mcp/healthz. */
export const isCold = (): boolean => datasetCache === undefined;

export const lastLoadMs = (): number => loadMs;
