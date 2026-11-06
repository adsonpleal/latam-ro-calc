import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { promisesPerRefine } from './refine-line';

/**
 * The shadow set's "HP máx. +10 por refino" lives in each piece's own `script`, and only
 * there.
 *
 * It used to live in two places: `HpSpCalculator` also added
 * `(soma dos refinos sombrios) × 10` on top, so every refined shadow piece paid the bonus
 * twice — and the ten pieces that give no HP at all were paid it anyway. `musa-tuevi-ado.rrf`
 * measured the damage: its Colar Sombrio Espiritual +5 is the character's only refined
 * shadow piece, and the game's own status window reports 15.465 de HP máx. against the
 * 15.516 the double count produced (`Wanderer.replay.spec.ts`).
 *
 * With the hard-coded half gone, the item data is the whole answer — which is what this
 * file guards. A shadow armour/shield/boot/earring/pendant whose pt-BR description
 * promises the +10 and does not declare it now silently gives nothing, and the 34 records
 * that were in exactly that state when the rule was removed are the reason to check.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** itemSubTypeId of the five shadow slots HpSpCalculator used to pay per refine. */
const SHADOW_SLOTS = [526, 527, 528, 529, 530];
/** The step script for "+10 de HP a cada 1 refino" (calculator.ts#calcStepBonus). */
const PER_REFINE_HP = '1---10';

/** The client's wording; `refine-line.ts` holds the two shapes it is printed in. */
const HP_MAX = /HP máx\. \+10/i;

const shadowPieces = Object.entries(items)
  .filter(([id, item]: [string, any]) => SHADOW_SLOTS.includes(item.itemSubTypeId) && latam[id])
  .map(([id, item]: [string, any]) => ({
    id,
    name: latam[id].name as string,
    promises: promisesPerRefine(latam[id].description, HP_MAX),
    declares: Array.isArray(item.script?.hp) && item.script.hp.includes(PER_REFINE_HP),
  }));

describe('shadow set — the per-refine HP comes from the piece script', () => {
  it('lists the expected pieces (552 with the line, 21 without)', () => {
    expect(shadowPieces.length).toBe(573);
    expect(shadowPieces.filter((p) => p.promises).length).toBe(552);
  });

  it('every piece promising +10 per refine declares "1---10"', () => {
    const missing = shadowPieces.filter((p) => p.promises && !p.declares).map((p) => `${p.id} ${p.name}`);
    expect(missing).toEqual([]);
  });

  /**
   * The other direction, so removing `_shadowHP` cannot be undone by hand: the twenty-one that
   * give no HP per refine must not declare it. The Armadura Sombria Transcendente has no
   * HP line at all, the Malha Sombria de Apoio gives +100 fixed rather than per refine, and
   * the ten Grupo do Éden pieces (24688-24697, shipped 14/09/2026) carry no refine line.
   */
  it('no piece declares the +10 unless its description promises it', () => {
    const extra = shadowPieces.filter((p) => !p.promises && p.declares).map((p) => `${p.id} ${p.name}`);
    expect(extra).toEqual([]);
  });
});
