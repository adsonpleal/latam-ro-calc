import { describe, expect, it } from 'vitest';
import { HeadGearLocation } from '../constants/head-gear-location';
import { ItemSubTypeId } from '../constants/item-sub-type.enum';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { HEAD_SLOTS, getHeadGearLocations, getHeadGearSlots, isCostumeHeadGear, resolveHeadSlotOccupancy } from './head-gear-slots';

const { Upper, Middle, Lower } = HeadGearLocation;

/** 436003 Máscara de Odium — "Equipa em: Meio e Baixo", the item Luís reported. */
const odiumMask = { itemSubTypeId: ItemSubTypeId.Upper, location: 'Lower', locations: ['Middle', 'Lower'] };
const plainHat = { itemSubTypeId: ItemSubTypeId.Upper, location: null };
const plainMidGlasses = { itemSubTypeId: ItemSubTypeId.Upper, location: 'Middle' };
const costumeMask = { itemSubTypeId: ItemSubTypeId.CostumeLower, location: 'Lower', locations: ['Middle', 'Lower'] };

describe('getHeadGearLocations', () => {
  it('reads every position off a multi-slot item', () => {
    expect(getHeadGearLocations(odiumMask)).toEqual([Middle, Lower]);
  });

  it('keeps the canonical top-to-bottom order regardless of how the data is written', () => {
    expect(getHeadGearLocations({ itemSubTypeId: 512, locations: ['Lower', 'Upper', 'Middle'] })).toEqual([Upper, Middle, Lower]);
  });

  it('falls back to the single `location` when the item occupies one slot', () => {
    expect(getHeadGearLocations(plainMidGlasses)).toEqual([Middle]);
  });

  it('treats a head gear with no location at all as Upper', () => {
    // ~1.1k upper head gears ship `location: null`; Upper is the historical default.
    expect(getHeadGearLocations(plainHat)).toEqual([Upper]);
  });

  it('falls back to the sub type for costumes, which is where their slot is recorded', () => {
    expect(getHeadGearLocations({ itemSubTypeId: ItemSubTypeId.CostumeMiddle })).toEqual([Middle]);
  });

  it('ignores junk in `locations` rather than inventing a slot', () => {
    expect(getHeadGearLocations({ itemSubTypeId: 512, location: 'Middle', locations: ['Garment', 'nope'] })).toEqual([Middle]);
  });

  it('returns nothing for items that are not head gear', () => {
    expect(getHeadGearLocations({ itemSubTypeId: ItemSubTypeId.Armor, location: 'Armor' })).toEqual([]);
    expect(getHeadGearLocations(null)).toEqual([]);
  });
});

describe('HEAD_SLOTS', () => {
  it('covers both families, real slots first', () => {
    expect(HEAD_SLOTS).toEqual([
      ItemTypeEnum.headUpper, ItemTypeEnum.headMiddle, ItemTypeEnum.headLower,
      ItemTypeEnum.costumeUpper, ItemTypeEnum.costumeMiddle, ItemTypeEnum.costumeLower,
    ]);
  });
});

describe('getHeadGearSlots', () => {
  it('maps a real head gear onto the equipment slots', () => {
    expect(getHeadGearSlots(odiumMask)).toEqual([ItemTypeEnum.headMiddle, ItemTypeEnum.headLower]);
  });

  it('maps a costume onto the costume slots — the two families never mix', () => {
    expect(isCostumeHeadGear(costumeMask)).toBe(true);
    expect(getHeadGearSlots(costumeMask)).toEqual([ItemTypeEnum.costumeMiddle, ItemTypeEnum.costumeLower]);
  });
});

describe('resolveHeadSlotOccupancy', () => {
  it('marks the other slots a multi-slot item takes over', () => {
    const { occupiedBy, toClear } = resolveHeadSlotOccupancy({ [ItemTypeEnum.headLower]: odiumMask });

    expect(occupiedBy).toEqual({ [ItemTypeEnum.headMiddle]: ItemTypeEnum.headLower });
    expect(toClear).toEqual([]);
  });

  it('occupies downward too — the mask can be worn from the Meio slot', () => {
    // Only headUpper/headMiddle have a card socket, so which slot holds it matters.
    const { occupiedBy } = resolveHeadSlotOccupancy({ [ItemTypeEnum.headMiddle]: odiumMask });

    expect(occupiedBy).toEqual({ [ItemTypeEnum.headLower]: ItemTypeEnum.headMiddle });
  });

  it('leaves single-slot head gear alone', () => {
    const { occupiedBy, toClear } = resolveHeadSlotOccupancy({
      [ItemTypeEnum.headUpper]: plainHat,
      [ItemTypeEnum.headMiddle]: plainMidGlasses,
    });

    expect(occupiedBy).toEqual({});
    expect(toClear).toEqual([]);
  });

  it('drops the item the player just picked over, not the one they just picked', () => {
    // Mask already in Baixo; the player now chooses glasses in Meio -> the mask goes.
    const { toClear } = resolveHeadSlotOccupancy(
      { [ItemTypeEnum.headLower]: odiumMask, [ItemTypeEnum.headMiddle]: plainMidGlasses },
      new Set([ItemTypeEnum.headMiddle]),
    );

    expect(toClear).toEqual([ItemTypeEnum.headLower]);
  });

  it('drops the covered item when the multi-slot one is the fresh pick', () => {
    const { toClear } = resolveHeadSlotOccupancy(
      { [ItemTypeEnum.headLower]: odiumMask, [ItemTypeEnum.headMiddle]: plainMidGlasses },
      new Set([ItemTypeEnum.headLower]),
    );

    expect(toClear).toEqual([ItemTypeEnum.headMiddle]);
  });

  it('lets the spanning item win when nothing was singled out, e.g. an old share link', () => {
    // Builds saved before this rule existed can hold both; the mask is what the game
    // would actually let you wear, so the loose middle piece is the one to drop.
    const { toClear } = resolveHeadSlotOccupancy({
      [ItemTypeEnum.headLower]: odiumMask,
      [ItemTypeEnum.headMiddle]: plainMidGlasses,
    });

    expect(toClear).toEqual([ItemTypeEnum.headMiddle]);
  });

  it('never lets a costume collide with real head gear', () => {
    const { occupiedBy, toClear } = resolveHeadSlotOccupancy({
      [ItemTypeEnum.costumeLower]: costumeMask,
      [ItemTypeEnum.headMiddle]: plainMidGlasses,
    });

    expect(occupiedBy).toEqual({ [ItemTypeEnum.costumeMiddle]: ItemTypeEnum.costumeLower });
    expect(toClear).toEqual([]);
  });
});
