/**
 * Pins the ROADMAP 2027 monster preview: the three Biosphere expansions kRO has shipped
 * and LATAM has not, shown in the target picker with the **Prévia** marker.
 *
 * These records could not come from the usual source. `mobs.json` is generated from LATAM
 * server data, so it can never carry a monster LATAM has not shipped — the feed is not
 * merely stale here, it is structurally unable to help. They were machine-read from
 * divine-pride instead, by `.agents/skills/add-ro-monster/dp-source.mjs`, whose parser was
 * validated by reproducing all 24 calc-read fields of 21548 (a live Biosphere mob) exactly.
 *
 * What this spec guards is the part a re-import would not catch: that the preview stays
 * marked and does not spread, that the fields the engine actually reads are present and in
 * the engine's own English vocabulary, and that each mob's published damage reduction
 * reached the id list the engine reads.
 *
 * Note one asymmetry with the item preview: `latam-monsters.json` is a name overlay, not
 * the "LATAM has shipped it" list that `latam-items.json` is for items, so there is no
 * generated list to graduate against here. `tools/sync-monster-db.mjs` does that instead —
 * it clears `preRelease` for any id the LATAM feed has begun carrying.
 */
import { describe, expect, it } from 'vitest';
import monsters from '../../assets/demo/data/monster.json';
import latam from '../../assets/demo/data/latam-monsters.json';
import { MonsterModel } from '../models/monster.model';
import { getMonsterGroupName, getMonsterSpawnMap } from '../constants/monster-spawn-mapper';
import { monsterDamageReductionPercent } from '../constants/monster-damage-reduction';

const db = monsters as unknown as Record<string, MonsterModel>;
const client = latam as unknown as Record<string, string>;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Q1 — "Renovação das Ecosferas de Varmunt". kRO's three new Biosphere areas, one MVP each
 * at level 260. divine-pride maps: bl_temple, bl_venom, bl_soul.
 */
const TEMPLE = range(21920, 21927);
const VENOM = range(21928, 21935);
const SOUL = range(21936, 21943);
/** The area MVPs, the only three that take 1% instead of 10%. */
const RENEWAL_MVPS = [21927, 21935, 21943];
/**
 * Q2 — "Profundezas da Ecosfera" (Deep Level 1), divine-pride map bl_depth1. All sixteen
 * are on the boss protocol (`class: 1`) without being MVPs, which is easy to get wrong.
 */
const DEEP_1 = range(22140, 22155);

const AREAS = [
  ['Q1 Renovação · Temple', TEMPLE, 'bl_temple', 8],
  ['Q1 Renovação · Venom', VENOM, 'bl_venom', 8],
  ['Q1 Renovação · Soul', SOUL, 'bl_soul', 8],
  ['Q2 Profundezas da Ecosfera', DEEP_1, 'bl_depth1', 16],
] as const satisfies readonly (readonly [string, readonly number[], string, number])[];

const ALL = AREAS.flatMap(([, ids]) => ids);

/** The engine parses these English strings, not the numeric codes (`Monster.setData`). */
const RACES = ['Formless', 'Undead', 'Brute', 'Plant', 'Insect', 'Fish', 'Demon', 'DemiHuman', 'Angel', 'Dragon'];
const SIZES = ['Small', 'Medium', 'Large'];
const ELEMENTS = ['Neutral', 'Water', 'Earth', 'Fire', 'Wind', 'Poison', 'Holy', 'Dark', 'Ghost', 'Undead'];

