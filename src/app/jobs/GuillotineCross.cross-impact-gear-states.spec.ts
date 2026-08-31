import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { GuillotineCross } from './GuillotineCross';

/**
 * `gc-cross-impact-gear-states.rrf` — "Sonny_#2", Sicário base 170 / job 58, on tra_fild
 * against a Dummy - Médio, 20/08/2026. Tracker card LfVVfKMZg3.
 *
 * The most useful shape a recording can have: the player **strips to nothing on camera**,
 * fires, then puts the build back on one piece at a time and adds the buffs. Five states,
 * spanning a 140× damage range, out of one file — the gearless control §9 of the review
 * skill asks for is in here rather than needing a recording of its own:
 *
 *   1. bare-handed, no buffs        14.203 ×5 · crit 19.880 ×2
 *   2. + Gélida Ilusional +10       96.719..101.563 · crit 138.355
 *   3. + Aplicar Toxina             106.190, 109.564 · crit 156.184, 162.372
 *   4. + the whole build            614.404..658.014 (n=10)
 *   5. + Encantar com Veneno Mortal 1.854.790..2.025.737 (n=10)
 *   6. + Envenenar Arma (endow)   1.822.086..2.373.784 (n=10, ver o teste final)
 *
 * State 1 is **deterministic** — bare-handed there is no weapon ATK to roll, so all five
 * non-crits print the same number and both crits print the same number, and the pair is an
 * exact equation rather than a range (review skill §6). The crit is 1,4× the non-crit.
 *
 * Two things this file settled that the card could not:
 *
 *  - **Which poison Aplicar Toxina was carrying.** The EFST (341) is the same whichever it
 *    is, and the choice is worth ~9% on the non-crit and more on the crit. Pyrexia puts
 *    states 3, 4 and 5 above the simulator's critical ceiling; Magic Mushroom fits all
 *    three, hugging both ends of the range in the two states with enough packets to say so.
 *  - **The CRIT formula.** The status window is re-sent after every one of the 34 equip
 *    events, which is 8 readings of Crítico at four different SOR values — enough to catch
 *    `getBaseCriRate` taking a ~0,333 slope where the game takes 0,3. See the sibling
 *    `GuillotineCross.cross-impact-replay.spec.ts`, where that gap had been pinned open.
 *
 * The buffs are all the recorder's own: filtering `statusEvents` by `aid` matters on
 * tra_fild, and this file is the mild case at one bystander (see triage-rrf §3).
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_MEDIO = '21065';
const CROSS_IMPACT = 2022;

const replay: any = decodeReplay(loadReplayFixture('gc-cross-impact-gear-states.rrf'));
const aid = replay.sessionInfo.aid;

/** The build worn at `t`: the t=0 snapshot with every equip change up to then folded on. */
function stateAt(t: number) {
  const inv = new Map<any, any>(
    [...replay.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...(r.cards ?? [])] }]),
  );
  for (const e of replay.equipChanges ?? []) {
    if (e.time > t) break;
    const rec = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
    inv.set(e.slot, {
      ...rec,
      itemId: e.itemId,
      refine: e.refine,
      grade: e.grade,
      cards: [...(e.cards ?? [])],
      options: e.options?.length ? e.options : rec.options ?? [],
      equipped: e.equipped ? e.location : 0,
    });
  }
  return replayToModel({ ...replay, initialInventory: inv } as any, items).model as any;
}

