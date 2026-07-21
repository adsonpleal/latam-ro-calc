/**
 * Named build saves persisted in `localStorage` under `ro-saves`, separate from
 * the single `ro-set` autosave. Each entry stores the same preset shape the
 * autosave does (`toUpsertPresetModel(model, character)`), so a saved build
 * round-trips through the proven `loadItemSet` path.
 *
 * Framework-free (lives in src/app/core) and storage-injected so it can be
 * unit-tested with a fake store — mirrors `CalcStorage`.
 */
import { PresetModel } from '../api-services/models/preset-model';
import { StorageLike } from './calc-storage';
import { PlayerTargetProfile } from './pvp';

const SAVES_KEY = 'ro-saves';

export interface SavedSimulation {
  id: string;
  name: string;
  /** Class id snapshot for the card label (preset.class is authoritative). */
  classId: number;
  savedAt: number;
  preset: PresetModel;
  /**
   * PVP: the build's defensive profile as an enemy player, computed from the
   * solved build at save time (see docs/pvp.md §3). Absent on sims saved before
   * the PVP feature — those must be re-saved to be usable as a PVP target.
   */
  targetProfile?: PlayerTargetProfile;
}

const newId = (): string => {
  try {
    return (globalThis as any)?.crypto?.randomUUID?.() ?? String(Date.now());
  } catch {
    return String(Date.now());
  }
};

export class SavedSimulationStore {
  constructor(private readonly storage: StorageLike) {}

  /** All saves, newest first. Tolerant of a corrupt/missing value. */
  list(): SavedSimulation[] {
    try {
      const raw = JSON.parse(this.storage.getItem(SAVES_KEY) as string);
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((s) => s && typeof s.name === 'string' && s.preset)
        .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  nameExists(name: string): boolean {
    const n = name.trim().toLowerCase();
    return this.list().some((s) => s.name.trim().toLowerCase() === n);
  }

  /** Create or overwrite (by case-insensitive name) and return the saved entry. */
  upsert(name: string, preset: PresetModel, targetProfile?: PlayerTargetProfile): SavedSimulation {
    const trimmed = name.trim();
    const n = trimmed.toLowerCase();
    const list = this.list();
    const existing = list.find((s) => s.name.trim().toLowerCase() === n);
    const entry: SavedSimulation = {
      id: existing?.id ?? newId(),
      name: trimmed,
      classId: Number(preset.class) || 0,
      savedAt: Date.now(),
      preset,
      targetProfile,
    };
    const next = existing ? list.map((s) => (s.id === existing.id ? entry : s)) : [entry, ...list];
    this.writeAll(next);
    return entry;
  }

  /**
   * Attach/replace a sim's cached PVP target profile WITHOUT touching its
   * `savedAt` or ordering — used when a profile is solved lazily on selection,
   * which must not re-timestamp or reorder the sim. No-op if the id is gone.
   */
  setTargetProfile(id: string, targetProfile: PlayerTargetProfile): void {
    const list = this.list();
    const entry = list.find((s) => s.id === id);
    if (!entry) return;
    entry.targetProfile = targetProfile;
    this.writeAll(list);
  }

  remove(id: string): void {
    this.writeAll(this.list().filter((s) => s.id !== id));
  }

  private writeAll(list: SavedSimulation[]): void {
    this.storage.setItem(SAVES_KEY, JSON.stringify(list));
  }
}
