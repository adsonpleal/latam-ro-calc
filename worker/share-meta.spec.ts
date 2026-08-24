import { describe, expect, it } from 'vitest';
import { encodeBuild } from '../src/app/core/share-codec';
import { buildShareMeta, SITE_ORIGIN } from './share-meta';

const token = (preset: Record<string, any>) => encodeBuild(preset);

describe('buildShareMeta', () => {
  it('names the class and the levels, in pt-BR', () => {
    const meta = buildShareMeta(token({ class: 4252, level: 285, jobLevel: 70 }));
    expect(meta?.title).toBe('Cavaleiro Draconiano Nv. 285/70 — Simulador de Dano RO LATAM');
    expect(meta?.description).toContain('Cavaleiro Draconiano');
    expect(meta?.description).toContain('base 285');
  });

  it('works for a build that carries nothing but its identity', () => {
    // class/level/jobLevel are share-codec's ALWAYS_KEEP set, so they are the three
    // fields every token has ever carried — which is why the Worker needs no defaults.
    expect(buildShareMeta(token({ class: 12, level: 1, jobLevel: 1 }))?.title).toContain('Cavaleiro Rúnico');
  });

  it('falls back to the English name, then to a generic one', () => {
    // ClassNamePtBr is partial; ClassID covers the rest, and an id in neither still
    // has to produce a usable title rather than "undefined Nv. 1/1".
    expect(buildShareMeta(token({ class: 999999, level: 10, jobLevel: 5 }))?.title).toBe(
      'Build Nv. 10/5 — Simulador de Dano RO LATAM',
    );
  });

  it('builds both URLs from the constant origin, never from the request', () => {
    // A spoofed Host must not be able to point og:url or og:image somewhere else.
    const t = token({ class: 4252, level: 285, jobLevel: 70 });
    const meta = buildShareMeta(t);
    expect(meta?.canonical).toBe(`${SITE_ORIGIN}/s/${t}/`);
    expect(meta?.image).toBe(`${SITE_ORIGIN}/s/${t}/og.png`);
  });

  it('returns null for anything it cannot read', () => {
    // The caller then serves the shell untouched: a bad token degrades the preview,
    // it never breaks the page.
    expect(buildShareMeta(null)).toBeNull();
    expect(buildShareMeta('')).toBeNull();
    expect(buildShareMeta('a/b')).toBeNull();
    expect(buildShareMeta('a'.repeat(5000))).toBeNull();
    expect(buildShareMeta('obviously-not-a-token')).toBeNull();
  });

  it('returns null for a token whose payload is not a build', () => {
    expect(buildShareMeta(encodeBuild({ hello: 'world' } as any))).toBeNull();
  });
});
