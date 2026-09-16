/**
 * Reading a share link someone pasted into a text field.
 *
 * People paste whatever the share dialog handed them: the canonical `/s/<token>/`
 * URL, a legacy `#/?b=<token>` one, the shortened `short.latam-tools.com.br/<slug>`
 * form, or occasionally the bare token. A short link cannot be decoded locally — its
 * slug is a database key, not a build — so it is reported as such for the caller to
 * resolve against the shortener's `GET /api/links/<slug>`.
 *
 * Framework-free (src/app/core): no Angular/RxJS/PrimeNG, no DOM.
 */
import { isShareToken, readShareToken } from './share-path';

/**
 * What the text turned out to be. Flat rather than a union, because the project builds
 * with strict:false, which never narrows one: `token` is set for `'token'`, `slug` for
 * `'short'`, and the other is null.
 */
export interface ShareInput {
  kind: 'token' | 'short';
  token: string | null;
  slug: string | null;
}

/** Same alphabet the shortener accepts for a slug. */
const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const trimUrl = (url: string): string => url.trim().replace(/\/+$/, '');

/** Whether `input` is a link on the shortener rather than one carrying a build. */
export const isShortLink = (input: string | null | undefined, shortenerUrl: string): boolean => {
  const s = (input ?? '').trim();
  return !!shortenerUrl && s.startsWith(trimUrl(shortenerUrl) + '/') && !readShareToken(s);
};

/**
 * Classify pasted text, or `null` when it is not a link we can use.
 *
 * Chat clients wrap links in `<…>` and people paste them with trailing
 * punctuation, so both are tolerated; the trailing `.` is NOT stripped from a
 * canonical URL, though, since a token can legitimately end in one — the
 * `/s/<token>/` form carries its own terminating slash for exactly that reason.
 */
export const parseShareInput = (text: string | null | undefined, shortenerUrl: string): ShareInput | null => {
  const raw = (text ?? '').trim().replace(/^<(.*)>$/, '$1').trim();
  if (!raw) return null;

  if (isShortLink(raw, shortenerUrl)) {
    const rest = raw.slice(trimUrl(shortenerUrl).length + 1);
    const slug = rest.split(/[/?#]/)[0].replace(/[.,;!]+$/, '');
    return SLUG_PATTERN.test(slug) ? { kind: 'short', token: null, slug } : null;
  }

  const token = readShareToken(raw);
  if (token) return { kind: 'token', token, slug: null };

  // A bare token, never a URL: anything with a scheme that matched neither form is
  // some other site's link and must not be fed to the decompressor as a token.
  if (!/^[a-z][a-z\d+\-.]*:/i.test(raw) && isShareToken(raw)) return { kind: 'token', token: raw, slug: null };
  return null;
};
