export function tablePage<T>(value: readonly T[], rows: number, first: number, paginator: boolean, total = value.length, pageLinks = 5) {
  const size = Math.max(1, rows);
  const pageCount = Math.ceil(total / size);
  const page = Math.max(0, Math.min(pageCount - 1, Math.floor(first / size)));
  const start = paginator ? page * size : 0;
  const pageStart = Math.max(0, Math.min(page - Math.floor(pageLinks / 2), pageCount - pageLinks));
  return { size, pageCount, page, start, displayed: paginator ? value.slice(start, start + size) : value,
    pages: Array.from({ length: Math.min(pageLinks, pageCount) }, (_, index) => pageStart + index) };
}
export function sameRow<T>(chosen: T | null, row: T, key?: keyof T): boolean {
  return chosen === row || key != null && chosen != null && chosen[key] === row?.[key];
}
