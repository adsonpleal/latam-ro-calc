/**
 * A searchable index over the union of both item files.
 *
 * `item.json` carries the mechanics; `latam-items.json` is the LATAM universe and is
 * the larger set — ~7.7k of its ids have no calculator record at all. The app's own
 * pipeline drops those (it iterates item.json's keys), so this index unions them back
 * in and flags each row with `inCalcDb`. Rows without a calculator record are
 * name-searchable and describable, but cannot be filtered by slot/bonus/class,
 * because they have no structured fields to filter on.
 */
import { canUsedByClass } from 'src/app/utils';
import { CharacterBase } from 'src/app/jobs/_character-base.abstract';
import { ItemMap, LatamItem } from './merge-items';
import { classifyItem, SlotTag } from './slot-classifier';
import { foldAccents, tokenize } from './text';

export interface ItemRow {
  id: number;
  name: string;
  /** Folded name + English name + aegis name, for accent-insensitive matching. */
  norm: string;
  inCalcDb: boolean;
  latam: boolean;
  slots?: number;
  slotTags?: SlotTag[];
  reqLv?: number;
  atk?: number;
  def?: number;
}

/** Hoisted: constructing a collator per sort dominated the whole search. */
const COLLATOR = new Intl.Collator('pt-BR');

export interface SearchFilters {
  query?: string;
  slot?: SlotTag;
  classId?: number;
  bonus?: string[];
  bonusMode?: 'all' | 'any';
  /** Skill name or in-game id — matches damage, cooldown and cast-time bonus keys. */
  skill?: string;
  minSlots?: number;
  maxLevel?: number;
  inCalcDb?: boolean;
  latamOnly?: boolean;
  limit?: number;
  offset?: number;
}

/** Bonus-key families a per-skill filter should look at, mirroring the app's item search. */
const skillKeyPrefixes = (id: number | string) => [`${id}`, `chance__${id}`, `cd__${id}`, `vct__${id}`, `fct__${id}`, `fix_vct__${id}`];

export class ItemIndex {
  private readonly rows: ItemRow[] = [];
  private readonly byId = new Map<number, ItemRow>();

  constructor(
    private readonly items: ItemMap,
    private readonly latamItems: Record<string, LatamItem>,
  ) {
    // item.json first: index on the record's `id`, never the key. Id 4807 is
    // deliberately re-listed under 48079999/480799999 so the same enchant appears in
    // several costume-enchant pickers — one row, slot tags unioned.
    for (const record of Object.values(items) as any[]) {
      const existing = this.byId.get(record.id);
      const tags = classifyItem(record);
      if (existing) {
        existing.slotTags = [...new Set([...(existing.slotTags ?? []), ...tags])];
        continue;
      }

      const latam = latamItems[record.id];
      const row: ItemRow = {
        id: record.id,
        name: record.name,
        norm: foldAccents([record.name, record.enName, record.aegisName].filter(Boolean).join(' ')),
        inCalcDb: true,
        latam: !!latam,
        slots: record.slots || undefined,
        slotTags: tags.length ? tags : undefined,
        reqLv: record.requiredLevel ?? undefined,
        atk: record.attack ?? undefined,
        def: record.defense ?? undefined,
      };
      this.rows.push(row);
      this.byId.set(row.id, row);
    }

    // Then the LATAM-only ids: name and description, nothing mechanical.
    for (const [idStr, latam] of Object.entries(latamItems)) {
      const id = Number(idStr);
      if (this.byId.has(id)) continue;
      const row: ItemRow = {
        id,
        name: latam.name,
        norm: foldAccents([latam.name, latam.aegisName].filter(Boolean).join(' ')),
        inCalcDb: false,
        latam: true,
        slots: latam.slots || undefined,
      };
      this.rows.push(row);
      this.byId.set(id, row);
    }
  }

  get size(): number {
    return this.rows.length;
  }

  get(id: number): ItemRow | undefined {
    return this.byId.get(id);
  }

  /** The full calculator record, when the item has one. */
  record(id: number): any | undefined {
    const row = this.byId.get(id);
    return row?.inCalcDb ? this.items[id] : undefined;
  }

  /** The pt-BR overlay entry, which exists for LATAM-only items too. */
  latamRecord(id: number): LatamItem | undefined {
    return this.latamItems[id];
  }

  /** True when any structural filter is set, which implies `inCalcDb`. */
  static needsCalcDb(f: SearchFilters): boolean {
    return !!(f.slot || f.classId || f.bonus?.length || f.skill || f.minSlots !== undefined || f.maxLevel !== undefined);
  }

  search(filters: SearchFilters, char?: CharacterBase): { total: number; rows: ItemRow[] } {
    const {
      query,
      slot,
      bonus = [],
      bonusMode = 'all',
      skill,
      minSlots,
      maxLevel,
      latamOnly = true,
      limit = 20,
      offset = 0,
    } = filters;

    const requireCalcDb = filters.inCalcDb ?? (ItemIndex.needsCalcDb(filters) || undefined);
    const terms = query ? tokenize(query) : [];
    const classFilter = char ? canUsedByClass(char) : undefined;
    const skillKeys = skill ? skillKeyPrefixes(skill) : [];

    // Bounded top-k rather than sorting every match: an unfiltered search matches all
    // ~14k LATAM rows, and sorting them to return 20 cost ~36ms of blocked event loop.
    const keep = offset + limit;
    const compare = rankBy(query ? foldAccents(query) : '');
    const top: ItemRow[] = [];
    let total = 0;

    for (const row of this.rows) {
      if (requireCalcDb !== undefined && row.inCalcDb !== requireCalcDb) continue;
      if (latamOnly && !row.latam) continue;
      if (terms.length && !terms.every((t) => row.norm.includes(t))) continue;
      if (slot && !row.slotTags?.includes(slot)) continue;
      if (minSlots !== undefined && (row.slots ?? 0) < minSlots) continue;
      if (maxLevel !== undefined && (row.reqLv ?? 0) > maxLevel) continue;

      if (classFilter || bonus.length || skillKeys.length) {
        const record = this.items[row.id];
        if (!record) continue;
        if (classFilter && !classFilter(record)) continue;

        const script = record.script ?? {};
        if (bonus.length) {
          const hits = bonus.filter((key) => script[key] !== undefined);
          if (bonusMode === 'all' ? hits.length !== bonus.length : hits.length === 0) continue;
        }
        if (skillKeys.length && !skillKeys.some((key) => script[key] !== undefined)) continue;
      }

      total++;
      // Insertion into a k-sized buffer; k is at most offset+limit (≤100).
      if (top.length < keep) {
        let i = top.length;
        while (i > 0 && compare(row, top[i - 1]) < 0) i--;
        top.splice(i, 0, row);
      } else if (compare(row, top[keep - 1]) < 0) {
        let i = keep - 1;
        while (i > 0 && compare(row, top[i - 1]) < 0) i--;
        top.splice(i, 0, row);
        top.length = keep;
      }
    }

    return { total, rows: top.slice(offset) };
  }
}

/** Exact match, then prefix, then everything else; ties favour items the calculator knows. */
function rankBy(folded: string) {
  const score = (row: ItemRow): number => {
    if (!folded) return 2;
    if (row.norm === folded) return 0;
    if (row.norm.startsWith(folded)) return 1;
    return 2;
  };
  return (a: ItemRow, b: ItemRow): number =>
    score(a) - score(b) ||
    Number(b.inCalcDb) - Number(a.inCalcDb) ||
    Number(b.latam) - Number(a.latam) ||
    COLLATOR.compare(a.name, b.name);
}
