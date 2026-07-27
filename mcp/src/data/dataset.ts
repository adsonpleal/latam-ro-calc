/**
 * Loads every runtime JSON once at boot and hands out read-only views of it.
 *
 * The item map is shared across requests by reference: `Calculator.setMasterItems()`
 * only stores it and `getItem()` only reads, so there is nothing to copy — which is
 * what keeps a 12 MB parse off the per-request path.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ClassRegistry } from './class-registry';
import { ItemIndex } from './item-index';
import { ItemMap, LatamItem, mergeLatamItems, mergeLatamMonsters } from './merge-items';
import { MonsterIndex } from './monster-index';

export interface Dataset {
  /** item.json, with the pt-BR overlay applied. Read-only — never mutate. */
  items: ItemMap;
  /** latam-items.json: the full LATAM item universe, incl. ids absent from item.json. */
  latamItems: Record<string, LatamItem>;
  monsters: ItemMap;
  hpSpTable: any;
  itemViews: Record<string, [number, number]>;
  classes: ClassRegistry;
  itemIndex: ItemIndex;
  monsterIndex: MonsterIndex;
}

const readJson = <T>(dir: string, file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

export function loadDataset(dataDir: string): Dataset {
  const items = readJson<ItemMap>(dataDir, 'item.json');
  const latamItems = readJson<Record<string, LatamItem>>(dataDir, 'latam-items.json');
  const monsters = readJson<ItemMap>(dataDir, 'monster.json');
  const latamMonsters = readJson<Record<string, string>>(dataDir, 'latam-monsters.json');
  const hpSpTable = readJson<any>(dataDir, 'hp_sp_table.json');
  const latamClasses = readJson<number[]>(dataDir, 'latam-classes.json');
  const itemViews = readJson<Record<string, [number, number]>>(dataDir, 'item-views.json');

  mergeLatamItems(items, latamItems);
  mergeLatamMonsters(monsters, latamMonsters);

  return {
    items,
    latamItems,
    monsters,
    hpSpTable,
    itemViews,
    classes: new ClassRegistry(latamClasses),
    itemIndex: new ItemIndex(items, latamItems),
    monsterIndex: new MonsterIndex(monsters, latamMonsters),
  };
}
