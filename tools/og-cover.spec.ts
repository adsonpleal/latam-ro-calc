/**
 * src/assets/og-cover.png is what index.html hands crawlers for the homepage, and what
 * the share Worker falls back to when a per-build card cannot be produced.
 *
 * It is a **vendored artefact**: latam-social renders it (src/projects/ro-calc/cover.ts
 * there) and it is copied in, because the fallback has to keep working precisely when
 * that service does not. Refresh it with:
 *
 *   curl https://social.latam-tools.com.br/ro-calc/cover.png -o src/assets/og-cover.png
 *
 * The .svg beside it is the diffable source and has no route — the service only serves
 * PNG. Regenerate it there with `pnpm cover` and copy both files across.
 *
 * This spec asserts only what index.html actually promises about it. Whether it still
 * matches the live card design is not checkable from here — that is the accepted cost of
 * vendoring, and latam-social's own specs hold the design together on its side.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const png = readFileSync('src/assets/og-cover.png');

describe('the vendored social cover', () => {
  it('is a PNG', () => {
    expect(png.subarray(0, 4).toString('hex')).toBe('89504e47');
  });

  it('is the size the meta tags declare', () => {
    // src/index.html advertises og:image:width 1200 / og:image:height 630. A mismatch
    // makes some crawlers refuse the image outright rather than scale it.
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
