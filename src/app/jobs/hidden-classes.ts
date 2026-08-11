/**
 * Classes whose job icon ships in the LATAM client (so tools/sync-latam-db.mjs
 * allowlists them in latam-classes.json) but that we deliberately keep out of the
 * class picker because the calculator doesn't model them yet.
 *
 * Currently empty: Spirit Handler (4308) was the last hold-out and its attack skills
 * are now modelled and characterised (SpiritHandler.characterization.spec.ts), so it
 * is shown. Kept as the extension point for the next class that lands in the client ahead
 * of its formulas — add the id here to hide it until it is modelled.
 */
export const HIDDEN_CLASS_IDS: ReadonlySet<number> = new Set([]);
