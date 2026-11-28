export const JOB_4_MIN_MAX_LEVEL = [200, 250] as [number, number];

export const JOB_4_MAX_JOB_LEVEL = 50;

/**
 * kRO's 275/60 level expansion, deployed 2024-08-07. LATAM has not shipped it — it is the
 * Q4 entry of the ROADMAP 2027 — so these caps are offered as a **Prévia** beside the live
 * ones above, never in place of them. See docs/skill-versions.md.
 *
 * Nothing here needed new data, which is why it is a cap change and not a data import:
 *
 *   - the `jobBonusTable` and `TraitBonusTable` of all twenty fourth-job classes already
 *     carry real rows through job level 59 (they are padded to 70), so job 51-60 was
 *     already in the repo and only `JOB_4_MAX_JOB_LEVEL` kept it out of reach;
 *   - `BaseStateCalculator` already accumulates trait points to level 275, and status
 *     points stop growing at 200 for every class by design;
 *   - base HP/SP is the one figure with no row above 250, and `HpSpCalculator` has always
 *     clamped the lookup there. That clamp is now named and explained in that file.
 */
export const JOB_4_PREVIEW_MIN_MAX_LEVEL = [200, 275] as [number, number];

export const JOB_4_PREVIEW_MAX_JOB_LEVEL = 60;
