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
 * The caches are module globals, which on Workers means per-isolate and shared by every
 * request that isolate goes on to serve. Nothing here runs at module scope: a Worker gets
 * only 400 ms of CPU for startup, and parsing several megabytes would spend it all — done
 * inside `fetch` the same work draws on the request's much larger budget instead.
 */
import { DataKey, DataManifest, manifestPath } from '../../src/app/core/data-manifest';
import { buildDataset, Dataset, DatasetSources } from '../../mcp/src/data/dataset';

export interface AssetsEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

/**
 * The ASSETS binding routes on pathname alone, so the host is arbitrary. A fixed one is
 * used rather than the incoming request's: these results are cached for the life of the
 * isolate and reused by later requests, and nothing about them should depend on whichever
 * request happened to warm the cache.
 */
const ASSET_BASE = 'https://assets.invalid';

const MANIFEST_PATH = 'assets/data-manifest.json';

/**
 * A per-isolate memo that forgets its own failures.
 *
 * Without the clear, one transient asset read pins the rejection for as long as the
 * isolate lives and every later request replays it.
 */
function once<T>(load: (env: AssetsEnv) => Promise<T>): (env: AssetsEnv) => Promise<T> {
  let pending: Promise<T> | undefined;
  return (env) =>
    (pending ??= load(env).catch((error) => {
      pending = undefined;
      throw error;
    }));
}

async function readJson<T>(env: AssetsEnv, path: string): Promise<T> {
  const res = await env.ASSETS.fetch(new Request(new URL(`/${path}`, ASSET_BASE), { method: 'GET' }));
  if (!res.ok) throw new Error(`ASSETS ${path} respondeu ${res.status}.`);

  // `not_found_handling: "single-page-application"` answers a missing asset with
  // index.html and a 200, so status alone proves nothing. tools/inject-data-manifest.mjs
  // fails the build when a manifest entry is missing from dist, which is where this should
  // be caught — this is the backstop, and it keeps the failure legible if one ever gets
  // through (otherwise it surfaces as `Unexpected token '<'` far from the cause).
  const type = res.headers.get('content-type') ?? '';
  if (!type.includes('application/json')) {
    throw new Error(`ASSETS ${path} devolveu "${type}" em vez de JSON — provável manifesto defasado.`);
  }

  return (await res.json()) as T;
}

/** Diagnostics for /mcp/healthz. `cold` says whether a request had to build the dataset. */
let loaded = false;
let loadMs = 0;

const manifest = once((env) => readJson<DataManifest>(env, MANIFEST_PATH));

const dataset = once(async (env: AssetsEnv): Promise<Dataset> => {
  const started = Date.now();
  const files = await manifest(env);
  const read = <T>(key: DataKey) => readJson<T>(env, manifestPath(files, key));

  const [items, latamExtra, monsters, latamMonsters, hpSpTable, classes] = await Promise.all([
    read<DatasetSources['items']>('itemsCore'),
    read<DatasetSources['latamExtra']>('latamExtra'),
    read<DatasetSources['monsters']>('monsters'),
    read<DatasetSources['latamMonsters']>('latamMonsters'),
    read<DatasetSources['hpSpTable']>('hpsp'),
    read<DatasetSources['classes']>('classes'),
  ]);

  // Descriptions are ~7 MB and only get_item and item_description want them, so an isolate
  // that spends its life running `calculate` never fetches them. buildDataset memoizes.
  const built = buildDataset({ items, latamExtra, monsters, latamMonsters, hpSpTable, classes }, () =>
    read<Record<string, string>>('itemsDescMcp'),
  );
  loadMs = Date.now() - started;
  loaded = true;
  return built;
});

/** The dataset, built once per isolate. */
export const getDataset = dataset;

/** True when no request has built the dataset yet — reported by /mcp/healthz. */
export const isCold = (): boolean => !loaded;

export const lastLoadMs = (): number => loadMs;
