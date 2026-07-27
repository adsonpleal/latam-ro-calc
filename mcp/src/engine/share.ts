/**
 * The share-link bridge: the same token the web calculator reads from `#/?b=…`.
 *
 * Both directions matter. Agents receive links people copied out of the browser, and
 * hand back links people open in it — so this module must stay byte-compatible with
 * `RoCalculatorComponent#buildShareUrl` / `#consumeSharedBuild`.
 */
import { CompareState } from 'src/app/core/compare-state';
import { decodeShared, encodeBuild } from 'src/app/core/share-codec';
import { CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { MainModel } from 'src/app/models/main.model';
import { toUpsertPresetModel } from 'src/app/utils';

/** Same pattern the app uses. Never URLSearchParams — it would mangle the token. */
const TOKEN_IN_URL = /[?&]b=([^&#\s]+)/;

export interface DecodedShare {
  preset: Record<string, any>;
  compare: CompareState | null;
}

/** A build as the app serializes it for saving/sharing. */
export const toPreset = (model: MainModel, char: CharacterBase): Record<string, any> =>
  toUpsertPresetModel(model, char) as unknown as Record<string, any>;

export const buildShareUrl = (preset: Record<string, any>, appOrigin: string, compare?: CompareState | null): string =>
  `${appOrigin.replace(/\/+$/, '')}/#/?b=${encodeBuild(preset, compare)}`;

/**
 * Accepts a full URL, a `#/?b=…` fragment, or a bare token, and returns the sparse
 * build plus any comparison it carries. Throws on anything undecodable — an agent
 * silently calculating a default build from a typo'd link would be worse.
 */
export function parseShare(input: string): DecodedShare {
  const raw = (input ?? '').trim();
  if (!raw) throw new Error('Link de compartilhamento vazio.');

  const token = raw.match(TOKEN_IN_URL)?.[1] ?? raw;
  const decoded = decodeShared(token);
  if (!decoded) throw new Error('Link de compartilhamento inválido ou corrompido.');
  return decoded;
}

/** Whether a string looks like a shortened link that needs resolving first. */
const isShortLink = (input: string, shortenerUrl: string): boolean => {
  const s = (input ?? '').trim();
  return s.startsWith(shortenerUrl) && !TOKEN_IN_URL.test(s);
};

/** Expand a shortened link, or pass anything else through untouched. */
export const resolveIfShort = async (share: string, shortenerUrl: string): Promise<string> =>
  isShortLink(share, shortenerUrl) ? resolveShortLink(share) : share;

/**
 * Follow a short link to the real share URL. People paste the shortened form because
 * that's what the app's share dialog hands them.
 */
export async function resolveShortLink(url: string, timeoutMs = 3000): Promise<string> {
  const signal = AbortSignal.timeout(timeoutMs);
  const res = await fetch(url, { redirect: 'follow', signal });
  // The token lives in the fragment, which fetch does not expose via res.url on a
  // redirect, so fall back to the Location header when needed.
  const location = res.headers.get('location');
  const candidate = TOKEN_IN_URL.test(res.url) ? res.url : location ?? res.url;
  if (!TOKEN_IN_URL.test(candidate)) throw new Error(`O link curto ${url} não aponta para uma simulação.`);
  return candidate;
}

/**
 * Shorten a share URL via the same service the app uses. Best-effort: the long URL
 * always works, so a shortener hiccup must not fail the tool call.
 */
export async function shortenShareUrl(url: string, shortenerUrl: string, timeoutMs = 3000): Promise<string> {
  try {
    const res = await fetch(`${shortenerUrl}/api/links`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return url;
    const body = (await res.json()) as { short_url?: string };
    return body?.short_url || url;
  } catch {
    return url;
  }
}
