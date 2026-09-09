import { describe, expect, it } from 'vitest';
import { EQUIPMENT_SLOTS } from '../app-config/equipment-slots';
import { ItemTypeEnum } from '../constants/item-type.enum';
import { DEFAULT_PET_LOYALTY, PetLoyalty } from '../constants/pet-loyalty';
import { ArchMage } from '../jobs/ArchMage';
import { DragonKnight } from '../jobs/DragonKnight';
import { RuneKnight } from '../jobs/RuneKnight';
import { ShadowCross } from '../jobs/ShadowCross';
import { SuperNovice } from '../jobs/SuperNovice';
import { CharacterBase } from '../jobs/_character-base.abstract';
import { ItemModel } from '../models/item.model';
import { MainModel } from '../models/main.model';
import { createMainModel } from '../utils/create-main-model';
import { applyClassSwitch, findClassSwitchLosses, hasBuildToKeep, isEquipableInSlot, isUsableByClass } from './class-switch';

/**
 * The class dropdown used to wipe the build; it now offers to carry it over, which is only
 * safe if what the new class cannot wear is subtracted first. Report:
 * issues.latam-tools.com.br/t/A1ju2K45hrVkKRrb0kNa
 */

const item = (overrides: Partial<ItemModel> & Record<string, any>): ItemModel =>
  ({ id: 1, aegisName: 'Test_Item', name: 'Item de Teste', slots: 0, ...overrides }) as ItemModel;

const classOf = (ctor: new () => CharacterBase) => new ctor();

const buildWith = (overrides: Partial<MainModel>): MainModel => ({ ...createMainModel(), ...overrides });

/** A catalogue keyed by id, the shape the component passes in. */
const catalogue = (...items: ItemModel[]): Record<number, ItemModel> =>
  items.reduce((map, entry) => ({ ...map, [entry.id]: entry }), {});

const lossFor = (model: MainModel, items: Record<number, ItemModel>, nextClass: CharacterBase, canWieldOffHandWeapon = true) =>
  findClassSwitchLosses({ model, items, nextClass, canWieldOffHandWeapon });

describe('isUsableByClass', () => {
  const knight = classOf(RuneKnight).classNameSet;

  it('lets an item that names nobody go on anyone', () => {
    expect(isUsableByClass({}, knight)).toBe(true);
    expect(isUsableByClass(undefined, knight)).toBe(true);
  });

  it('reads usableClass against the whole lineage, not just the current job', () => {
    // A Rune Knight is still a Swordman as far as the item tables are concerned.
    expect(isUsableByClass({ usableClass: ['Swordman'] }, knight)).toBe(true);
    expect(isUsableByClass({ usableClass: ['Mage'] }, knight)).toBe(false);
  });

  it('lets unusableClass win over an open usableClass', () => {
    expect(isUsableByClass({ unusableClass: ['Swordman'] }, knight)).toBe(false);
    expect(isUsableByClass({ usableClass: ['all'], unusableClass: ['Swordman'] }, knight)).toBe(false);
  });
});

describe('isEquipableInSlot', () => {
  const knight = classOf(RuneKnight);
  const superNovice = classOf(SuperNovice);
  const mageSword = item({ usableClass: ['Swordman'], itemLevel: 4, itemSubTypeId: 257 });

  it('judges nothing on an unfiltered slot, or on an id with no record', () => {
    expect(isEquipableInSlot('none', mageSword, classOf(ArchMage))).toBe(true);
    expect(isEquipableInSlot('gear', undefined, classOf(ArchMage))).toBe(true);
  });

  it('gives the Super Novice its level-4 one-hander and any head gear', () => {
    // itemSubTypeId 257 is the one-handed sword: not on the Swordman-only list, but the
    // Super Novice exemption in the weapon picker takes it anyway.
    expect(isEquipableInSlot('weapon', mageSword, superNovice)).toBe(true);
    expect(isEquipableInSlot('weapon', mageSword, knight)).toBe(true);
    expect(isEquipableInSlot('weapon', mageSword, classOf(ArchMage))).toBe(false);

    const knightHat = item({ usableClass: ['Swordman'] });
    expect(isEquipableInSlot('headGear', knightHat, superNovice)).toBe(true);
    expect(isEquipableInSlot('headGear', knightHat, classOf(ArchMage))).toBe(false);
  });

  it('does not extend the weapon exemption past level 4 or past the six types', () => {
    expect(isEquipableInSlot('weapon', item({ usableClass: ['Swordman'], itemLevel: 3, itemSubTypeId: 257 }), superNovice)).toBe(false);
    // itemSubTypeId 267 is the bow, which the Super Novice never gets.
    expect(isEquipableInSlot('weapon', item({ usableClass: ['Swordman'], itemLevel: 4, itemSubTypeId: 267 }), superNovice)).toBe(false);
  });
});

