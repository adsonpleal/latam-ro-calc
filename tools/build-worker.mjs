#!/usr/bin/env node
/**
 * Bundles the Cloudflare Worker — the share-preview routes and the MCP server — before
 * wrangler uploads it.
 *
 * Why a pre-bundle at all, when wrangler runs esbuild itself: the engine under src/app/**
 * imports itself through the `src/*` path alias (36 files do, calculator.ts among them),
 * and wrangler's own pass does not honour a tsconfig baseUrl and exposes no plugin hook.
 * mcp/../worker/tsconfig.json supplies that alias, and with it the `environment` ->
 * `environment.prod.ts` swap that decides which skills CharacterBase exposes — so what
 * ships matches what the website runs. Wrangler's pass over the already-bundled output is
 * a near no-op.
 *
 * `splitting` is the other load-bearing setting. worker/index.ts reaches the MCP handler
 * through a dynamic import, and splitting is what turns that into a separate chunk: the
 * entry stays under a kilobyte and the ~1.7 MB engine is evaluated only by a request that
 * actually asks for /mcp. Without it everything would land in the entry module and be
 * evaluated at startup, where a Worker has just 400 ms of CPU.
 *
 * The data JSONs are deliberately not inlined — the Worker reads them through the ASSETS
 * binding (worker/mcp/data.ts), which keeps them pinned to the deployment.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFileSync, readdirSync, rmSync } from 'node:fs';
import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'dist/worker');

// Wipe first. Chunk names are content-hashed, so a stale one from a previous build would
// linger — and wrangler's `find_additional_modules` uploads whatever it finds, which would
// ship dead code and, worse, make it ambiguous which bundle is live.
rmSync(outdir, { recursive: true, force: true });

const result = await esbuild.build({
  entryPoints: [resolve(root, 'worker/index.ts')],
  outdir,
  tsconfig: resolve(root, 'worker/tsconfig.json'),
  bundle: true,
  splitting: true,
  format: 'esm',
  // Not 'node': workerd is not Node, and `platform: 'node'` would leave node: builtins
  // externalised for a runtime that has none of them.
  platform: 'browser',
  conditions: ['workerd', 'worker', 'browser', 'import', 'module', 'default'],
  mainFields: ['module', 'main'],
  target: 'es2022',
  minify: true,
  sourcemap: 'linked',
  metafile: true,
  logLevel: 'info',
});

/**
 * Guard the environment swap.
 *
 * The `src/environments/environment` -> `environment.prod.ts` alias in worker/tsconfig.json
 * is the only thing standing between the Worker and a production deploy that runs with
 * `production: false` — under which CharacterBase's atkSkills/activeSkills/passiveSkills
 * getters expose dev-only skills the website hides, silently diverging the skill lists that
 * share tokens index into. Nothing fails loudly when that alias stops applying, so check
 * the bytes. The marker is read out of the two files rather than hardcoded, so renaming a
 * backend cannot quietly retire the check.
 */
const marker = (file) => readFileSync(resolve(root, 'src/environments', file), 'utf8').match(/roBackendUrl:\s*'([^']+)'/)?.[1];
const devUrl = marker('environment.ts');
const prodUrl = marker('environment.prod.ts');

if (!devUrl || !prodUrl || devUrl === prodUrl) {
  throw new Error('Não consegui distinguir os environments de dev e produção — o guard abaixo ficaria inútil.');
}

const bundled = readdirSync(outdir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => readFileSync(resolve(outdir, f), 'utf8'))
  .join('');

if (bundled.includes(devUrl)) {
  throw new Error(
    `O bundle do Worker levou o environment de DESENVOLVIMENTO (${devUrl}). ` +
      'O alias src/environments/environment -> environment.prod.ts em worker/tsconfig.json parou de valer.',
  );
}
if (!bundled.includes(prodUrl)) {
  throw new Error(`O bundle do Worker não contém o environment de produção (${prodUrl}).`);
}

const outputs = Object.entries(result.metafile.outputs)
  .filter(([name]) => !name.endsWith('.map'))
  .sort((a, b) => b[1].bytes - a[1].bytes);

for (const [name, meta] of outputs) {
  console.log(`  ${name.padEnd(46)} ${(meta.bytes / 1024).toFixed(0).padStart(6)} KB`);
}
