import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Guard for the `EQUIP[name]` -> `EQUIP_ID[id]` migration of the Visual-enchant stones.
 *
 * `EQUIP[<english name>]` is the legacy combo form (docs/item-json.md, "⚠️ Legado"): it
 * resolves through `enName`, so it breaks when a pt-BR rename lands and it silently
 * couples every record that happens to share a display name. The stone family was the last
 * large holdout — 159 records, 330 clauses.
 *
 * The migration is only safe if **no partner generation is dropped**. The client re-issued
 * most of these stones under a second id, and the two records share one English name, so a
 * single `EQUIP[Melee Stone (Middle)]` used to fire for either. Rewritten by id, that has
 * to become `EQUIP_ID[310328||1000378]` — naming just one generation would quietly stop
 * paying half the playerbase.
 *
 * Two independent checks, because neither covers the other:
 *
 * - **The baseline** (`costume-enchant-combo-baseline.json`, 809 cases) was recorded from
 *   the engine *before* the migration and is asserted unchanged after it. Every clause is
 *   exercised once per generation of every partner it names.
 * - **The structural invariant** catches what the baseline cannot. 8 of those cases sit
 *   behind a `LEARN_SKILL[...]` the harness class never learns, so their numbers are
 *   identical whether the clause fires or not. Asserting that each `EQUIP_ID[...]` lists
 *   *every* record sharing the partner's English name pins them anyway.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const baseline: Array<{
  stone: number;
  pt: string | null;
  en: string;
  partners: number[];
  expect: Record<string, number>;
}> = JSON.parse(readFileSync('src/app/core/__tests__/costume-enchant-combo-baseline.json', 'utf8'));

const SLOT_BY_SUB: Record<number, string> = {
  71: 'costumeEnchantUpper',
  72: 'costumeEnchantMiddle',
  73: 'costumeEnchantLower',
  74: 'costumeEnchantGarment',
  75: 'costumeEnchantGarment4',
  76: 'costumeEnchantGarment2',
};
const STONE_SUBS = Object.keys(SLOT_BY_SUB).map(Number);
const stoneEntries = Object.entries<any>(db).filter(([, it]) => STONE_SUBS.includes(it.itemSubTypeId));

/** Same normalisation `Calculator.matchName` applies before comparing. */
const matchName = (n: string) => (n || '').replace(/\[\d]$/, '').trim();

/** Every record id carrying one English name — one entry per generation of the stone. */
const idsByName = new Map<string, number[]>();
for (const [id, it] of Object.entries<any>(db)) {
  const n = matchName(it.name);
  if (!idsByName.has(n)) idsByName.set(n, []);
  idsByName.get(n)!.push(+id);
}

/** Wear the stones and read back every non-zero equipment bonus. */
function statusOf(ids: number[]): Record<string, number> {
  const items: Record<number, any> = {};
  const model: any = createMainModel();
  model.level = 200;

  for (const id of ids) {
    items[id] = db[id];
    model[SLOT_BY_SUB[db[id].itemSubTypeId]] = id;
  }
  const raw = equipStatusOf(makeCalculator(items), model);

  return Object.fromEntries(
    Object.entries(raw)
      .filter(([, v]) => typeof v === 'number' && v !== 0)
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

describe('Visual-enchant stone combos survive the move to EQUIP_ID', () => {
  describe('the recorded behaviour is unchanged', () => {
    it('covers every stone that carried a name-based clause', () => {
      // 159 records, and each one has at least one case with a partner worn — a fixture of
      // "stone alone" rows would pass the migration without proving anything.
      const stones = new Set(baseline.map((c) => c.stone));
      const withPartners = new Set(baseline.filter((c) => c.partners.length).map((c) => c.stone));
      expect(stones.size).toBe(159);
      expect(withPartners.size).toBe(159);
      expect(baseline.length).toBe(809);
    });

    it.each(baseline.map((c) => [`${c.stone} ${c.pt ?? c.en} + [${c.partners.join(', ') || 'nothing'}]`, c] as const))(
      '%s',
      (_label, c) => {
        expect(statusOf([c.stone, ...c.partners])).toEqual(c.expect);
      },
    );
  });

  describe('the clauses are id-based and name every generation', () => {
    it('leaves no EQUIP[name] clause in the stone family', () => {
      const legacy = stoneEntries
        .filter(([, it]) => /EQUIP\[/.test(JSON.stringify(it.script ?? {})))
        .map(([id]) => +id);
      expect(legacy).toEqual([]);
    });

    it('resolves every id named by an EQUIP_ID clause', () => {
      const dangling: string[] = [];
      for (const [id, it] of stoneEntries)
        for (const m of JSON.stringify(it.script ?? {}).matchAll(/EQUIP_ID\[([\d|&]+)]/g))
          for (const partner of m[1].split(/[|&]+/))
            if (!db[partner]) dangling.push(`${id} -> ${partner}`);
      expect(dangling).toEqual([]);
    });

    it('lists every re-issue of a partner, never just one generation', () => {
      // This is the check the behavioural cases cannot make for the skill-gated clauses.
      // An `||` group is one stone across its generations, so it must hold *all* the ids
      // that share that stone's English name — drop one and that generation stops paying.
      const incomplete: string[] = [];
      for (const [id, it] of stoneEntries) {
        for (const m of JSON.stringify(it.script ?? {}).matchAll(/EQUIP_ID\[([\d|&]+)]/g)) {
          for (const group of m[1].split('&&')) {
            const ids = group.split('||').map(Number);
            const names = new Set(ids.map((p) => matchName(db[p]?.name)));
            // Every id in an `||` group is the same stone, so they share one name.
            if (names.size !== 1) continue;
            const all = (idsByName.get([...names][0]) ?? []).slice().sort((a, b) => a - b);
            const got = ids.slice().sort((a, b) => a - b);
            if (JSON.stringify(all) !== JSON.stringify(got))
              incomplete.push(`${id}: [${got}] should be [${all}] for "${[...names][0]}"`);
          }
        }
      }
      expect(incomplete).toEqual([]);
    });
  });
});
