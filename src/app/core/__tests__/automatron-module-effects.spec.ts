import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { bonusKeyLabel } from '../bonus-key-label';
import { defenderReductionMultiplier } from '../pvp';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * The two automódulos that were missing from item.json — F-Eternidade on the Perna and
 * H-Maré on the Colete. Both were reported from the game; the pools that offer them are
 * held by automatron-enchant-pools.spec.ts.
 *
 * P-Total joined them later: it is a defender-side module, so it only had somewhere to go
 * once the PVP section gave the engine the subclass_/subsize_/subrace_ namespace.
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
const MOTOR_A = 480020;
const F_ETERNIDADE = 310121;
const H_MARE = 310175;
const P_TOTAL = 310112;

/** Equip `piece` at `refine` with `module` in its first socket, and read the bonus back. */
function bonusOf(piece: number, slotKey: string, module: number | undefined, refine = 0): Record<string, number> {
  const items: any = { [piece]: { ...db[piece] } };
  if (module) items[module] = { ...db[module] };

  const model = createMainModel();
  model.level = 200;
  if (piece === PERNA_A) {
    model.boot = piece;
    model.bootRefine = refine;
  } else if (piece === MOTOR_A) {
    model.garment = piece;
    model.garmentRefine = refine;
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

describe('P-Total (310112)', () => {
  // Phrase for phrase the same as 310579 Orbe Lupino - Total 1 and 29542 U-Total.
  it('resists Normais e Chefes from +0, tamanhos from +9 and raças from +11', () => {
    const at = (refine: number) => bonusOf(MOTOR_A, 'garmentEnchant1', P_TOTAL, refine);

    expect(at(0)['subclass_all']).toBe(7);
    expect(at(0)['subsize_all'] || 0).toBe(0);
    expect(at(9)['subsize_all']).toBe(7);
    expect(at(9)['subrace_all'] || 0).toBe(0);
    expect(at(11)['subrace_all']).toBe(7);
  });

  it('cuts the damage a player attacker deals — Normal and Médio both hit', () => {
    const bonus = bonusOf(MOTOR_A, 'garmentEnchant1', P_TOTAL, 11);
    const incoming = {
      attackerRace: 'player_human' as const,
      attackerElement: 'neutral' as const,
      attackerSize: 'm' as const,
      attackerType: 'normal' as const,
      dmgType: 'physical' as const,
    };

    // Normal (7%) and Médio (7%) apply. The +11 race clause does NOT: the client spells
    // it "todas as raças de monstros", and an attacking player is neither (core/pvp.ts,
    // PLAYER_RACES) — so it is two categories, not three.
    expect(defenderReductionMultiplier({ bonus, ...incoming })).toBeCloseTo(0.93 ** 2, 10);
  });

  it('gives its race clause to a monster attacker, where the line does apply', () => {
    const bonus = bonusOf(MOTOR_A, 'garmentEnchant1', P_TOTAL, 11);
    const fromDemon = {
      attackerRace: 'demon',
      attackerElement: 'neutral',
      attackerSize: 'm' as const,
      attackerType: 'normal' as const,
      dmgType: 'physical' as const,
    };

    expect(defenderReductionMultiplier({ bonus, ...fromDemon })).toBeCloseTo(0.93 ** 3, 10);
  });
});
