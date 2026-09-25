import { describe, expect, it } from 'vitest';
import items from '../../../assets/demo/data/item.json';
import { SLOTS_BY_KEY } from '../../app-config/equipment-slots';
import { deriveSlot } from '../../core/equipment-slot-derivation';
import { ItemModel } from '../../models/item.model';
import { ItemTypeEnum } from '../item-type.enum';
import { getVerusEnchants } from './verus';

// Tracker yyQb241cRLzkHL9106Xp; https://browiki.org/wiki/Verus#Encantamento
const db = items as Record<string, ItemModel>;
const enchantMap = new Map(Object.values(db).filter((item) => item.itemTypeId === 11).map((item) => [item.aegisName, item]));
const levels = (prefix: string, max: number) => Array.from({ length: max }, (_, i) => `${prefix}${i + 1}`);
const stats = (max: number) => ['Strength', 'Agility', 'Vitality', 'Dexterity', 'Luck'].flatMap((prefix) => levels(prefix, max));
const sorted = (names: string[]) => [...names].sort();

const pools: [number[], string[], number][] = [
  [[15110, 15343], [
    ...levels('Agility', 2), ...levels('Luck', 2), ...levels('Attack_Delay_', 2),
    'Evasion1', 'Evasion3', 'Evasion12', ...levels('Vitality', 3), ...levels('MHP', 3),
    'Def3', 'Def6', 'Def9', 'aegis_4933', 'aegis_4934', 'aegis_4935',
  ], 3],
  [[15111, 15344], [
    ...levels('Agility', 2), ...levels('Luck', 2), ...levels('Attack_Delay_', 2),
    'Evasion1', 'Evasion3', 'Evasion12', ...levels('Strength', 3),
    ...levels('Dexterity', 3), ...levels('Fighting_Spirit', 3), ...levels('Expert_Archer', 3),
  ], 3],
  [[22043, 22044], [...stats(2), ...levels('Spell', 2), ...levels('Attack_Delay_', 2)], 3],
  [[20732, 20733], [...stats(3), ...levels('Expert_Archer', 3)], 3],
  [[2995, 2996], [...stats(2), ...levels('Spell', 2), 'Attack_Delay_1'], 2],
];

const slotFor = (id: number) => id === 2995 || id === 2996 ? ItemTypeEnum.accRight
  : id === 22043 || id === 22044 ? ItemTypeEnum.boot
    : id === 20732 || id === 20733 ? ItemTypeEnum.garment : ItemTypeEnum.armor;

describe('Verus Peças Suplementares and Autopeças', () => {
  it.each(pools.flatMap(([ids, pool, count]) => ids.map((id) => [id, pool, count] as const)))('%i offers the full published pool in %i slots', (id, pool, count) => {
    const positions = getVerusEnchants(id)!;
    expect(positions).toHaveLength(4);
    expect(positions.filter(Boolean)).toHaveLength(count);
    for (const position of positions.filter((p): p is string[] => !!p)) {
      expect(sorted(position)).toEqual(sorted(pool));
      expect(position).not.toContain('Inteligence1');
      expect(position.filter((name) => !enchantMap.has(name))).toEqual([]);
    }

    const rendered = deriveSlot({
      descriptor: SLOTS_BY_KEY.get(slotFor(id))!, item: db[id], mapEnchant: enchantMap,
      refineList: [], shadowRefineList: [],
    });
    expect(rendered.enchantLists.filter((list) => list?.length)).toHaveLength(count);
    for (const list of rendered.enchantLists.filter((list): list is NonNullable<typeof list> => !!list?.length)) {
      expect(list.map((option) => option.value).sort()).toEqual(pool.map((name) => enchantMap.get(name)!.id).sort());
    }
  });

  it('registers Neutralidade stones with their actual Neutro resistance effects', () => {
    for (const level of [1, 2, 3]) {
      const stone = db[4932 + level];
      expect(stone.itemTypeId).toBe(11);
      expect(stone.script).toEqual({ subele_neutral: [String(level)] });
    }
  });
});
