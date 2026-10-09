import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createRawTotalBonus } from '../utils/create-raw-total-bonus';
import { createBonusNameList } from '../utils/create-bonus-name-list';
import { ItemModel, itemAutoCastEffectScripts,
  ITEM_AUTO_CAST_DIRECTIVE, ITEM_AUTO_CAST_EFFECT_DIRECTIVE, ITEM_AUTO_CAST_PENDING_DIRECTIVE } from '../models/item.model';
import { filterSearchItems, isSearchableItemBonusKey, ITEM_SEARCH_BONUS_OPTIONS, ItemSearchFilters, ItemSearchRow } from './item-search';

const defaults: ItemSearchFilters = { name: '', positions: [], skillIds: [], bonuses: [], matchAllBonuses: true };
const makeItem = (id: number, script?: ItemModel['script'], name = 'Chapéu de Teste') => ({ id, name, script } as ItemModel);
const row = (id: number, position = 'headUpperList'): ItemSearchRow => ({ id, value: id, label: 'Item ' + id, position });
function search(items: ItemModel[], filters: Partial<ItemSearchFilters> = {}, rows = items.map(item => row(item.id))) {
  return filterSearchItems(Object.fromEntries(items.map(item => [item.id, item])), rows, { ...defaults, ...filters }).map(item => item.id);
}

describe('item search catalogue coverage', () => {
  const database = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8')) as Record<number, ItemModel>;
  // Metadata and unmodelled client entries, not supported bonuses. Keep exclusions
  // specific so a new supported stat/family cannot hide in an open-ended exception.
  const excluded = new Set(['refine', 'weight', 'dmg__Lucifer Morocc', ITEM_AUTO_CAST_PENDING_DIRECTIVE]);
  const required = new Set([
    ...Object.keys(createRawTotalBonus()),
    ITEM_AUTO_CAST_DIRECTIVE, ITEM_AUTO_CAST_EFFECT_DIRECTIVE,
    ...Object.values(database).flatMap(item => [
      ...Object.keys(item.script ?? {}),
      ...itemAutoCastEffectScripts(item.script).flatMap(effect => Object.keys(effect.bonusPerRefine ?? {})),
    ]),
  ].filter(key => !excluded.has(key)));

  it('requires an explicit search option for every supported engine and item-script bonus', () => {
    const missing = [...required].filter(key => key === ITEM_AUTO_CAST_DIRECTIVE || key === ITEM_AUTO_CAST_EFFECT_DIRECTIVE
      ? !ITEM_SEARCH_BONUS_OPTIONS.some(option => option.value === key)
      : !isSearchableItemBonusKey(key));
    expect(missing.sort(), 'Add missing bonuses to ITEM_SEARCH_BONUS_OPTIONS with a Portuguese label and matcher.').toEqual([]);
  });

  it('preserves every previously selectable bonus', () => {
    const leaves = (entries: any[]): string[] => entries.flatMap(entry => entry.children?.length ? leaves(entry.children) : [entry.value]);
    const values = new Set(ITEM_SEARCH_BONUS_OPTIONS.map(option => option.value));
    expect([...leaves(createBonusNameList()), 'fct', 'perfectDodge', 'cd__'].filter(key => !values.has(key))).toEqual([]);
  });

  it('has unique values and readable labels, without accepting future bonuses implicitly', () => {
    expect(new Set(ITEM_SEARCH_BONUS_OPTIONS.map(option => option.value)).size).toBe(ITEM_SEARCH_BONUS_OPTIONS.length);
    expect(ITEM_SEARCH_BONUS_OPTIONS.filter(option => !option.label || option.label === option.value)).toEqual([]);
    expect(isSearchableItemBonusKey('newFutureBonus')).toBe(false);
    expect(isSearchableItemBonusKey('newModifier__156')).toBe(false);
    expect(isSearchableItemBonusKey('chance__newFutureBonus')).toBe(false);
  });

  it.each(['pow', 'res', 'mres', 'subsize_s_magical', 'm_my_element_fire', 'p_pene_race_demon'])('finds supported %s bonuses in the real item database', key => {
    const item = Object.values(database).find(item => Array.isArray(item.script?.[key]) && item.script[key].length > 0)!;
    expect(item).toBeDefined();
    expect(search([item], { bonuses: [key] })).toEqual([item.id]);
  });

});