/** Full engine run on the build worn at `t`, with the named active skills switched on. */
function sim(t: number, actives: Record<string, number> = {}) {
  const m = stateAt(t);
  const cls: any = new GuillotineCross();
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
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const value = 'Cross Impact==5';
  m.selectedAtkSkill = value;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[DUMMY_MEDIO], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  return {
    model: m,
    atkStatus: tot.calc.totalStatusAtk as number,
    equipAtk: ((tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk) as number,
    cri: tot.calc.totalCri as number,
    criMin: Math.round(ds.skillMinDamage as number),
    criMax: Math.round(ds.skillMaxDamage as number),
    noCriMin: Math.round(ds.skillMinDamageNoCri as number),
    noCriMax: Math.round(ds.skillMaxDamageNoCri as number),
  };
}

/** Every Cross Impact packet the recorder itself produced, in order. */
const packets = (replay.damage ?? []).filter((d: any) => d.source === aid && d.skillId === CROSS_IMPACT);

/** Windows picked between equip bursts, from the file's own timeline. */
const PELADO = 19_000;
const KATAR = 46_000;
const TOXINA = 72_000;
const GEAR = 95_500;
const EDP = 115_500;
const MAGIC_MUSHROOM = { 'Poisonous Weapon': 2 };

describe('Sicário — Lâminas Retalhadoras por estado de equipamento (LfVVfKMZg3)', () => {
  it('strips the character to nothing and puts it back on, one piece at a time', () => {
    expect(replay.equipChanges.length).toBe(34);
    // Bare-handed: no weapon at all, which is what makes state 1 deterministic.
    expect(stateAt(PELADO).weapon).toBeUndefined();
    expect([stateAt(KATAR).weapon, stateAt(KATAR).weaponRefine]).toEqual([610012, 10]);
    expect(stateAt(GEAR).weapon).toBe(610012);
  });

  /**
   * SP 41 (ATQ) and SP 42 (ATQ Equip.) straight off the ZC_PAR_CHANGE bursts, at the three
   * states where the window settles. These are the game's own numbers and they are exact —
   * which is what licenses reading a formula off the packets at all.
   */
  it('reproduces the recorded status window at every state', () => {
    expect([sim(PELADO).atkStatus, sim(PELADO).equipAtk]).toEqual([195, 0]);
    expect([sim(KATAR).atkStatus, sim(KATAR).equipAtk]).toEqual([195, 340]);
    expect([sim(GEAR).atkStatus, sim(GEAR).equipAtk]).toEqual([226, 404]);
  });

  /**
   * The katar doubles the number the engine carries and the client's field does not, so the
   * comparison takes a floor of the halved value (rAthena doubles the tenths before the
   * single truncation). 130 is the window's reading with the whole build on.
   */
  it('reproduces the recorded Crítico', () => {
    expect(Math.floor(sim(KATAR).cri / 2)).toBe(33); // gravado: 33
    expect(Math.floor(sim(GEAR).cri / 2)).toBe(130); // gravado: 130
  });

  /**
   * Bare-handed there is nothing left to roll, so both numbers are exact equalities rather
   * than ranges — the strongest single assertion in the file, and the one that says the
   * class formula itself is right before any equipment enters the picture.
   */
  it('matches the bare-handed packets exactly, crit and non-crit', () => {
    const bare = packets.filter((d: any) => d.time > PELADO && d.time < KATAR);
    expect([...new Set(bare.map((d: any) => d.damage))].sort((a: number, b: number) => a - b)).toEqual([14203, 19880]);

    const s = sim(PELADO);
    expect(s.noCriMin).toBe(s.noCriMax); // no weapon → no roll
    expect(s.criMin).toBe(s.criMax);
    expect(s.noCriMax).toBe(14204); // recorded 14203; the engine's last unit is a rounding step
    expect(s.criMax).toBe(19880); // exact
  });

  /**
   * Aplicar Toxina's EFST does not say which poison is loaded, and the two the calculator
   * offers are worth different amounts. Magic Mushroom is the one that fits: with Pyrexia
   * the recorded criticals fall *below* the simulated floor in all three of the states that
   * carry the buff, which sampling cannot explain.
   */
  it('identifies the poison as Magic Mushroom, not Pyrexia', () => {
    const recorded = [156184, 162372];
    const mushroom = sim(TOXINA, MAGIC_MUSHROOM);
    for (const d of recorded) {
      expect(d).toBeGreaterThanOrEqual(mushroom.criMin);
      expect(d).toBeLessThanOrEqual(mushroom.criMax);
    }
    const pyrexia = sim(TOXINA, { 'Poisonous Weapon': 1 });
    expect(Math.min(...recorded)).toBeLessThan(pyrexia.criMin);
  });

  /**
   * The two states with enough packets to bound a range. Both are criticals — the engine's
   * non-crit ceiling is far below the recorded floor — and both sit inside the simulated
   * critical range while hugging each end of it, which is what a correct range looks like
   * against a sample this size.
   */
  it.each([
    { estado: 'gear completo', at: GEAR, actives: MAGIC_MUSHROOM, from: 85_600, to: EDP, n: 10, largura: 1.09 },
    // Stops at 140 s on purpose: Envenenar Arma comes on at 142.668 and endows the weapon
    // with Veneno, which is a sixth state (10 more packets, up to 2.373.784). It is left
    // unasserted because the endow is a model-level element change rather than one of the
    // class's own toggles, so it does not belong in this file's harness.
    { estado: 'gear + EDP', at: EDP, actives: { ...MAGIC_MUSHROOM, 'Enchant Deadly Poison': 1 }, from: EDP, to: 140_000, n: 10, largura: 1.13 },
  ])('brackets every packet of the $estado state', ({ at, actives, from, to, n, largura }) => {
    const window = packets.filter((d: any) => d.time > from && d.time < to).map((d: any) => d.damage);
    expect(window.length).toBe(n);

    const s = sim(at, actives);
    expect(s.noCriMax).toBeLessThan(Math.min(...window)); // every packet is a critical
    for (const d of window) {
      expect(d).toBeGreaterThanOrEqual(s.criMin);
      expect(d).toBeLessThanOrEqual(s.criMax);
    }
    // And the range stays tight enough that a wrong ratio would not still fit. EDP is the
    // wider of the two because it multiplies the weapon-ATK roll along with everything else.
    expect(s.criMax / s.criMin).toBeLessThan(largura);
  });
});
