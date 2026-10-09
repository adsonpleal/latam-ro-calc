import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const exists = tag => spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], { stdio: 'ignore' }).status === 0;
git('fetch', 'origin', '--tags');
const history = JSON.parse(readFileSync('src/releases/history.json', 'utf8'));
for (const entry of history.toReversed()) {
  const release = `v${entry.v}`;
  const receipt = `announced/${release}`;
  // Only releases allocated by the new workflow participate; old history is
  // preserved without replaying historical Discord announcements.
  if (!exists(release) || exists(receipt)) continue;
  if (spawnSync('git', ['merge-base', '--is-ancestor', release, 'HEAD']).status !== 0) continue;
  execFileSync(process.execPath, ['tools/post-novidades.mjs'], {
    stdio: 'inherit', env: { ...process.env, RELEASE_VERSION: entry.v },
  });
  git('tag', receipt, release);
  git('push', 'origin', `refs/tags/${receipt}`);
}