describe('item search matching', () => {
  it('normalizes name fragments and includes scriptless items', () => {
    expect(search([makeItem(1), makeItem(2, {}, 'Botas')], { name: '  CHAPEU  ' })).toEqual([1]);
    expect(search([makeItem(1)], { bonuses: ['atk'] })).toEqual([]);
  });
  it.each([true, false])('ignores empty bonus rows in matchAll=%s', matchAllBonuses => {
    expect(search([makeItem(1), makeItem(2, {})], { bonuses: [null, ''], matchAllBonuses })).toEqual([1, 2]);
  });
  it.each([true, false])('ignores duplicate bonus selections in matchAll=%s', matchAllBonuses => {
    expect(search([makeItem(1, { atk: ['0'] }), makeItem(2, { matk: ['10'] })],
      { bonuses: ['atk', 'atk', null], matchAllBonuses })).toEqual([1]);
  });
  it('combines bonus rows with AND or OR', () => {
    const items = [makeItem(1, { atk: ['10'] }), makeItem(2, { matk: ['10'] }), makeItem(3, { atk: ['10'], matk: ['10'] })];
    expect(search(items, { bonuses: ['atk', 'matk'] })).toEqual([3]);
    expect(search(items, { bonuses: ['atk', 'matk'], matchAllBonuses: false })).toEqual([1, 2, 3]);
  });
  it('keeps name, position and skills restrictive even with OR bonuses', () => {
    const items = [makeItem(1, { atk: ['10'], '156': ['5'] }), makeItem(2, { matk: ['10'] }),
      makeItem(3, { atk: ['10'], '156': ['5'] }, 'Botas')];
    expect(search(items, { name: 'chapéu', positions: ['headUpperList', 'headMiddleList'], skillIds: [156, 157],
      bonuses: ['atk', 'matk'], matchAllBonuses: false })).toEqual([1]);
    expect(search(items, { positions: ['weaponList'] })).toEqual([]);
  });
  it('deduplicates multi-slot equipment after matching its positions', () => {
    const items = [makeItem(1)];
    expect(search(items, {}, [row(1), row(1, 'headLowerList')])).toEqual([1]);
    expect(search(items, { positions: ['headLowerList'] }, [row(1), row(1, 'headLowerList')])).toEqual([1]);
  });
  it('never includes an item outside the supplied eligible rows', () => {
    expect(search([makeItem(1), makeItem(2)], {}, [row(2), row(99)])).toEqual([2]);
  });
  it('matches conditional/chance keys without evaluating build conditions', () => {
    expect(search([makeItem(1, { chance__atk: ['EQUIP_ID[999]REFINE[10]===10'] })], { bonuses: ['atk', 'chance__'] })).toEqual([1]);
    expect(search([makeItem(1, { atk: [] })], { bonuses: ['atk'] })).toEqual([]);
  });
  it('finds cooldown bonuses without a skill and narrows them to selected skills', () => {
    const items = [makeItem(1, { cd__156: ['1'] }), makeItem(2, { chance__cd__157: ['2'] }),
      makeItem(3, { '156': ['5'], cd__157: ['1'] })];
    expect(search(items, { bonuses: ['cd__'] })).toEqual([1, 2, 3]);
    expect(search(items, { bonuses: ['cd__'], skillIds: [156] })).toEqual([1]);
    expect(search(items, { bonuses: ['cd__'], skillIds: [157] })).toEqual([2, 3]);
  });
  it.each(['acd__', 'vct__', 'fix_vct__', 'fct__', 'fctPercent__', 'enable_skill__', 'spCost__'])('supports skill modifier %s', prefix => {
    expect(search([makeItem(1, { [prefix + '156']: ['5'] })], { bonuses: [prefix], skillIds: [156] })).toEqual([1]);
  });
  it('distinguishes skill damage from other skill modifiers', () => {
    expect(search([makeItem(1, { '156': ['20'] }), makeItem(2, { cd__156: ['1'] }),
      makeItem(3, { chance__156: ['20'] })], { bonuses: ['skillDamage'], skillIds: [156] })).toEqual([1, 3]);
  });
  it('searches structured auto-casts and effect bonuses, but not unsupported pending casts', () => {
    const items = [
      makeItem(1, { autoCast: [{ skillId: 156, skillLevel: ['5'], chance: ['20'], trigger: 'physical-attack' }] }),
      makeItem(2, { autoCastEffect: [{ name: 'proc', label: 'Efeito', chance: 5, durationSeconds: 5, bonusPerRefine: { atk: 2 } }] }),
      makeItem(3, { autoCastPending: [{ skillName: 'Pendente', skillId: 156, reason: 'Não calculado' }] }),
    ];
    expect(search(items, { bonuses: ['autoCast'], skillIds: [156] })).toEqual([1]);
    expect(search(items, { bonuses: ['autoCast'], skillIds: [157] })).toEqual([]);
    expect(search(items, { bonuses: ['autoCastEffect', 'atk'] })).toEqual([2]);
    expect(search(items, { skillIds: [156] })).toEqual([1]);
  });
});
