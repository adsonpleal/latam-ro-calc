import { describe, expect, it } from 'vitest';
import { ItemOptionNumber as N } from '../constants/item-option-number.enum';
import { MainModel } from '../models/main.model';
import { toRawOptionTxtList } from './to-raw-option-txt-list';

// Minimal model: only the fields toRawOptionTxtList reads (equipped item ids +
// rawOptionTxts). Everything else can be absent for this pure function.
const model = (over: Partial<MainModel> = {}): MainModel =>
  ({ rawOptionTxts: [], ...over } as MainModel);

// `Temporal_Armor_TW` is a 2-option-slot armor in ExtraOptionTable; the unknown
// id resolves to 0 slots. `Clover_Ace_Defense` (Selo de Paus, 420269) is a
// Lower-headgear member of the Selo de Loki set — 2 Bônus Aleatórios slots.
const itemMap = {
  2301: { id: 2301, aegisName: 'Temporal_Armor_TW' },
  420269: { id: 420269, aegisName: 'Clover_Ace_Defense' },
} as any;

describe('toRawOptionTxtList', () => {
  it('keeps both shadow option slots while the shadow item is worn', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.SD_Wp_1] = 'hit:9';
    rawOptionTxts[N.SD_Wp_2] = 'res:10';
    const out = toRawOptionTxtList(model({ shadowWeapon: 700016, rawOptionTxts } as any), itemMap);
    expect(out[N.SD_Wp_1]).toBe('hit:9');
    expect(out[N.SD_Wp_2]).toBe('res:10');
  });

  it('clears both shadow option slots when no shadow item is worn', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.SD_Wp_1] = 'hit:9';
    rawOptionTxts[N.SD_Wp_2] = 'res:10';
    const out = toRawOptionTxtList(model({ shadowWeapon: undefined, rawOptionTxts }), itemMap);
    expect(out[N.SD_Wp_1]).toBeNull();
    expect(out[N.SD_Wp_2]).toBeNull();
  });

  it('clamps non-shadow options to the item\'s ExtraOptionTable slot count', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.Armor_1] = 'atk:10';
    rawOptionTxts[N.Armor_2] = 'matk:5';
    rawOptionTxts[N.Armor_3] = 'str:5'; // 3rd slot — beyond the armor's 2
    const out = toRawOptionTxtList(model({ armor: 2301, rawOptionTxts } as any), itemMap);
    expect(out[N.Armor_1]).toBe('atk:10');
    expect(out[N.Armor_2]).toBe('matk:5');
    expect(out[N.Armor_3]).toBeNull();
  });

  it('drops every non-shadow option when the item is missing from the table', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.Armor_1] = 'atk:10';
    const out = toRawOptionTxtList(model({ armor: 99999, rawOptionTxts } as any), itemMap);
    expect(out[N.Armor_1]).toBeNull();
  });

  it('keeps both Lower-headgear option slots for a Selo de Loki "Ace" item', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.H_Low_1] = 'str:5';
    rawOptionTxts[N.H_Low_2] = 'def:200';
    const out = toRawOptionTxtList(model({ headLower: 420269, rawOptionTxts } as any), itemMap);
    expect(out[N.H_Low_1]).toBe('str:5');
    expect(out[N.H_Low_2]).toBe('def:200');
  });

  it('clears Lower-headgear option slots when no Lower headgear is worn', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.H_Low_1] = 'str:5';
    rawOptionTxts[N.H_Low_2] = 'def:200';
    const out = toRawOptionTxtList(model({ headLower: undefined, rawOptionTxts }), itemMap);
    expect(out[N.H_Low_1]).toBeNull();
    expect(out[N.H_Low_2]).toBeNull();
  });

  it('relocates a weapon baseHp/baseSp roll into the X_HP/X_SP buckets', () => {
    const rawOptionTxts: string[] = [];
    rawOptionTxts[N.W_Left_1] = 'baseHp:500';
    rawOptionTxts[N.W_Left_2] = 'baseSp:60';
    const out = toRawOptionTxtList(model({ rawOptionTxts }), itemMap);
    expect(out[N.W_Left_1]).toBeNull();
    expect(out[N.W_Left_2]).toBeNull();
    expect(out[N.X_HP]).toBe('baseHp:500');
    expect(out[N.X_SP]).toBe('baseSp:60');
  });
});
