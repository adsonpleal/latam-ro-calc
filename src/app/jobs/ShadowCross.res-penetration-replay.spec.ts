import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { ElementType } from 'src/app/constants';
import { JobBuffs } from 'src/app/constants/job-buffs';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController, collectBuffBonuses, collectConsumables } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { ShadowCross } from './ShadowCross';

/**
 * RES against a real target — two recordings by Ynk (Executor 239/50, POD 100 / CRV 52),
 * 17/09/2026, Lâminas Retalhadoras Nv5 on Quimera Lava (20920: RES 471, Pequeno, Amorfo,
 * Fogo 3) in amicitia2. Until these, every fixture hit a dummy with RES 0.
 *
 *   sc-res-penetration-telum.rrf   01:10  1.622 ms  54.565.938  Argutus Telum (25%)
 *                                         8.764 ms  61.460.805  + Adulterar Veneno Nv10 (30%)
 *   sc-res-penetration-party.rrf   02:48    674 ms  31.838.597  no penetration, Sinfonia dos Ventos
 *                                         3.786 ms  35.099.351  Adulterar Veneno Nv10 (30%)
 *
 * Every packet is a critical (skill crit rate ≥ 125%), so each one is a single number.
 *
 * **What the telum file settles.** Between its two casts only the penetration changes:
 * same gear, same buffs (Profanar Arma is switched on in between, but a stack would move the
 * second packet by 3%, and the ratio is exact to the ppm), same monster type. So the ratio of
 * the two packets is the ratio of two RES multipliers and nothing else, and it fixes three
 * things at once:
 *
 *  - **penetration is clamped at 50%**: 25 + 30 unclamped predicts 1,1570, recorded 1,1264;
 *  - **the remaining RES is truncated** before the formula — 471 × 0,75 → 353 and
 *    471 × 0,5 → 235 predict 1,1263590 against a recorded 1,1263584, while the fractional
 *    353,25 / 235,5 the engine used to carry predict 1,1259787, 340 ppm off;
 *  - **bROWiki's curve**, `1 − 0,8·r/(r + 400)`, and Quimera Lava's RES 471 — scanning RES
 *    300-700 under truncation, 471 is the best fit.
 *
 * **The party file only corroborates.** Its first cast still had Sinfonia dos Ventos, which
 * ended at 1.050 ms, so the pair differs by the song as well as by the penetration. rAthena
 * prices the song at 4 + 3×5 + Domínio Musical + nível de classe ÷ 5 = 39 ATQ at the maxima,
 * and the packets want ~44: the pair is consistent with the curve, but the song's exact value
 * is not in the file and moves the ratio by ~500 ppm per point, so it cannot choose between
 * truncated and fractional RES.
 *
 * **The build.** Gear comes from the importer; the talents from the party file's
 * ZC_COUPLESTATUS (the telum file, one map, carries none — same values, same night). The
 * buffs are the recorder's own EFSTs, filtered by aid:
 *
 *  - Bênção, Aumentar Agilidade, Impositio Manus (telum file only), Argutus Telum;
 *  - Encantar com Veneno Mortal, Aplicar Toxina, Envenenar Arma (the endow);
 *  - EFST 271-276, the stat foods. The icon is the same whatever the dish, and only the
 *    strongest one per stat counts (Bolinho Divino's +10 included, EFST 685, which also
 *    gives ATQ +30), so the level per stat was fitted to the status window: FOR +15,
 *    AGI +20, VIT +10, INT +15, DES +20, SOR +20. That set closes HP máx., ATQ, DEF, DEFM,
 *    Precisão and Esquiva to within 3 — HP only with the Bolsa do Baby Shark at +20 HP per
 *    base level, which is what fixed that record (it read +2);
 *  - Estimulante (102803), Suco Celular Enriquecido (12437).
 *
 * Two **"[Durante o Evento]"** blocks were live that night: the [Visual] Cabeça do Baby Shark
 * worn in both files (ATQ +50, CRIT +10, tamanhos +10%) and the Carta Baby Shark in the telum
 * file's Casaco Pirata (tamanhos +10%, raças +10%). The status window proves the head was on —
 * ATQ Equip. reads 1.250, which the engine reaches only with those 50. They are gated to the
 * event's dates (baby-shark-event-bonus.spec.ts), so the calculator's clock is pinned to the
 * moment each file was recorded; without that the fixtures would lose them on 12/10/2026.
 *
 * Which toxin Aplicar Toxina carried is not in the file either (EFST 341 is the same for all
 * of them). **Cogumelo Mágico** is the one that fits: with it and the EDP element fix (see
 * `ShadowCross.edp-element-replay.spec.ts`, from a later recording of the same character on
 * the same monster) the telum file lands 0,06% from the recording and the party file 0,9%.
 * Pirexia would put both about 3% over. The same choice was made for `gc-cross-impact-gear-
 * states.rrf` on its own evidence.
 *
 * **Ruled out while chasing that gap.** EFST 131 is EDP's pseudo-poison weapon ATQ, already
 * in `getWeaponAtk`. The Casaco Pirata's pt-BR "Grau D: T.CRIT +3" reads like a script bug
 * (the record grants CRV +3), but the Betelgeuse recording of the same character wears the
 * coat at grade A and its status window reads T.CRÍT 33 without Estimulante and 35 with it —
 * exactly the CRV reading; T.CRIT +3 would give 35 and 37. The English source says "CRT + 3"
 * too, so the pt-BR text is the mistranslation and the record stays.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const QUIMERA_LAVA = '20920';
const TELUM_FILE = 'sc-res-penetration-telum.rrf';
const PARTY_FILE = 'sc-res-penetration-party.rrf';

/** Bolinho Divino's ATQ; its stats do not stack with the stat foods that are also up. */
const BOLINHO_DIVINO_ATK = { atk: 30 };

