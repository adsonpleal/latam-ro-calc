import { describe, expect, it } from 'vitest';
import itemDb from '../../assets/demo/data/item.json';
import latamDb from '../../assets/demo/data/latam-items.json';
import { HeadGearLocation } from '../constants/head-gear-location';
import { ItemSubTypeId } from '../constants/item-sub-type.enum';
import { getHeadGearLocations } from './head-gear-slots';

/**
 * The LATAM item description is the authoritative statement of where a head gear sits —
 * `Equipa em: ^777777Meio e Baixo^000000`. item.json used to record only one of those
 * positions, so 118 multi-slot head gears (Máscara de Odium 436003 among them, reported
 * by Luís) were offered in a single dropdown and could be paired with an item the game
 * would never let you wear alongside them.
 *
 * This locks the two sources together: any item whose description lists more than one
 * position must carry a matching `locations`. New items imported from the GRF are checked
 * for free.
 */

const items = itemDb as Record<string, any>;
const latam = latamDb as Record<string, { name?: string; description?: string }>;

const HEAD_SUB_TYPES = new Set<number>([
  ItemSubTypeId.Upper,
  ItemSubTypeId.CostumeUpper,
  ItemSubTypeId.CostumeMiddle,
  ItemSubTypeId.CostumeLower,
]);

const WORDS: Record<string, HeadGearLocation> = {
  topo: HeadGearLocation.Upper,
  meio: HeadGearLocation.Middle,
  baixo: HeadGearLocation.Lower,
  ixo: HeadGearLocation.Lower, // one costume's line is truncated to the tail of "Baixo"
  upper: HeadGearLocation.Upper,
  mid: HeadGearLocation.Middle,
  lower: HeadGearLocation.Lower,
};
const ORDER = [HeadGearLocation.Upper, HeadGearLocation.Middle, HeadGearLocation.Lower];

/**
 * Pulls the positions out of the description's slot line; null when it is missing or names
 * no position we recognise.
 *
 * The label and colour code both vary across the client's own text — `Equipa em:`,
 * `Equipado em:` and `Posição:` all occur, and a few entries are truncated mid-word (one
 * costume's line reads just `ixo`, the tail of `Baixo`). ragassets' `equipSlots` parse
 * already tolerates these; matching its grammar keeps this check from silently skipping
 * the items it claims to cover.
 */
function describedLocations(description: string | undefined): HeadGearLocation[] | null {
  const line = /(?:Equipa(?:do)? em|Posição):\s*\^?[0-9a-fA-F]{0,6}([^\n^]*)/.exec(description ?? '');
  if (!line) return null;

  // "Topo, Meio e Baixo" / "Meio e baixo" / "Meio Baixo" — separators vary by item.
  const words = new Set(
    line[1]
      .trim()
      .toLowerCase()
      .replace(/\.$/, '')
      .split(/[,\s]+|\be\b/)
      .map((w) => WORDS[w])
      .filter(Boolean),
  );

  return words.size ? ORDER.filter((l) => words.has(l)) : null;
}

describe('multi-slot head gear data', () => {
  const headGears = Object.entries(items).filter(([id, item]) => HEAD_SUB_TYPES.has(item.itemSubTypeId) && latam[id]);

  it('has head gear to check', () => {
    // 1894 at the time of writing — a floor, so a broken db import fails loudly here
    // instead of silently passing the check below on an empty set.
    expect(headGears.length).toBeGreaterThan(1500);
  });

  it('gives every head gear the positions its LATAM description lists', () => {
    const wrong = headGears
      .map(([id, item]) => {
        const described = describedLocations(latam[id].description);

        return described ? { id, name: latam[id].name, described, actual: getHeadGearLocations(item) } : null;
      })
      .filter((row) => row && row.described.join() !== row.actual.join());

    expect(wrong).toEqual([]);
  });

  it('resolves the reported Máscara de Odium to Meio + Baixo', () => {
    expect(getHeadGearLocations(items['436003'])).toEqual([HeadGearLocation.Middle, HeadGearLocation.Lower]);
  });

  it('only carries `locations` where it actually adds a position', () => {
    // A single-element `locations` would be noise duplicating `location`.
    const redundant = Object.entries(items)
      .filter(([, item]) => item.locations)
      .filter(([, item]) => item.locations.length < 2);

    expect(redundant).toEqual([]);
  });
});
