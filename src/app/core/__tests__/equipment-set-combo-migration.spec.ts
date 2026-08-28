import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createMainModel } from 'src/app/utils';
import { equipStatusOf, makeCalculator } from './make-calculator';

/**
 * Guard for the `EQUIP[name]` -> `EQUIP_ID[id]` migration of the equipment set combos that
 * turned up in the Dragon Knight replay audit — 14 records, 59 clauses.
 *
 * `EQUIP[<english name>]` is the legacy combo form (docs/item-json.md, "⚠️ Legado"): it
 * resolves through `enName`, so a pt-BR rename or a `[Apoio]`-style suffix silently stops
 * the bonus paying, and it couples every record that happens to share a display name —
 * the client re-issues items under new ids keeping the old English name.
 *
 * The migration is only safe if **no partner generation is dropped**. Here every partner
 * resolved to exactly one id (checked, and re-checked by the structural invariant below),
 * so no clause needed the `EQUIP_ID[a||b]` multi-generation form. That is a fact about
 * this batch, not a general one — the costume-enchant family needed it on most clauses.
 *
 * Two independent checks, because neither covers the other:
 *
 * - **The baseline** (`equipment-set-combo-baseline.json`, 100 cases) was recorded from the
 *   engine *before* the rewrite and asserted unchanged after it. Every clause is exercised
 *   with the partner absent and present, at refine 0 and 15, so a clause that stops firing
 *   — or one that starts firing when it should not — moves a number. All 50 clause/refine
 *   pairs show a real difference between absent and present, so no case is inert.
 * - **The structural invariant** catches what the baseline cannot: that each `EQUIP_ID[...]`
 *   names *every* record sharing the partner's English name. A baseline can only prove the
 *   ids that are there behave; it cannot prove none is missing.
 *
 * One clause lost an alternative. `15346` (Unexpected Fortune Armor) named
 * `EQUIP[Temporal Luk Boots||Modified Temporal Luk Boots]`, and **no item carries the
 * second name** — it could never fire, so dropping it is behaviour-preserving and the
 * baseline confirms it. It is probably a typo for "Modified Luk Boots" (22118), which the
 * sibling `20968` names in the same set; correcting it would be a real behaviour change,
 * so it is deliberately NOT folded into this migration.
 */

const db = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const baseline: Array<{
  target: number;
  targetSlot: string;
  partners: Array<{ name: string; id: number; slot: string }>;
  refine: number;
  withPartner: boolean;
  status: Record<string, number>;
}> = JSON.parse(readFileSync('src/app/core/__tests__/equipment-set-combo-baseline.json', 'utf8'));

/** The 14 records this run migrated. */
const MIGRATED = [
  2963, 15346, 20968, 24443, 24663, 24681, 420020, 450127, 450177, 480020, 480306, 490166, 600009, 600023,
];

/** Same normalisation `Calculator.matchName` applies before comparing. */
const matchName = (n: string) => (n || '').replace(/\[\d]$/, '').trim();

/** Every record id carrying one English name — one entry per generation of the item. */
const idsByName = new Map<string, number[]>();
for (const [id, it] of Object.entries<any>(db)) {
  const n = matchName(it.enName ?? it.name);
  if (!n) continue;
  if (!idsByName.has(n)) idsByName.set(n, []);
  idsByName.get(n)!.push(Number(id));
}

describe('equipment set combos: EQUIP[name] -> EQUIP_ID[id]', () => {
  it('leaves no migrated record matching a partner by name', () => {
    const offenders = MIGRATED.filter((id) => /EQUIP\[/.test(JSON.stringify(db[id]?.script ?? {})));
    expect(offenders).toEqual([]);
  });

  it('reproduces the pre-migration behaviour exactly', () => {
    for (const c of baseline) {
      const model: any = createMainModel();
      model.level = 200;
      model.jobLevel = 50;
      model[c.targetSlot] = c.target;
      model[`${c.targetSlot}Refine`] = c.refine;
      if (c.withPartner) {
        for (const p of c.partners) {
          model[p.slot] = p.id;
          model[`${p.slot}Refine`] = c.refine;
        }
      }

      const status = equipStatusOf(makeCalculator(db), model);
      const actual = Object.fromEntries(Object.entries(status).filter(([, v]) => v !== 0 && v != null));
      const label = `item ${c.target} refine ${c.refine} partner=${c.withPartner}`;

      expect({ label, ...actual }).toEqual({ label, ...c.status });
    }
  });

  /**
   * The baseline cannot see a generation that was never named. If a partner's English name
   * is carried by more than one record, every one of those ids has to appear in the clause
   * — otherwise the combo quietly stops paying for whoever holds the other generation.
   */
  it('names every generation of every partner it references', () => {
    const incomplete: string[] = [];
    for (const id of MIGRATED) {
      const script = JSON.stringify(db[id]?.script ?? {});
      for (const [, inner] of script.matchAll(/EQUIP_ID\[([^\]]+)\]/g)) {
        for (const group of inner.split('&&')) {
          const listed = group.split('||').map(Number).filter((n) => !Number.isNaN(n));
          if (!listed.length) continue;
          // An `||` group is an any-of, and its alternatives may be different items
          // (20968 accepts either boot) as well as different generations of one item.
          // So the invariant is per NAME: whichever names appear among the listed ids,
          // every generation of those names has to be listed too.
          const namesPresent = new Set(listed.map((x) => matchName(db[x]?.enName ?? db[x]?.name)));
          for (const name of namesPresent) {
            const all = (idsByName.get(name) ?? []).slice().sort((a, b) => a - b);
            const got = listed.filter((x) => matchName(db[x]?.enName ?? db[x]?.name) === name).sort((a, b) => a - b);
            if (JSON.stringify(all) !== JSON.stringify(got)) {
              incomplete.push(`${id}: EQUIP_ID[${group}] lists ${got.join(', ')} for "${name}", but that name is carried by ${all.join(', ')}`);
            }
          }
        }
      }
    }
    expect(incomplete).toEqual([]);
  });

  it('points every referenced id at a record that exists', () => {
    const dangling: string[] = [];
    for (const id of MIGRATED) {
      for (const [, inner] of JSON.stringify(db[id]?.script ?? {}).matchAll(/EQUIP_ID\[([^\]]+)\]/g)) {
        for (const ref of inner.split(/&&|\|\|/)) {
          if (!db[ref.trim()]) dangling.push(`${id} -> ${ref}`);
        }
      }
    }
    expect(dangling).toEqual([]);
  });
});
