import { describe, expect, it } from 'vitest';
import { createSourceTracker, isWebSourceChange } from './web-watch.mjs';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('development rebuild inputs', () => {
  it('ignores duplicate/read events but detects changes, additions and deletions', () => {
    const directory = mkdtempSync(join(tmpdir(), 'ro-watch-'));
    try {
      const source = join(directory, 'main.ts'); writeFileSync(source, 'one');
      const changed = createSourceTracker(directory);
      readFileSync(source); expect(changed('main.ts')).toBe(false);
      writeFileSync(source, 'two'); expect(changed('main.ts')).toBe(true);
      expect(changed('main.ts')).toBe(false);
      writeFileSync(join(directory, 'new.ts'), 'new'); expect(changed('new.ts')).toBe(true);
      rmSync(source); expect(changed('main.ts')).toBe(true);
      expect(changed('main.ts')).toBe(false);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
  it('does not rebuild itself when generated data is removed or recreated', () => {
    for (const name of ['assets', 'assets/data', 'assets\\data', 'assets/data/items.json', 'assets\\data\\items.json', 'assets/data-manifest.json']) expect(isWebSourceChange(name)).toBe(false);
  });
  it('does rebuild for source data, styles, code and asset changes', () => {
    for (const name of ['assets/demo/data/item.json', 'assets/icons/ui/check.svg', 'styles.css', 'app/ui/select.component.ts', 'build-web.mjs']) expect(isWebSourceChange(name)).toBe(true);
    expect(isWebSourceChange('app/ui/select.component.spec.ts')).toBe(false);
  });
});
