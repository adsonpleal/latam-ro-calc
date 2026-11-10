import { SKILL_META } from './index';

/** Client text carries `^rrggbb` colour codes between the words; strip them before parsing. */
const plain = (text?: string) => (text ?? '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** "1.500" and "7,5" are the client's own thousands and decimal separators. */
const num = (text: string) => Number(text.replace(/\./g, '').replace(',', '.'));

/** The client writes its column separator as " l " and, in a few descriptions, as " | ". */
const cells = (line: string) => line.split(/ l | \| /).map((part) => part.trim());

/**
 * The per-level ATQ/ATQM table the client prints in a skill's own description: a
 * `Nível l ATQ l <other columns>` header followed by one `[Nv n]` line per level. Reads
 * the column the header names, so cells like "7x7 células" are never taken as ratios.
 * Returns null for a description that publishes no such column.
 *
 * `column` names that header cell exactly, for the descriptions that print more than one
 * ATQ column — Ferir Alvo's "Nível l ATQ (Pistola) l ATQ (Rifle) l Chance" is the only one
 * today. Left out, the first plain `ATQ`/`ATQM` column is the one read.
 *
 * Shared by the specs that hold the engine to that table, which is the source of truth for
 * a skill's ratio (CLAUDE.md) — see `skill-ratio-client-table.spec.ts`.
 */
export function clientRatioTable(name: string, column?: string): Map<number, number> | null {
  const lines = plain(SKILL_META[name]?.description).split('\n');
  for (let index = 0; index < lines.length; index++) {
    const header = cells(lines[index]);
    if (header[0] !== 'Nível') continue;
    const at = header.findIndex((part) => (column ? part === column : part === 'ATQ' || part === 'ATQM'));
    if (at < 1) continue;
    const table = new Map<number, number>();
    for (let next = index + 1; next < lines.length; next++) {
      const row = lines[next].match(/^\[Nv\.? ?(\d+)\]:? ?(.*)$/);
      if (!row) break;
      const percent = (cells(row[2])[at - 1] ?? '').match(/^([\d.]+(?:,\d+)?)%$/);
      if (percent) table.set(Number(row[1]), num(percent[1]));
    }
    if (table.size) return table;
  }
  return null;
}
