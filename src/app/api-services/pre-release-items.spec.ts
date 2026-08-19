/**
 * Watches the `preRelease` opt-in in item.json — the one hand-authored source of
 * `presentInLatam` (see docs/item-json.md).
 *
 * A `preRelease` item is one LATAM has not shipped yet, listed anyway with the English
 * name and description taken from its iRO page on divine-pride. That is a stopgap: the
 * day the client update lands, `sync-with-ragassets` brings the id into latam-items.json
 * and the pt-BR overlay silently wins for `name`/`description` — leaving a stale English
 * `description` in item.json and a flag that no longer does anything.
 *
 * Nothing would go visibly wrong, which is exactly why this is a test: the failure below
 * is the reminder to go back, drop the flag, reset `description` to "" and let the overlay
 * take over. It is the only signal we get.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const readData = (file: string): Record<string, any> =>
  JSON.parse(readFileSync(join(process.cwd(), 'src/assets/demo/data', file), 'utf8'));

const items = readData('item.json');
const latam = readData('latam-items.json');

const preReleaseKeys = Object.keys(items).filter((key) => items[key].preRelease);

describe('preRelease items', () => {
  it('lists the ids waiting on LATAM', () => {
    // Guards the guard: if the sweep ever matched nothing, every check below would pass
    // vacuously and the graduation reminder would be gone without anyone noticing.
    expect(preReleaseKeys.length).toBeGreaterThan(0);
  });

  it('graduates once LATAM ships them — drop the flag and restore the pt-BR overlay', () => {
    const shipped = preReleaseKeys
      .filter((key) => latam[items[key].id] ?? latam[key])
      .map((key) => `${key} (${items[key].name})`);

    expect(shipped).toEqual([]);
  });

  it('carries the iRO English text, since there is no pt-BR one to overlay', () => {
    // The opposite of every other record, which leaves `description: ""` and takes the
    // pt-BR text from latam-items.json at build time.
    const empty = preReleaseKeys.filter((key) => !items[key].description?.trim());
    expect(empty).toEqual([]);
  });
});
