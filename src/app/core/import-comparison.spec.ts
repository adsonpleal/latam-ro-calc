import { describe, expect, it } from 'vitest';
import { AllowedCompareItemTypes } from 'src/app/app-config/allowed-compare-item-types';
import { PetLoyalty } from 'src/app/constants/pet-loyalty';
import { createMainModel } from 'src/app/utils/create-main-model';
import { STATS_COMPARE_KEYS, sanitizeCompareState } from './compare-state';
import { buildComparisonFromImport, buildComparisonFromSavedSim, canCompareSavedPreset } from './import-comparison';

const SLOTS = [...AllowedCompareItemTypes] as string[];

/** A build as an import hands it over: a full model, some slots empty. */
function importedBuild() {
  const m = createMainModel();
  Object.assign(m, {
    class: 4252, level: 250, jobLevel: 55,
    str: 130, agi: 90, vit: 80, int: 1, dex: 100, luk: 1,
    pow: 80, sta: 20, wis: 0, spl: 0, con: 50, crt: 10,
    weapon: 1291, weaponRefine: 12, weaponGrade: 'A', weaponCard1: 4001, weaponEnchant2: 4700,
    armor: 15000, armorRefine: 9, armorCard: 4105,
    pet: 9001, petLoyalty: PetLoyalty.Normal,
    propertyAtk: 3, ammo: 1773,
  });
  m.rawOptionTxts = ['atk:10'];
  return m;
}

describe('buildComparisonFromImport', () => {
  it('compares every offered slot, empty ones included, and the character', () => {
    const state = buildComparisonFromImport(importedBuild(), SLOTS);
    expect(state.itemNames).toEqual(SLOTS);
    expect(state.stats).toBe(true);
    // An empty slot is compared as empty, not left to the build on screen.
    expect(state.model2['boot']).toBeNull();
    expect(state.model2['shield']).toBeNull();
  });

  it('carries each item with its cards, enchants, refine and grade', () => {
    const { model2 } = buildComparisonFromImport(importedBuild(), SLOTS);
    expect(model2).toMatchObject({
      weapon: 1291, weaponRefine: 12, weaponGrade: 'A', weaponCard1: 4001, weaponCard2: null, weaponEnchant2: 4700,
      armor: 15000, armorRefine: 9, armorCard: 4105,
    });
    expect(model2['rawOptionTxts']).toEqual(['atk:10']);
  });

  it('carries the loose fields a slot owns: pet loyalty, converter and ammo', () => {
    const { model2 } = buildComparisonFromImport(importedBuild(), SLOTS);
    expect(model2).toMatchObject({ pet: 9001, petLoyalty: PetLoyalty.Normal, propertyAtk: 3, ammo: 1773 });
  });

  it('carries level, job level, stats and traits', () => {
    const imported = importedBuild();
    const { model2 } = buildComparisonFromImport(imported, SLOTS);
    for (const key of STATS_COMPARE_KEYS) expect(model2[key]).toBe(imported[key]);
  });

  it('leaves out a slot the class is not offered', () => {
    const state = buildComparisonFromImport(importedBuild(), SLOTS.filter((s) => s !== 'leftWeapon'));
    expect(state.itemNames).not.toContain('leftWeapon');
    expect('leftWeapon' in state.model2).toBe(false);
  });

  it('survives the sanitizer that guards storage and share links', () => {
    const state = buildComparisonFromImport(importedBuild(), SLOTS);
    expect(sanitizeCompareState(JSON.parse(JSON.stringify(state)))).toEqual(JSON.parse(JSON.stringify(state)));
  });

  it('overrides the build on screen through the compare pass spread', () => {
    const main = { ...createMainModel(), level: 200, str: 50, weapon: 7, boot: 22004 };
    const { model2 } = buildComparisonFromImport(importedBuild(), SLOTS);
    const merged = { ...main, ...model2 };
    expect(merged).toMatchObject({ level: 250, str: 130, weapon: 1291, boot: null });
  });
});

describe('buildComparisonFromSavedSim', () => {
  /** A named save as the store holds it: a preset, not a full model. */
  const savedPreset = (overrides: Record<string, any> = {}) => ({
    class: 4252, level: 250, jobLevel: 55, str: 130, pow: 80,
    weapon: 1291, weaponRefine: 12, armor: 15000, ...overrides,
  });

  it('compares a save of the class on screen', () => {
    const state = buildComparisonFromSavedSim(savedPreset(), 4252, SLOTS);
    expect(state?.itemNames).toEqual(SLOTS);
    expect(state?.stats).toBe(true);
    expect(state?.model2).toMatchObject({ weapon: 1291, weaponRefine: 12, armor: 15000, level: 250, str: 130 });
  });

  it('refuses a save of another class, which is what disables the card icon', () => {
    expect(buildComparisonFromSavedSim(savedPreset(), 4257, SLOTS)).toBeNull();
  });

  it('reads the class the way it comes back out of localStorage, as a string or a number', () => {
    expect(canCompareSavedPreset(savedPreset({ class: '4252' }), 4252)).toBe(true);
    expect(canCompareSavedPreset(savedPreset(), 4252)).toBe(true);
    expect(canCompareSavedPreset(savedPreset(), 4257)).toBe(false);
    expect(canCompareSavedPreset(null, 4252)).toBe(false);
  });

  it('fills in the defaults of a preset saved before a field existed', () => {
    // A preset carries no `rawOptionTxts` when it was saved before random options, and
    // the compare pass reads that array; normalizeSavedModel is what puts it back.
    const state = buildComparisonFromSavedSim(savedPreset(), 4252, SLOTS);
    expect(state?.model2['rawOptionTxts']).toEqual([]);
    expect(state?.model2['boot']).toBeNull();
  });

  it('refuses a save with no preset at all rather than comparing an empty build', () => {
    expect(buildComparisonFromSavedSim(null, 4252, SLOTS)).toBeNull();
  });
});
