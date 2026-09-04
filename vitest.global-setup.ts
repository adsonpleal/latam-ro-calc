import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Regenerate `src/assets/data/` before the suite runs, when it is missing or stale.
 *
 * Six spec files build a real Dataset out of those artifacts (`mcp/src/data/dataset.node.ts`),
 * and `mcp/src/data/derived-parity.spec.ts` exists precisely to prove the generator loses
 * nothing — which it cannot do if it reads output from an older `item.json`. The directory
 * is gitignored, so on a fresh checkout it is not there at all.
 *
 * This lives here rather than in the `test` npm script so that `test:watch` and `test:cov`
 * get the same guarantee; a script string only covers the one entry point someone
 * remembered.
 */
const SRC = 'src/assets/demo/data';
const OUT = 'src/assets/data';
const MANIFEST = 'src/assets/data-manifest.json';

const newest = (dir: string): number => {
  try {
    return readdirSync(dir).reduce((max, file) => Math.max(max, statSync(join(dir, file)).mtimeMs), 0);
  } catch {
    return 0; // missing directory: treat as "nothing generated yet"
  }
};

/**
 * True when the manifest exists and every file it names is on disk. Guards the case a
 * timestamp cannot see: `pnpm build` emits hashed names, so a manifest can be newer than
 * the sources while pointing at files a later `pnpm data:dev` has already replaced.
 */
function complete(): boolean {
  try {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { base: string; files: Record<string, string> };
    return Object.values(manifest.files).every((file) => existsSync(join('src', manifest.base + file)));
  } catch {
    return false;
  }
}

export default function setup(): void {
  const generated = newest(OUT);
  if (generated > 0 && generated >= newest(SRC) && complete()) return;

  execFileSync(process.execPath, ['tools/build-web-data.mjs'], { stdio: 'inherit' });
}
