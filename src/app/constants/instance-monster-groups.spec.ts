import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MonsterGroupNames, getMonsterGroupName, getMonsterSpawnMap } from './monster-spawn-mapper';

/**
 * The three instances added on 19/08/2026 — Queda do Aeroplano, Arena Noturna and Torre da
 * Constelação (bROWiki has a page for each). A monster only reaches the target picker if
 * three things line up: the record is in monster.json, its `spawn` is the instance's map
 * code, and that code has a label in monster-spawn-mapper.ts. Miss the last one and the
 * group header renders as "undefined", which is why the mapper is asserted here too — this
 * is its first coverage.
 *
 * The map codes come from divine-pride's map-specific drop tables (`1@mjo2` is "Mjolnir
 * Mountains Forgotten Cavity", `1@ch_t`/`2@ch_t` are "Constellation Tower"). Arena Noturna
 * publishes none, so it carries the pseudo-code MD_N_ARENA.
 */
const monsters: Record<string, { id: number; dbname: string; spawn: string; stats: Record<string, any> }> = JSON.parse(
  readFileSync('src/assets/demo/data/monster.json', 'utf8'),
);

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Every Torre floor boss the ragassets feed carries, all of them `MD_T_*`. */
const TORRE_FLOOR_BOSSES = [...range(21325, 21332), ...range(21342, 21357), 21359];

const INSTANCES = [
  { label: 'Queda do Aeroplano', spawn: '1@mjo2', ids: range(20886, 20891) },
  { label: 'Arena Noturna', spawn: 'MD_N_ARENA', ids: [...range(20856, 20870), 20872] },
  { label: 'Torre da Constelação', spawn: '1@ch_t', ids: TORRE_FLOOR_BOSSES },
  { label: 'Torre da Constelação', spawn: '2@ch_t', ids: [20996] },
  { label: 'Torre da Constelação', spawn: '3@ch_t', ids: [20994] },
];

describe('the monsters of the three 2026-08 instances', () => {
  for (const { label, spawn, ids } of INSTANCES) {
    it(`puts ${ids.length} monster(s) on ${spawn} under "${label}"`, () => {
      for (const id of ids) {
        const monster = monsters[String(id)];
        expect(monster, `monster ${id} is missing from monster.json`).toBeDefined();
        expect(monster.spawn).toBe(spawn);
      }
      expect(getMonsterSpawnMap(spawn)).toBe(label);
      expect(MonsterGroupNames).toContain(label);
    });
  }

  it('gives the three Torre map codes one shared group', () => {
    expect(MonsterGroupNames.filter((name) => name === 'Torre da Constelação')).toHaveLength(1);
  });

  /*
   * The picker used to send every mvp:1 monster to the catch-all "Boss" group before it
   * looked at the map at all, which emptied an instance's group of the fight people open it
   * for: Torre da Constelação showed 11 of its 27 monsters, and Queda do Aeroplano 5 of 6.
   */
  it('keeps an instance MVP in its own instance group', () => {
    const group = (id: number) => {
      const { spawn, stats } = monsters[String(id)];

      return getMonsterGroupName({ id, spawn, mvp: stats.mvp, class: stats.class });
    };

    expect(group(20891)).toBe('Queda do Aeroplano'); // Criatura Desconhecida, the Aeroplano MVP
    expect(group(20996)).toBe('Torre da Constelação'); // Naght Sieger
    expect(group(20994)).toBe('Torre da Constelação'); // Betelgeuse
    expect(group(21356)).toBe('Torre da Constelação'); // Ifrit da Torre, an MVP of the floors
    expect(group(21325)).toBe('Torre da Constelação'); // Mastering, a non-boss floor monster
  });

  it('still sends the browiki MVP list to its own group, whatever the map says', () => {
    // 20620 Pimentinha is on the browiki list and spawns on a mapped instance map.
    expect(getMonsterGroupName({ id: 20620, spawn: 'amicitia1', mvp: 1, class: 1 })).toBe('MVPs');
    // A boss whose map carries no label still falls back to the catch-all group.
    expect(getMonsterGroupName({ id: 999999, spawn: 'no_such_map', mvp: 1, class: 1 })).toBe(' Boss');
    expect(getMonsterGroupName({ id: 999999, spawn: '', mvp: 0, class: 0 })).toBe('Etc');
  });

  /*
   * The feed grew `res`/`mres` columns after this repo was written, and both the extractor
   * and tools/mob-source.mjs used to hardcode zeros. These monsters are where that showed:
   * the tower halves incoming damage twice over, and importing them at 0/0 would have made
   * every build look far stronger against them than it is.
   */
  it('imports the RES/MRES the feed publishes, not zeros', () => {
    for (const id of TORRE_FLOOR_BOSSES) {
      expect(monsters[String(id)].stats.res, `monster ${id} res`).toBe(300);
      expect(monsters[String(id)].stats.mres, `monster ${id} mres`).toBe(300);
    }
    expect(monsters['20996'].stats.res).toBe(300); // Naght Sieger
    expect(monsters['20996'].stats.mres).toBe(200);
    expect(monsters['20891'].stats.res).toBe(468); // Criatura Desconhecida
    expect(monsters['20891'].stats.mres).toBe(156);
  });

  /* The source spells the Arena opponents' race "Human"; the calc's vocabulary is DemiHuman. */
  it('normalizes the Arena opponents to DemiHuman', () => {
    for (const id of [...range(20856, 20870), 20872]) {
      expect(monsters[String(id)].stats.raceName).toBe('DemiHuman');
    }
  });
});
