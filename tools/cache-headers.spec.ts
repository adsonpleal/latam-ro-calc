// Guards the cache policy in src/_headers.
//
// The whole design rests on one invariant: no two rules may match the same path. Cloudflare
// applies EVERY matching rule and joins repeated headers with a comma, so an overlap does
// not error — it silently emits `Cache-Control: no-cache, public, max-age=31536000,
// immutable` and no-cache wins. Nothing in a build or a deploy would catch that, hence this
// spec.
//
// The second invariant is that the SPA shell matches NO rule, so it inherits Cloudflare's
// `public, max-age=0, must-revalidate` default. That is what keeps a deploy from being
// stuck behind a stale index.html.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const HEADERS_FILE = join(ROOT, 'src/_headers');
const DIST = join(ROOT, 'dist/sakai-ng');

interface Rule {
  pattern: string;
  headers: Record<string, string>;
}

function parseHeaders(text: string): Rule[] {
  const rules: Rule[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: {} });
      continue;
    }
    const idx = line.indexOf(':');
    if (idx === -1 || rules.length === 0) continue;
    rules[rules.length - 1].headers[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return rules;
}

// Cloudflare's splat is greedy and crosses path segments: `/assets/*` does match
// `/assets/data/x.json`. Model it exactly, or the spec would bless overlaps the platform
// would actually produce.
function matches(pattern: string, path: string): boolean {
  const rx = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
  return rx.test(path);
}

const RULES = parseHeaders(readFileSync(HEADERS_FILE, 'utf8'));

function matching(path: string): Rule[] {
  return RULES.filter((r) => matches(r.pattern, path));
}

const IMMUTABLE = 'public, max-age=31536000, immutable';
const ONE_DAY = 'public, max-age=86400';

describe('src/_headers', () => {
  it('parses into rules that all set Cache-Control', () => {
    expect(RULES.length).toBeGreaterThan(0);
    for (const rule of RULES) {
      expect(rule.headers['Cache-Control'], `${rule.pattern} sets no Cache-Control`).toBeTruthy();
    }
  });

  it('has no catch-all rule', () => {
    // `/*` would match everything and comma-join into every other rule.
    expect(RULES.map((r) => r.pattern)).not.toContain('/*');
  });

  describe('content-hashed files cache forever', () => {
    const paths = [
      '/main.JRDFR52D.js',
      '/polyfills.RCMVNLZG.js',
      '/scripts.4FWRIP5I.js',
      '/chunk-ESOZRO5K.js',
      '/styles.OJPDPOTQ.css',
      '/media/primeicons.XI7ZC3P3.woff2',
      '/assets/data/items-core.826c04a2ab.json',
      '/assets/data/monsters.f0e1ecf99e.json',
    ];
    it.each(paths)('%s -> immutable, from exactly one rule', (path) => {
      const hit = matching(path);
      expect(hit.map((r) => r.pattern)).toHaveLength(1);
      expect(hit[0].headers['Cache-Control']).toBe(IMMUTABLE);
    });
  });

  describe('stable filenames get one day', () => {
    const paths = [
      '/assets/layout/styles/theme/vela-green/theme.css',
      '/assets/layout/images/logo.svg',
      '/assets/icons/icon-192.png',
      '/assets/og-cover.png',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/manifest.webmanifest',
    ];
    it.each(paths)('%s -> 86400, from exactly one rule', (path) => {
      const hit = matching(path);
      expect(hit.map((r) => r.pattern)).toHaveLength(1);
      expect(hit[0].headers['Cache-Control']).toBe(ONE_DAY);
    });
  });

  it('the data manifest is explicitly no-cache, and /assets/data/* cannot reach it', () => {
    // It names which hashed data files to load, so a stale copy points the app at a
    // previous build. Explicit rather than relying on the platform default.
    const hit = matching('/assets/data-manifest.json');
    expect(hit.map((r) => r.pattern)).toEqual(['/assets/data-manifest.json']);
    expect(hit[0].headers['Cache-Control']).toBe('no-cache');
  });

  describe('only the SPA shell relies on the platform default', () => {
    // Client-side routes cannot be enumerated, so these match nothing and inherit
    // `public, max-age=0, must-revalidate`. Adding a rule here is a regression, not a
    // tidy-up — every path that CAN be named already is.
    //
    // The /s/* paths are share links, which the Worker answers with responses of its
    // own; _headers never applies to them. The shell it hands back embeds this build's
    // hashed bundle names, so must-revalidate is exactly what it needs — a rule here
    // would let a share link go stale across a deploy.
    const paths = [
      '/',
      '/index.html',
      '/some/client-side/route',
      '/?b=sharetoken',
      '/s/N4IgxgN.gA6.0A7',
      '/s/N4IgxgN.gA6.0A7/',
      '/s/N4IgxgN.gA6.0A7/og.png',
    ];
    it.each(paths)('%s', (path) => {
      expect(matching(path).map((r) => r.pattern)).toHaveLength(0);
    });
  });

  it('uses no literal suffix after a splat', () => {
    // Cloudflare documents `*` as greedy but not that it backtracks to satisfy a trailing
    // literal. `/main.*.js` would depend on undocumented behaviour; `/main.*` does not.
    for (const { pattern } of RULES) {
      const splat = pattern.indexOf('*');
      if (splat === -1) continue;
      expect(pattern.slice(splat), `${pattern} has a literal after its splat`).toBe('*');
    }
  });

  it('never lets two rules claim the same built file', () => {
    if (!existsSync(DIST)) return; // dist is not in git; only assert when a build is present

    const walk = (dir: string, prefix = ''): string[] =>
      readdirSync(dir).flatMap((name) => {
        const full = join(dir, name);
        return statSync(full).isDirectory() ? walk(full, `${prefix}/${name}`) : [`${prefix}/${name}`];
      });

    const overlaps = walk(DIST)
      .filter((p) => p !== '/_headers')
      .map((p) => ({ path: p, hit: matching(p).map((r) => r.pattern) }))
      .filter((r) => r.hit.length > 1);

    expect(overlaps).toEqual([]);
  });
});

describe('angular.json', () => {
  it('copies _headers into every build output', () => {
    const config = JSON.parse(readFileSync(join(ROOT, 'angular.json'), 'utf8'));
    const targets = config.projects['ro-calculator']?.architect ?? Object.values<any>(config.projects)[0].architect;

    const withAssets = Object.entries<any>(targets).filter(([, t]) => Array.isArray(t.options?.assets));
    expect(withAssets.length).toBeGreaterThan(0);

    // ng build fails on a missing asset, so a target that lists it also proves the file
    // exists — but only for the targets that actually list it. Hence: all of them.
    for (const [name, target] of withAssets) {
      expect(target.options.assets, `${name} does not copy src/_headers`).toContain('src/_headers');
    }
  });
});
