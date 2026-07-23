/**
 * Classes whose job icon exists in the LATAM client GRF (so tools/build-latam-db.mjs
 * allowlists them in latam-classes.json) but that we deliberately keep out of the
 * class picker because the calculator doesn't model them yet.
 *
 * Spirit Handler (4308) shipped in the GRF alongside the other Expanded 4th classes,
 * but its skills aren't implemented, so it stays hidden until they are. Drop the id
 * from this set once the class is modelled.
 */
export const HIDDEN_CLASS_IDS: ReadonlySet<number> = new Set([
  4308, // Spirit Handler — skills not modelled yet
]);
