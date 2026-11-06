/**
 * Read a "+N per refine" promise off an item's pt-BR client description.
 *
 * Two specs audit a shadow slot against this promise — `shadow-set-refine-hp.spec.ts` for
 * the "HP máx. +10 por refino" the armour, shield, boot, earring and pendant pay, and
 * `shadow-weapon-refine-atk.spec.ts` for the "ATQ e ATQM +1 por refino" the weapon pays —
 * and both have to read it the same way. They used to carry a copy each of the function
 * below, together with a copy each of the comment explaining the block rule. Nothing made
 * them fail together: a later fix to one copy would have left the other silently reading
 * the old way and still green, which is the drift `instinto-build.ts` was written to stop.
 *
 * The specs themselves stay separate, because the slots differ in what they pay, in which
 * ids promise it and in which ones are exceptions. Only the reader is shared.
 */

/** Strip the client's ^RRGGBB colour codes. */
export const plainDescription = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/**
 * Whether `description` promises `line` once per refine.
 *
 * The client writes it in two shapes: a single line ("HP máx. +10 por refino.") and a
 * headed block ("A cada refino:" … "HP máx. +10."), which can carry other lines in between
 * — the Colar Sombrio FOR puts "ATQ +1." first, and the Manopla Sombria CON heads its own
 * block with "CON +1." Read block by block, split on the `-----` separator run, so that a
 * later block's flat line (a fixed bonus) cannot borrow an earlier block's
 * "A cada refino:".
 *
 * `line` matches the bonus without its trailing full stop, e.g. `/HP máx\. \+10/` or
 * `/ATQ e ATQM \+1/`.
 */
export function promisesPerRefine(description: string, line: RegExp): boolean {
  const flat = new RegExp(`${line.source}\\.`, line.flags);
  const perRefino = new RegExp(`${line.source}\\s+por refino`, line.flags);

  return plainDescription(description)
    .split(/-{5,}/)
    .some((block) => perRefino.test(block) || (/A cada refino:/i.test(block) && flat.test(block)));
}