describe('findClassSwitchLosses', () => {
  const items = catalogue(
    item({ id: 100, name: 'Espada do Cavaleiro', usableClass: ['Swordman'], itemLevel: 4, itemSubTypeId: 257 }),
    item({ id: 200, name: 'Manto Comum' }),
    item({ id: 300, name: 'Elmo do Cavaleiro', usableClass: ['Swordman'] }),
    item({ id: 400, name: 'Carta do Cavaleiro', usableClass: ['Swordman'] }),
    item({ id: 500, name: 'Adaga Curta', usableClass: ['Thief'], itemLevel: 4, itemSubTypeId: 256 }),
  );

  it('names the slot, the item and why, in picker order', () => {
    const model = buildWith({ weapon: 100, garment: 200, headUpper: 300 });

    expect(lossFor(model, items, classOf(ArchMage))).toEqual([
      { key: ItemTypeEnum.weapon, slotLabel: 'Arma', itemId: 100, itemName: 'Espada do Cavaleiro', reason: 'class' },
      { key: ItemTypeEnum.headUpper, slotLabel: 'Topo', itemId: 300, itemName: 'Elmo do Cavaleiro', reason: 'class' },
    ]);
  });

  it('keeps everything on a switch inside the same lineage', () => {
    const model = buildWith({ weapon: 100, garment: 200, headUpper: 300 });

    expect(lossFor(model, items, classOf(DragonKnight))).toEqual([]);
  });

  it('leaves the slots the picker never filters alone', () => {
    // A card, a pet and a costume enchant go on whoever picks them: the lists behind them
    // carry no class filter at all, so no switch can cost them.
    const model = buildWith({ weaponCard1: 400, pet: 400, costumeEnchantUpper: 400 });

    expect(lossFor(model, items, classOf(ArchMage))).toEqual([]);
  });

  it('takes the off-hand weapon from a class that does not dual wield', () => {
    const model = buildWith({ leftWeapon: 500 });
    const shadowCross = classOf(ShadowCross);

    expect(lossFor(model, items, shadowCross, true)).toEqual([]);
    expect(lossFor(model, items, shadowCross, false)).toEqual([
      { key: ItemTypeEnum.leftWeapon, slotLabel: 'Arma Esq.', itemId: 500, itemName: 'Adaga Curta', reason: 'offHand' },
    ]);
  });

  it('keeps an id with no record rather than dropping it unread', () => {
    expect(lossFor(buildWith({ armor: 999999 }), items, classOf(ArchMage))).toEqual([]);
  });
});

