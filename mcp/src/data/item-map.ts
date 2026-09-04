/**
 * The shape of the two big record maps the dataset is built from.
 *
 * This used to also hold the LATAM overlay merge, lifted from `RoService`'s item pipeline.
 * That merge now happens once at build time in `tools/build-web-data.mjs`, which emits
 * items-core already translated — so the runtime never sees an untranslated record and
 * there is nothing left here to merge. What the generator does instead is covered by
 * `tools/build-web-data.spec.ts` and `mcp/src/data/derived-parity.spec.ts`.
 */

/** item.json / monster.json as loaded: an object keyed by id, values untyped by design. */
export type ItemMap = Record<string, any>;
