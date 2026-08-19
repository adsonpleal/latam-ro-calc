import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { createMainModel } from 'src/app/utils';
import { importReplayBuffer } from 'src/app/replay/replay-to-model';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { SoulAscetic } from './SoulAscetic';

/**
 * Soul Ascetic — Exorcizar Assombração (SOA_EXORCISM_OF_MALICIOUS_SOUL, 5425) against the
 * first replay this class has ever had. Until now `SoulAscetic.characterization.spec.ts`
 * only encoded the Sigma "2nd version" blog; this file is the first time the class meets
 * real packets.
 *
 * Ground truth: `fixtures/soa-exorcismo.rrf`, submitted through "Ajude o simulador" and
 * triaged as card bVCSkxTfvj. "ShaktiBell", Asceta das Almas base 223 / job 40, recorded
 * on tra_fild against "Dummy - Médio" (mob 21065, Formless, Neutral 1, boss, MDEF 0).
 * 14 seconds, five casts, nothing else: cast Convocar Almas Lv5, cast Exorcizar
 * Assombração Lv5, repeat. Five damage packets, all `count = 5`:
 *
 *   2.866.465   2.806.720   2.533.250   2.620.710   2.711.250
 *
 * **What this recording settles.**
 *
 *  1. *The formula in `SoulAscetic.ts` is right.* browiki.org/wiki/Exorcizar_Assombração
 *     publishes it in full — "Dano = {[(Dano base) + (Nv. de Maestria com Almas x 2)] +
 *     FEI} x Almas Ativas x (Nv. de base / 100)" — which is character-for-character what
 *     the class computes, and its 150%/250% per level reproduce the client's own table
 *     (750% / 1.250% at Lv5). Two independent sources, no divergence: the `[V2]` label the
 *     skill still carries is, for this one skill, not a liability. Asserted below.
 *  2. *The cast window is right.* The recording's ZC_USE_SKILL puts the cast at **824 ms**;
 *     the engine computes 824,3 ms from fct 1,5 + vct 3 and this build's reduction. That
 *     also validates the imported build's DEX, INT and every VCT% piece on it — an exact
 *     match no wrong loadout survives.
 *  3. *The traits are consistent.* The sender reported FEI 92 and nothing else, and 92 is
 *     exactly the whole trait budget at base 223 (7 at 200, +3 per level, +4 every 5th).
 *     The recording itself carries none: it never leaves tra_fild, so no ZC_COUPLESTATUS.
 *
 * **What it cannot settle, and why.** This is a 14-second single-state recording. It has
 * no ZC_PAR_CHANGE for any status field — only HP (5), SP (7) and AP (232) — so the §3
 * cross-check that normally proves the build before a formula is read off it is simply not
 * available, and there is no gearless control and no second buff state to separate the
 * stages (§9). Two inputs to the damage are unobservable in it:
 *
 *   - **the soul count.** Convocar Almas "atinge o limite máximo de Almas", and this
 *     character has Perícia com Almas Lv5 → 20 souls. But every packet carries `count = 5`,
 *     while both bROWiki and the client say "o número de golpes é igual ao número de Almas
 *     consumidas". One of the two is wrong and the file cannot say which.
 *   - **the enhanced branch.** The 250%-per-level column applies if the target carries
 *     Assombração or the caster stands in a Totem de Tutela. Neither leaves a trace here:
 *     no ground unit is created during the recording, and the status stream only ever
 *     carries the *player's* own EFSTs, never the dummy's.
 *
 * The matrix of those two is pinned below. Only one cell comes close, and it is the one
 * the plain reading of the file argues against.
 *
 * **Ruled out as the explanation for the gap**, by measurement:
 *   - the souls' own MATK: bROWiki's Coletar Alma says "Cada Alma concede ATQM +3", which
 *     is exactly the `x_matk: lv * 3` the Total Soul dropdown already applies;
 *   - Talismã do Mago (5420 Lv2, EFST 1358, up for the whole recording) — it is missing
 *     from the class, but S.ATQM +4 moves damage +2,8%, i.e. it makes the only near-fitting
 *     cell *worse*, not better;
 *   - the other active EFSTs: 1053/1061 (Coletar Alma and the soul counter), 1356 Talismã
 *     do Protetor and 157 Kaahi (both HP regen — the periodic 10.685 HP heals every 3 s are
 *     Talismã do Protetor), 1059 Espírito do Golem (DEF), and 802/942/983/984/1084/1085,
 *     the play-time and account EXP/drop counters already dismissed in `nw-mastery-gap`;
 *   - Reencarnação das Almas (+7-25% to all damage) and Mandala das Feras (+S.ATQM): both
 *     missing from the class, but neither is in this character's learned tree.
 *
 * **What would close it**: one recording that changes map (for the status window and the
 * traits) and casts the same skill in two states — with and without Totem de Tutela — plus
 * one cast with no weapon. That separates the branch from the soul count in one file.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const FIXTURE = 'soa-exorcismo.rrf';
/** "Dummy - Médio" — all five packets hit this one entity (aid 4378). */
const TARGET = '21065';
const BASE_LEVEL = 223;
const JOB_LEVEL = 40;
const SKILL = 'Exorcism of Malicious Soul==5';
/** Trait budget at base 223 is 92, and the sender allocated all of it to FEI. */
const SPL = 92;
const SOUL_MASTERY = 10;
const TALISMAN_MASTERY = 5;

