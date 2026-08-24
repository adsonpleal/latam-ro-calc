import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// The calculator engine (src/app/core, utils, domain, constants, jobs, models,
// replay) is framework-free TypeScript, so the logic suite runs in plain Node
// with no Angular/DOM bootstrap. The app still keeps Karma (`npm run test:ng`)
// for any component-level specs; Vitest owns the fast unit tests.
export default defineConfig({
  plugins: [
    // The runnable scripts under tools/ open with `#!/usr/bin/env node`. Node strips a
    // shebang when it imports a module, but vite-node inlines the file and hands the `#!`
    // straight to the parser, which dies with "Invalid or unexpected token" — reported
    // against whichever spec did the import, at a line number that doesn't exist there,
    // so the message points nowhere near the cause. `server.deps.external` doesn't help:
    // it only covers bare package ids, not relative paths. Comment the line out instead,
    // keeping the line count so stack traces still line up.
    //
    // This bit tools/sync-latam-db.spec.ts, which imports sync-latam-db.mjs: it only ever
    // passed while a stale transform sat in the vite cache, and started failing the moment
    // the file was re-materialised by a branch switch.
    {
      name: 'strip-tools-shebang',
      enforce: 'pre',
      transform(code: string, id: string) {
        if (!/[\\/]tools[\\/].+\.mjs$/.test(id) || !code.startsWith('#!')) return null;
        return { code: code.replace(/^#![^\n]*/, '//'), map: null };
      },
    },
  ],
  resolve: {
    // Order matters — first match wins.
    alias: [
      // Mirror angular.json's production `fileReplacements`, which only the Angular
      // builder applies. CharacterBase's atkSkills/activeSkills/passiveSkills getters
      // branch on `environment.production` to hide dev-only skills, so without this the
      // suite would exercise a skill universe the site never ships — and the MCP
      // server, which bundles with the same swap, would be tested against the wrong one.
      {
        find: /^src\/environments\/environment$/,
        replacement: resolve(process.cwd(), 'src/environments/environment.prod.ts'),
      },
      // The codebase imports with the tsconfig `baseUrl: "./"` style, e.g.
      // `import { floor } from 'src/app/utils'`. Map that prefix to the real dir.
      { find: /^src\//, replacement: resolve(process.cwd(), 'src') + '/' },
    ],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'mcp/**/*.spec.ts', 'worker/**/*.spec.ts', 'tools/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/app/core/**', 'src/app/utils/**', 'src/app/domain/**', 'src/app/replay/**'],
      exclude: ['**/*.spec.ts', '**/__tests__/**'],
    },
  },
});
