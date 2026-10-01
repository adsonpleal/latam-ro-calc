import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/** Generated data directory events on Windows include the directory itself. */
export function isWebSourceChange(name) {
  if (!name) return false;
  const path = name.replaceAll('\\', '/');
  return path !== 'assets' && path !== 'assets/data' && !path.startsWith('assets/data/') && path !== 'assets/data-manifest.json' && !path.endsWith('.spec.ts');
}
/** Ignore metadata/read events and duplicate notifications; rebuild for changed bytes. */
export function createSourceTracker(directory) {
  const previous = new Map();
  function fingerprint(path) {
    try {
      if (!statSync(path).isFile()) return undefined;
      return createHash('sha256').update(readFileSync(path)).digest('hex');
    } catch (error) { if (error.code === 'ENOENT') return undefined; throw error; }
  }
  function collect(path, prefix = '') {
    for (const entry of readdirSync(path, { withFileTypes: true })) {
      const name = prefix + entry.name;
      if (entry.isDirectory()) {
        if (name !== 'assets/data') collect(resolve(path, entry.name), name + '/');
      } else if (isWebSourceChange(name)) previous.set(name, fingerprint(resolve(directory, name)));
    }
  }
  collect(directory);
  return name => {
    if (!isWebSourceChange(name)) return false;
    const key = name.replaceAll('\\', '/');
    const current = fingerprint(resolve(directory, key));
    if (current === previous.get(key)) return false;
    if (current === undefined) previous.delete(key); else previous.set(key, current);
    return true;
  };
}
