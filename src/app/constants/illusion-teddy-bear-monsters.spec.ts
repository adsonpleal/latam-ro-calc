import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MonsterGroupNames, getMonsterGroupName, getMonsterSpawnMap } from './monster-spawn-mapper';

/**
 * Ilusão do Ursinho (ein_d02_i), reported as missing from the target picker on the issue
 * tracker (card tGdUEn4M4zaPvFwRris1). The eight regular monsters of the map had no record
 * in monster.json at all; only the MVP, Ursinho Brilhante, was there, and only because its
 * id is on the browiki MVP list — its own `spawn` was empty.
 *
 * Stats come from the ragassets feed and were cross-checked against the divine-pride pages
 * (https://www.divine-pride.net/database/map/ein_d02_i/); the map code and the pt-BR names
 * against https://browiki.org/wiki/Ilusão_do_Ursinho. Note that DP's map listing renders the
 * element one level higher than the monster's own page — the feed agrees with the latter.
 */
const monsters: Record<string, { id: number; dbname: string; spawn: string; stats: Record<string, any> }> = JSON.parse(
  readFileSync('src/assets/demo/data/monster.json', 'utf8'),
);

const SPAWN = 'ein_d02_i';
const LABEL = '150 - 165 ein_d02_i';

/** The five bears, the miners, the soul fragment and the obsidian — every regular spawn. */
const REGULARS = [
  { id: 20255, dbname: 'ILL_TEDDY_BEAR_R', level: 160, element: 'Fire 1', race: 'Formless', scale: 'Small' },
  { id: 20256, dbname: 'ILL_TEDDY_BEAR_Y', level: 160, element: 'Wind 1', race: 'Formless', scale: 'Small' },
  { id: 20257, dbname: 'ILL_TEDDY_BEAR_G', level: 162, element: 'Poison 1', race: 'Formless', scale: 'Small' },
  { id: 20258, dbname: 'ILL_TEDDY_BEAR_W', level: 160, element: 'Neutral 1', race: 'Formless', scale: 'Small' },
  { id: 20259, dbname: 'ILL_TEDDY_BEAR_B', level: 157, element: 'Water 1', race: 'Formless', scale: 'Small' },
  { id: 20261, dbname: 'ILL_PITMAN', level: 159, element: 'Earth 2', race: 'Demon', scale: 'Large' },
  { id: 20262, dbname: 'ILL_MINERAL', level: 158, element: 'Neutral 2', race: 'Formless', scale: 'Small' },
  { id: 20263, dbname: 'ILL_OBSIDIAN', level: 161, element: 'Earth 2', race: 'Formless', scale: 'Small' },
];

/** Ursinho Brilhante, summoned by a server-wide kill count, and on the browiki MVP list. */
const MVP_ID = 20260;

const group = (id: number) => {
  const { spawn, stats } = monsters[String(id)];

  return getMonsterGroupName({ id, spawn, mvp: stats.mvp, class: stats.class });
};

describe('the monsters of Ilusão do Ursinho', () => {
  it(`puts the ${REGULARS.length} regular monsters on ${SPAWN}`, () => {
    for (const { id, dbname } of REGULARS) {
      const monster = monsters[String(id)];
      expect(monster, `monster ${id} is missing from monster.json`).toBeDefined();
      expect(monster.dbname, `monster ${id} dbname`).toBe(dbname);
      expect(monster.spawn, `monster ${id} spawn`).toBe(SPAWN);
    }
  });

  it('gives that map code a label, so the group header is not "undefined"', () => {
    expect(getMonsterSpawnMap(SPAWN)).toBe(LABEL);
    expect(MonsterGroupNames).toContain(LABEL);
  });

  it('sends every regular monster of the map to that group', () => {
    for (const { id } of REGULARS) expect(group(id), `monster ${id}`).toBe(LABEL);
  });

  /*
   * The picker's three stats are read as English name strings, not as the numeric codes
   * (see Monster.setData) — a wrong vocabulary word costs the element/race/size multiplier
   * silently. The feed spells the bears' race "fantasma", normalized to Formless on import.
   */
  it('imports the level and the element/race/size vocabulary the calc reads', () => {
    for (const { id, level, element, race, scale } of REGULARS) {
      const { stats } = monsters[String(id)];
      expect(stats.level, `monster ${id} level`).toBe(level);
      expect(stats.elementName, `monster ${id} element`).toBe(element);
      expect(stats.raceName, `monster ${id} race`).toBe(race);
      expect(stats.scaleName, `monster ${id} size`).toBe(scale);
    }
  });

  /* Zero here is the feed's own value, matching divine-pride — not a missing column. */
  it('keeps RES/MRES at the zero the feed publishes', () => {
    for (const { id } of REGULARS) {
      expect(monsters[String(id)].stats.res, `monster ${id} res`).toBe(0);
      expect(monsters[String(id)].stats.mres, `monster ${id} mres`).toBe(0);
    }
  });

  it('carries the map code on the MVP too, and still groups it with the browiki MVPs', () => {
    expect(monsters[String(MVP_ID)].spawn).toBe(SPAWN);
    expect(group(MVP_ID)).toBe('MVPs');
  });

  it('leaves nothing of the map in the catch-all groups', () => {
    for (const { id } of REGULARS) {
      expect(group(id)).not.toBe('Etc');
      expect(group(id)).not.toBe(' Boss');
    }
  });
});
