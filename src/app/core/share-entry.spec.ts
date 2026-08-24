import { afterEach, describe, expect, it } from 'vitest';
import { captureShareEntry, resetShareEntry, shareEntryHref } from './share-entry';
import { readShareToken } from './share-path';

afterEach(() => resetShareEntry());

describe('shareEntryHref', () => {
  it('returns what was captured, not what the URL later became', () => {
    // The whole point: by the time the app reads it, `window.location.href` is
    // '<origin>/#/' — the router's first replaceState resolved '#/' against
    // <base href="/"> and took the share path with it.
    captureShareEntry('https://simulador.latam-tools.com.br/s/abc/');
    expect(readShareToken(shareEntryHref())).toBe('abc');
  });

  it('falls back to the live URL when nothing was captured', () => {
    // No DOM in this suite, so the fallback is the empty string rather than a throw.
    expect(shareEntryHref()).toBe('');
  });

  it('keeps the last capture', () => {
    captureShareEntry('https://x/s/one/');
    captureShareEntry('https://x/s/two/');
    expect(readShareToken(shareEntryHref())).toBe('two');
  });
});
