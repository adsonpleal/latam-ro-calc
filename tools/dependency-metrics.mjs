import { readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = resolve(import.meta.dirname, '..');
const root = process.argv[3] ? resolve(workspace, process.argv[3]) : workspace;
/** pnpm 12 stores package-manager and application locks as separate YAML documents. */
export function countLockedPackages(lock) {
  const names = new Set();
  let inPackages = false;
  for (const line of lock.replace(/\r\n/g, '\n').split('\n')) {
    if (/^packages:\s*$/.test(line)) { inPackages = true; continue; }
    if (/^\S/.test(line)) { inPackages = false; continue; }
    if (!inPackages) continue;
    const key = /^  (\S.*):\s*$/.exec(line)?.[1];
    if (key) names.add(key.replace(/^(['"])(.*)\1$/, '$2'));
  }
  return names.size;
}
function size(path) {
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return 0;
    if (stat.isFile()) return stat.size;
    return readdirSync(path).reduce((total, name) => total + size(resolve(path, name)), 0);
  } catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const lock = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8');
  const result = {
    runtimeDirect: Object.keys(manifest.dependencies ?? {}).length,
    developmentDirect: Object.keys(manifest.devDependencies ?? {}).length,
    uniqueLockedPackages: countLockedPackages(lock),
    installedBytes: size(resolve(root, 'node_modules')),
    webBundleBytes: (size(resolve(root, 'dist/sakai-ng')) ? readdirSync(resolve(root, 'dist/sakai-ng'), { withFileTypes: true }) : [])
      .filter(entry => entry.isFile() && /\.(js|css)$/.test(entry.name))
      .reduce((sum, entry) => sum + size(resolve(root, 'dist/sakai-ng', entry.name)), 0),
  };
  console.log(JSON.stringify(result, null, 2));
  if (process.argv[2]) writeFileSync(resolve(workspace, process.argv[2]), JSON.stringify(result, null, 2) + '\n');
}
