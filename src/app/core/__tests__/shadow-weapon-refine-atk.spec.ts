import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';
import { promisesPerRefine } from './refine-line';

/**
 * The shadow weapon's "ATQ e ATQM +1 por refino" lives in each piece's own `script`, as
 * `atk`/`matk` `1---1` (calculator.ts#calcStepBonus), and only there.
 *
 * Tracker ANKIJTUCORKtBHxAWxKv, reported by Ametsuky against the 24686 Manopla Sombria de
 * Absorção: at +10 it gave no ATQ and no ATQM, while the 24539 Manopla Sombria do Katar —
 * which carries the same line and nothing else flat — gave the full +10. Six of the 146
 * pieces whose pt-BR description prints the line declared nothing at all, and this file is
 * the counterpart of `shadow-set-refine-hp.spec.ts` for the one slot that spec leaves out:
 * the weapon pays ATQ/ATQM per refine where the other five pay HP.
 *
 * The six were all ported from an upstream record whose Thai `description` omits the line
 * — 24686's lists MHP/MSP, the per-3-refine ATK% and the +7/+10 blocks, and never the
 * per-refine pair — so the porting batch had nothing to copy from. The LATAM client text in
 * `latam-items.json` is the source, which is why the audit below reads the promise off it
 * rather than off a list of ids.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** itemSubTypeId of the shadow weapon slot. */
const SHADOW_WEAPON = 280;
/** The step script for "+1 a cada 1 refino" (calculator.ts#calcStepBonus). */
const PER_REFINE = '1---1';

/** The client's wording: 131 pieces print it as one line, 15 inside an "A cada refino:" block. */
const ATQ_E_ATQM = /ATQ e ATQM \+1/i;

const shadowWeapons = Object.entries<any>(items)
  .filter(([id, item]) => item.itemSubTypeId === SHADOW_WEAPON && latam[id])
  .map(([id, item]) => ({
    id,
    name: latam[id].name as string,
    promises: promisesPerRefine(latam[id].description, ATQ_E_ATQM),
    atk: Array.isArray(item.script?.atk) && item.script.atk.includes(PER_REFINE),
    matk: Array.isArray(item.script?.matk) && item.script.matk.includes(PER_REFINE),
  }));

/**
 * The fifteen that declare the step without printing that exact line, each for its own
 * reason, so a sixteenth cannot appear by a copied script:
 *
 * - 24425 Manopla Sombria Perfeita promises "ATQ +4" and spends the step to get there —
 *   asserted below.
 * - 24589-24600 and 24739, the Apoio set, open with "Não pode ser refinado" and give a
 *   flat "ATQ e ATQM +10", so their step never pays in game.
 * - 24416 Manopla Sombria Transcendente prints no refine line at all, like the Armadura
 *   Sombria Transcendente in `shadow-set-refine-hp.spec.ts`.
 */
const DECLARES_WITHOUT_THE_LINE = [
  '24416', '24425',
  '24589', '24590', '24591', '24592', '24593', '24594',
  '24595', '24596', '24597', '24598', '24599', '24600', '24739',
];

describe('shadow weapon — the per-refine ATQ/ATQM comes from the piece script', () => {
  it('lists the expected pieces (146 of 180 with the line)', () => {
    expect(shadowWeapons.length).toBe(180);
    expect(shadowWeapons.filter((p) => p.promises).length).toBe(146);
  });

  it('every piece promising +1 per refine declares "1---1" on both atk and matk', () => {
    const missing = shadowWeapons
      .filter((p) => p.promises && !(p.atk && p.matk))
      .map((p) => `${p.id} ${p.name} (atk: ${p.atk}, matk: ${p.matk})`);

    expect(missing).toEqual([]);
  });

  it('no other piece declares the step', () => {
    const known = new Set(DECLARES_WITHOUT_THE_LINE);
    // Compared as a set difference rather than as an ordered list: `extra` follows
    // `item.json`'s own key order, so a deep-equal would report a reshuffle of that file as
    // a fifteen-element diff instead of naming the piece that actually arrived.
    const unexplained = shadowWeapons
      .filter((p) => !p.promises && (p.atk || p.matk) && !known.has(p.id))
      .map((p) => `${p.id} ${p.name}`);

    expect(unexplained).toEqual([]);
  });

  it('keeps that exception list down to the pieces that still need it', () => {
    const declaring = new Set(shadowWeapons.filter((p) => !p.promises && (p.atk || p.matk)).map((p) => p.id));

    expect(DECLARES_WITHOUT_THE_LINE.filter((id) => !declaring.has(id))).toEqual([]);
  });

  it('spends the step on the Manopla Sombria Perfeita to reach its promised ATQ +4', () => {
    expect(items['24425'].script.atk).toEqual(['1---3', PER_REFINE]);
    expect(items['24425'].script.matk).toEqual([PER_REFINE]);
  });
});

function bonusOf(refine: number): Record<string, number> {
  const model = { ...createMainModel(), level: 250, shadowWeapon: 24686, shadowWeaponRefine: refine };

  return equipStatusOf(makeCalculator(items), model);
}

describe('Manopla Sombria de Absorção (24686)', () => {
  it('pays +1 ATQ and +1 ATQM per refine, +10 each at +10', () => {
    // One engine run for both, so the pair is provably the same build and not two.
    const at10 = bonusOf(10);

    expect([at10.atk, at10.matk]).toEqual([10, 10]);
  });

  it('pays nothing at +0', () => {
    const at0 = bonusOf(0);

    expect([at0.atk ?? 0, at0.matk ?? 0]).toEqual([0, 0]);
  });

  /**
   * The second half of the report, which held up: the "a cada 3 refinos: dano físico +1%"
   * was already reaching `atkPercent` through the same `3---1` step, so it is pinned here
   * rather than changed — floor(refine / 3), and nothing before +3.
   */
  it.each([
    [0, 0], [2, 0], [3, 1], [9, 3], [10, 3],
  ])('gives floor(%i / 3) = %i%% physical damage', (refine, expected) => {
    expect(bonusOf(refine).atkPercent ?? 0).toBe(expected);
  });
});
