import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { SkyEmperor } from './SkyEmperor';

/**
 * `se-basic-crit-kihop.rrf` — "Hit-Girl", Mestre Celestial base 230 / job 47 on tra_fild,
 * 20/08/2026. Tracker card kxwDtYXuhh, submitted anonymously. Traits read off the file
 * (POD 100, CRV 21 — a map change at 12,8 s carries ZC_COUPLESTATUS and the whole status
 * window, item by item).
 *
 * Nine basic attacks on the Dummy - Pequeno with a Livro Malevolente +7, every one a
 * critical and every one 23.437. No buff at all: the only statuses on the recorder are
 * the two permanent Moon icons (EFST 1007 `MOON_PLACE`, 1010 `MOON_MONSTER`) — the
 * character has a lunar map and a lunar target designated, and no solar one.
 *
 * What the file settled:
 *
 *  - **Kihop reaches the critical.** The class ATK adjustment (`modifyFinalAtk`: Kihop
 *    Nv5 is ×1,85 on the whole ATK) was applied to the basic attack's min/max since
 *    SkyEmperor.firmamento.spec.ts, but not to the critical, which is the same attack on
 *    the max ATK. The engine answered 11.914 for a packet the game prints at 23.437 —
 *    the crit of an ATK Kihop had never multiplied, to within two units of floor order.
 *  - **Espada Mágica de Thanatos's record was four lines short.** The window at the map
 *    change reads P.ATQ 67 and S.ATQM 19 (the engine had 62 and 14: "Nv. base 230:
 *    P.ATQ e S.ATQM +5") and the last accessory to load adds ATQ +50 and ATQM +50 to
 *    ATQ Equip. 404 → 454 ("Conjunto [Pingente da Força Física]: ATQ e ATQM +50"). Both
 *    are on the garment's own pt-BR text; the record carried only the refine lines and
 *    the Marionete's cast-time bonus. The size, penetration and the remaining set lines
 *    were filled in from the same text, unmeasured here (the dummy is Small).
 *  - **Fúria Solar does not fire on a Small target the character never designated.**
 *    With the Wrath switched on the engine would print 61.764 — 2,6× the packet. The
 *    Moon icons and the size gate in StarEmperor.resolveWrath agree: only a target
 *    aligned by Oposição pays, and this one is not.
 *
 * The 2-unit residual (23.439 simulated) is floor order inside the critical chain and
 * is asserted as such, not hidden in a tolerance wider than that.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_PEQUENO = '21064';
const THANATOS_SWORD = 480136;
const RED_FORCE_PENDANT = 490100;
const MAP_CHANGE = 12_944;

const replay: any = decodeReplay(loadReplayFixture('se-basic-crit-kihop.rrf'));
const aid = replay.sessionInfo.aid;

function sim(opts: { actives?: Record<string, number>; db?: any } = {}) {
  const db = opts.db ?? items;
  const m: any = replayToModel(replay, db).model;
  const cls: any = new SkyEmperor();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  const learned: Record<number, number> = {};
  for (const [id, lv] of replay.learnedSkills) learned[id] = lv;
  const passiveIds = cls.passiveSkills.map((p: any) => {
    const sid = SKILL_ID_BY_NAME[p.name];
    return sid ? learned[sid] ?? 0 : 0;
  });
  const actives = opts.actives ?? {};
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();
  const skill = 'Solar Burst==5'; // any skill: only the basic attack is read
  m.selectedAtkSkill = skill;
  const calc = new Calculator().setMasterItems(db).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_PEQUENO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: m.aspdPotion,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skill, selectedChances: [], usedHpL: false,
  } as any);
  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  const st: any = (calc as any).dmgCalculator.status;
  return {
    kihopLv: cls.learnLv('Power') as number,
    window: { 41: tot.calc.totalStatusAtk, 42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk, 49: tot.calc.totalHit, 50: tot.calc.totalFlee, 52: tot.calc.totalCri, 225: ds.pAtk, 226: ds.sMatk } as Record<number, number>,
    couple: { 13: st.totalStr, 14: st.totalAgi, 15: st.totalVit, 16: st.totalInt, 17: st.totalDex, 18: st.totalLuk, 219: st.totalPow, 220: st.totalSta, 221: st.totalWis, 222: st.totalSpl, 223: st.totalCon, 224: st.totalCrt } as Record<number, number>,
    crit: [ds.criMinDamage, ds.criMaxDamage] as [number, number],
    basic: [ds.basicMinDamage, ds.basicMaxDamage] as [number, number],
  };
}

const packets = () =>
  (replay.damage ?? [])
    .filter((d: any) => d.source === aid && !d.skillId && replay.entities.get(d.target)?.view === Number(DUMMY_PEQUENO))
    .map((d: any) => d.damage as number);

function windowAt(sp: number, t: number): number {
  const seen = (replay.paramChanges ?? []).filter((p: any) => p.type === sp && p.time <= t);
  return Number(seen[seen.length - 1].value);
}

describe('Mestre Celestial — nine basic crits under Kihop, no other buff (kxwDtYXuhh)', () => {
  it('imports the build with the traits the map change carried, and no buff but the Moon icons', () => {
    const { summary }: any = replayToModel(replay, items);
    expect(summary.equippedCount).toBe(18);
    expect(summary.skippedItems).toEqual([]);
    expect(summary.traits).toEqual({ pow: 100, sta: 0, wis: 0, spl: 0, con: 0, crt: 21 });
    // 46 POSTDELAY, 802/942/993/994/1084/1085/1312 RODEX, EXP and DROP counters: bookkeeping.
    const NOISE = new Set([46, 622, 673, 695, 802, 942, 983, 984, 987, 993, 994, 1084, 1085, 1312]);
    const mine = [...new Set((replay.statusEvents ?? []).filter((s: any) => s.aid === aid).map((s: any) => s.statusId))].filter((id: number) => !NOISE.has(id)).sort();
    expect(mine).toEqual([1007, 1010]); // MOON_PLACE, MOON_MONSTER — no SUN_MONSTER (1009)
    expect(sim().kihopLv).toBe(5);
  });

  it('reproduces the status window at the map change, seven fields', () => {
    const r = sim();
    let compared = 0;
    for (const sp of [41, 42, 49, 50, 52, 225, 226]) {
      expect(r.window[sp], `SP ${sp}`).toBe(windowAt(sp, MAP_CHANGE));
      compared++;
    }
    expect(compared).toBe(7);
  });

  it('reproduces all twelve ZC_COUPLESTATUS columns', () => {
    const r = sim();
    const last = new Map<number, number>();
    for (const c of (replay.coupleStatus ?? []).filter((x: any) => x.time <= MAP_CHANGE)) last.set(c.statusId, c.base + c.plus);
    expect(last.size).toBe(12);
    for (const [sp, v] of last) expect(r.couple[sp], `SP ${sp}`).toBe(v);
  });

  it('lands the nine identical crits on 23.437 once Kihop multiplies the critical too', () => {
    const rec = packets();
    expect(rec).toHaveLength(9);
    expect(new Set(rec)).toEqual(new Set([23_437]));
    const [min, max] = sim().crit;
    expect(min).toBe(max); // DEX 131 on a level-5 book: no weapon variance left
    // Two units of floor order inside the critical chain, no more.
    expect(Math.abs(max - 23_437)).toBeLessThanOrEqual(2);
    // And the crit is the ×1,85 of the same attack's non-crit max, not a number of its own.
    const [, basicMax] = sim().basic;
    expect(max / basicMax).toBeGreaterThan(2.4); // ×1,70 crit damage × 1,49 crit multiplier, on ATK already ×1,85
  });

  it('would print 2,6× the packet with Fúria Solar on: the Small dummy was never aligned', () => {
    const [, wrath] = sim({ actives: { 'Wrath of Sun': 3 } }).crit;
    expect(wrath / 23_437).toBeGreaterThan(2.5);
  });

  it('needs the four Espada Mágica de Thanatos lines the window pointed at', () => {
    // Without the level-gated P.ATQ/S.ATQM and the Pingente set, the window is 5 and 50 short.
    const bare = { ...items, [THANATOS_SWORD]: { ...items[THANATOS_SWORD], script: { range: ['3---2'], melee: ['3---2'], m_my_element_all: ['3---2'], vct: ['EQUIP_ID[400023]10'] } } };
    const r = sim({ db: bare });
    expect(r.window[225]).toBe(62);
    expect(r.window[226]).toBe(14);
    expect(r.window[42]).toBe(404);
    expect(items[THANATOS_SWORD].script.pAtk).toEqual(['LEVEL[210]3', 'LEVEL[230]2']);
    expect(items[THANATOS_SWORD].script.atk).toEqual([`EQUIP_ID[${RED_FORCE_PENDANT}||490101]50`]);
  });
});
