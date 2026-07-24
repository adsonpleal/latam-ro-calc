/**
 * Persisted calculator preferences (selected monsters for batch calc, chosen
 * battle-table columns). Wraps a `localStorage`-shaped backend behind an
 * interface so the parsing/validation can be unit-tested with a fake store and
 * so the engine layer never references the `localStorage` global directly.
 */
import { CompareState, sanitizeCompareState } from './compare-state';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MONSTER_IDS_KEY = 'monsterIds';
const BATTLE_COLS_KEY = 'battle_cols';
const COMPARE_STATE_KEY = 'ro-set-compare';

export class CalcStorage {
  constructor(private readonly storage: StorageLike) {}

  /** Monster ids previously chosen for the multi-monster calc (sanitised to ints). */
  readMonsterIds(): number[] {
    try {
      const ids = JSON.parse(this.storage.getItem(MONSTER_IDS_KEY) as string);
      if (!Array.isArray(ids)) return [];
      return ids.map(Number).filter((id) => Number.isInteger(id));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  writeMonsterIds(ids: number[]): void {
    this.storage.setItem(MONSTER_IDS_KEY, JSON.stringify(ids));
  }

  /** Field names of the battle-summary columns the user kept visible (strings only). */
  readBattleColNames(): string[] {
    try {
      const cached = JSON.parse(this.storage.getItem(BATTLE_COLS_KEY) as string);
      if (!Array.isArray(cached)) return [];
      return cached.filter((a) => typeof a === 'string');
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  writeBattleColNames(fields: string[]): void {
    this.storage.setItem(BATTLE_COLS_KEY, JSON.stringify(fields));
  }

  /**
   * The "comparar slot" comparison paired with the current autosave, so it can be
   * restored on refresh. `null` when nothing valid is stored (or the comparison
   * was cleared).
   */
  readCompareState(): CompareState | null {
    try {
      return sanitizeCompareState(JSON.parse(this.storage.getItem(COMPARE_STATE_KEY) as string));
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /** Persist (or clear, when passed a null/empty state) the current comparison. */
  writeCompareState(state: CompareState | null): void {
    this.storage.setItem(COMPARE_STATE_KEY, JSON.stringify(sanitizeCompareState(state)));
  }
}
