import { readFileSync } from 'node:fs';
import { build } from 'esbuild';
import { SKILL_META, SKILL_DESC_BY_ID } from '../src/app/skills';
import { browserDataPlugin, splitSkillCatalog } from './browser-data.mjs';
import { startupOutputs } from './web-startup.mjs';

describe('browser startup data', () => {
  it('keeps every skill identity while moving all description prose to a sidecar', () => {
    const { metadata, descriptions } = splitSkillCatalog(SKILL_META);
    expect(descriptions).toEqual(SKILL_DESC_BY_ID);
    expect(Object.keys(metadata)).toEqual(Object.keys(SKILL_META));
    for (const [name, meta] of Object.entries(SKILL_META)) {
      const { description, ...identity } = meta as { description?: string };
      expect(metadata[name]).toEqual(identity);
      expect(metadata[name]).not.toHaveProperty('description');
    }
  });

  it('projects the complete current version list without bundling the history logs', async () => {
    const result = await build({ entryPoints: ['src/releases/summary.ts'], bundle: true, write: false,
      format: 'esm', plugins: [browserDataPlugin(process.cwd())] });
    const code = result.outputFiles[0].text;
    const { releaseVersions } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
    const history = JSON.parse(readFileSync('src/releases/history.json', 'utf8'));
    expect(releaseVersions).toEqual(history.map((entry: { v: string }) => entry.v));
    expect(code).not.toContain(history[0].logs[0]);
    expect(code.length).toBeLessThan(10_000);
  });

  it('counts the required bootstrap and shared imports but leaves optional chunks lazy', () => {
    const outputs = {
      'main.js': { imports: [{ path: 'bootstrap.js', kind: 'dynamic-import' }] },
      'bootstrap.js': { imports: [{ path: 'shared.js', kind: 'import-statement' }, { path: 'history.js', kind: 'dynamic-import' }] },
      'shared.js': { imports: [{ path: 'external.js', kind: 'import-statement', external: true }] },
      'history.js': { imports: [] },
      'styles.css': { imports: [] },
    };
    expect([...startupOutputs(outputs, ['main.js', 'bootstrap.js', 'styles.css'])])
      .toEqual(['main.js', 'bootstrap.js', 'shared.js', 'styles.css']);
  });
});
