import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Community bug reports of 13/08/2026 that turned out to be missing `script` data.
 *
 * Both items had been registered with the structural fields only, so the calculator
 * showed the piece but none of its effects. The pt-BR description is the source of truth
 * (CLAUDE.md); each block below quotes the line it stands for.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

interface Worn {
  id: number;
  slot: string;
  refine?: number;
}

/** Equip `worn` and hand back the summed equipment bonus. */
function bonusOf(worn: Worn[]): Record<string, number> {
  const db: Record<number, any> = {};
  for (const piece of worn) db[piece.id] = { ...items[piece.id] };

  const model = createMainModel();
  model.level = 200;
  for (const piece of worn) {
    model[piece.slot] = piece.id;
    model[`${piece.slot}Refine`] = piece.refine ?? 0;
  }

  return equipStatusOf(makeCalculator(db), model);
}

const ESCUDO_AUTOMATRON_B = 460158;
const ELMO_MAGICO_DE_CINZAS = 401252;
const CAJADO_DE_CINZAS = 1669;
const CAJADO_DUPLO_DE_CINZAS = 2023;

const ONDA_PSIQUICA = '2449';
const PO_DE_DIAMANTE = '2447';
const IMPACTO_ESPIRITUAL = '2202';
const CORRENTE_ELETRICA = '2214';

describe('460158 Escudo Automatron B (reported by junior.zkt)', () => {
  // "Ignora 15% da DEFM de todas as raças de monstros. A cada 2 refinos: Ignora 5% da
  // DEFM de todas as raças de monstros." — the shield had an empty script, so it ignored
  // nothing. Its sibling Escudo Automatron A is the same effect on the physical side.
  const mdefPene = (refine: number) =>
    bonusOf([{ id: ESCUDO_AUTOMATRON_B, slot: 'shield', refine }])['m_pene_race_all'] || 0;

  it('ignores 15% MDEF unrefined, +5% every 2 refines', () => {
    expect(mdefPene(0)).toBe(15);
    expect(mdefPene(1)).toBe(15);
    expect(mdefPene(2)).toBe(15 + 5);
    expect(mdefPene(9)).toBe(15 + 20);
    expect(mdefPene(10)).toBe(15 + 25);
  });

  it('mirrors Escudo Automatron A on the magic side', () => {
    const a = items[460157].script;
    const b = items[ESCUDO_AUTOMATRON_B].script;

    expect(b.m_pene_race_all).toEqual(a.p_pene_race_all);
    expect(b.m_class_boss).toEqual(a.p_class_boss);
  });

  it('adds 10% magic damage vs bosses from +7', () => {
    // "Refino +7 ou mais: Dano mágico contra monstros chefes +10%."
    const bossDamage = (refine: number) =>
      bonusOf([{ id: ESCUDO_AUTOMATRON_B, slot: 'shield', refine }])['m_class_boss'] || 0;

    expect(bossDamage(6)).toBe(0);
    expect(bossDamage(7)).toBe(10);
  });
});

describe('401252 Elmo Mágico de Cinzas sets (anonymous report)', () => {
  // Reported as "Conjunto Cajado de Cinzas + Elmo de Cinzas": the helm is the *Mágico*
  // one, and only its flat "Dano mágico +7%" leg was registered. Neither set's per-refine
  // skill bonus existed, so refining the staff changed nothing.
  const withStaff = (staff: number, weaponRefine: number) =>
    bonusOf([
      { id: ELMO_MAGICO_DE_CINZAS, slot: 'headUpper', refine: 0 },
      { id: staff, slot: 'weapon', refine: weaponRefine },
    ]);

  describe('[Cajado de Cinzas]', () => {
    // "Recarga de [Onda Psíquica] -1,5 segundos.
    //  A cada 2 refinos da arma: Dano de [Onda Psíquica] e [Pó de Diamante] +5%."
    it('adds 5% to Onda Psíquica and Pó de Diamante every 2 weapon refines', () => {
      const at = (weaponRefine: number) => {
        const bonus = withStaff(CAJADO_DE_CINZAS, weaponRefine);
        return [bonus[ONDA_PSIQUICA] || 0, bonus[PO_DE_DIAMANTE] || 0];
      };

      expect(at(0)).toEqual([0, 0]);
      expect(at(1)).toEqual([0, 0]);
      expect(at(2)).toEqual([5, 5]);
      expect(at(9)).toEqual([20, 20]);
      expect(at(10)).toEqual([25, 25]);
    });

    it('cuts 1.5s off the Onda Psíquica cooldown regardless of refine', () => {
      expect(withStaff(CAJADO_DE_CINZAS, 0)['cd__2449']).toBe(1.5);
    });
  });

  describe('[Cajado Duplo de Cinzas]', () => {
    // "Dano mágico +7%.
    //  A cada 2 refinos da arma: Dano de [Impacto Espiritual] e [Corrente Elétrica] +5%."
    it('adds 5% to Impacto Espiritual and Corrente Elétrica every 2 weapon refines', () => {
      const at = (weaponRefine: number) => {
        const bonus = withStaff(CAJADO_DUPLO_DE_CINZAS, weaponRefine);
        return [bonus[IMPACTO_ESPIRITUAL] || 0, bonus[CORRENTE_ELETRICA] || 0];
      };

      expect(at(0)).toEqual([0, 0]);
      expect(at(2)).toEqual([5, 5]);
      expect(at(10)).toEqual([25, 25]);
    });

    it('keeps the flat 7% magic damage that already worked', () => {
      expect(withStaff(CAJADO_DUPLO_DE_CINZAS, 0)['matkPercent']).toBe(7);
    });
  });

  it('keeps the two sets apart — one staff never fires the other', () => {
    const withOne = withStaff(CAJADO_DE_CINZAS, 10);
    const withTwo = withStaff(CAJADO_DUPLO_DE_CINZAS, 10);

    expect([withOne[IMPACTO_ESPIRITUAL] || 0, withOne[CORRENTE_ELETRICA] || 0]).toEqual([0, 0]);
    expect([withTwo[ONDA_PSIQUICA] || 0, withTwo[PO_DE_DIAMANTE] || 0]).toEqual([0, 0]);
    expect(withOne['matkPercent'] || 0).toBe(0);
  });
});
