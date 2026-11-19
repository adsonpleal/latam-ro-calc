import { describe, expect, it } from 'vitest';
import { PetLoyalty } from 'src/app/constants';
import { FACA_3, ITEM_DB, wornBonus } from './worn-bonus';

const SUIT = 450217;
const PHREEONI = 4121;
const INFINITE_PHREEONI = 4649;
const OVO_FREEONI = 9111;
const OVO_PORING = 9001;

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

/**
 * The fourth set on the same armour pairs it with the pet rather than with a card, and it
 * paid nothing at all until this spec existed: the condition was written `EQUIP[Q-pet
 * Phreeoni]`, and no item in the database answers to that name. `EQUIP[...]` is matched by
 * `matchName()` against the item's English display name, which for the egg is "Phreeoni
 * Egg" ("Freeoni Egg" once the LATAM overlay is on) — "Q-pet Phreeoni" is the kRO wording
 * for the *summoned* pet, and it reached item.json as prose, not as anything matchable.
 *
 * Matching the egg by id is what the rest of the database already does for a pet partner
 * (see Cesta de Mascotes, 410599), and it is the form that survives the pt-BR renaming.
 *
 * Figures from the LATAM client's own description of the armour, which names the set
 * "Mascote Freeoni" and no intimacy tier: "Dano físico +7%. Velocidade de ataque +2."
 */
describe('Traje de Freeoni pet combo', () => {
  it('matches the pet by its LATAM item id, not by a name nothing carries', () => {
    expect(ITEM_DB[SUIT].script.atkPercent).toContain('EQUIP_ID[9111]===7');
    expect(ITEM_DB[SUIT].script.aspd).toContain('EQUIP_ID[9111]===2');
  });

  /** What the egg adds on top of the armour worn alone — the set bonus and nothing else. */
  const petBonus = (pet: number | undefined, key: string, petLoyalty?: PetLoyalty) =>
    (wornBonus({ armor: SUIT, armorRefine: 12, weapon: FACA_3, pet, petLoyalty })[key] ?? 0)
    - (wornBonus({ armor: SUIT, armorRefine: 12, weapon: FACA_3 })[key] ?? 0);

  it('grants physical damage +7% and ASPD +2 with the Ovo de Freeoni equipped', () => {
    expect(petBonus(OVO_FREEONI, 'atkPercent')).toBe(7);
    expect(petBonus(OVO_FREEONI, 'aspd')).toBe(2);
  });

  it('grants nothing with the pet slot empty', () => {
    expect(petBonus(undefined, 'atkPercent')).toBe(0);
    expect(petBonus(undefined, 'aspd')).toBe(0);
  });

  it('grants nothing to a different pet', () => {
    expect(petBonus(OVO_PORING, 'atkPercent')).toBe(0);
    expect(petBonus(OVO_PORING, 'aspd')).toBe(0);
  });

  /*
   * The set carries no `LOYALTY[n]`, and the LATAM description names no tier — unlike the
   * egg's own HIT bonus, which does. So the armour pays the same at every intimacy, and a
   * later edit that gates it on a tier has to break this.
   */
  it.each([PetLoyalty.Baixa, PetLoyalty.Nenhuma, PetLoyalty.Normal, PetLoyalty.Alta])(
    'pays the same at loyalty tier %i', (tier) => {
      expect(petBonus(OVO_FREEONI, 'atkPercent', tier)).toBe(7);
      expect(petBonus(OVO_FREEONI, 'aspd', tier)).toBe(2);
    });
});
