/**
 * Runtime configuration, all overridable by environment (see the systemd unit).
 */
const env = (key: string, fallback: string): string => process.env[key]?.trim() || fallback;
const envInt = (key: string, fallback: number): number => {
  const n = Number(process.env[key]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  port: envInt('PORT', 8787),

  /** Where the seven runtime JSONs live. Defaults to the repo copy for local dev. */
  dataDir: env('DATA_DIR', 'src/assets/demo/data'),

  /** Origin of the web calculator, used to build share links. */
  appOrigin: env('PUBLIC_APP_ORIGIN', 'https://simulador.latam-tools.com.br'),

  /** URL shortener, mirroring the app's share dialog. */
  shortenerUrl: env('SHORTENER_URL', 'https://short.latam-tools.com.br'),

  /** Dummy - Neutro: neutral defence, so the element table cancels out and a bare
   *  comparison isn't distorted by resistances. */
  defaultTargetId: envInt('DEFAULT_TARGET_ID', 21077),

  /** Hostname this server is served as. Validating it — not Origin — is what actually
   *  defends against DNS rebinding. */
  allowedHosts: env('ALLOWED_HOSTS', 'mcp.simulador.latam-tools.com.br,localhost')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),

  /** Browser-based MCP clients send Origin; native/CLI ones send none (and must be
   *  allowed, or the primary use case breaks). */
  allowedOrigins: env(
    'ALLOWED_ORIGINS',
    'https://claude.ai,https://simulador.latam-tools.com.br,http://localhost:4200',
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  limits: {
    /** Concurrent solve-bearing tool calls. The engine is synchronous, so each one
     *  blocks the event loop for the whole box — queueing unboundedly would just turn
     *  a burst into a timeout for everyone. */
    maxConcurrentSolves: envInt('MAX_CONCURRENT_SOLVES', 2),
    /** Wall-clock budget for an iterating tool, after which it returns partial
     *  results flagged `truncated`. */
    solveBudgetMs: envInt('SOLVE_BUDGET_MS', 2000),
    maxOptimizeCandidates: envInt('MAX_OPTIMIZE_CANDIDATES', 40),
    maxTableMonsters: envInt('MAX_TABLE_MONSTERS', 20),
    maxCompareBuilds: envInt('MAX_COMPARE_BUILDS', 4),
    maxSearchResults: envInt('MAX_SEARCH_RESULTS', 50),
  },
} as const;
