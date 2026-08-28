import { DropdownModel } from 'src/app/models/dropdown.model';
import { ItemModel } from 'src/app/models/item.model';

/** A node of the Bônus Aleatório tree (createExtraOptionList). */
export interface OptionTreeNode {
  label: string;
  value?: string | number;
  children?: OptionTreeNode[];
}

interface PickerRequestBase {
  /** False hides the "Nenhum" row, for a field with no empty state (pet loyalty). */
  clearable?: boolean;
  /** The chip the panel hangs off. */
  anchor: HTMLElement;
  /** Panel heading, e.g. "Carta 2". */
  title: string;
}

export interface FlatPickerRequest extends PickerRequestBase {
  mode: 'flat';
  options: readonly DropdownModel[];
  value: string | number | null | undefined;
  /** Fields the filter box searches — the old `filterBy` list, verbatim. */
  filterKeys: readonly string[];
  /**
   * Which field holds the row icon. `value` for items (the id is the icon), `img` for the
   * element converters, whose icons are asset names like `I_Aspersio`.
   */
  iconKey?: 'value' | 'img' | null;
  /** Paint rows with the `property_<Element>` palette taken from the `element` field. */
  elementColoured?: boolean;
  /**
   * Option value → CSS class, for a list that carries no `element` of its own. Pet
   * loyalty is the case: its tiers have a palette but no element behind it.
   */
  colourClasses?: Record<string, string>;
  /** Item map for the per-row description popover. Omit for non-item lists. */
  items?: Record<number, ItemModel>;
}

export interface TreePickerRequest extends PickerRequestBase {
  mode: 'tree';
  roots: readonly OptionTreeNode[];
  value: string | null | undefined;
  /** Flattened leaf value → label, for the search that replaces drilling. */
  leafIndex: ReadonlyMap<string, string>;
}

export type PickerRequest = FlatPickerRequest | TreePickerRequest;

/**
 * `committed: false` means the panel was dismissed and nothing should be written — which
 * is not the same as committing `null`, the "Nenhum" row, which clears the chip.
 */
export interface PickerResult {
  committed: boolean;
  value?: string | number | null;
}
