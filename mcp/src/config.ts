/**
 * Runtime configuration.
 *
 * Every value has a default and can be overridden by a Worker `var` (see the `vars` block
 * in wrangler.jsonc). `initConfig` is called once per isolate, from the MCP entry point,
 * before any request is handled — the values are plain strings and numbers, identical for
 * every request on a given deployment, so holding them in a module global is safe and
 * keeps the ~20 read sites from having to thread a parameter through.
 *
 * The one thing that must NOT read config at module-eval time is a schema const: the
 * module is evaluated by the dynamic `import()` that precedes `initConfig`, so anything
 * captured there would freeze the default. `tools/discovery.ts` builds its two search
 * schemas from factories for exactly this reason.
 */
export interface ConfigEnv {
  [key: string]: unknown;
}

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
    /** Iterations a tool may run before it returns partial results flagged `truncated`.
     *  A count, not a deadline — see util/budget.ts. */
    maxSolveUnits: 40,
    maxOptimizeCandidates: 40,
    maxTableMonsters: 20,
    maxCompareBuilds: 4,
    maxSearchResults: 50,
  },
};

export type Config = typeof DEFAULTS;

/** Mutated in place by initConfig so existing `config.x` reads keep working. */
export const config: Config = structuredClone(DEFAULTS);

const str = (env: ConfigEnv, key: string, fallback: string): string => {
  const raw = env[key];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : fallback;
};

const int = (env: ConfigEnv, key: string, fallback: number): number => {
  const n = Number(env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const list = (env: ConfigEnv, key: string, fallback: string[]): string[] => {
  const raw = env[key];
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
};

/** Apply the Worker `env` over the defaults. Idempotent. */
export function initConfig(env: ConfigEnv): Config {
  config.appOrigin = str(env, 'PUBLIC_APP_ORIGIN', DEFAULTS.appOrigin);
  config.shortenerUrl = str(env, 'SHORTENER_URL', DEFAULTS.shortenerUrl);
  config.defaultTargetId = int(env, 'DEFAULT_TARGET_ID', DEFAULTS.defaultTargetId);
  config.allowedHosts = list(env, 'ALLOWED_HOSTS', DEFAULTS.allowedHosts);
  config.allowedOrigins = list(env, 'ALLOWED_ORIGINS', DEFAULTS.allowedOrigins);
  config.limits = {
    maxSolveUnits: int(env, 'MAX_SOLVE_UNITS', DEFAULTS.limits.maxSolveUnits),
    maxOptimizeCandidates: int(env, 'MAX_OPTIMIZE_CANDIDATES', DEFAULTS.limits.maxOptimizeCandidates),
    maxTableMonsters: int(env, 'MAX_TABLE_MONSTERS', DEFAULTS.limits.maxTableMonsters),
    maxCompareBuilds: int(env, 'MAX_COMPARE_BUILDS', DEFAULTS.limits.maxCompareBuilds),
    maxSearchResults: int(env, 'MAX_SEARCH_RESULTS', DEFAULTS.limits.maxSearchResults),
  };
  return config;
}