/** EFST 271-276: the strongest dish per stat, fitted to the status window (see above). */
const STAT_FOODS = { str: 15, agi: 20, vit: 10, int: 15, dex: 20, luk: 20 };

const TALENTS = { pow: 100, sta: 0, wis: 0, spl: 0, con: 0, crt: 52 };

interface State {
  file: string;
  t: number;
  buffs?: Record<string, number>;
  actives?: Record<string, number>;
  extra?: Record<string, number>[];
}

function simulate(state: State) {
  const replay: any = decodeReplay(loadReplayFixture(state.file));
  const inv = new Map<any, any>([...replay.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...(r.cards ?? [])] }]));
  for (const e of replay.equipChanges ?? []) {
    if (e.time > state.t) break;
    const rec = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
    inv.set(e.slot, {
      ...rec, itemId: e.itemId, refine: e.refine, grade: e.grade, cards: [...(e.cards ?? [])],
      options: e.options?.length ? e.options : rec.options ?? [], equipped: e.equipped ? e.location : 0,
    });
  }
  const m: any = replayToModel({ ...replay, initialInventory: inv }, items).model;
  Object.assign(m, TALENTS);
  m.class = 4254;
  m.propertyAtk = ElementType.Poison;
  m.consumables = [102803, 12437];
  m.selectedAtkSkill = 'Cross Impact==5';

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
  // Aplicar Toxina value 2 is Cogumelo Mágico — see the header.
  const actives = { 'Enchant Deadly Poison': 1, 'Poisonous Weapon': 2, ...state.actives };
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const buffs = { Clementia: 10, Cantocandidus: 10, ...state.buffs };
  const { equipAtk: buffEquips, masteryAtk: buffMasterys }: any = collectBuffBonuses(
    JobBuffs as any,
    JobBuffs.map((x: any) => buffs[x.name] ?? 0),
    activeSkillNames,
  );

  // The Baby Shark event bonuses are dated; judge them on the night of the recording.
  const recordedAt = new Date(replay.sessionInfo.recordedAt);
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls).setClock(() => recordedAt);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[QUIMERA_LAVA], equipAtks, masteryAtks, buffEquips, buffMasterys,
    consumeData: collectConsumables(m, items).scripts, aspdPotion: m.aspdPotion,
    extraOptionScripts: [
      ...parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
      BOLINHO_DIVINO_ATK, STAT_FOODS, ...(state.extra ?? []),
    ],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: m.selectedAtkSkill, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const c: any = calc.getTotalSummary().calc;
  const nodes: any[] = ds.skillFormulaGraph?.max?.nodes ?? [];
  const traits = (calc as any).dmgCalculator.traitBonus;
  return {
    replay,
    critRate: ds.skillCriRateToMonster as number,
    crit: ds.skillMaxDamage as number,
    critMin: ds.skillMinDamage as number,
    restRes: nodes.find((n) => n.id === 'restRes')?.value as number,
    window: { 6: c.maxHp, 41: c.totalStatusAtk, 45: c.softDef, 47: c.softMdef, 49: c.totalHit, 50: c.totalFlee, 225: traits.pAtk, 227: c.res, 228: c.mres, 230: traits.cRate } as Record<number, number>,
    atkEquip: calc.getTotalSummary().weapon.baseWeaponAtk + calc.getTotalSummary().weapon.refineBonus + c.totalEquipAtk,
  };
}

