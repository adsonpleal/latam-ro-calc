import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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

/**
 * The two shapes the client writes it in: a single line ("HP máx. +10 por refino.") and a
 * headed block ("A cada refino:" … "HP máx. +10."), which can carry other lines in
 * between — Colar Sombrio FOR puts "ATQ +1." first. Read block by block, since a later
 * block's "HP máx. +10." (a flat bonus) must not borrow an earlier "A cada refino:".
 */
function promisesPerRefineHp(description: string): boolean {
  return description
    .replace(/\^[0-9a-fA-F]{6}/g, '')
    .split(/-{5,}/)
    .some((block) => /HP máx\. \+10\s+por refino/i.test(block) || (/A cada refino:/i.test(block) && /HP máx\. \+10\./i.test(block)));
}

const shadowPieces = Object.entries(items)
  .filter(([id, item]: [string, any]) => SHADOW_SLOTS.includes(item.itemSubTypeId) && latam[id])
  .map(([id, item]: [string, any]) => ({
    id,
    name: latam[id].name as string,
    promises: promisesPerRefineHp(latam[id].description ?? ''),
    declares: Array.isArray(item.script?.hp) && item.script.hp.includes(PER_REFINE_HP),
  }));

describe('conjunto sombrio — o HP por refino vem do script da peça', () => {
  it('a lista tem as peças que se espera (544 com a linha, 10 sem)', () => {
    expect(shadowPieces.length).toBe(554);
    expect(shadowPieces.filter((p) => p.promises).length).toBe(544);
  });

  it('toda peça que promete os +10 por refino declara "1---10"', () => {
    const faltando = shadowPieces.filter((p) => p.promises && !p.declares).map((p) => `${p.id} ${p.name}`);
    expect(faltando).toEqual([]);
  });

  /**
   * The other direction, so removing `_shadowHP` cannot be undone by hand: the ten that
   * give no HP per refine must not declare it. The Armadura Sombria Transcendente has no
   * HP line at all, and the Malha Sombria de Apoio gives +100 fixed rather than per refine.
   */
  it('nenhuma peça declara os +10 sem que a descrição os prometa', () => {
    const sobrando = shadowPieces.filter((p) => !p.promises && p.declares).map((p) => `${p.id} ${p.name}`);
    expect(sobrando).toEqual([]);
  });
});
