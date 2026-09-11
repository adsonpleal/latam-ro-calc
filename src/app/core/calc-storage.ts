/**
 * Persisted calculator preferences (selected monsters for batch calc, chosen
 * battle-table columns). Wraps a `localStorage`-shaped backend behind an
 * interface so the parsing/validation can be unit-tested with a fake store and
 * so the engine layer never references the `localStorage` global directly.
 */
import { MAX_RELIEVE_LEVEL } from '../constants/monster-relieve';
import { CompareState, sanitizeCompareState } from './compare-state';
import { SlotColorLabels, sanitizeSlotColorLabels } from './slot-colors';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const MONSTER_IDS_KEY = 'monsterIds';
const RELIEVE_LEVEL_KEY = 'monsterRelieve';
const BATTLE_COLS_KEY = 'battle_cols';
const COMPARE_STATE_KEY = 'ro-set-compare';
const SLOT_COLOR_LABELS_KEY = 'ro-color-labels';
const SLOT_COLOR_SEEN_KEY = 'ro-color-seen';

export class CalcStorage {
  constructor(private readonly storage: StorageLike) {}

  /**
   * Read a JSON key through a sanitizer, answering `fallback` when it is missing, corrupt
   * or unusable. Every value this class holds is written by the app and read back on the
   * next visit, so a browser carrying a half-written or hand-edited key must not take the
   * page down with it — the contract is stated once here rather than in each reader.
   */
  private readJson<T>(key: string, sanitize: (raw: unknown) => T, fallback: T): T {
    try {
      const raw = this.storage.getItem(key);
      return raw == null ? fallback : sanitize(JSON.parse(raw));
    } catch (error) {
      console.error(error);
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    this.storage.setItem(key, JSON.stringify(value));
  }

  /** Monster ids previously chosen for the multi-monster calc (sanitised to ints). */
  readMonsterIds(): number[] {
    return this.readJson(MONSTER_IDS_KEY, (raw) => (Array.isArray(raw) ? raw.map(Number).filter(Number.isInteger) : []), []);
  }

  writeMonsterIds(ids: number[]): void {
    this.writeJson(MONSTER_IDS_KEY, ids);
  }

  /**
   * The Aliviar level chosen for the target, 0 when off. Lives here rather than on the
   * build model because it describes the *target*, like the selected monster itself —
   * the same reason `monster` is a plain localStorage key and not a preset field.
   * Anything outside 0..MAX_RELIEVE_LEVEL reads back as 0.
   */
  readRelieveLevel(): number {
    const level = Number(this.storage.getItem(RELIEVE_LEVEL_KEY));
    if (!Number.isInteger(level) || level < 0 || level > MAX_RELIEVE_LEVEL) return 0;

    return level;
  }

  writeRelieveLevel(level: number): void {
    this.storage.setItem(RELIEVE_LEVEL_KEY, String(level));
  }

  /** Field names of the battle-summary columns the user kept visible (strings only). */
  readBattleColNames(): string[] {
    return this.readJson(BATTLE_COLS_KEY, (raw) => (Array.isArray(raw) ? raw.filter((a) => typeof a === 'string') : []), []);
  }

  writeBattleColNames(fields: string[]): void {
    this.writeJson(BATTLE_COLS_KEY, fields);
  }

  /**
   * The "comparar slot" comparison paired with the current autosave, so it can be
   * restored on refresh. `null` when nothing valid is stored (or the comparison
   * was cleared).
   */
  readCompareState(): CompareState | null {
    return this.readJson(COMPARE_STATE_KEY, sanitizeCompareState, null);
  }

  /** Persist (or clear, when passed a null/empty state) the current comparison. */
  writeCompareState(state: CompareState | null): void {
    this.writeJson(COMPARE_STATE_KEY, sanitizeCompareState(state));
  }

  /**
   * The names this browser gave the slot-highlight colours.
   *
   * Deliberately here and not on the build model: which colour a slot wears is part
   * of the build and travels with it, but what "Azul" means is one person's
   * convention. Sharing it would rename the colours in the reader's own simulation,
   * so this key never enters a preset, a named save or a share token.
   */
  readSlotColorLabels(): SlotColorLabels {
    return this.readJson(SLOT_COLOR_LABELS_KEY, sanitizeSlotColorLabels, {});
  }

  writeSlotColorLabels(labels: SlotColorLabels): void {
    this.writeJson(SLOT_COLOR_LABELS_KEY, sanitizeSlotColorLabels(labels));
  }

  /**
   * Whether the slot-highlight button has ever been opened on this browser. The hint
   * that points at it is shown only while this is false, so it introduces the feature
   * once and then stops — it is a nudge, not a setting.
   */
  readSlotColorSeen(): boolean {
    return this.storage.getItem(SLOT_COLOR_SEEN_KEY) === '1';
  }

  markSlotColorSeen(): void {
    this.storage.setItem(SLOT_COLOR_SEEN_KEY, '1');
  }
}
