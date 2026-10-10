#!/usr/bin/env node
// Orchestrator-only: bind an immutable served build to its static resource bytes.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
const [directory, buildId, output] = process.argv.slice(2);
if (!directory || !buildId || !output) throw new Error('Usage: node build-contract.mjs BUILD_DIRECTORY BUILD_ID EXPECTED_CONTRACT.json');
const root = resolve(directory);
const files = {};
function walk(path) {
  for (const entry of readdirSync(path, { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name))) {
    const full = resolve(path, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) {
      const name = '/' + relative(root, full).split('\\').join('/');
      if (name === '/__responsive-build.json' || name.endsWith('.map')) continue;
      files[name] = createHash('sha256').update(readFileSync(full)).digest('hex');
    } else throw new Error(`Build contains unsupported non-regular file: ${full}`);
  }
}
walk(root);
if (!files['/index.html']) throw new Error('Build directory must contain index.html');
const resources = Object.fromEntries(Object.entries(files).sort(([a],[b]) => a.localeCompare(b)));
const contract = { build_id: buildId, resource_digest: createHash('sha256').update(JSON.stringify(resources)).digest('hex'), files: resources };
const serialized = JSON.stringify(contract, null, 2) + '\n';
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(resolve(output), serialized);
writeFileSync(resolve(root, '__responsive-build.json'), serialized);
console.log(`Build contract: ${buildId}; ${Object.keys(resources).length} resources; ${contract.resource_digest}`);