describe('ROADMAP 2027 preview monsters', () => {
  it('covers the four new Biosphere maps', () => {
    for (const [label, ids, , count] of AREAS) expect(ids, label).toHaveLength(count);
    expect(ALL).toHaveLength(40);
    expect(new Set(ALL).size, 'an id listed under two areas would be flagged twice').toBe(ALL.length);
  });

  it('marks every record Prévia', () => {
    for (const [label, ids] of AREAS) {
      for (const id of ids) {
        expect(db[id], `${label} ${id}`).toBeDefined();
        expect(db[id].preRelease, `${label} ${id}`).toBe(true);
      }
    }
  });

  it('flags these forty and nothing else', () => {
    // Monsters have no generated "LATAM has it" list to compare against. `latam-monsters.json`
    // looks like latam-items.json but is NOT its equivalent: it is a 4170-entry name overlay
    // that already carries these ids with their English names, so it cannot say what shipped.
    // The real signal is the ragassets feed, which is LATAM server data — and the graduation
    // happens in `tools/sync-monster-db.mjs`, which clears `preRelease` for any id the feed
    // has started carrying. A test cannot reach that feed, so what it can guard is the
    // inverse: that no record drifts into the preview set unnoticed.
    const flagged = Object.keys(db).filter((id) => db[id].preRelease).map(Number).sort((a, b) => a - b);
    expect(flagged).toEqual([...ALL].sort((a, b) => a - b));
  });

  it('gives every preview monster a name the picker can show', () => {
    // The overlay is what the picker displays; the record's own `name` is only a fallback.
    // These are English because the feed has no pt-BR label for content LATAM lacks —
    // the same compromise a preview item's English name is, and not a gap to invent around.
    for (const id of ALL) expect(client[id]?.trim(), String(id)).toBeTruthy();
  });

  it('gives the engine the fields it actually reads, in its own vocabulary', () => {
    for (const id of ALL) {
      const { stats } = db[id];
      expect(RACES, `${id} race`).toContain(stats.raceName);
      expect(SIZES, `${id} size`).toContain(stats.scaleName);
      expect(ELEMENTS, `${id} element`).toContain(stats.elementShortName);
      // "Holy 3" — the short name plus a level between 1 and 4.
      expect(stats.elementName, `${id} elementName`).toMatch(/^[A-Za-z]+ [1-4]$/);
      expect(stats.elementName.startsWith(stats.elementShortName), `${id} element pair`).toBe(true);
      for (const field of ['level', 'health', 'defense', 'magicDefense', 'res', 'mres',
        'str', 'agi', 'vit', 'int', 'dex', 'luk'] as const) {
        expect(stats[field], `${id} ${field}`).toBeGreaterThan(0);
      }
      expect(db[id].name.trim(), `${id} name`).not.toBe('');
      expect(db[id].dbname.trim(), `${id} dbname`).not.toBe('');
    }
  });

  it('lands each area in its own picker group', () => {
    for (const [label, ids, map] of AREAS) {
      // An unmapped spawn code renders as the literal "undefined" in the picker.
      expect(getMonsterSpawnMap(map), label).not.toContain('undefined');
      for (const id of ids) {
        expect(db[id].spawn, `${label} ${id}`).toBe(map);
        const { stats } = db[id];
        const group = getMonsterGroupName({ id, spawn: db[id].spawn, mvp: stats.mvp, class: stats.class });
        expect(group, `${label} ${id}`).toBe(getMonsterSpawnMap(map));
      }
    }
  });

  it('keeps the published damage reduction, which these areas all have', () => {
    // Every one of these mobs publishes a "Taking only N% of the damage dealt to it" line.
    // The engine reads an explicit id list, not stats.attr, so a missing entry here means
    // the mob silently takes full damage.
    for (const id of ALL) {
      const expected = RENEWAL_MVPS.includes(id) ? 99 : 90;
      expect(monsterDamageReductionPercent(id), String(id)).toBe(expected);
    }
  });

  it('separates the MVPs from the merely boss-flagged', () => {
    for (const id of RENEWAL_MVPS) {
      expect(db[id].stats.mvp, `${id} mvp`).toBe(1);
      expect(db[id].stats.level, `${id} level`).toBe(260);
    }
    // Deep Level 1 is boss protocol without being MVP — the distinction the skill warns
    // about, and the reason these do not land in the shared "MVPs" group.
    for (const id of DEEP_1) {
      expect(db[id].stats.class, `${id} class`).toBe(1);
      expect(db[id].stats.mvp, `${id} mvp`).toBe(0);
    }
    for (const id of [...TEMPLE, ...VENOM, ...SOUL].filter((id) => !RENEWAL_MVPS.includes(id))) {
      expect(db[id].stats.mvp, `${id} mvp`).toBe(0);
      expect(db[id].stats.class, `${id} class`).toBe(0);
    }
  });
});
