/**
 * The changelog is served as a fetched artifact, never bundled.
 *
 * It is append-only: every release adds an entry, and since the notes became trilingual
 * an entry costs ~2,3 KB. While `history.json` was a bundled import, publishing notes
 * grew the browser bundle, which tripped the `totalBaseline` ratchet inside the deploy's
 * own release step — after the pull request's build had already passed. Two deploys died
 * that way (see docs/dependency-reduction.md) before the file moved out.
 *
 * So these are not style preferences. The first test is the regression guard: one
 * `import` of history.json anywhere under src/ puts 800 KB back in the bundle and breaks
 * every future release.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DATA_KEYS, DataManifest, manifestPath } from 'src/app/core/data-manifest';
import { ReleaseEntry } from 'src/releases/entry-logs';

const history: ReleaseEntry[] = JSON.parse(readFileSync('src/releases/history.json', 'utf8'));
const manifest: DataManifest = JSON.parse(readFileSync('src/assets/data-manifest.json', 'utf8'));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('the changelog as a data artifact', () => {
  it('is read by summary.ts alone, the one module browser-data.mjs replaces', () => {
    const readers = sourceFiles('src')
      // A quoted module specifier, so the prose in entry-logs.ts does not count as a read.
      .filter(file => /['"][^'"]*history\.json['"]/.test(readFileSync(file, 'utf8')))
      .map(file => relative('.', file).split(sep).join('/'));
    // summary.ts may: `browser-data.mjs` rewrites that module in browser builds down to
    // the version strings, so the logs never reach the bundle through it.
    expect(readers).toEqual(['src/releases/summary.ts']);
  });

  it('is emitted under a manifest key the browser client knows', () => {
    expect(DATA_KEYS).toContain('releaseHistory');
    expect(manifest.files.releaseHistory).toMatch(/^release-history\./);
  });

  it('carries every entry verbatim, in all three languages', () => {
    const emitted = JSON.parse(readFileSync(join('src', manifestPath(manifest, 'releaseHistory')), 'utf8'));
    expect(emitted).toEqual(history);
    // The dialog reads logs_es/logs_en off these entries, so a projection that dropped
    // them would leave Spanish and English readers on the Portuguese fallback. Entries
    // older than the trilingual fragments have none, which `entryLogs` handles; what must
    // not happen is a translation that covers only part of an entry.
    const ragged = (emitted as ReleaseEntry[]).filter(entry =>
      (entry.logs_es && entry.logs_es.length !== entry.logs.length)
      || (entry.logs_en && entry.logs_en.length !== entry.logs.length));
    expect(ragged.map(entry => entry.v)).toEqual([]);
    expect((emitted as ReleaseEntry[]).filter(entry => entry.logs_es).length).toBeGreaterThan(100);
  });

  it('is not one of the artifacts fetched before the first paint', () => {
    const inject = readFileSync('tools/inject-data-manifest.mjs', 'utf8');
    const eager = /const EAGER_KEYS = (\[[^\]]*\])/.exec(inject);
    expect(JSON.parse(eager![1].replaceAll("'", '"'))).not.toContain('releaseHistory');
  });
});
