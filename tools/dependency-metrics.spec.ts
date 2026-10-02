import { countLockedPackages } from './dependency-metrics.mjs';

describe('dependency metrics', () => {
  it('counts package definitions across pnpm 12 documents without counting snapshots or duplicate versions', () => {
    const lock = `---
packages:
  'pnpm@12.8.1':
    resolution: {integrity: example}
  '@pnpm/exe@12.8.1':
    optional: true
snapshots:
  'pnpm@12.8.1': {}
---
packages:
  pnpm@12.8.1:
    resolution: {integrity: example}
  react@19.3.0:
    resolution: {integrity: example}
snapshots:
  react@19.3.0: {}
`;
    expect(countLockedPackages(lock)).toBe(3);
    expect(countLockedPackages(lock.replace(/\n/g, '\r\n'))).toBe(3);
  });
});
