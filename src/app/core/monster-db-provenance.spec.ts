import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Monster records the ragassets client feed cannot maintain.
 *
 * `tools/sync-monster-db.mjs` refreshes every record in monster.json from the client's own
 * mobs.json — except the ones the client table does not carry. Those keep whatever they
 * were created with, forever, and no sync run will ever correct them. Today that is 64
 * records: 9 synthetic Miragem de Amdarais clones this repo owns on purpose, and **55 real
 * monsters** whose stats come from divine-pride instead. 55 of the 64 have RES > 0, which
 * makes them exactly the targets whose numbers get disputed.
 *
 * 20994 Betelgeuse is the one that got disputed, on tracker card `qpFtVdQx1bxY4PTJ3pVS`
 * ("Diferença de dano no Betelgeuse", reportado por Ynk, 21/08/2026). Its block came in
 * from the upstream Thai fork in commit c29084f7 (26/07/2024) and had never been read
 * since. It was checked against https://www.divine-pride.net/database/monster/20994 on
 * 21/08/2026 and **every figure matched** — the record is right; what the report was
 * really seeing is Aliviar, which the boss casts (constants/monster-relieve.ts).
 *
 * This spec exists so that verification is not lost, and so a careless edit or a bad
 * re-scrape of an unmaintainable record fails a test instead of quietly changing damage.
 * Divine-pride's own page prints "500 (-44,44%) Res", the same reduction
 * `res-mres-reduction.spec.ts` pins against bROWiki — two independent sources agreeing on
 * the stat and on what it does with it.
 */

const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));

describe('Betelgeuse (20994) — verified against divine-pride, unmaintainable by the feed', () => {
  const rec = monsters['20994'];

  it('is in the database, on the Torre da Constelação map that groups the picker', () => {
    expect(rec).toBeDefined();
    expect(rec.dbname).toBe('MD_BETELGEUSE');
    expect(rec.spawn).toBe('3@ch_t');
  });

  it('keeps divine-pride\'s stat block — level, HP, DEF/MDEF and the six base stats', () => {
    expect(rec.stats.level).toBe(250);
    expect(rec.stats.health).toBe(2_000_000_000);
    expect(rec.stats.defense).toBe(346);
    expect(rec.stats.magicDefense).toBe(102);
    expect([rec.stats.str, rec.stats.agi, rec.stats.vit]).toEqual([211, 211, 132]);
    expect([rec.stats.int, rec.stats.dex, rec.stats.luk]).toEqual([152, 279, 108]);
  });

  it('keeps RES 500 / RESM 500 — the figures the damage gap was blamed on', () => {
    expect(rec.stats.res).toBe(500);
    expect(rec.stats.mres).toBe(500);
  });

  it('is Grande / Dragão / Neutro 2 and an MVP boss', () => {
    expect(rec.stats.scaleName).toBe('Large');
    expect(rec.stats.raceName).toBe('Dragon');
    expect(rec.stats.elementName).toBe('Neutral 2');
    expect(rec.stats.mvp).toBe(1);
    expect(rec.stats.class).toBe(1);
  });
});

/**
 * A ratchet, not a census: the point is that the set of records the feed cannot maintain
 * only ever shrinks (a client update finally shipping one) or grows *deliberately* (the
 * add-ro-monster skill taking in another divine-pride-only mob). Either way the number
 * here has to be edited by hand, which is the moment to re-read the list.
 *
 * Checking the ids against the live feed would need the network, so this asserts the
 * shape it can see locally — the synthetic clones are all present and accounted for.
 */
describe('the synthetic Miragem de Amdarais targets stay accounted for', () => {
  const SYNTHETIC = [205731, 205732, 205733, 205734, 205735, 205736, 205737, 205738, 205739];

  it('all nine per-level clones exist and differ from mob 20573 only in HP', () => {
    const base = monsters['20573'];
    expect(base).toBeDefined();
    for (const id of SYNTHETIC) {
      const clone = monsters[String(id)];
      expect(clone, `monstro sintético ${id}`).toBeDefined();
      expect(clone.stats.health).not.toBe(base.stats.health);
      expect([clone.stats.defense, clone.stats.res, clone.stats.mres])
        .toEqual([base.stats.defense, base.stats.res, base.stats.mres]);
    }
  });
});
