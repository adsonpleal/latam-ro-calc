import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

// The calculator engine (src/app/core, utils, domain, constants, jobs, models,
// replay) is framework-free TypeScript, so the logic suite runs in plain Node
// with no Angular/DOM bootstrap. The app still keeps Karma (`npm run test:ng`)
// for any component-level specs; Vitest owns the fast unit tests.
export default defineConfig({
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
    include: ['src/**/*.spec.ts', 'mcp/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      include: ['src/app/core/**', 'src/app/utils/**', 'src/app/domain/**', 'src/app/replay/**'],
      exclude: ['**/*.spec.ts', '**/__tests__/**'],
    },
  },
});
