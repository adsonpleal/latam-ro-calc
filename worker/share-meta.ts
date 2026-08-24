/**
 * Share token → the Open Graph tags a crawler should see. Pure: no Worker runtime,
 * no fetch, no globals, so it is unit-testable in plain Node.
 *
 * Only three fields are read, and they are the three `share-codec.ts` keeps in its
 * ALWAYS_KEEP set — so every token ever minted carries them, whatever the build. That
 * is why the Worker needs no model defaults and no item database: the card image,
 * which the MCP server renders, is where everything else is shown.
 */
import { decodeShared } from '../src/app/core/share-codec';
import { buildSharePath, isShareToken } from '../src/app/core/share-path';
import { ClassID, ClassNamePtBr } from '../src/app/jobs/_class-name';

/**
 * A module constant, never `request.headers.host`: a spoofed Host would otherwise end
 * up in og:url and canonical, pointing a preview at somebody else's domain.
 */
export const SITE_ORIGIN = 'https://simulador.latam-tools.com.br';

/** Bounds the decompressed payload before it is parsed — lz-string is a compressor,
 *  and a short token can expand into megabytes of JSON. */
const MAX_PRESET_JSON_CHARS = 256 * 1024;

export interface ShareMeta {
  title: string;
  description: string;
  /** Canonical URL of this share link. */
  canonical: string;
  /** Absolute URL of the card image, proxied by this Worker. */
  image: string;
}

const finite = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/**
 * Returns null when there is nothing build-specific to say. The caller then serves the
 * shell untouched, so a human still gets a working app and a crawler still gets the
 * site's generic card — a bad token must never turn into a broken page.
 */
export function buildShareMeta(token: string | null | undefined): ShareMeta | null {
  if (!isShareToken(token)) return null;

  const shared = decodeShared(token, MAX_PRESET_JSON_CHARS);
  if (!shared) return null;

  const classId = finite(shared.preset['class']);
  const level = finite(shared.preset['level']);
  const jobLevel = finite(shared.preset['jobLevel']);
  if (classId === null || level === null || jobLevel === null) return null;

  const className = ClassNamePtBr[classId] ?? ClassID[classId] ?? 'Build';
  const path = buildSharePath(token as string);

  return {
    title: `${className} Nv. ${level}/${jobLevel} — Simulador de Dano RO LATAM`,
    description:
      `Build de ${className} (base ${level}, classe ${jobLevel}) no Simulador de Dano RO LATAM. ` +
      `Abra o link para ver os atributos, trocar equipamentos e calcular o dano.`,
    canonical: `${SITE_ORIGIN}${path}`,
    image: `${SITE_ORIGIN}${path}og.png`,
  };
}