describe('applyClassSwitch', () => {
  const items = catalogue(item({ id: 100, name: 'Espada do Cavaleiro', usableClass: ['Swordman'], itemLevel: 4, itemSubTypeId: 257 }));

  it('empties the whole slot, not just the item', () => {
    const model = buildWith({
      weapon: 100,
      weaponRefine: 12,
      weaponGrade: 'A',
      weaponCard1: 4001,
      weaponEnchant0: 4002,
      weaponEnchant3: 4003,
      ammo: 7000,
      propertyAtk: 'fire' as any,
      rawOptionTxts: [],
    });
    // W_Left_1..3, the main weapon's three Bônus Aleatórios.
    model.rawOptionTxts[0] = 'STR +10';

    const switched = applyClassSwitch(model, lossFor(model, items, classOf(ArchMage)), classOf(ArchMage));

    expect(switched.weapon).toBeUndefined();
    expect(switched.weaponRefine).toBeUndefined();
    expect(switched.weaponGrade).toBeUndefined();
    expect(switched.weaponCard1).toBeUndefined();
    expect(switched.weaponEnchant0).toBeUndefined();
    expect(switched.weaponEnchant3).toBeUndefined();
    // The ammo list is decided by the weapon and the converter paints its element: with
    // the weapon gone, neither has anything to apply to.
    expect(switched.ammo).toBeUndefined();
    expect(switched.propertyAtk).toBeUndefined();
    expect(switched.rawOptionTxts[0]).toBeUndefined();
  });

  it('takes the costume enchants off with their costume', () => {
    const costume = catalogue(item({ id: 700, name: 'Visual do Cavaleiro', usableClass: ['Swordman'] }));
    const model = buildWith({ costumeUpper: 700, costumeEnchantUpper: 4100 });

    const switched = applyClassSwitch(model, lossFor(model, costume, classOf(ArchMage)), classOf(ArchMage));

    expect(switched.costumeUpper).toBeUndefined();
    expect(switched.costumeEnchantUpper).toBeUndefined();
  });

  it('leaves the slots it was not told about untouched', () => {
    const model = buildWith({ weapon: 100, weaponRefine: 12, armor: 300, armorRefine: 9, str: 120 });

    const switched = applyClassSwitch(model, lossFor(model, items, classOf(ArchMage)), classOf(ArchMage));

    expect(switched.armor).toBe(300);
    expect(switched.armorRefine).toBe(9);
    expect(switched.str).toBe(120);
  });

  it('drops the trait points on a class with no trait table', () => {
    // damage-calculator adds model.pow and friends into the totals whatever the class is,
    // and only the input is hidden on a 3rd class — so carrying them over would keep
    // paying POD and CON with no field on screen to explain it.
    const model = buildWith({ pow: 60, sta: 30, wis: 10, spl: 20, con: 50, crt: 40 });

    expect(applyClassSwitch({ ...model }, [], classOf(RuneKnight))).toMatchObject({ pow: 0, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 });
    expect(applyClassSwitch({ ...model }, [], classOf(DragonKnight))).toMatchObject({ pow: 60, con: 50 });
  });

  it('restores the pet loyalty default when a pet slot is cleared', () => {
    const pets = catalogue(item({ id: 800, name: 'Ovo Exclusivo', usableClass: ['Swordman'] }));
    const model = buildWith({ pet: 800, petLoyalty: PetLoyalty.Baixa });

    // The pet list is never class-filtered, so this only happens if a caller asks for it.
    const switched = applyClassSwitch(model, [{ key: ItemTypeEnum.pet, slotLabel: 'Pet', itemId: 800, itemName: 'Ovo', reason: 'class' }], classOf(ArchMage));

    expect(switched.pet).toBeUndefined();
    expect(switched.petLoyalty).toBe(DEFAULT_PET_LOYALTY);
    expect(pets[800].name).toBe('Ovo Exclusivo');
  });
});

describe('hasBuildToKeep', () => {
  it('says no to a sheet nothing has been put on', () => {
    expect(hasBuildToKeep(createMainModel())).toBe(false);
  });

  it('says yes to any worn item, including the ones no switch can cost', () => {
    for (const slot of EQUIPMENT_SLOTS) {
      expect(hasBuildToKeep(buildWith({ [slot.key]: 100 })), slot.key).toBe(true);
    }
  });

  it('says yes to hand-assigned stat and trait points', () => {
    expect(hasBuildToKeep(buildWith({ dex: 120 }))).toBe(true);
    expect(hasBuildToKeep(buildWith({ con: 30 }))).toBe(true);
  });
});
