import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Size *damage* — the `p_size_*` / `m_size_*` keys, the offensive counterpart of
 * size-resistance.spec.ts's `subsize_*`.
 *
 * Found while syncing with ragassets: twelve items said "Dano físico/mágico contra todos
 * os Tamanhos +N%" in their pt-BR description and granted nothing, and two more granted
 * it on the wrong channel — the Arco Primordial-LT keyed `p_element_all` for a line that
 * never mentions elements, and the Detector de Joias, a magic dagger, procced
 * `chance__p_size_all` for a magic effect.
 *
 * The pt-BR description is the source of truth (CLAUDE.md).
 *
 * The check reads the key names rather than the summed bonus because the grant sits
 * behind every kind of gate the script grammar has — a refine tier, a proc, a set
 * partner, a class. What matters is that the item declares the key at all.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const latam = JSON.parse(readFileSync('src/assets/demo/data/latam-items.json', 'utf8'));

/** Strip the client's ^RRGGBB colour codes. */
const plain = (description: string) => (description || '').replace(/\^[0-9a-fA-F]{6}/g, '');

/** The size-damage line. The client capitalises "Tamanhos" inconsistently. */
const SIZE_DAMAGE_LINE = /Dano (f[íi]sico e m[áa]gico|f[íi]sico|m[áa]gico) contra todos os [Tt]amanhos/i;

/**
 * The two Carnival costumes. Their whole bonus block is prefixed "[Durante o Evento]" and
 * only exists while the event runs, so the script is deliberately empty — registering it
 * would grant 10% size, element and race damage year-round.
 */
const EVENT_ONLY = [19873, 19874];

/** Any gate may prefix the key (`chance__`, …), so match on the infix, not the start. */
const declares = (script: any, channel: 'p' | 'm'): boolean =>
  Object.keys(script || {}).some((key) => key.includes(`${channel}_size_`));

describe('guard: every description granting size damage has p_size_*/m_size_* in its script', () => {
  const rows = Object.keys(latam)
    .filter((id) => items[id])
    .map((id) => ({ id, match: SIZE_DAMAGE_LINE.exec(plain(latam[id].description)) }))
    .filter((row) => row.match);

  it('matches the whole family, not a handful of items', () => {
    expect(rows.length).toBeGreaterThan(80);
  });

  it('leaves no item without the key its description names', () => {
    const missing = rows
      .filter((row) => !EVENT_ONLY.includes(Number(row.id)))
      .flatMap(({ id, match }) => {
        const kind = match![1].toLowerCase();
        const both = kind.includes('e m');
        const gaps: string[] = [];

        if ((both || kind.startsWith('f')) && !declares(items[id].script, 'p')) gaps.push('p_size_*');
        if ((both || kind.startsWith('m')) && !declares(items[id].script, 'm')) gaps.push('m_size_*');

        return gaps.map((gap) => `${id} ${latam[id].name} — missing ${gap}`);
      });

    expect(missing).toEqual([]);
  });

  it('keeps the two event costumes out by exemption, not by accident', () => {
    for (const id of EVENT_ONLY) {
      expect(plain(latam[id].description)).toContain('[Durante o Evento]');
      expect(items[id].script).toEqual({});
    }
  });
});
