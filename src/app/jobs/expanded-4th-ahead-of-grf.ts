/**
 * The Expanded 4th classes (Sky Emperor, Soul Ascetic, Shinkiro, Shiranui, Night
 * Watch, Hyper Novice) are complete in the calculator — job files, formulas, skill
 * names — but aren't in the LATAM client GRF yet, so the GRF-derived icon allowlist
 * (latam-classes.json) doesn't list them and ragassets serves no party-emblem icon.
 *
 * We surface them anyway. That takes two coordinated facts, and they are the same
 * fact: a class is force-visible *because* it has no GRF icon, which is exactly why
 * it also needs the sprite-head icon fallback. So both live here as one map, keyed
 * by class id → the sex to render the sprite head in (Shinkiro is male-locked,
 * Shiranui female-locked; the rest default to male). Consumers:
 *   - ro-calculator.component.ts unions these ids into the visible-class filter
 *   - icon-url.pipe.ts renders the sprite head instead of the missing emblem
 *
 * TODO(latam-grf): delete this whole module once the six ship in the client GRF —
 * tools/build-latam-db.mjs will then pick their icons up on its own and they become
 * ordinary allowlisted classes. Spirit Handler (4308) is intentionally absent: its
 * skills aren't modelled yet, so it stays hidden.
 */
export const EXPANDED_4TH_AHEAD_OF_GRF: Readonly<Record<number, 'male' | 'female'>> = {
  4302: 'male', // Sky Emperor
  4303: 'male', // Soul Ascetic
  4304: 'male', // Shinkiro (male-locked)
  4305: 'female', // Shiranui (female-locked)
  4306: 'male', // Night Watch
  4307: 'male', // Hyper Novice
};

/** The ids above, as a Set, for the class-visibility filter. */
export const EXPANDED_4TH_AHEAD_OF_GRF_IDS: ReadonlySet<number> = new Set(
  Object.keys(EXPANDED_4TH_AHEAD_OF_GRF).map(Number),
);
