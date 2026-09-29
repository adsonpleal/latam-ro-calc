import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMainModel } from 'src/app/utils';
import { makeCalculator, equipStatusOf } from './__tests__/make-calculator';
import { CustomItemLibrary, decodeCustomBundle, encodeCustomBundle } from './custom-item-library';
import { CUSTOM_ITEM_MIN_ID, customItemDescription, inferCustomIcon, validateCustomItems, validateScript } from './custom-items';
import { classifyItem } from '../../../mcp/src/data/slot-classifier';

const ARMOR = CUSTOM_ITEM_MIN_ID + 101;
const CARD = CUSTOM_ITEM_MIN_ID + 102;
const draft = (id: number, name: string, kind = 'armor', script: Record<string, any> = {}) =>
  ({ id, name, kind, script, cardCapacity: kind === 'armor' ? 1 : 0, enchantCapacity: 0, baCapacity: kind === 'armor' ? 5 : 0 });

describe('custom item batches', () => {
  it('describes combined conditions and scaling without exposing raw expressions', () => {
    const item = validateCustomItems([draft(ARMOR, 'Teste', 'armor', {
      atk: ['GRADE[me==A]REFINE[weapon,headUpper==2]---5', 'str:10---2', 'LOYALTY[4]7===5'],
    })]).items[0];
    const description = customItemDescription(item);
    expect(description).toContain('este item no grau A ou superior: A cada 2 refinos de Arma + Topo: ATQ +5');
    expect(description).toContain('A cada 10 de FOR: ATQ +2');
    expect(description).toContain('lealdade alta: A partir do refino +7: ATQ +5');
    expect(description).not.toMatch(/===|---|GRADE\[|REFINE\[/);
  });

  it('allows long names and retains element, head occupancy and unrestricted classes', () => {
    const name = 'Item personalizado '.repeat(30);
    const result = validateCustomItems([{ ...draft(ARMOR, name, 'headUpper'), propertyAtk: 'Fire',
      locations: ['Upper', 'Middle'], usableClass: [] }]);
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({ name: name.trim(), propertyAtk: 'Fire', locations: ['Upper', 'Middle'] });
    expect(result.items[0].usableClass).toBeUndefined();
    expect(validateCustomItems([{ ...draft(ARMOR, 'Teste'), propertyAtk: 'invalid' }]).errors)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: 'items[0].propertyAtk' })]));
  });

  it('creates an accessory for both sides and uses representative icons', () => {
    const result = validateCustomItems([draft(ARMOR, 'Presilha personalizada', 'accessory')]);
    expect(result.errors).toEqual([]);
    expect(result.items[0]).toMatchObject({ itemSubTypeId: 517, iconItemId: 2607 });
    expect(classifyItem(result.items[0])).toEqual(['accLeft', 'accRight']);
    expect(inferCustomIcon('accLeft', undefined, {})).toBe(2607);
    expect(inferCustomIcon('accRight', undefined, {})).toBe(2607);
    expect(inferCustomIcon('headUpper', undefined, {})).toBe(2228);
    expect(inferCustomIcon('headLower', undefined, {})).toBe(2265);
  });

  it('can copy mapped official scripts without losing legacy clauses', () => {
    const official = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
    const invalid = Object.values<any>(official).flatMap((item) => validateScript(item.script ?? {})
      .filter((error) => !error.path.includes('dmg__Lucifer Morocc'))
      .map((error) => `${item.id}: ${error.path}: ${error.message}`));
    expect(invalid.slice(0, 20)).toEqual([]);
  });
  it('accepts forward ID combos and the four shared sockets', () => {
    const result = validateCustomItems([
      { ...draft(ARMOR, 'Armadura'), cardCapacity: 1, enchantCapacity: 3, script: { atk: [`EQUIP_ID[${CARD}]10`] } },
      draft(CARD, 'Carta', 'card', { cri: ['5'] }),
    ]);
    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(2);
    expect(result.items[0].baCapacity).toBe(5);
  });

  it('rejects an overfull or broken member without partial output', () => {
    const result = validateCustomItems([draft(ARMOR, 'Válido'), { ...draft(CARD, 'Inválido'), cardCapacity: 3, enchantCapacity: 2 }]);
    expect(result.items).toEqual([]);
    expect(result.errors.some((error) => error.path === 'items[1].enchantCapacity')).toBe(true);
  });

  it('rejects invalid weapon types, incompatible defaults and malformed rule bodies', () => {
    expect(validateCustomItems([{ ...draft(ARMOR, 'Arma', 'weapon'), itemSubTypeId: 1 }]).errors)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: 'items[0].itemSubTypeId' })]));
    expect(validateCustomItems([{ ...draft(ARMOR, 'Armadura'), defaultCards: [CARD] },
      draft(CARD, 'Encanto', 'enchant')]).errors)
      .toEqual(expect.arrayContaining([expect.objectContaining({ path: 'items[0].defaultCards[0]' })]));
    expect(validateScript({ atk: ['EQUIP_ID[abc]10'] })).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'script.atk[0]' }),
    ]));
    expect(validateScript({ atk: ['REFINE[abc]10', '1===oops'] }).map((error) => error.path))
      .toEqual(expect.arrayContaining(['script.atk[0]', 'script.atk[1]']));
  });

  it('imports an entire link idempotently and remaps a conflicting combo', () => {
    let stored: string | null = null;
    const store = new CustomItemLibrary({ getItem: () => stored, setItem: (_key, value) => { stored = value; } });
    const first = validateCustomItems([draft(ARMOR, 'Primeira', 'armor', { atk: ['10'] })]).items[0];
    store.save(first);
    const incoming = validateCustomItems([
      draft(ARMOR, 'Outra', 'armor', { atk: [`EQUIP_ID[${CARD}]20`] }),
      draft(CARD, 'Carta', 'card', { cri: ['5'] }),
    ]).items;
    const bundle = decodeCustomBundle(encodeCustomBundle(incoming));
    const installed = store.import(bundle, { [ARMOR]: first });
    expect(installed[0].id).not.toBe(ARMOR);
    expect(installed[0].script['atk']).toEqual([`EQUIP_ID[${CARD}]20`]);
    store.import(bundle, { [ARMOR]: first });
    expect(store.list()).toHaveLength(3);
  });
});

