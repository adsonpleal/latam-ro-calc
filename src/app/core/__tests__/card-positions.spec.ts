import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CardPosition } from 'src/app/constants/card-position.enum';

/**
 * Cards whose `compositionPos` matched no branch of the card router.
 *
 * A card can be perfectly registered — right script, right magnitudes, right name — and
 * still reach no picker at all, because the router routes by position: anything outside
 * CardPosition sits in every picker's blind spot, registered and unreachable. Both records
 * below were found that way, one from a report and one while auditing the missing cards,
 * and both belong at CardPosition.Weapon.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

describe('Carta Mosca Caçadora (4115) reaches the weapon-card list', () => {
  it('sits at the weapon card position', () => {
    // The record carried 2 — the Aegis right-hand bitmask — which matches no branch of the
    // card router, so the card landed in no picker at all.
    expect(db[4115].itemTypeId).toBe(6);
    expect(db[4115].compositionPos).toBe(CardPosition.Weapon);
  });
});

describe('Carta Lobo (27390) reaches the weapon-card list', () => {
  it('carries a weapon compositionPos instead of null', () => {
    // Found while auditing the missing cards, not reported: the record was in the database
    // with `compositionPos: null`, which matches no branch of the card router — registered
    // and unreachable. The pt-BR description's "Equipa em: Arma" agrees with RagnaPlace's
    // `weapon`. What the card grants is in wolf-poe-combo.spec.ts.
    expect(db[27390].itemTypeId).toBe(6);
    expect(db[27390].compositionPos).toBe(CardPosition.Weapon);
  });
});
