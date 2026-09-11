import { SlotColorLabels } from 'src/app/core/slot-colors';

export interface SlotColorPickerRequest {
  /** The header swatch button the panel hangs off. */
  anchor: HTMLElement;
  /** The palette id the slot currently wears, or null. */
  value: string | null;
}

/**
 * One flat shape rather than a union: `tsconfig` runs with `strict: false`, where a
 * discriminated union never narrows, so every consumer would be reading optional
 * fields off it anyway.
 *
 * The panel emits a `rename` for each name the player edits — it stays open, because
 * renaming is not choosing — and then exactly one `pick` (or `dismiss`) as it closes.
 */
export interface SlotColorPickerEvent {
  kind: 'pick' | 'rename' | 'dismiss';
  /** `pick` only: the chosen palette id, or null for "Sem cor". */
  value?: string | null;
  /** `rename` only: the full label map after the edit, ready to persist. */
  labels?: SlotColorLabels;
}
