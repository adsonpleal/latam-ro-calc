/**
 * The runtime dataset, assembled from sources that are already derived.
 *
 * Nothing here touches the filesystem. `tools/build-web-data.mjs` does the LATAM merge at
 * build time and emits the result to `src/assets/data/`, so both callers hand `buildDataset`
 * plain parsed objects: the Worker reads them through the ASSETS binding
 * (`worker/mcp/data.ts`), and the specs read the raw files off disk (`dataset.node.ts`).
 *
 * Everything is shared across requests by reference: `Calculator.setMasterItems()` only
 * stores the map and `getItem()` only reads, so there is nothing to copy — which is what
 * keeps a multi-megabyte parse off the per-request path.
 */
import { ClassRegistry } from './class-registry';
import { ItemIndex } from './item-index';
import { ItemMap } from './item-map';
import { MonsterIndex } from './monster-index';

/**
 * A `latam-extra.json` record: one of the ~6,6k LATAM ids with no calculator record at
 * all. Name and slots only — there is nothing mechanical to carry.
 */
export interface LatamExtra {
  name: string;
  aegisName?: string;
  slots?: number;
}

/** The parsed artifacts `buildDataset` needs. Names match the data-manifest keys. */
export interface DatasetSources {
  /** items-core: item.json with the pt-BR overlay already applied. */
  items: ItemMap;
  /** items-mcp: map key -> requiredLevel, the one field items-core drops that we read. */
  itemsMcp: Record<string, number>;
  latamExtra: Record<string, LatamExtra>;
  /** monsters: monster.json with the pt-BR names already applied. */
  monsters: ItemMap;
  /** latam-monsters: the full id -> pt-BR name map, incl. the mobs with no stat block. */
  latamMonsters: Record<string, string>;
  hpSpTable: any;
  classes: number[];
}

/**
 * Resolves the ~7 MB description map. Separate from the sources above because only
 * `get_item` and `item_description` need it, and an isolate that never runs them should
 * never pay for it.
 */
export type DescriptionLoader = () => Promise<Record<string, string>>;

export interface Dataset {
  /** items-core, keyed as item.json is. Read-only — never mutate. */
  items: ItemMap;
  /** The LATAM ids with no calculator record. Read-only. */
  latamExtra: Record<string, LatamExtra>;
  monsters: ItemMap;
  hpSpTable: any;
  classes: ClassRegistry;
  itemIndex: ItemIndex;
  monsterIndex: MonsterIndex;
  /**
   * The best description available for an id: the pt-BR text when LATAM has one, the
   * item.json English text otherwise. Async because the Worker fetches the map lazily.
   */
  description(id: number): Promise<string | undefined>;
}

/**
 * Writes `requiredLevel` back onto the core records.
 *
 * items-core drops it because the browser never reads it, but the MCP's `search_items`
 * exposes it as the `maxLevel` filter and `get_item` reports it. Mutating the core map is
 * safe and deliberate: it happens once, before any request sees the dataset.
 */
export function applyMcpExtras(items: ItemMap, itemsMcp: Record<string, number>): ItemMap {
  for (const key of Object.keys(itemsMcp)) {
    const item = items[key];
    if (item) item.requiredLevel = itemsMcp[key];
  }
  return items;
}

export function buildDataset(src: DatasetSources, loadDescriptions: DescriptionLoader): Dataset {
  applyMcpExtras(src.items, src.itemsMcp);

  let descriptions: Promise<Record<string, string>> | undefined;

  return {
    items: src.items,
    latamExtra: src.latamExtra,
    monsters: src.monsters,
    hpSpTable: src.hpSpTable,
    classes: new ClassRegistry(src.classes),
    itemIndex: new ItemIndex(src.items, src.latamExtra),
    monsterIndex: new MonsterIndex(src.monsters, src.latamMonsters),
    async description(id: number): Promise<string | undefined> {
      descriptions ??= loadDescriptions();
      return (await descriptions)[id];
    },
  };
}
