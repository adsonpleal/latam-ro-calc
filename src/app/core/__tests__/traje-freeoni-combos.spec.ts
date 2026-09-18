import { describe, expect, it } from 'vitest';
import { FACA_3, ITEM_DB, wornBonus } from './worn-bonus';

const SUIT = 450217;
const PHREEONI = 4121;
const INFINITE_PHREEONI = 4649;

function comboBonus(refine: number, card: number, key: string): number {
  const withoutCard = wornBonus({ armor: SUIT, armorRefine: refine, weapon: FACA_3 });
  const withCard = wornBonus({ armor: SUIT, armorRefine: refine, weapon: FACA_3, weaponCard: card });
  const cardAlone = wornBonus({ weapon: FACA_3, weaponCard: card });
  const weaponAlone = wornBonus({ weapon: FACA_3 });
  return (withCard[key] ?? 0) - (withoutCard[key] ?? 0) - (cardAlone[key] ?? 0) + (weaponAlone[key] ?? 0);
}

describe('Traje de Freeoni card combos', () => {
  it('matches each card by its LATAM item id', () => {
    expect(ITEM_DB[SUIT].script.range).toContain('EQUIP_ID[4121]2---3');
    expect(ITEM_DB[SUIT].script.p_class_boss).toContain('EQUIP_ID[4121]3---8');
    expect(ITEM_DB[SUIT].script.criDmg).toContain('EQUIP_ID[4649]3---4');
  });

  it.each([
    [0, 0, 0],
    [1, 0, 0],
    [2, 3, 0],
    [3, 3, 8],
    [5, 6, 8],
    [6, 9, 16],
    [9, 12, 24],
    [12, 18, 32],
  ])('grants the regular card bonuses at armor refine +%i', (refine, range, boss) => {
    expect(comboBonus(refine, PHREEONI, 'range')).toBe(range);
    expect(comboBonus(refine, PHREEONI, 'p_class_boss')).toBe(boss);
    expect(comboBonus(refine, INFINITE_PHREEONI, 'range')).toBe(0);
    expect(comboBonus(refine, INFINITE_PHREEONI, 'p_class_boss')).toBe(0);
  });

  it.each([
    [0, 0],
    [2, 0],
    [3, 4],
    [5, 4],
    [6, 8],
    [9, 12],
  ])('scales the Infinite card critical damage at armor refine +%i', (refine, criticalDamage) => {
    expect(comboBonus(refine, INFINITE_PHREEONI, 'criDmg')).toBe(criticalDamage);
    expect(comboBonus(refine, INFINITE_PHREEONI, 'pAtk')).toBe(10);
    expect(comboBonus(refine, INFINITE_PHREEONI, 'cRate')).toBe(5);
    expect(comboBonus(refine, PHREEONI, 'criDmg')).toBe(0);
  });
});
