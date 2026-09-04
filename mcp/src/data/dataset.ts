/**
 * The runtime dataset, assembled from sources that are already derived.
 *
 * Nothing here touches the filesystem. `tools/build-web-data.mjs` does the LATAM merge at
 * build time and emits the result to `src/assets/data/`, so both callers hand `buildDataset`
 * plain parsed objects: the Worker reads them through the ASSETS binding
 * (`worker/mcp/data.ts`), and the specs read the same files off disk (`dataset.node.ts`).
 *
 * Everything is shared across requests by reference: `Calculator.setMasterItems()` only
 * stores the map and `getItem()` only reads, so there is nothing to copy — which is what
 * keeps a multi-megabyte parse off the per-request path.
 */
import { ClassRegistry } from './class-registry';
import { ItemIndex } from './item-index';
import { MonsterIndex } from './monster-index';

/** item.json / monster.json as loaded: an object keyed by id, values untyped by design. */
export type ItemMap = Record<string, any>;

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
  latamExtra: Record<string, LatamExtra>;
  /** monsters: monster.json with the pt-BR names already applied. */
  monsters: ItemMap;
  /** latam-monsters: the full id -> pt-BR name map, incl. the mobs with no stat block. */
  latamMonsters: Record<string, string>;
  hpSpTable: any;
  classes: number[];
}

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
   * item.json English text otherwise. Async because the map is ~7 MB and only two tools
   * need it, so both callers fetch it on first use rather than up front.
   */
  description(id: number): Promise<string | undefined>;
}

/**
 * @param loadDescriptions resolves the id -> description map. Called at most once — the
 * promise is memoized here, so neither caller needs a cache of its own.
 */
export function buildDataset(src: DatasetSources, loadDescriptions: () => Promise<Record<string, string>>): Dataset {
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