describe('custom item calculation', () => {
  it('uses its own card source, inherits refine, and ignores stale official card fields', () => {
    const [armor, card] = validateCustomItems([
      draft(ARMOR, 'Armadura', 'armor', { atkPercent: ['10'] }),
      draft(CARD, 'Carta', 'card', { atkPercent: ['7===20'] }),
    ]).items;
    const stale = { ...card, id: 4001, custom: false, script: { atkPercent: ['100'] } } as any;
    const model = createMainModel() as any;
    model.armor = ARMOR;
    model.armorCard = 4001;
    model.customAttachments = { armor: { itemId: ARMOR, cards: [CARD], enchants: [], bas: [], refine: 7, grade: '' } };
    const status = equipStatusOf(makeCalculator({ [ARMOR]: armor, [CARD]: card, 4001: stale }), model);
    expect(status.atkPercent).toBe(30);
  });

  it('keeps custom base MATK separate from scripted MATK', () => {
    const weapon = validateCustomItems([{ ...draft(ARMOR + 2, 'Arma', 'weapon', { matk: ['12'] }),
      itemSubTypeId: 257, itemLevel: 5, attack: 100, baseMatk: 80 }]).items[0];
    const model = createMainModel() as any;
    model.weapon = weapon.id;
    const calc = makeCalculator({ [weapon.id]: weapon });
    const status = equipStatusOf(calc, model);
    expect((calc as any).weaponData.data.baseWeaponMatk).toBe(80);
    expect(status.matk).toBe(12);
  });
});
