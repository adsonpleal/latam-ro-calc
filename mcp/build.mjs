/**
 * Bundles the MCP server into a single self-contained ESM file.
 *
 * The engine is pulled in from `src/app/**` as source; `mcp/tsconfig.json` supplies
 * both the `src/*` alias and the production-environment swap, so what ships matches
 * what the website runs. The data JSONs are deliberately NOT inlined — 18 MB of JS
 * object literals parses slower than the equivalent JSON and would be retained twice.
 */
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as esbuild from 'esbuild';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await esbuild.build({
  entryPoints: [resolve(root, 'mcp/src/index.ts')],
  outfile: resolve(root, 'dist/mcp/server.mjs'),
  tsconfig: resolve(root, 'mcp/tsconfig.json'),
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  minify: true,
  sourcemap: 'linked',
  metafile: true,
  // Some transitive CJS deps call require() at runtime; ESM output has no such global.
  banner: { js: "import{createRequire as __cr}from'module';const require=__cr(import.meta.url);" },
  logLevel: 'info',
});

const bytes = Object.values(result.metafile.outputs).reduce((sum, o) => sum + o.bytes, 0);
console.log(`bundled dist/mcp/server.mjs (${(bytes / 1024 / 1024).toFixed(2)} MB incl. sourcemap)`);