const replay: any = decodeReplay(loadReplayFixture(FIXTURE));
const imported: any = importReplayBuffer(loadReplayFixture(FIXTURE), items);
const recorded: number[] = (replay.damage ?? []).map((d: any) => d.damage);

/** Full engine run over the imported build, for one (souls, enhanced-branch) pair. */
function sim(souls: number, totem: boolean) {
  const cls: any = new SoulAscetic();
  const passiveLv: Record<string, number> = { 'Soul Mastery': SOUL_MASTERY, 'Talisman Mastery': TALISMAN_MASTERY };
  const activeLv: Record<string, number> = { 'Total Soul': souls, 'Totem of Tutelary': totem ? 1 : 0 };
  const passiveIds = cls._passiveSkillList.map((s: any) => passiveLv[s.name] ?? 0);
  const activeIds = cls._activeSkillList.map((s: any) => activeLv[s.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const bonus = cls.getJobBonusStatus(JOB_LEVEL);
  const model: any = createMainModel();
  // The gear is never retyped: `replayToModel` places all 20 pieces, their cards, enchants
  // and the two random options (see §2b of the review-rrf-class skill).
  Object.assign(model, imported.model);
  model.class = 4303;
  model.level = BASE_LEVEL;
  model.jobLevel = JOB_LEVEL;
  // Session snapshot: the allocated stats, before any job bonus.
  model.str = 1; model.agi = 116; model.vit = 100; model.int = 125; model.dex = 125; model.luk = 1;
  model.pow = 0; model.sta = 0; model.wis = 0; model.spl = SPL; model.con = 0; model.crt = 0;
  model.jobStr = bonus.str; model.jobAgi = bonus.agi; model.jobVit = bonus.vit;
  model.jobInt = bonus.int; model.jobDex = bonus.dex; model.jobLuk = bonus.luk;
  model.jobPow = bonus.pow; model.jobSta = bonus.sta; model.jobWis = bonus.wis;
  model.jobSpl = bonus.spl; model.jobCon = bonus.con; model.jobCrt = bonus.crt;
  model.selectedAtkSkill = SKILL;
  const rawOpts: string[] = imported.model.rawOptionTxts ?? [];
  model.rawOptionTxts = rawOpts;

  const calc: any = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(model);
  new CalculatorController().runChain(calc, {
    monster: monsters[TARGET], equipAtks, masteryAtks,
    buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts(rawOpts),
    activeSkillNames, learnedSkillMap,
    selectedAtkSkill: SKILL, selectedChances: [], usedHpL: false,
  } as any);

  const summary = calc.damageSummary;
  const total: any = calc.getTotalSummary();
  return {
    ratio: summary.baseSkillDamage as number,
    min: summary.skillMinDamageNoCri as number,
    max: summary.skillMaxDamageNoCri as number,
    castMs: Math.round(total.calcSkill.castPeriod * 1000),
    maxHp: total.calc.maxHp as number,
    maxSp: total.calc.maxSp as number,
  };
}

describe('Soul Ascetic — the recording itself', () => {
  it('is five Exorcizar Assombração Lv5 casts on one dummy, each packet 5 hits', () => {
    expect(recorded).toEqual([2866465, 2806720, 2533250, 2620710, 2711250]);
    for (const d of replay.damage) {
      expect(d.skillId).toBe(5425);
      expect(d.skillLevel).toBe(5);
      expect(d.hits).toBe(5);
      expect(d.target).toBe(4378);
    }
  });

  it('gathers souls with Convocar Almas Lv5 before every cast', () => {
    const casts = replay.skillUses.filter((s: any) => s.source === replay.sessionInfo.aid);
    expect(casts.map((s: any) => s.skillId)).toEqual([5421, 5425, 5421, 5425, 5421, 5425, 5421, 5425, 5421, 5425]);
  });

  it('carries no status window at all — only HP, SP and AP', () => {
    const sps = [...new Set(replay.paramChanges.map((p: any) => p.type))] as number[];
    expect(sps.sort((a, b) => a - b)).toEqual([5, 7, 232]);
  });

  it('carries no traits (single map, no ZC_COUPLESTATUS) — FEI 92 comes from the card', () => {
    expect(imported.summary.traits).toBe(null);
  });

  it('imports all 20 equipped pieces, nothing outside item.json', () => {
    expect(imported.summary.equippedCount).toBe(20);
    expect(imported.summary.skippedItems).toEqual([]);
    expect(imported.summary.skippedCards).toBe(0);
  });
});

describe('Soul Ascetic — Exorcizar Assombração, what the recording confirms', () => {
  it('cast window matches the recorded 824 ms exactly', () => {
    const cast = replay.skillCasts.find((c: any) => c.skillId === 5425);
    expect(cast.castMs).toBe(824);
    expect(sim(20, false).castMs).toBe(824);
  });

  // browiki.org/wiki/Exorcizar_Assombração and the client's own per-level table both give
  // 150% per level plain and 250% per level enhanced; nv. de base, Maestria com Almas x2
  // and FEI enter as the wiki's formula writes them.
  it('plain branch: (150 x nv + Maestria x 2 + FEI) x Almas x nv. base/100', () => {
    // (150x5 + 10x2 + FEI 111) x 20 x 2,23
    expect(sim(20, false).ratio).toBe(39292);
    expect(sim(5, false).ratio).toBe(9823);
  });

  it('enhanced branch (Assombração / Totem de Tutela): the 150 becomes 250', () => {
    // (250x5 + 10x2 + FEI 111) x 20 x 2,23
    expect(sim(20, true).ratio).toBe(61592);
    expect(sim(5, true).ratio).toBe(15398);
  });
});

describe('Soul Ascetic — Exorcizar Assombração, the open residual', () => {
  const lo = Math.min(...recorded);
  const hi = Math.max(...recorded);

  /**
   * The four cells of (souls, branch). A cell "fits" only if its simulated range brackets
   * every recorded packet — the engine's min/max are the MATK roll's own bounds, so a
   * packet outside them is impossible, not merely unlikely.
   *
   * Measured, with the build exactly as imported:
   *
   *   souls  branch     simulated range            vs recording
   *    5     plain        397.135 -   454.255      6,3x too low
   *    5     enhanced     622.545 -   712.075      4,0x too low
   *   20     plain      1.643.885 - 1.871.725      1,53x too low
   *   20     enhanced   2.576.885 - 2.934.030      floor 1,7% above the lowest packet
   *
   * Only the last is even the right size, and it still does not contain the recording: the
   * smallest packet, 2.533.250, sits 1,7% below a floor the engine says is unreachable.
   * Adding the missing Talismã do Mago (S.ATQM +4) widens the miss to 4,6%, so the gap is
   * not that skill either. Something worth ~2% of magic damage is unaccounted for, on top
   * of a premise — that the enhanced branch was live — the file cannot corroborate.
   */
  it('20 souls, plain branch: the sim is 1,53x low', () => {
    const r = sim(20, false);
    expect(r.min).toBe(1643885);
    expect(r.max).toBe(1871725);
    expect(hi / r.max).toBeCloseTo(1.531, 3);
  });

  it('20 souls, enhanced branch: right size, floor still 1,7% above the lowest packet', () => {
    const r = sim(20, true);
    expect(r.min).toBe(2576885);
    expect(r.max).toBe(2934030);
    expect(r.max).toBeGreaterThan(hi);
    expect(r.min).toBeGreaterThan(lo);
    expect(r.min / lo).toBeCloseTo(1.017, 3);
  });

  it('5 souls — what the packet count says — is nowhere near, on either branch', () => {
    expect(hi / sim(5, false).max).toBeCloseTo(6.31, 2);
    expect(hi / sim(5, true).max).toBeCloseTo(4.03, 2);
  });
});

describe('Soul Ascetic — HP/SP table is wrong (hp_sp_table.json row 56)', () => {
  /**
   * Nothing above depends on this, and the recording proves it on its own: the character
   * sits at 60.398 HP for the whole file (Talismã do Protetor tops it up every 3 s and the
   * value repeats exactly, so it is the cap) with SP peaking at 6.416. The engine says
   * 28.106 and 2.864.
   *
   * The table row is the culprit, and it is wrong on its face — no replay needed:
   *
   *   SoulAscetic   baseHp@200  9.805   @250 12.555   baseSp  900 at *every* level 200-250
   *   SoulReaper    baseHp@200 20.752                          (its own 3rd job)
   *   ArchMage      baseHp@200 20.446   @250 31.274            (the lowest-HP 4th job)
   *
   * A 4th job with less than half its 3rd job's HP is not a curve, and a flat 900 SP across
   * 51 levels is a placeholder — 900 is exactly SoulLinker's max SP at level 99. Fitting the
   * recording puts baseHp@223 near 25.600 (25.000 gives 58.967, 26.000 gives 61.183) and
   * baseSp@223 near 2.300, i.e. squarely in ArchMage territory, which is where a Soul
   * Ascetic belongs.
   *
   * The whole 200-250 curve is not derivable from one data point and ragassets publishes no
   * HP/SP table, so this pins the broken values rather than inventing replacements. Fix the
   * row from a real source and these two numbers change — that is the point.
   */
  it('the recording holds HP 60.398 and SP 6.416 at base 223', () => {
    // ZC_PAR_CHANGE values arrive as BigInt.
    const hp = replay.paramChanges.filter((p: any) => p.type === 5).map((p: any) => Number(p.value));
    const sp = replay.paramChanges.filter((p: any) => p.type === 7).map((p: any) => Number(p.value));
    expect(Math.max(...hp)).toBe(60398);
    expect(Math.max(...sp)).toBe(6416);
  });

  it('the engine gets 28.106 HP and 2.864 SP — less than half', () => {
    const r = sim(20, false);
    expect(r.maxHp).toBe(28106);
    expect(r.maxSp).toBe(2864);
  });

  it('the row itself is below the class it evolves from', () => {
    expect(hpSpTable['56'].jobs).toEqual({ SoulAscetic: true });
    expect(hpSpTable['56'].baseHp['200']).toBe(9805);
    expect(hpSpTable['54'].jobs).toEqual({ SoulReaper: true, BabySoulReaper: true });
    expect(hpSpTable['54'].baseHp['200']).toBe(20752);
    // baseSp never moves across the whole 4th-job range.
    expect(new Set(Object.values(hpSpTable['56'].baseSp))).toEqual(new Set([900]));
  });
});
