import history from './history.json';

// tools/browser-data.mjs emits only this small projection in browser builds.
export const releaseVersions: readonly string[] = history.map(entry => entry.v);
