import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { prepareRelease, readFragments } from './release-notes.mjs';

describe('release fragments', () => {
  let root: string;
  beforeEach(() => {
    root = mkdtempSync(resolve(tmpdir(), 'release-notes-'));
    mkdirSync(resolve(root, 'release-notes'));
    mkdirSync(resolve(root, 'src/releases'), { recursive: true });
    writeFileSync(resolve(root, 'package.json'), JSON.stringify({ version: '0.1.165-beta' }));
    writeFileSync(resolve(root, 'src/releases/history.json'), JSON.stringify([
      { v: '0.1.165-beta', date: '06-10-2026', logs: ['Earlier release'] },
    ]));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  const fragment = (name: string, logs: unknown[]) => writeFileSync(resolve(root, 'release-notes', name), JSON.stringify({ type: 'patch', logs }));

  it('batches parallel changes, preserves history, and does not bump again on retry', () => {
    fragment('b.json', ['Second change']);
    fragment('a.json', ['First change']);
    expect(prepareRelease(root, new Date('2026-10-09T01:00:00Z'))).toBe('0.1.166-beta');
    const history = JSON.parse(readFileSync(resolve(root, 'src/releases/history.json'), 'utf8'));
    expect(history[0]).toEqual({ v: '0.1.166-beta', date: '08-10-2026', logs: ['First change', 'Second change'] });
    expect(history[1].v).toBe('0.1.165-beta');
    expect(readdirSync(resolve(root, 'release-notes'))).toEqual([]);
    expect(prepareRelease(root)).toBeNull();
    fragment('c.json', ['Later change']);
    expect(prepareRelease(root)).toBe('0.1.167-beta');
  });

  it('rejects malformed notes before modifying version or consuming any fragments', () => {
    fragment('a.json', ['Valid']);
    fragment('b.json', [' ']);
    expect(() => prepareRelease(root)).toThrow('Invalid release fragment');
    expect(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version).toBe('0.1.165-beta');
    expect(readdirSync(resolve(root, 'release-notes'))).toHaveLength(2);
  });

  it('validates read-only and refuses inconsistent release history', () => {
    fragment('a.json', ['Change']);
    expect(readFragments(root)).toHaveLength(1);
    writeFileSync(resolve(root, 'package.json'), JSON.stringify({ version: '0.1.164-beta' }));
    expect(() => prepareRelease(root)).toThrow('disagree');
    expect(readdirSync(resolve(root, 'release-notes'))).toHaveLength(1);
  });
});
