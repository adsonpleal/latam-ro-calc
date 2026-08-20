import { ArchMage, CharacterBase, ElementalMaster, HyperNovice, RuneKnight } from 'src/app/jobs';
import { ITEMS, isCardRecord } from './card-set-doll';

/**
 * Which cards have a set clause, whom it names, and the dolls that fire it.
 *
 * Read off the database rather than listed by hand, so the baseline covers whatever is
 * there on the day it runs and cannot drift out of step with item.json.
 */

/**
 * The name a script condition matches an item by, exactly as `calculator.matchName` does:
 * `enName ?? name`, with a trailing "[N]" slot count stripped.
 *
 * Raw item.json has no `enName` — the LATAM overlay adds it at runtime, set to the English
 * `name` it is about to replace. So `enName ?? name` over the raw file is the same string
 * the app matches on, which is what lets this run against item.json directly.
 */
export const matchName = (item: any) => String(item.enName ?? item.name).replace(/\[\d]$/, '').trim();

/** matchName -> the ids carrying it. Several means the client re-issued the item. */
export const IDS_BY_MATCH_NAME: Map<string, number[]> = new Map();
for (const [id, item] of Object.entries(ITEMS) as [string, any][]) {
  const name = matchName(item);
  if (!IDS_BY_MATCH_NAME.has(name)) IDS_BY_MATCH_NAME.set(name, []);
  IDS_BY_MATCH_NAME.get(name)!.push(Number(id));
}

export interface SetClause {
  /** The bonus key the entry sits under. */
  key: string;
  /** The entry, verbatim. */
  entry: string;
  /** `EQUIP[...]` / `EQUIP_ID[...]`, whichever the entry uses. */
  form: 'name' | 'id';
  /** The condition read as the engine reads it: every group must have one member worn. */
  groups: number[][];
}

/** `a||b&&c` -> [[a, b], [c]] — the engine splits on `&&` first, then each group on `||`. */
function groupsOf(condition: string, resolve: (token: string) => number[]): number[][] {
  return condition
    .split('&&')
    .filter(Boolean)
    .map((group) => group.split('||').flatMap(resolve));
}

/** Every set clause on a card, with its partners resolved to ids. */
export function setClausesOf(id: number): SetClause[] {
  const clauses: SetClause[] = [];

  for (const [key, values] of Object.entries((ITEMS[id]?.script ?? {}) as Record<string, string[]>)) {
    for (const entry of values) {
      const byId = /EQUIP_ID\[([\d|&]+)]/.exec(entry);
      if (byId) {
        clauses.push({ key, entry, form: 'id', groups: groupsOf(byId[1], (t) => [Number(t)]) });
        continue;
      }

      const byName = /EQUIP\[([^\]]+)]/.exec(entry);
      if (byName) {
        clauses.push({ key, entry, form: 'name', groups: groupsOf(byName[1], (t) => IDS_BY_MATCH_NAME.get(t.trim()) ?? []) });
      }
    }
  }

  return clauses;
}

/** Every card that carries at least one set clause. */
export const CARDS_WITH_A_SET: number[] = Object.keys(ITEMS)
  .map(Number)
  .filter((id) => isCardRecord(id) && setClausesOf(id).length > 0)
  .sort((a, b) => a - b);

/**
 * The partner line-ups that fire a clause, one per alternative of every `||` group.
 *
 * A clause is a conjunction of disjunctions, so a line-up takes one member from each group.
 * Varying one group at a time while the others hold their first member is enough to reach
 * every alternative at least once — which is the point: a re-issued partner that no line-up
 * ever wears is a generation a rewrite could drop without a single number moving.
 */
export function lineUpsFor(clause: SetClause): number[][] {
  const first = clause.groups.map((group) => group[0]);
  if (clause.groups.every((group) => group.length <= 1)) return [first];

  const lineUps: number[][] = [];
  clause.groups.forEach((group, index) => {
    for (const member of group) {
      const lineUp = [...first];
      lineUp[index] = member;
      if (!lineUps.some((existing) => existing.join() === lineUp.join())) lineUps.push(lineUp);
    }
  });

  return lineUps;
}

/**
 * The class a clause has to be worn by to pay at all.
 *
 * `USED[...]` matches against `classNameSet`, which carries every ancestor, so one class per
 * lineage reaches the whole branch. Four tokens appear on card set clauses; the default
 * Rune Knight already answers to Swordman, so only three need a class of their own.
 */
const CLASS_FOR_USED: Record<string, () => CharacterBase> = {
  Mage: () => new ArchMage(),
  Sage: () => new ElementalMaster(),
  SuperNovice: () => new HyperNovice(),
  Swordman: () => new RuneKnight(),
};

/** The class this clause is measured as, and the label its scenario is keyed by. */
export function classOf(clause: SetClause): { make?: () => CharacterBase; label: string } {
  const used = /USED\[([^\]]+)]/.exec(clause.entry)?.[1];
  const make = used ? CLASS_FOR_USED[used] : undefined;

  return make ? { make, label: used! } : { label: '' };
}

/** A stable name for one measurement, used as the baseline's key. */
export const scenarioKey = (partners: number[], classLabel = '') =>
  `${partners.length ? `with:${partners.join(',')}` : 'alone'}${classLabel ? `@${classLabel}` : ''}`;
