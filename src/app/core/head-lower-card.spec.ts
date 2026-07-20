import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { ItemTypeEnum, MainItemWithRelations } from 'src/app/constants';
import { equipStatusOf, makeCalculator } from './__tests__/make-calculator';

/**
 * Reported: picking Máscara de Odium in the Baixo slot showed a "Carta" dropdown that
 * could not be used. The lower head slot had no card field anywhere — not in
 * ItemTypeEnum, MainItemWithRelations, the model, the preset, or the engine's status maps
 * — and the template passed `[cardList]="[]"`, so the picker rendered but bound to nothing.
 *
 * Lower head gear with a socket takes an ordinary head card, so the slot exists now. It is
 * not special-cased to multi-slot items: any slotted lower head gear can hold one.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));

const ODIUM = 436003; // Máscara de Odium — Meio + Baixo, slots: 1
const CARD = 4143; // Carta Orc Herói — head-position card, VIT +3

describe('head lower card slot', () => {
  it('is registered as a relation of headLower', () => {
    expect(MainItemWithRelations[ItemTypeEnum.headLower]).toContain(ItemTypeEnum.headLowerCard);
  });

  it('exists on a fresh model, so saved builds and share links round-trip it', () => {
    // setModelByJSONString copies only keys present in the empty model; a missing key here
    // means the card is silently dropped on load.
    expect(Object.keys(createMainModel())).toContain('headLowerCard');
  });

  it('applies the card bonus when the mask sits in the lower slot', () => {
    const card = db[CARD];
    expect(card, `card ${CARD} missing from the db`).toBeDefined();

    const items: any = { [ODIUM]: { ...db[ODIUM] }, [CARD]: { ...card } };
    const model = createMainModel();
    model.level = 200;
    model.headLower = ODIUM;
    model.headLowerCard = CARD;

    const bonus = equipStatusOf(makeCalculator(items), model);
    const withoutCard = equipStatusOf(makeCalculator(items), { ...createMainModel(), level: 200, headLower: ODIUM });

    expect(bonus['vit']).toBe(3); // Carta Orc Herói
    expect(withoutCard['vit']).toBe(0);
    expect(bonus['hpPercent']).toBe(5); // the mask's own line still applies
  });

  it('still applies the card when the same mask is worn in the middle slot', () => {
    const items: any = { [ODIUM]: { ...db[ODIUM] }, [CARD]: { ...db[CARD] } };
    const lower = equipStatusOf(makeCalculator(items), {
      ...createMainModel(), level: 200, headLower: ODIUM, headLowerCard: CARD,
    });
    const middle = equipStatusOf(makeCalculator(items), {
      ...createMainModel(), level: 200, headMiddle: ODIUM, headMiddleCard: CARD,
    });

    // Which slot the player picks must not change what the build is worth.
    expect(lower).toEqual(middle);
  });
});
