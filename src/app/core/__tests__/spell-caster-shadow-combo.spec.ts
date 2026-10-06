import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));
const ARMOR = 24747;
const SHOES = 24748;
const EARRING = 24749;
const PENDANT = 24750;

/** Tracker q6eBuWuTYxie7edhXU0Y: the earring mistakenly required the shoes.
 * Both pairs give -0.3 s at summed refine 20; wearing both must not double it.
 * The reported build has +10 earring/pendant, armor 24245 +10 and boots 24243 +9.
 */
function bonusOf(equipment: Record<string, number>) {
  const model = { ...createMainModel(), level: 240, ...equipment };
  return equipStatusOf(makeCalculator(db), model);
}

const accessories = (earring = 10, pendant = 10) => ({
  shadowEarring: EARRING, shadowEarringRefine: earring,
  shadowPendant: PENDANT, shadowPendantRefine: pendant,
});
const armorAndShoes = (armor = 10, shoes = 10) => ({
  shadowArmor: ARMOR, shadowArmorRefine: armor,
  shadowBoot: SHOES, shadowBootRefine: shoes,
});

describe('Spell Caster shadow fixed cast combos', () => {
  it('reduces fixed cast by 0.3 s with the reported equipment', () => {
    const bonus = bonusOf({ ...accessories(), shadowArmor: 24245, shadowArmorRefine: 10,
      shadowBoot: 24243, shadowBootRefine: 9 });
    expect(bonus.fct).toBeCloseTo(0.3);
    expect(bonus.spCostPercent).toBe(-10);
  });

  it('does not require armor or shoes for the accessory pair', () => {
    expect(bonusOf(accessories()).fct).toBeCloseTo(0.3);
  });

  it.each([[9, 10], [10, 9], [0, 0]])('requires accessory summed refine 20 (%i + %i)', (earring, pendant) => {
    const bonus = bonusOf(accessories(earring, pendant));
    expect(bonus.fct).toBe(0);
    expect(bonus.spCostPercent).toBe(-10);
  });

  it('does not grant the accessory bonus without either partner, even with the shoes', () => {
    for (const missing of ['shadowEarring', 'shadowPendant']) {
      expect(bonusOf({ ...accessories(), [missing]: 0, shadowBoot: SHOES }).fct).toBe(0);
    }
  });

  it('retains the armor/shoes reduction at summed refine 20', () => {
    expect(bonusOf(armorAndShoes()).fct).toBeCloseTo(0.3);
    expect(bonusOf(armorAndShoes(9, 10)).fct).toBe(0);
    expect(bonusOf({ ...armorAndShoes(), shadowBoot: 0 }).fct).toBe(0);
  });

  it('grants only 0.3 s when both complete pairs reach summed refine 20', () => {
    const bonus = bonusOf({ ...accessories(), ...armorAndShoes() });
    expect(bonus.fct).toBeCloseTo(0.3);
    expect(bonus.spCostPercent).toBe(-20);
  });

  it('does not cancel a qualifying pair when the other pair is below its threshold', () => {
    expect(bonusOf({ ...accessories(), ...armorAndShoes(9, 10) }).fct).toBeCloseTo(0.3);
    expect(bonusOf({ ...accessories(9, 10), ...armorAndShoes() }).fct).toBeCloseTo(0.3);
    expect(bonusOf({ ...accessories(9, 10), ...armorAndShoes(9, 10) }).fct).toBe(0);
  });

  it('does not cancel the accessory bonus for unrelated armor with the same refines', () => {
    expect(bonusOf({ ...accessories(), shadowArmor: 24245, shadowArmorRefine: 10,
      shadowBoot: SHOES, shadowBootRefine: 10 }).fct).toBeCloseTo(0.3);
  });

  it('matches the client description’s partner, refine threshold and fixed cast reduction', () => {
    const description = latam[EARRING].description.replace(/\^[0-9a-f]{6}/gi, '');
    expect(description).toContain('Colar Sombrio dos Feitiços');
    expect(description).toContain('Soma dos refinos 20 ou mais:');
    expect(description).toContain('Conjuração fixa -0,3 segundos.');
  });
});
