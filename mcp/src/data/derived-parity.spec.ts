/**
 * The MCP server used to read the hand-edited JSONs in src/assets/demo/data/ directly.
 * It now reads what tools/build-web-data.mjs derives from them, because a Worker cannot
 * open a file and would not want to parse 19 MB if it could.
 *
 * These are the tests that keep the two equivalent. The engine-level guard already exists
 * — mcp/src/engine/parity.spec.ts pins six absolute damage numbers through the whole
 * pipeline — so what is left to prove is the part damage cannot see: that the derived
 * artifacts still describe the same *set* of items, with the same flags, and that nothing
 * the tools read got pruned on the way.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadDatasetFromDisk } from './dataset.node';

const RAW = 'src/assets/demo/data';
const DERIVED = 'src/assets/data';

const read = (dir: string, file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'));

const rawItems = read(RAW, 'item.json') as Record<string, any>;
const rawLatam = read(RAW, 'latam-items.json') as Record<string, any>;
const rawMonsters = read(RAW, 'monster.json') as Record<string, any>;
const rawLatamMonsters = read(RAW, 'latam-monsters.json') as Record<string, string>;

const latamExtra = read(DERIVED, 'latam-extra.json') as Record<string, any>;
const itemsMcp = read(DERIVED, 'items-mcp.json') as Record<string, number>;
const descMcp = read(DERIVED, 'items-desc-mcp.json') as Record<string, string>;

/** Ids that item.json carries a record for — the test ItemIndex uses to decide overlap. */
const calcIds = new Set<number>(Object.values(rawItems).map((r: any) => r.id));

describe('latam-extra covers exactly the LATAM ids with no calculator record', () => {
  it('matches the set the old index built from latam-items.json', () => {
    const expected = Object.keys(rawLatam)
      .filter((id) => !calcIds.has(Number(id)))
      .sort();
    expect(Object.keys(latamExtra).sort()).toEqual(expected);
  });

  it('never overlaps items-core, or an id would be indexed twice', () => {
    expect(Object.keys(latamExtra).filter((id) => calcIds.has(Number(id)))).toEqual([]);
  });

  it('carries the fields the index reads off those rows', () => {
    // 7508 "Anel da Allysia" exists only in latam-items.json.
    expect(latamExtra['7508']).toMatchObject({ name: rawLatam['7508'].name });
    for (const [id, entry] of Object.entries(latamExtra)) {
      expect(entry.name).toBe(rawLatam[id].name);
      expect(entry.aegisName ?? undefined).toBe(rawLatam[id].aegisName || undefined);
      expect(entry.slots ?? undefined).toBe(rawLatam[id].slots || undefined);
    }
  });
});

describe('items-mcp restores the one field items-core drops that we read', () => {
  it('carries every requiredLevel in item.json, and nothing else', () => {
    const expected: Record<string, number> = {};
    for (const key of Object.keys(rawItems)) {
      const lv = rawItems[key].requiredLevel;
      if (lv !== undefined && lv !== null) expected[key] = lv;
    }
    expect(itemsMcp).toEqual(expected);
  });

  it('reaches the search index as reqLv', () => {
    const dataset = loadDatasetFromDisk();
    const withLevel = Object.keys(itemsMcp).find((key) => itemsMcp[key] > 0)!;
    const id = rawItems[withLevel].id;
    expect(dataset.itemIndex.get(id)?.reqLv).toBe(itemsMcp[withLevel]);
  });
});

describe('items-desc-mcp answers everything the raw lookup used to', () => {
  it('has a description for every id that had one before', () => {
    // The old handlers read `latamItems[id]?.description ?? items[id]?.description`,
    // where the second had already been overwritten by the pt-BR text when LATAM had it.
    const missing: string[] = [];
    for (const key of Object.keys(rawItems)) {
      const item = rawItems[key];
      const pt = rawLatam[item.id] ?? rawLatam[key];
      const expected = pt?.description ?? item.description;
      if (expected && descMcp[item.id] === undefined) missing.push(String(item.id));
    }
    for (const id of Object.keys(rawLatam)) {
      if (rawLatam[id].description && descMcp[id] === undefined) missing.push(id);
    }
    expect(missing).toEqual([]);
  });

  it('prefers the pt-BR text over the English one, as mergeLatamItems did', () => {
    const id = Object.keys(rawLatam).find(
      (k) => rawLatam[k].description && calcIds.has(Number(k)) && rawItems[k]?.description,
    )!;
    expect(descMcp[id]).toBe(rawLatam[id].description);
  });
});

describe('the index the Worker builds matches the one the box built', () => {
  const dataset = loadDatasetFromDisk();

  it('indexes the same number of items — 10503 distinct ids plus 6578 LATAM-only', () => {
    expect(dataset.itemIndex.size).toBe(calcIds.size + Object.keys(latamExtra).length);
    // The number the EC2 server's /healthz reported off the raw files.
    expect(dataset.itemIndex.size).toBe(17081);
  });

  it('indexes the same monsters, including the ones with no stat block', () => {
    const expected = new Set([...Object.keys(rawMonsters), ...Object.keys(rawLatamMonsters)]);
    expect(dataset.monsterIndex.size).toBe(expected.size);
  });

  it('applies the pt-BR monster names, which the generator now does at build time', () => {
    // This was mergeLatamMonsters' job until the merge moved into build-web-data.mjs.
    const renamed = Object.keys(rawMonsters).filter((id) => rawLatamMonsters[id]);
    expect(renamed.length).toBeGreaterThan(0);
    for (const id of renamed) {
      expect(dataset.monsters[id].name).toBe(rawLatamMonsters[id]);
    }
  });

  it('derives the LATAM flag identically to the old latam-items lookup', () => {
    // Old: `!!latamItems[record.id]`. New: `presentInLatam && !preRelease`, because
    // items-core forces presentInLatam on for preRelease items — which are by definition
    // the ones LATAM has not shipped, and which the old lookup therefore reported false.
    const wrong: number[] = [];
    for (const key of Object.keys(rawItems)) {
      const item = rawItems[key];
      const before = !!rawLatam[item.id];
      const after = dataset.itemIndex.get(item.id)?.latam;
      if (before !== after) wrong.push(item.id);
    }
    expect(wrong).toEqual([]);
  });
});
