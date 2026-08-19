export interface DropdownModel {
  label: string;
  value: string | number;
  element?: string;
  [key: string]: any;
}

export interface ItemDropdownModel {
  label: string;
  value: string | number;
  element?: string;
  usableClass?: string[];
  unusableClass?: string[];
  /** Item is not on LATAM yet — the picker marks it (see ItemModel.preRelease). */
  preRelease?: boolean;
}
