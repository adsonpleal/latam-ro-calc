/**
 * The only Worker on this zone, and it runs on exactly two routes: /s/* and /mcp.
 *
 * Everything else — the app shell, the bundles, the assets — is served straight from
 * Cloudflare's static-asset path, which is free and unlimited. That is why
 * `run_worker_first` in wrangler.jsonc names paths instead of being `true`: the homepage
 * must never depend on a Worker request budget.
 *
 * `/s/*` exists because a crawler cannot run JavaScript:
 *
 *  - `/s/<token>/` returns the real index.html with the Open Graph tags rewritten for
 *    this specific build, so the preview says who the character is;
 *  - `/s/<token>/og.png` proxies the card image from latam-social, edge-caches it, and
 *    falls back to the site's static cover if that service is unreachable.
 *
 * `/mcp` is the Model Context Protocol server, which used to be a Node process on EC2.
 * It shares this Worker so that it can read the calculator's data through the same ASSETS
 * binding, which pins the data to the deployment that was built against it.
 */
import { readShareToken } from '../src/app/core/share-path';
import { buildShareMeta, ShareMeta } from './share-meta';

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Origin of latam-social, which renders the card. Overridable via .dev.vars. */
  OG_ORIGIN: string;
  /** The MCP server's own vars, all optional — its defaults live in mcp/src/config.ts. */
  [key: string]: unknown;
}

const CARD_PATH = /^\/s\/[^/]+\/og\.png$/;
const OG_FETCH_TIMEOUT_MS = 5000;
/** The token fully determines the image, so a hit can be kept for a long time. */
const CARD_CACHE = 'public, max-age=604800, immutable';
/** Whatever made a card fall back to the static cover is probably temporary. */
const FALLBACK_CACHE = 'public, max-age=300';

const asset = (env: Env, url: URL, path: string): Promise<Response> =>
  env.ASSETS.fetch(new Request(new URL(path, url), { method: 'GET' }));

const setContent = (value: string) => ({
  element: (el: Element): void => {
    el.setAttribute('content', value);
  },
});

/**
 * Every tag below already exists in src/index.html, so this is attribute rewriting
 * only — nothing is injected and nothing can end up duplicated. The dimensions,
 * og:type, og:site_name, og:locale and twitter:card are left alone: the card keeps
 * the same 1200x630 shape the static cover has.
 */
const rewriteMeta = (shell: Response, meta: ShareMeta): Response =>
  new HTMLRewriter()
    .on('head > title', {
      element: (el): void => {
        el.setInnerContent(meta.title);
      },
    })
    .on('meta[name="description"]', setContent(meta.description))
    .on('meta[property="og:title"]', setContent(meta.title))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('meta[property="og:url"]', setContent(meta.canonical))
    .on('meta[property="og:image"]', setContent(meta.image))
    .on('meta[property="og:image:alt"]', setContent(meta.title))
    .on('meta[name="twitter:title"]', setContent(meta.title))
    .on('meta[name="twitter:description"]', setContent(meta.description))
    .on('meta[name="twitter:image"]', setContent(meta.image))
    .on('link[rel="canonical"]', {
      element: (el): void => {
        el.setAttribute('href', meta.canonical);
      },
    })
    // Share URLs are unbounded and all render the same app: worth previewing, not worth
    // indexing. Deliberately a meta tag and not robots.txt — facebookexternalhit obeys
    // robots.txt, so disallowing /s/ there would kill the Facebook/WhatsApp preview.
    .on('head', {
      element: (el): void => {
        el.append('<meta name="robots" content="noindex, follow">', { html: true });
      },
    })
    .transform(shell);

async function serveCard(request: Request, env: Env, ctx: ExecutionContext, url: URL, token: string): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  try {
    // `redirect: 'manual'` is load-bearing. The renderer answers every failure it can
    // survive — rate limit, unknown build, renderer down — with a 302 to the static
    // cover. Followed, that arrives here as a 200 image/png, passes the check below, and
    // gets edge-cached as `immutable` for a week UNDER THIS BUILD'S URL: one transient
    // hiccup at scrape time would freeze a generic card onto a specific build.
    const upstream = await fetch(`${env.OG_ORIGIN}/ro-calc/build.png?b=${token}`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(OG_FETCH_TIMEOUT_MS),
    });
    if (upstream.status === 200 && upstream.headers.get('content-type')?.startsWith('image/')) {
      const png = new Response(upstream.body, {
        status: 200,
        headers: { 'content-type': 'image/png', 'cache-control': CARD_CACHE },
      });
      ctx.waitUntil(cache.put(cacheKey, png.clone()));
      return png;
    }
  } catch {
    // Fall through: an unreachable renderer is not a reason to show no image at all.
  }

  const cover = await asset(env, url, '/assets/og-cover.png');
  return new Response(cover.body, {
    status: 200,
    headers: { 'content-type': 'image/png', 'cache-control': FALLBACK_CACHE },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Before the try below, deliberately: that block rescues a broken share link by
    // serving the app shell, which for an MCP client would turn a protocol error into a
    // page of HTML. The import is dynamic because the handler drags in the whole damage
    // engine — see the note at the top of worker/mcp/handler.ts.
    if (url.pathname === '/mcp' || url.pathname.startsWith('/mcp/')) {
      const { handleMcp } = await import('./mcp/handler');
      return handleMcp(request, env, ctx);
    }

    try {
      // Read the token off the raw URL, never via searchParams — same rule the app and
      // the MCP server follow, so all three agree on what a token is.
      const token = readShareToken(url.pathname);

      if (token && CARD_PATH.test(url.pathname)) {
        if (request.method !== 'GET' && request.method !== 'HEAD') {
          return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
        }
        const card = await serveCard(request, env, ctx, url, token);
        return request.method === 'HEAD' ? new Response(null, { status: card.status, headers: card.headers }) : card;
      }

      const shell = await asset(env, url, '/index.html');
      const meta = token ? buildShareMeta(token) : null;
      // No usable token, or the shell isn't HTML for some reason: hand back exactly what
      // the static path would have served, generic tags and all.
      if (!meta || !shell.headers.get('content-type')?.includes('text/html')) return shell;

      return rewriteMeta(shell, meta);
    } catch {
      // Never 500 a share link. The app itself reads the token client-side, so the
      // plain shell still loads the right build — only the preview is degraded.
      return asset(env, url, '/index.html');
    }
  },
};
