import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { bonusKeyLabel } from '../bonus-key-label';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The two automódulos that were missing from item.json — F-Eternidade on the Perna and
 * H-Maré on the Colete. Both were reported from the game; the pools that offer them are
 * held by automatron-enchant-pools.spec.ts.
 *
 * F-Eternidade is a proc, like the five F- modules already here: the VIT it grants is a
 * `chance__` bonus, and the "Regenera 800 de HP a cada 0,4 segundos" half is left out
 * because the engine has no measure for HP regen.
 *
 * @see https://browiki.org/wiki/Equipamentos_Automatron
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const PERNA_A = 470022;
const COLETE_A = 450127;
const F_ETERNIDADE = 310121;
const H_MARE = 310175;

/** Equip `piece` at `refine` with `module` in its first socket, and read the bonus back. */
function bonusOf(piece: number, slotKey: string, module: number | undefined, refine = 0): Record<string, number> {
  const items: any = { [piece]: { ...db[piece] } };
  if (module) items[module] = { ...db[module] };

  const model = createMainModel();
  model.level = 200;
  if (piece === PERNA_A) {
    model.boot = piece;
    model.bootRefine = refine;
  } else {
    model.armor = piece;
    model.armorRefine = refine;
  }
  if (module) model[slotKey] = module;

  return equipStatusOf(makeCalculator(items), model);
}

describe('F-Eternidade (310121)', () => {
  it('grants VIT +50 as a chance bonus, the same shape as the other F- automódulos', () => {
    const bonus = bonusOf(PERNA_A, 'bootEnchant1', F_ETERNIDADE);

    expect(bonus['chance__vit']).toBe(50);
    // The proc is not a permanent stat — VIT itself stays where the Perna alone left it.
    expect(bonus['vit'] || 0).toBe(bonusOf(PERNA_A, 'bootEnchant1', undefined)['vit'] || 0);
  });

  it('leaves the HP regeneration half of the proc unmodelled', () => {
    expect(Object.keys(db[F_ETERNIDADE].script)).toEqual(['chance__vit']);
  });
});

describe('H-Maré (310175)', () => {
  const skills: [string, number][] = [['Proteção da Orla', 5039], ['Festa do Camarão', 5051]];

  it.each(skills)('cuts the cooldown of %s by 0,5s, and by 1,5s more at +9 and +11', (_label, skillId) => {
    const key = `cd__${skillId}`;

    expect(bonusOf(COLETE_A, 'armorEnchant1', H_MARE, 0)[key]).toBe(0.5);
    expect(bonusOf(COLETE_A, 'armorEnchant1', H_MARE, 9)[key]).toBe(1.5);
    expect(bonusOf(COLETE_A, 'armorEnchant1', H_MARE, 11)[key]).toBe(3);
  });

  it('names both skills in the bonus panel — 5039 was missing from the catalog', () => {
    // Without a catalog entry the item panel prints the raw key ('Redução de Recarga de 5039').
    for (const [label, skillId] of skills) expect(bonusKeyLabel(`cd__${skillId}`)).toBe(`Redução de Recarga de ${label}`);
  });

  it('touches nothing but those two cooldowns', () => {
    expect(Object.keys(db[H_MARE].script).sort()).toEqual(['cd__5039', 'cd__5051']);
  });
});