const TELUM_ONLY: State = { file: TELUM_FILE, t: 1622, buffs: { 'Argutus Telum': 5, 'Impositio Manus': 5 } };
const TELUM_AND_VENOM: State = { ...TELUM_ONLY, t: 8764, actives: { 'Potent Venom': 10 } };

/** bROWiki's sentence, transcribed — the fraction of damage that survives RES. */
const browiki = (res: number) => 1 - (0.8 * res) / (res + 400);

describe('RES recordings — what the files carry', () => {
  it('the party file carries the talents; the single-map telum file carries none', () => {
    expect(decodeReplay(loadReplayFixture(PARTY_FILE)).traits).toMatchObject({ pow: 100, crt: 52 });
    expect(Object.keys((decodeReplay(loadReplayFixture(TELUM_FILE)) as any).traits ?? {})).toHaveLength(0);
  });

  it('each file has exactly the two Lâminas Retalhadoras packets from the recorder, on Quimera Lava', () => {
    for (const [file, expected] of [
      [TELUM_FILE, [54565938, 61460805]],
      [PARTY_FILE, [31838597, 35099351]],
    ] as const) {
      const replay: any = decodeReplay(loadReplayFixture(file));
      const me = replay.sessionInfo.aid;
      const packets = replay.damage.filter((d: any) => d.source === me && d.skillId === 2022);
      expect(packets.map((d: any) => Number(d.damage))).toEqual(expected);
      for (const d of packets) expect(replay.entities.get(d.target)?.view).toBe(20920);
    }
  });

  it('Adulterar Veneno (EFST 1194) switches on between the two casts, in both files', () => {
    for (const [file, first, second] of [[TELUM_FILE, 1622, 8764], [PARTY_FILE, 674, 3786]] as const) {
      const replay: any = decodeReplay(loadReplayFixture(file));
      const on = replay.statusEvents.find((s: any) => s.aid === replay.sessionInfo.aid && s.statusId === 1194 && s.isOn).time;
      expect(on).toBeGreaterThan(first);
      expect(on).toBeLessThan(second);
    }
  });
});

