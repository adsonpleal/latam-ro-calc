import { Chip } from 'src/app/core/equipment-chips';

/** A chip with everything needed to draw it — the card resolves this from the item map. */
export interface ChipView {
  chip: Chip;
  /** The value's label, or the placeholder when the chip is empty. */
  text: string;
  filled: boolean;
  /** Item id, or an asset name for the element converters. */
  icon: string | number | null;
  /** `property_<Element>` (converter, ammo) or a loyalty tier class. */
  elementClass: string | null;
  /** Item id for the hover description; null when the value is not an item. */
  descId: number | null;
  /** The item chip, drawn a size up. */
  primary: boolean;
  /** Item not released on LATAM yet. */
  preRelease: boolean;
}
