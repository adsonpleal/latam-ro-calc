import { readFileSync, readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspace = resolve(import.meta.dirname, '..');
const root = process.argv[3] ? resolve(workspace, process.argv[3]) : workspace;
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
function size(path) {
  try {
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) return 0;
    if (stat.isFile()) return stat.size;
    return readdirSync(path).reduce((total, name) => total + size(resolve(path, name)), 0);
  } catch (error) { if (error.code === 'ENOENT') return 0; throw error; }
}
const lock = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8').replace(/\r\n/g, '\n');
const packages = lock.split('\npackages:\n')[1]?.split('\nsnapshots:\n')[0] ?? '';
const result = {
  runtimeDirect: Object.keys(manifest.dependencies ?? {}).length,
  developmentDirect: Object.keys(manifest.devDependencies ?? {}).length,
  uniqueLockedPackages: (packages.match(/^  \S.*:\s*$/gm) ?? []).length,
  installedBytes: size(resolve(root, 'node_modules')),
  webBundleBytes: (size(resolve(root, 'dist/sakai-ng')) ? readdirSync(resolve(root, 'dist/sakai-ng'), { withFileTypes: true }) : [])
    .filter(entry => entry.isFile() && /\.(js|css)$/.test(entry.name))
    .reduce((sum, entry) => sum + size(resolve(root, 'dist/sakai-ng', entry.name)), 0),
};
console.log(JSON.stringify(result, null, 2));
if (process.argv[2]) writeFileSync(resolve(workspace, process.argv[2]), JSON.stringify(result, null, 2) + '\n');
