import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { ShadowCross } from './ShadowCross';

/**
 * `sc-shadow-scar-stacks.rrf` — "lHidanl", Executor base 240 / job 50, on tra_fild against a
 * Dummy - Grande, 25/08/2026. Tracker card 5tGJSGaNWg. Talentos POD 100 / CRV 59, typed into
 * the submission dialog by the recorder (the file never changes map, so it carries no
 * `ZC_COUPLESTATUS` of its own).
 *
 * **This is the recording that caught Profanação doing nothing.** The buffs are EDP,
 * Envenenar Arma, a Poção do Despertar and Profanar Arma (EFST 1226) — and its 18 Lâminas
 * Retalhadoras packets do not sit still. They open at 37,0 M and climb to a plateau around
 * 43-47 M, which is the shape of a debuff stacking up on the target, not of a damage roll.
 *
 * The engine had no way to produce that climb: `ShadowCross` emitted the stacks as a
 * `meleeReduction` bonus, and **nothing in the codebase read that key** — the 20-stack picker
 * moved no number at all. So 12 of these 18 packets sat above the simulated ceiling with
 * nothing to attribute them to. Profanação now goes through `shadowScar` and the target's
 * damage-taken stage, at the 3% per stack bROWiki documents
 * (https://browiki.org/wiki/Profanar_Arma), matching rAthena's
 * `damage += damage * (3 * val1) / 100`.
 *
 * What this file can pin is the **bracket**, not a per-packet stack count: the recording does
 * not say how many stacks were up at any given cast, and the target's own status events are
 * not in the stream. So the assertion is that the whole window lives inside 0..6 stacks and
 * *opens* at 0 — which is the part that would break if the per-stack value were wrong, and
 * which no longer holds the moment the key stops being read.
 *
 * Six stacks after ~10 seconds is what Profanar Arma Lv5 should give: a 5% chance per attack,
 * with each stack expiring on its own 15 s timer, is nowhere near the 20 cap.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const CROSS_IMPACT = 2022;
const DUMMY_GRANDE = '21066';
/** Read off the tracker card — the file itself carries no ZC_COUPLESTATUS. */
const TALENTOS = { pow: 100, sta: 0, wis: 0, spl: 0, con: 0, crt: 59 };

const replay: any = decodeReplay(loadReplayFixture('sc-shadow-scar-stacks.rrf'));
const aid = replay.sessionInfo.aid;
const packets = (replay.damage ?? []).filter((d: any) => d.source === aid && d.skillId === CROSS_IMPACT);

/** The build, with `stacks` of Profanação on the target. */
function sim(stacks: number) {
  const m = replayToModel(replay, items).model as any;
  Object.assign(m, TALENTOS);
  const cls: any = new ShadowCross();
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
  // EDP is on for the whole file (EFST 114 from 5.652 ms); 'Shadow Wound' is the picker for
  // Profanar Arma's stacks — its `name` is the catalog's alias for skill 5293.
  const actives: Record<string, number> = { 'Enchant Deadly Poison': 1, 'Shadow Wound': stacks };
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const value = 'Cross Impact==5';
  m.selectedAtkSkill = value;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_GRANDE], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  return { min: Math.round(ds.skillMinDamage), max: Math.round(ds.skillMaxDamage) };
}

describe('Executor — Profanação acumulando na gravação (5tGJSGaNWg)', () => {
  it('has Profanar Arma up, and damage that climbs rather than settling', () => {
    const on = new Set<number>();
    for (const s of replay.statusEvents ?? []) {
      if (s.aid !== aid) continue;
      s.isOn ? on.add(s.statusId) : on.delete(s.statusId);
    }
    expect(on.has(1226)).toBe(true); // EFST_SHADOW_WEAPON — Profanar Arma
    expect(on.has(114)).toBe(true); // EFST_EDP

    const valores = packets.map((d: any) => d.damage);
    expect(valores.length).toBe(18);
    // The first cast is the smallest in the file: nothing has landed on the target yet.
    expect(valores[0]).toBe(Math.min(...valores));
    // And the spread is far wider than one damage roll — 27% from first to largest.
    expect(Math.max(...valores) / valores[0]).toBeGreaterThan(1.25);
  });

  /**
   * The regression guard proper. Before the fix every one of these rows was identical, so a
   * broken `shadowScar` key shows up here as `0` and `20` bracketing the same range.
   */
  it('moves the damage by 3% per stack, up to 60% at 20', () => {
    const zero = sim(0);
    for (const stacks of [1, 6, 20]) {
      const s = sim(stacks);
      expect(s.max / zero.max).toBeCloseTo(1 + 0.03 * stacks, 6);
    }
  });

  /**
   * The whole recorded window sits inside 0..6 stacks, and opens exactly at 0. The upper
   * bound is what fails if the per-stack value is too small; the opening packet is what fails
   * if it is too large, or if the build underneath is wrong.
   */
  it('brackets the recorded window between 0 and 6 stacks', () => {
    const valores = packets.map((d: any) => d.damage);
    const zero = sim(0);
    const seis = sim(6);

    // Every packet is a critical: the non-crit ceiling is nowhere near these numbers.
    expect(Math.min(...valores)).toBeGreaterThanOrEqual(zero.min);
    expect(Math.max(...valores)).toBeLessThanOrEqual(seis.max);
    // The opening cast lands in the 0-stack range, before anything has been applied.
    expect(valores[0]).toBeLessThanOrEqual(zero.max);
    // Nowhere near the 20-stack cap, which is what a 5%-per-attack proc over ~10 s predicts.
    expect(Math.max(...valores)).toBeLessThan(sim(10).min);
  });
});
