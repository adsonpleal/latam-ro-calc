/**
 * `current` is the LATAM baseline. The 28/10/2026 client moved the fourth-job and
 * expanded-fourth trees onto the 02/06/2022 kRO rebalance: its per-level ATK/MATK tables
 * and its 86 retuned delay rows both reproduce that bundle, where the 31/07/2026 client
 * still printed the pre-rebalance numbers. So the rebalance is the simulator's default,
 * not an opt-in variant.
 *
 * `pre-rebalance` keeps the ratios and timings LATAM ran before that patch. It is what the
 * recordings made up to 09/2026 measured, which is why the replay specs ask for it by name.
 */
export type SkillFormulaVersion = 'current' | 'pre-rebalance' | 'rebalance-2026-02';

/** Display dates are kRO deployments; persisted IDs retain their original names. */
export const SKILL_REBALANCE_REFERENCES: {
  label: string; value: SkillFormulaVersion; references: { label: string; url: string }[];
}[] = [
  { label: 'Atual (LATAM) — Rebalance 02/06/2022 (kRO)', value: 'current', references: [
    { label: 'Comunicado de implementação no kRO (coreano)', url: 'https://ro.gnjoy.com/news/notice/View.asp?BBSMode=10001&seq=7600&curpage=1' },
    { label: 'Anúncio e alterações em inglês — Divine Pride', url: 'https://www.divine-pride.net/forum/index.php?/topic/3723-kro-jobs-improvement-project/page/13/#comment-11126' },
    { label: 'Fórmulas por classe — Sigma', url: 'https://sigmathefallen.blogspot.com/2025/02/' },
  ] },
  { label: 'Rebalance - 21/12/2022 - (kRO)', value: 'rebalance-2026-02', references: [
    { label: 'Comunicado de implementação no kRO (coreano)', url: 'https://ro.gnjoy.com/news/notice/View.asp?BBSMode=10001&seq=7670&curpage=1' },
    { label: 'Anúncio e alterações em inglês — Divine Pride', url: 'https://www.divine-pride.net/forum/index.php?/topic/3723-kro-jobs-improvement-project/page/14/#comment-12421' },
    { label: 'Fórmulas por classe — Sigma', url: 'https://sigmathefallen.blogspot.com/2026/02/' },
  ] },
];

export const SKILL_FORMULA_VERSION_OPTIONS: { label: string; value: SkillFormulaVersion }[] = [
  { label: 'Atual (LATAM)', value: 'current' },
  { label: 'Pré-rebalanceamento (até 28/10/2026)', value: 'pre-rebalance' },
  { label: 'Rebalance - 21/12/2022 - (kRO)', value: 'rebalance-2026-02' },
];

/**
 * `rebalance-2022-06` was this bundle's ID while it was still a variant. A build saved
 * then asked for exactly what `current` is now, so it keeps the numbers it was saved with.
 */
export function normalizeSkillFormulaVersion(value: unknown): SkillFormulaVersion {
  return value === 'pre-rebalance' || value === 'rebalance-2026-02' ? value : 'current';
}

/** True while the build reads the LATAM baseline, including the model's unset default. */
export function isLatamBaseline(version?: SkillFormulaVersion): boolean {
  return version !== 'pre-rebalance' && version !== 'rebalance-2026-02';
}
