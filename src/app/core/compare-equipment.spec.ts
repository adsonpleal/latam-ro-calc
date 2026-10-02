import { prepareCompareEquipment } from './compare-equipment';
import { ItemTypeEnum as Slot } from '../constants/item-type.enum';
import { DEFAULT_PET_LOYALTY } from '../constants/pet-loyalty';
import { CustomItemDefinition } from './custom-items';

const prepare = (source: Record<string, any>, itemNames: Slot[], extra = {}) => prepareCompareEquipment({
  source, itemNames, itemOrder: [Slot.weapon, Slot.leftWeapon, Slot.pet], items: {}, leftWeaponShown: true, compareStats: false, ...extra,
});
describe('comparison equipment preparation', () => {
  it('keeps a hidden off-hand selection but excludes its equipment and attached cards', () => {
    const result = prepare({ leftWeapon: 100, leftWeaponCard1: 200, leftWeaponRefine: 12 }, [Slot.leftWeapon], { leftWeaponShown: false });
    expect(result.model).toMatchObject({ leftWeapon: 100, leftWeaponCard1: 200, leftWeaponRefine: 12 });
    expect(result.offered.leftWeapon).toBe(false);
    expect(result.equipped.size).toBe(0);
    const shown = prepare(result.model, [Slot.leftWeapon]);
    expect([...shown.equipped]).toEqual([[Slot.leftWeapon, 100], [Slot.leftWeaponCard1, 200]]);
  });
  it('clears related fields for an empty slot and carries converter, ammo and loyalty with filled slots', () => {
    const result = prepare({ weapon: 100, propertyAtk: 'Fire', ammo: 200, pet: 300, armorCard: 400, armorRefine: 12 }, [Slot.weapon, Slot.pet, Slot.armor]);
    expect(result.model).toMatchObject({ propertyAtk: 'Fire', ammo: 200, petLoyalty: DEFAULT_PET_LOYALTY, armor: null, armorCard: null, armorRefine: null, armorGrade: null });
    const cleared = prepare({ weapon: null, propertyAtk: 'Fire', ammo: 200, pet: null, petLoyalty: 'Alta' }, [Slot.weapon, Slot.pet]);
    expect(cleared.model).toMatchObject({ propertyAtk: null, ammo: null, petLoyalty: null });
  });
  it('copies character fields only for a stat comparison and retains its own job level', () => {
    const source = { level: 250, jobLevel: 60, str: 120, pow: 100 };
    expect(prepare(source, []).model['level']).toBeUndefined();
    const compared = prepare(source, [], { compareStats: true });
    expect(compared.model).toMatchObject({ level: 250, jobLevel: 60, str: 120, pow: 100, agi: 0 });
  });
  it('isolates custom attachments so editing the derived comparison cannot change the source', () => {
    const custom = { custom: true, schemaVersion: 1, id: 1_000_000_000_001, cardCapacity: 1, enchantCapacity: 0,
      baCapacity: 0, defaultCards: [200], defaultEnchants: [], defaultBas: [] } as CustomItemDefinition;
    const source = { weapon: custom.id };
    const result = prepare(source, [Slot.weapon], { items: { [custom.id]: custom } });
    result.model['customAttachments'].weapon.cards[0] = 999;
    expect((source as Record<string, any>)['customAttachments'].weapon.cards).toEqual([200]);
  });
});
