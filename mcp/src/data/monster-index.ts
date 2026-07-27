/**
 * Monster search. Same shape of gap as items: `latam-monsters.json` names ~4.1k mobs,
 * but only the 458 in `monster.json` carry a stat block — and only those can be used
 * as a target. Rows are flagged `hasStats` and searches default to requiring it, so an
 * agent doesn't pick a target `calculate` would reject.
 */
import { elementPtBr, monsterTypePtBr, racePtBr, sizePtBr } from 'src/app/constants/monster-i18n';
import { MVP_IDS } from 'src/app/constants/mvp';
import { ItemMap } from './merge-items';
import { foldAccents, tokenize } from './text';

export interface MonsterRow {
  id: number;
  name: string;
  norm: string;
  hasStats: boolean;
  level?: number;
  hp?: number;
  /** English logic keys; the pt-BR labels are produced at render time. */
  element?: string;
  race?: string;
  size?: string;
  boss?: boolean;
  mvp?: boolean;
}

/** Hoisted: a per-sort collator dominated the sort itself. */
const COLLATOR = new Intl.Collator('pt-BR');

export interface MonsterFilters {
  query?: string;
  minLevel?: number;
  maxLevel?: number;
  race?: string;
  element?: string;
  size?: string;
  boss?: boolean;
  hasStats?: boolean;
  limit?: number;
  offset?: number;
}

export class MonsterIndex {
  private readonly rows: MonsterRow[] = [];
  private readonly byId = new Map<number, MonsterRow>();

  constructor(
    private readonly monsters: ItemMap,
    latamNames: Record<string, string>,
  ) {
    for (const record of Object.values(monsters) as any[]) {
      const s = record.stats ?? {};
      const row: MonsterRow = {
        id: record.id,
        name: record.name,
        norm: foldAccents([record.name, record.dbname].filter(Boolean).join(' ')),
        hasStats: true,
        level: s.level,
        hp: s.health,
        // elementName is "Neutral 4" — the level suffix is part of the mechanic, but
        // for filtering only the element itself matters.
        element: typeof s.elementName === 'string' ? s.elementName.split(' ')[0] : undefined,
        race: s.raceName,
        size: s.scaleName,
        boss: s.class === 1 || undefined,
        mvp: MVP_IDS.has(record.id) || undefined,
      };
      this.rows.push(row);
      this.byId.set(row.id, row);
    }

    for (const [idStr, name] of Object.entries(latamNames)) {
      const id = Number(idStr);
      if (this.byId.has(id)) continue;
      const row: MonsterRow = { id, name, norm: foldAccents(name), hasStats: false };
      this.rows.push(row);
      this.byId.set(id, row);
    }
  }

  get size(): number {
    return this.rows.length;
  }

  get(id: number): MonsterRow | undefined {
    return this.byId.get(id);
  }

  record(id: number): any | undefined {
    return this.monsters[id];
  }

  /** pt-BR labels shared with the calculation result's `target` block. Everything is
   *  omitted rather than guessed for a monster with no stat block. */
  labels(row: MonsterRow, elementName?: string) {
    return {
      element: elementName ? elementPtBr(elementName) : undefined,
      race: row.race ? racePtBr(row.race) : undefined,
      size: row.size ? sizePtBr(row.size) : undefined,
      type: row.hasStats ? monsterTypePtBr(row.boss ? 'Boss' : 'Normal') : undefined,
    };
  }

  /** Full stat block, pt-BR labelled, for `get_monster`. */
  detail(id: number): Record<string, any> | undefined {
    const row = this.byId.get(id);
    if (!row) return undefined;
    if (!row.hasStats) return { id, name: row.name, hasStats: false, note: 'Sem bloco de atributos no calculador — não pode ser usado como alvo.' };

    const s = this.monsters[id].stats;
    return {
      id,
      name: row.name,
      level: s.level,
      hp: s.health,
      ...this.labels(row, s.elementName),
      mvp: MVP_IDS.has(id),
      def: s.defense,
      mdef: s.magicDefense,
      res: s.res,
      mres: s.mres,
      hit: s.hit,
      flee: s.flee,
      stats: { str: s.str, agi: s.agi, vit: s.vit, int: s.int, dex: s.dex, luk: s.luk },
      spawn: this.monsters[id].spawn,
      attackRange: s.attackRange,
    };
  }

  search(filters: MonsterFilters): { total: number; rows: MonsterRow[] } {
    const { query, minLevel, maxLevel, race, element, size, boss, hasStats = true, limit = 20, offset = 0 } = filters;
    const terms = query ? tokenize(query) : [];
    const wantedId = query && /^\d+$/.test(query.trim()) ? Number(query.trim()) : undefined;

    const matched = this.rows.filter((row) => {
      if (hasStats && !row.hasStats) return false;
      if (wantedId !== undefined && row.id === wantedId) return true;
      if (terms.length && !terms.every((t) => row.norm.includes(t))) return false;
      if (minLevel !== undefined && (row.level ?? 0) < minLevel) return false;
      if (maxLevel !== undefined && (row.level ?? 0) > maxLevel) return false;
      if (race && row.race !== race) return false;
      if (element && row.element !== element) return false;
      if (size && row.size !== size) return false;
      if (boss !== undefined && !!row.boss !== boss) return false;
      return true;
    });

    matched.sort((a, b) => (a.level ?? 0) - (b.level ?? 0) || COLLATOR.compare(a.name, b.name));
    return { total: matched.length, rows: matched.slice(offset, offset + limit) };
  }
}
