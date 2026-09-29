import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HpSpTable } from 'src/app/models/hp-sp-table.model';

/**
 * The base HP/SP rows of the seven Expanded 4th classes (tracker card vk17UlVbaGo5GlRMnIxb).
 *
 * Upstream shipped placeholders for these seven — Sky Emperor and Soul Ascetic with one SP
 * value for all 51 levels, Hyper Novice continuing the Super Novice row at +5 HP per level,
 * most below the class they evolve from — and hid the Recursos group for them
 * in production rather than print those numbers. The class wikis do not publish these tables and
 * ragassets has no HP feed, so six rows come from rAthena's per-class formula
 * (`JobDatabase::calc_basehp` / `calc_basesp` in src/map/pc.cpp, factors from
 * db/re/job_stats.yml), special cases included: the mapid bits give Hyper Novice the Super
 * Novice +2000 at 99 and +2000 at 150, Night Watch the Gunslinger SP −18, Shinkiro/Shiranui
 * and the Ninja SP −22. Spirit Handler instead uses a table collected from character
 * screens for levels 201–250 (level 200 extrapolated from the first two rows):
 * https://forum.gamer.com.tw/Co.php?bsn=4212&sn=2896152
 * rAthena's Summoner ×1,5 yielded 50,115 base HP at 240 versus the observed 33,213,
 * making the imported Animist build's HP roughly 74,000 too high.
 *
 * Those six formula-generated rows approximate LATAM, rather than reproduce its exact table.
 * Against the recordings on disk the HP máx.
 * lands +0,5% (Soul Ascetic, soa-exorcismo.rrf) to about +9% (Hyper Novice bare-handed,
 * hn-physical-matrix.rrf) over the status window, and the Hyper Novice SP is further out;
 * the checks use typed VIT/INT, so part of that spread is the stats, not the row. Replace
 * the remaining rows from real status windows when enough of them exist, and update this spec.
 */
const table: HpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));
const row = (cls: string) => table.find((r) => r.jobs[cls])!;

interface Factors { hf: number; hi: number; sf: number; si: number; sn?: boolean; gun?: boolean; nin?: boolean }
const FACTORS: Record<string, Factors> = {
  SkyEmperor: { hf: 72, hi: 6050, sf: 3, si: 469 },
  SoulAscetic: { hf: 94, hi: 1058, sf: 6, si: 400 },
  Shinkiro: { hf: 85, hi: 4496, sf: 3, si: 474, nin: true },
  Shiranui: { hf: 85, hi: 4496, sf: 3, si: 474, nin: true },
  NightWatch: { hf: 66, hi: 5603, sf: 9, si: 16, gun: true },
  HyperNovice: { hf: 38, hi: 5584, sf: 6, si: 40, sn: true },
};

/** rAthena renewal `calc_basehp` / `calc_basesp` for one level. */
function rathena(f: Factors, level: number): [number, number] {
  let hp = 35 + Math.floor((level * f.hi) / 100);
  let sp = 10 + Math.floor((level * f.si) / 100);
  for (let i = 2; i <= level; i++) {
    hp += Math.floor((f.hf / 100) * i + 0.5);
    sp += Math.floor((f.sf / 100) * i + 0.5);
  }
  if (f.sn) hp += (level >= 99 ? 2000 : 0) + (level >= 150 ? 2000 : 0);
  if (f.nin) sp = level >= 10 ? sp - 22 : 11 + 3 * level;
  else if (f.gun) sp = level >= 10 ? sp - 18 : 9 + 3 * level;
  return [hp, sp];
}

describe('Expanded 4th HP/SP rows (hp_sp_table.json)', () => {
  it.each(Object.keys(FACTORS))('%s carries the rAthena curve for every level 200-250', (cls) => {
    const r = row(cls);
    expect(Object.keys(r.baseHp)).toHaveLength(51);
    expect(Object.keys(r.baseSp)).toHaveLength(51);
    for (let level = 200; level <= 250; level++) {
      const [hp, sp] = rathena(FACTORS[cls], level);
      expect(r.baseHp[level], `${cls} HP @${level}`).toBe(hp);
      expect(r.baseSp[level], `${cls} SP @${level}`).toBe(sp);
    }
  });

  it('the special cases the mapid bits imply are in the numbers', () => {
    // Hyper Novice: +4000 over the bare formula (the two Super Novice bonuses).
    expect(row('HyperNovice').baseHp[200]).toBe(22843);
    // Night Watch: SP −18 (Gunslinger); Shinkiro/Shiranui: SP −22 (Ninja).
    expect(row('NightWatch').baseSp[200]).toBe(1834);
    expect(row('Shinkiro').baseSp[200]).toBe(1540);
    expect(row('Shiranui').baseSp[200]).toBe(row('Shinkiro').baseSp[200]);
    // Spirit Handler level 200 is extrapolated from the observed 201–250 rows.
    expect(row('SpiritHandler').baseHp[200]).toBe(27201);
    expect(row('SpiritHandler').baseSp[200]).toBe(1171);
  });

  it.each([
    [201, 27332, 1188],
    [220, 29997, 1546],
    [240, 33213, 2016],
    [250, 35001, 2292],
  ])('uses observed Spirit Handler base HP/SP at level %i', (level, hp, sp) => {
    expect(row('SpiritHandler').baseHp[level]).toBe(hp);
    expect(row('SpiritHandler').baseSp[level]).toBe(sp);
  });

  it.each([
    ['HyperNovice', 'SuperNovice'],
    ['SkyEmperor', 'StarEmperor'],
    ['SoulAscetic', 'SoulReaper'],
    ['Shinkiro', 'Kagerou'],
    ['Shiranui', 'Oboro'],
    ['NightWatch', 'Rebellion'],
  ])('%s at 200 is above %s at 200 — the placeholder rows were below', (cls, parent) => {
    expect(row(cls).baseHp[200]).toBeGreaterThan(row(parent).baseHp[200]);
    expect(row(cls).baseSp[200]).toBeGreaterThan(row(parent).baseSp[200]);
  });

  it.each([...Object.keys(FACTORS), 'SpiritHandler'])('%s grows every level, HP and SP alike', (cls) => {
    const r = row(cls);
    for (let level = 201; level <= 250; level++) {
      expect(r.baseHp[level]).toBeGreaterThan(r.baseHp[level - 1]);
      expect(r.baseSp[level]).toBeGreaterThanOrEqual(r.baseSp[level - 1]);
    }
  });
});
