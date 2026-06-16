import { ItemDropdownModel } from '../models/dropdown.model';

export const toDropdownList = <T extends Record<string, any>>(
  list: T[],
  labelKey: keyof T,
  valueKey: keyof T,
  elementKey?: keyof T,
  extraKeys?: (keyof T)[],
): ItemDropdownModel[] => {
  return list.map<ItemDropdownModel>((a) => {
    const ex = (extraKeys || []).reduce<T>((extraAttr, key) => {
      extraAttr[key] = a[key];

      return extraAttr;
    }, {} as T);

    // Show the card-slot count in the picker label (e.g. "Chip de Batalha [1]").
    // The pt-BR item names drop the "[N]" suffix the game shows, so a 0-slot and a
    // 1-slot version look identical; restore it here. 0-slot items (incl. cards,
    // ammo, consumables) and labels that already carry "[N]" are left untouched.
    const slots = (a as Record<string, any>)['slots'];
    const baseLabel = a[labelKey];
    const label =
      typeof slots === 'number' && slots > 0 && typeof baseLabel === 'string' && !/\[\d+\]$/.test(baseLabel)
        ? `${baseLabel} [${slots}]`
        : baseLabel;

    return {
      label,
      value: a[valueKey],
      usableClass: a['usableClass'] || undefined,
      unusableClass: a['unusableClass'] || undefined,
      element: elementKey ? a[elementKey] || '' : undefined,
      lv200ClassName: a['requiredLevel'] >= 200 ? 'lv200' : '',
      ...ex,
    };
  });
};
