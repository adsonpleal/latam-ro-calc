import { describe, expect, it } from 'vitest';
import { ElementType } from '../constants';
import { ItemModel } from '../models/item.model';
import { Weapon } from './weapon';

// Minimal item factory. itemSubTypeId 267 = bow (long range), 257 = sword.
const item = (over: Partial<ItemModel> = {}): ItemModel =>
  ({
    itemLevel: 4,
    attack: 120,
    weight: 80,
    propertyAtk: ElementType.Fire,
    itemSubTypeId: 257,
    script: { matk: ['30'] },
    ...over,
  } as ItemModel);

describe('Weapon', () => {
  it('passes through base atk/matk/weight/element from the item', () => {
    const w = new Weapon().set({ itemData: item(), refineLevel: 0, grade: '' });
    expect(w.data.baseWeaponAtk).toBe(120);
    expect(w.data.baseWeaponMatk).toBe(30);
    expect(w.data.weight).toBe(80);
    expect(w.data.propertyAtk).toBe(ElementType.Fire);
  });

  it('set() is chainable (returns the instance)', () => {
    const w = new Weapon();
    expect(w.set({ itemData: item(), refineLevel: 0, grade: '' })).toBe(w);
  });

  it('applies the refine upgrade table (level-4 weapon, +10 => +70 atk, +84 over)', () => {
    const w = new Weapon().set({ itemData: item({ itemLevel: 4 }), refineLevel: 10, grade: '' });
    expect(w.data.refineBonus).toBe(70);
    expect(w.data.overUpgradeBonus).toBe(84);
  });

  it('adds the grade bonus on top of the refine bonus', () => {
    // Only level-5 weapons take a grade (canGradeItem). Grade A doubles the refine ATK:
    // +10 => 80 + 80. The whole grade/level table lives in weapon-refine.spec.ts.
    const w = new Weapon().set({ itemData: item({ itemLevel: 5 }), refineLevel: 10, grade: 'A' });
    expect(w.data.refineBonus).toBe(80 + 80);
  });

  it('exposes pAtk/sMatk for level-5 weapons', () => {
    const w = new Weapon().set({ itemData: item({ itemLevel: 5 }), refineLevel: 10, grade: '' });
    expect(w.data.pAtkOrSMatk).toBe(20);
  });

  it('zeroes all refine bonuses at +0', () => {
    const w = new Weapon().set({ itemData: item(), refineLevel: 0, grade: 'A' });
    expect(w.data.refineBonus).toBe(0);
    expect(w.data.overUpgradeBonus).toBe(0);
    expect(w.data.highUpgradeBonus).toBe(0);
  });

  it('classifies a bow as a long-range weapon', () => {
    const w = new Weapon().set({ itemData: item({ itemSubTypeId: 267 }), refineLevel: 0, grade: '' });
    expect(w.data.typeName).toBe('bow');
    expect(w.data.rangeType).toBe('range');
    expect(w.isType('bow')).toBe(true);
    expect(w.isType('sword')).toBe(false);
    expect(w.isAllowShield()).toBe(false); // bow not in AllowShieldTable
  });

  it('classifies a sword as melee that allows a shield', () => {
    const w = new Weapon().set({ itemData: item({ itemSubTypeId: 257 }), refineLevel: 0, grade: '' });
    expect(w.data.rangeType).toBe('melee');
    expect(w.isAllowShield()).toBe(true);
  });

  it('treats an unknown/empty weapon as melee, no type, shield allowed', () => {
    const w = new Weapon().set({ itemData: undefined as any, refineLevel: 10, grade: 'A' });
    expect(w.data.baseWeaponAtk).toBe(0);
    expect(w.data.typeName).toBeUndefined();
    expect(w.data.refineBonus).toBe(0);
    expect(w.isType('sword')).toBe(false);
    expect(w.isAllowShield()).toBe(true);
  });
});
