/**
 * Runtime configuration.
 *
 * Every value has a default and can be overridden by a Worker `var` (see the `vars` block
 * in wrangler.jsonc). `initConfig` runs at the top of every request — it is idempotent and
 * costs two string splits — and the values are plain strings and numbers, identical for
 * every request on a given deployment, so holding them in a module global is safe.
 *
 * The one thing that must NOT read config at module-eval time is a schema const: the
 * module is evaluated by the dynamic `import()` that precedes `initConfig`, so anything
 * captured there would freeze the default. `tools/discovery.ts` builds its two search
 * schemas from factories for exactly this reason.
 */
const DEFAULTS = {
  /** Origin of the web calculator, used to build share links. */
  appOrigin: 'https://simulador.latam-tools.com.br',

  /** URL shortener, mirroring the app's share dialog. */
  shortenerUrl: 'https://short.latam-tools.com.br',

  /** Dummy - Neutro: neutral defence, so the element table cancels out and a bare
   *  comparison isn't distorted by resistances. */
  defaultTargetId: 21077,

  /** Hostnames this server answers as. Cloudflare already routes by hostname, so this is
   *  belt-and-braces rather than the primary DNS-rebinding defence it was on the box. */
  allowedHosts: ['simulador.latam-tools.com.br', 'localhost'],

  /** Browser-based MCP clients send Origin; native/CLI ones send none (and must be
   *  allowed, or the primary use case breaks). */
  allowedOrigins: ['https://claude.ai', 'https://simulador.latam-tools.com.br', 'http://localhost:4200'],

  limits: {
    maxOptimizeCandidates: 40,
    maxTableMonsters: 20,
    maxCompareBuilds: 4,
    maxSearchResults: 50,
  },
};

type Config = typeof DEFAULTS;

/** Mutated in place by initConfig so `config.x` reads stay valid across the module graph. */
export const config: Config = { ...DEFAULTS, limits: { ...DEFAULTS.limits } };

/** Apply the Worker `env` over the defaults. Idempotent. */
export function initConfig(env: object): void {
  // One narrowing, here, so callers can pass their own closed binding interface instead of
  // widening it with an index signature (which would switch off typo checking wholesale).
  const vars = env as Record<string, unknown>;

  const str = (key: string, fallback: string): string => {
    const raw = vars[key];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
  };

  const int = (key: string, fallback: number): number => {
    const n = Number(vars[key]);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const list = (key: string, fallback: string[]): string[] => {
    const raw = vars[key];
    if (typeof raw !== 'string' || !raw.trim()) return [...fallback];
    return raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  };

  config.appOrigin = str('PUBLIC_APP_ORIGIN', DEFAULTS.appOrigin);
  config.shortenerUrl = str('SHORTENER_URL', DEFAULTS.shortenerUrl);
  config.defaultTargetId = int('DEFAULT_TARGET_ID', DEFAULTS.defaultTargetId);
  config.allowedHosts = list('ALLOWED_HOSTS', DEFAULTS.allowedHosts);
  config.allowedOrigins = list('ALLOWED_ORIGINS', DEFAULTS.allowedOrigins);
  config.limits = {
    maxOptimizeCandidates: int('MAX_OPTIMIZE_CANDIDATES', DEFAULTS.limits.maxOptimizeCandidates),
    maxTableMonsters: int('MAX_TABLE_MONSTERS', DEFAULTS.limits.maxTableMonsters),
    maxCompareBuilds: int('MAX_COMPARE_BUILDS', DEFAULTS.limits.maxCompareBuilds),
    maxSearchResults: int('MAX_SEARCH_RESULTS', DEFAULTS.limits.maxSearchResults),
  };
}