describe('RES recordings — the build reproduces the status window', () => {
  // Read at 6.247 ms in the party file, after the song had ended.
  const r = simulate({ file: PARTY_FILE, t: 6247 });

  it('ATQ Equip. 1.250 — only with the Cabeça do Baby Shark event block counted', () => {
    expect(r.atkEquip).toBe(1250);
  });

  it('Precisão 632, Esquiva 682, P.ATQ 87, TEN 32, TENM 24, T.CRÍT 20', () => {
    const { 49: hit, 50: flee, 225: pAtk, 227: res, 228: mres, 230: cRate } = r.window;
    expect({ 49: hit, 50: flee, 225: pAtk, 227: res, 228: mres, 230: cRate }).toEqual({ 49: 632, 50: 682, 225: 87, 227: 32, 228: 24, 230: 20 });
  });

  it('HP máx. 111.479 — only with the Bolsa do Baby Shark at +20 HP per base level', () => {
    // At +2 per level, as the record used to read, the engine is ~4.300 short.
    expect(Math.abs(r.window[6] - 111479)).toBeLessThanOrEqual(5);
  });

  it('ATQ 929, DEF 207, DEFM 139 to within a point', () => {
    expect(Math.abs(r.window[41] - 929)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.window[45] - 207)).toBeLessThanOrEqual(1);
    expect(Math.abs(r.window[47] - 139)).toBeLessThanOrEqual(1);
  });

  // Still open: SP máx. 3.809 against ~3.763 and CRIT 144 against 147, neither of which
  // touches this skill's damage.
});

describe('RES recordings — Argutus Telum alone vs Telum + Adulterar Veneno', () => {
  const telum = simulate(TELUM_ONLY);
  const both = simulate(TELUM_AND_VENOM);
  const recorded = 61460805 / 54565938;

  it('both packets are criticals, so each is one number', () => {
    for (const r of [telum, both]) {
      expect(r.critRate).toBeGreaterThanOrEqual(100);
      expect(r.crit).toBe(r.critMin);
    }
  });

  it('Telum 25% leaves RES 353, not 353,25', () => {
    expect(telum.restRes).toBe(353);
  });

  it('Telum 25% + Veneno 30% is clamped to 50% and leaves RES 235, not 235,5', () => {
    expect(both.restRes).toBe(235);
  });

  it('the arithmetic alone already separates the hypotheses', () => {
    const ppm = (x: number) => (x / recorded - 1) * 1e6;
    expect(Math.abs(ppm(browiki(235) / browiki(353)))).toBeLessThan(5);
    expect(Math.abs(ppm(browiki(235.5) / browiki(353.25)))).toBeGreaterThan(300);
    expect(browiki(211) / browiki(353)).toBeGreaterThan(recorded * 1.02); // unclamped 55%
  });

  it('the engine reproduces the recorded ratio to within 10 ppm', () => {
    expect(Math.abs((both.crit / telum.crit / recorded - 1) * 1e6)).toBeLessThan(10);
  });

  // Closed to 0,06% by the EDP element fix and Cogumelo Mágico; kept as an equality-ish pin
  // so that either of those silently changing shows up here.
  it('reproduces both packets to within 0,1%', () => {
    expect(54565938 / telum.crit).toBeCloseTo(0.9994, 3);
    expect(61460805 / both.crit).toBeCloseTo(0.9994, 3);
  });
});

describe('RES recordings — the party file corroborates, it does not decide', () => {
  const noPenetration = (song: number) =>
    simulate({ file: PARTY_FILE, t: 674, extra: [{ atk: song }] });
  const venom = simulate({ file: PARTY_FILE, t: 3786, actives: { 'Potent Venom': 10 } });
  const recorded = 35099351 / 31838597;

  it('RES 471 with no penetration, 329 under Adulterar Veneno Nv10', () => {
    expect(noPenetration(0).restRes).toBe(471);
    expect(venom.restRes).toBe(329);
  });

  it('with Sinfonia dos Ventos at 44 ATQ the pair closes to within 250 ppm', () => {
    expect(Math.abs((venom.crit / noPenetration(44).crit / recorded - 1) * 1e6)).toBeLessThan(250);
  });

  it('without the song it does not: the first cast needs ~40 ATQ more than the second', () => {
    expect(venom.crit / noPenetration(0).crit / recorded).toBeGreaterThan(1.015);
  });

  // 0,9% under the recording — the rest of this file's own unknowns (the song, and whatever
  // else a 9-player party was doing), against 0,06% on the solo telum file.
  it('reproduces the Veneno cast to within 1%', () => {
    expect(35099351 / venom.crit).toBeCloseTo(0.991, 2);
  });
});
