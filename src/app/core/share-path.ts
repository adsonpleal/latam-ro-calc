/**
 * The share-link URL grammar, in one place.
 *
 * A build travels as an lz-string token (see `share-codec.ts`). It used to ride
 * only in the URL *fragment* — `#/?b=<token>` — which browsers never send to a
 * server, so no crawler could ever see which build a link pointed at and every
 * shared simulation previewed as the same generic card. The canonical form is
 * now a real path, `/s/<token>/`, which the edge can read and answer with
 * per-build Open Graph tags.
 *
 * Both forms are accepted forever: links people already pasted into Discord
 * years of builds ago must keep working.
 *
 * The app, the MCP server and the Cloudflare Worker all have to agree on this
 * grammar byte for byte, which is why it lives here rather than as a regex
 * copied into each of them.
 *
 * Framework-free (src/app/core): no Angular/RxJS/PrimeNG, no DOM.
 */

/** Path prefix of the canonical share URL. */
export const SHARE_PATH_PREFIX = '/s/';

/**
 * lz-string's URI-safe alphabet is `A-Z a-z 0-9 + - $`, and `encodeBuild` maps
 * `+` to `.` so the token survives a query string. Every one of those characters
 * is legal unescaped in a path segment, so a token never needs percent-encoding.
 *
 * The length cap is a guard, not a format rule: it bounds how much work an
 * unauthenticated caller can hand the decompressor before anything is parsed.
 */
const TOKEN_PATTERN = /^[A-Za-z0-9.$-]{1,4096}$/;

/** Strip `scheme://authority` so the path can be anchored at its real start. */
const ORIGIN_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/[^/]*/;

/** Whether a string is shaped like a share token. Cheap, and runs before any decode. */
export const isShareToken = (value: string | null | undefined): boolean => !!value && TOKEN_PATTERN.test(value);

/**
 * Canonical share path for a token.
 *
 * The trailing slash is not decoration. A token ends in `.` whenever its last
 * lz-string symbol is the one `+` was mapped to, and chat clients' link
 * autodetection strips a trailing period as sentence punctuation — handing the
 * reader a truncated token that decodes into a different build, or none.
 */
export const buildSharePath = (token: string): string => `${SHARE_PATH_PREFIX}${token}/`;

/**
 * Recover the token from any URL form we have ever handed out: the canonical
 * `/s/<token>/`, the legacy `#/?b=<token>`, or a bare `?b=<token>` query.
 *
 * Read raw — NOT via URLSearchParams, which decodes `+` to a space and would
 * quietly corrupt any token minted before the `+`/`.` mapping existed.
 */
export const readShareToken = (href: string | null | undefined): string | null => {
  const raw = href ?? '';
  const cut = raw.search(/[?#]/);
  const path = (cut === -1 ? raw : raw.slice(0, cut)).replace(ORIGIN_PATTERN, '');

  // The path form wins: it is the only one a server can see, so when both are
  // present (an old link opened on a share path) it is the authoritative one.
  const fromPath = path.match(/^\/s\/([^/?#]+)/)?.[1];
  if (isShareToken(fromPath)) return fromPath as string;

  const fromQuery = raw.match(/[?&]b=([^&#]+)/)?.[1];
  return isShareToken(fromQuery) ? (fromQuery as string) : null;
};
