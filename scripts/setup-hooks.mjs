// Point git at the version-controlled hooks directory so `.githooks/*` runs for
// everyone after a plain `npm install` / `bun install` — no husky dependency.
//
// Invoked by the `prepare` lifecycle script. Wrapped in try/catch so a missing
// git binary or a non-repo checkout (e.g. a CI source tarball) can never fail
// the install.
import { execSync } from 'node:child_process';

try {
  execSync('git config core.hooksPath .githooks', { stdio: 'ignore' });
  console.log('✓ git hooks path set to .githooks (pre-push runs the tests)');
} catch {
  // No git available / not a git checkout — nothing to wire up.
}
