/** Preserve primitive values, object identity, and valid falsy selections. */
export function optionValue(option: any, key?: string, labelKey?: string): any {
  if (option == null || typeof option !== 'object') return option;
  if (key) return option[key];
  return !labelKey && 'value' in option ? option.value : option;
}
export function optionLabel(option: any, key?: string): string {
  return String(option == null ? '' : typeof option === 'object' ? option[key || 'label'] ?? option.value ?? '' : option);
}
export function toggleSelection<T>(selection: readonly T[] | null | undefined, value: T): T[] {
  const values = selection ?? [];
  return values.includes(value) ? values.filter(entry => entry !== value) : [...values, value];
}

export function chooseSelection(value: any, option: any, multiple: boolean, toggleSingle: boolean, disabled = false, key?: string, labelKey?: string): any {
  if (disabled || option?.disabled) return value;
  const next = optionValue(option, key, labelKey);
  return multiple ? toggleSelection(value, next) : toggleSingle && value === next ? null : next;
}

export function filteredRows(options: any[], query: string, group: boolean, filterBy = 'label', labelKey?: string): { option: any; group?: boolean }[] {
  const search = query.toLocaleLowerCase('pt-BR').trim();
  const matches = (option: any) => !search || filterBy.split(',').some(key => String(option?.[key.trim()] ?? optionLabel(option, labelKey)).toLocaleLowerCase('pt-BR').includes(search));
  return group ? options.flatMap(parent => {
    const entries = (parent.items ?? []).filter(matches);
    return entries.length ? [{ option: parent, group: true }, ...entries.map(option => ({ option }))] : [];
  }) : options.filter(matches).map(option => ({ option }));
}

export function toggleAllSelection(value: readonly any[] | null | undefined, rows: { option: any; group?: boolean }[], key?: string, labelKey?: string): any[] {
  const enabled = rows.filter(row => !row.group && !row.option?.disabled).map(row => optionValue(row.option, key, labelKey));
  const current = value ?? [];
  return enabled.every(entry => current.includes(entry)) ? current.filter(entry => !enabled.includes(entry)) : [...new Set([...current, ...enabled])];
}

export function virtualRange(count: number, itemSize: number, height: number, scrollTop: number, overscan = 4) {
  const first = Math.floor(Math.max(0, scrollTop) / Math.max(1, itemSize));
  return { start: Math.min(count, Math.max(0, first - overscan)), end: Math.min(count, first + Math.ceil(height / Math.max(1, itemSize)) + overscan) };
}
