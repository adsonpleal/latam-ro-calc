import { SKILL_META } from './index';

/** Client text carries `^rrggbb` colour codes between the words; strip them before parsing. */
const plain = (text?: string) => (text ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** "1.500" and "7,5" are the client's own thousands and decimal separators. */
const num = (text: string) => Number(text.replace(/\./g, '').replace(',', '.'));

/**
 * The per-level ATQ/ATQM table the client prints in a skill's own description: a
 * `Nível l ATQ l <other columns>` header followed by one `[Nv n]` line per level. Reads
 * the column the header names, so cells like "7x7 células" are never taken as ratios.
 * Returns null for a description that publishes no such column.
 *
 * Shared by the specs that hold the engine to that table, which is the source of truth for
 * a skill's ratio (CLAUDE.md) — see `skill-ratio-client-table.spec.ts`.
 */
export function clientRatioTable(name: string): Map<number, number> | null {
  const lines = plain(SKILL_META[name]?.description).split('\n');
  for (let index = 0; index < lines.length; index++) {
    const header = lines[index].split(' l ').map((part) => part.trim());
    if (header[0] !== 'Nível') continue;
    const column = header.findIndex((part) => part === 'ATQ' || part === 'ATQM');
    if (column < 1) continue;
    const table = new Map<number, number>();
    for (let next = index + 1; next < lines.length; next++) {
      const row = lines[next].match(/^\[Nv\.? ?(\d+)\]:? ?(.*)$/);
      if (!row) break;
      const percent = (row[2].split(' l ')[column - 1] ?? '').trim().match(/^([\d.]+(?:,\d+)?)%$/);
      if (percent) table.set(Number(row[1]), num(percent[1]));
    }
    if (table.size) return table;
  }
  return null;
}
