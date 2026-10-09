// CI-only: each attempt starts from current main. A rejected normal push means
// another merge won the race; rebuild everything against that merge before retrying.
import { execFileSync, spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { prepareRelease } from './release-notes.mjs';

if (process.env.GITHUB_ACTIONS !== 'true' || !process.env.GITHUB_OUTPUT) {
  throw new Error('Run this coordinator only inside GitHub Actions');
}
const root = process.cwd();
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const pnpm = (...args) => execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' });
git('config', 'user.name', 'github-actions[bot]');
git('config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com');
let finished = false;
for (let attempt = 0; attempt < 5; attempt++) {
  git('fetch', 'origin', 'main', '--tags');
  git('reset', '--hard', 'origin/main');
  const version = prepareRelease(root);
  pnpm('install', '--frozen-lockfile');
  pnpm('lint:check');
  pnpm('typecheck');
  pnpm('test');
  pnpm('build');
  if (version) {
    git('add', 'package.json', 'src/releases/history.json', 'release-notes');
    git('commit', '-m', `chore: release ${version}`);
    const tag = `v${version}`;
    git('tag', tag);
    const push = spawnSync('git', ['push', '--atomic', 'origin', 'HEAD:refs/heads/main', `refs/tags/${tag}`], { stdio: 'inherit' });
    if (push.status !== 0) {
      git('tag', '-d', tag);
      console.log('Release push rejected; retrying against current main');
      continue;
    }
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `sha=${git('rev-parse', 'HEAD')}\n`);
  finished = true;
  break;
}
if (!finished) throw new Error('Release push failed after five attempts; rerun workflow');
