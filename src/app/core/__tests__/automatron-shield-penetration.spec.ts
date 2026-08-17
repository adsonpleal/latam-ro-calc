import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * 460158 Escudo Automatron B, whose whole script was missing: the calculator showed the
 * shield and none of its effects.
 *
 * The shield is the magic half of a pair — 460157 Escudo Automatron A does the same thing on
 * the physical side — so the A record is the template the B one is held to. The enchant pools
 * of both are a separate subject, in constants/enchant_item/automatron-shield.spec.ts.
 *
 * The pt-BR description is the source of truth (CLAUDE.md); each block quotes the line it
 * stands for.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ESCUDO_AUTOMATRON_A = 460157;
const ESCUDO_AUTOMATRON_B = 460158;

/** Equip the shield at `refine` and hand back the summed equipment bonus. */
function bonusOf(refine: number): Record<string, number> {
  const db = { [ESCUDO_AUTOMATRON_B]: { ...items[ESCUDO_AUTOMATRON_B] } };

  const model = createMainModel();
  model.level = 200;
  model.shield = ESCUDO_AUTOMATRON_B;
  model.shieldRefine = refine;

  return equipStatusOf(makeCalculator(db), model);
}

describe('460158 Escudo Automatron B', () => {
  // "Ignora 15% da DEFM de todas as raças de monstros. A cada 2 refinos: Ignora 5% da
  // DEFM de todas as raças de monstros." — the shield had an empty script, so it ignored
  // nothing.
  const mdefPene = (refine: number) => bonusOf(refine)['m_pene_race_all'] || 0;

  it('ignores 15% MDEF unrefined, +5% every 2 refines', () => {
    expect(mdefPene(0)).toBe(15);
    expect(mdefPene(1)).toBe(15);
    expect(mdefPene(2)).toBe(15 + 5);
    expect(mdefPene(9)).toBe(15 + 20);
    expect(mdefPene(10)).toBe(15 + 25);
  });

  it('mirrors Escudo Automatron A on the magic side', () => {
    const a = items[ESCUDO_AUTOMATRON_A].script;
    const b = items[ESCUDO_AUTOMATRON_B].script;

    expect(b.m_pene_race_all).toEqual(a.p_pene_race_all);
    expect(b.m_class_boss).toEqual(a.p_class_boss);
  });

  it('adds 10% magic damage vs bosses from +7', () => {
    // "Refino +7 ou mais: Dano mágico contra monstros chefes +10%."
    const bossDamage = (refine: number) => bonusOf(refine)['m_class_boss'] || 0;

    expect(bossDamage(6)).toBe(0);
    expect(bossDamage(7)).toBe(10);
  });
});
