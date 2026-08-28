import { describe, expect, it } from 'vitest';
import { PetLoyalty, selectLoyaltyLines } from './pet-loyalty';

/**
 * A pet egg's bonus applies at its tier **and above**, and the tiers replace one another
 * rather than stacking. Both halves matter: only the first makes an egg that names a
 * single tier keep paying above it, and only the second stops a four-tier egg paying four
 * times over at Alta.
 *
 * Reported against Ovo de Andarilho (9037), whose only tier is Normal — at the default
 * Alta it was giving nothing at all.
 */

/** Ovo de Andarilho (9037): "Na Lealdade Normal: AGI +3. DES -1." */
const ANDARILHO_AGI = ['LOYALTY[3]===3'];
const ANDARILHO_DEX = ['LOYALTY[3]===-1'];

/** Ovo de Andarilho Poluto (9117), which spells every tier out. */
const POLUTO_AGI = ['LOYALTY[1]===4', 'LOYALTY[2]===4', 'LOYALTY[3]===4', 'LOYALTY[4]===4'];
const POLUTO_CRI = ['LOYALTY[2]===1', 'LOYALTY[3]===2', 'LOYALTY[4]===3'];
const POLUTO_CRI_DMG = ['LOYALTY[3]===5', 'LOYALTY[4]===7'];

describe('selectLoyaltyLines', () => {
  it('keeps a single-tier bonus paying above its tier', () => {
    // The bug: at Alta this egg matched nothing, so it gave no bonus at all.
    expect(selectLoyaltyLines(ANDARILHO_AGI, PetLoyalty.Alta)).toEqual(['LOYALTY[3]===3']);
    expect(selectLoyaltyLines(ANDARILHO_DEX, PetLoyalty.Alta)).toEqual(['LOYALTY[3]===-1']);
    expect(selectLoyaltyLines(ANDARILHO_AGI, PetLoyalty.Normal)).toEqual(['LOYALTY[3]===3']);
  });

  it('pays nothing below the lowest tier the bonus names', () => {
    expect(selectLoyaltyLines(ANDARILHO_AGI, PetLoyalty.Nenhuma)).toEqual([]);
    expect(selectLoyaltyLines(POLUTO_CRI_DMG, PetLoyalty.Nenhuma)).toEqual([]);
    expect(selectLoyaltyLines(POLUTO_CRI, PetLoyalty.Baixa)).toEqual([]);
  });

  it('keeps exactly one tier — the highest reached — never the sum', () => {
    // Four lines of AGI +4 must stay AGI +4 at Alta, not +16.
    expect(selectLoyaltyLines(POLUTO_AGI, PetLoyalty.Alta)).toEqual(['LOYALTY[4]===4']);
    expect(selectLoyaltyLines(POLUTO_CRI, PetLoyalty.Alta)).toEqual(['LOYALTY[4]===3']);
    expect(selectLoyaltyLines(POLUTO_CRI_DMG, PetLoyalty.Alta)).toEqual(['LOYALTY[4]===7']);
  });

  it('walks down a tier at a time as intimacy drops', () => {
    expect(selectLoyaltyLines(POLUTO_CRI, PetLoyalty.Normal)).toEqual(['LOYALTY[3]===2']);
    expect(selectLoyaltyLines(POLUTO_CRI, PetLoyalty.Nenhuma)).toEqual(['LOYALTY[2]===1']);
    expect(selectLoyaltyLines(POLUTO_CRI_DMG, PetLoyalty.Normal)).toEqual(['LOYALTY[3]===5']);
  });

  it('leaves lines that carry no tier condition alone', () => {
    const plain = ['5', 'REFINE[weapon>=7]===3'];
    expect(selectLoyaltyLines(plain, PetLoyalty.Baixa)).toBe(plain);
  });

  it('keeps unconditional lines alongside the winning tier', () => {
    const mixed = ['2', 'LOYALTY[2]===1', 'LOYALTY[4]===3'];
    expect(selectLoyaltyLines(mixed, PetLoyalty.Normal)).toEqual(['2', 'LOYALTY[2]===1']);
  });
});
