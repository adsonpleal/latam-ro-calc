import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { Genetic } from './Genetic';

/**
 * `gn-cart-cannon-gear-states.rrf` — "DeepAlchemy", Bioquímico base 158 / job 52, in the
 * tra_fild test room against a Dummy - Grande, 05/09/2026. Tracker card pfmWFfc6NS,
 * recording by MLPerceptron.
 *
 * A third class, so the six traits do not exist and the card is complete without them.
 *
 * The player fires fifteen Canhão de Prótons with nothing but the cannonball equipped,
 * then puts on a sword, then the rest of the starter build — three states out of one file,
 * and the first of them is the gearless control the review skill asks for:
 *
 *   A  cannonball only     15.967 x15  (deterministic — no weapon, nothing to roll)
 *   B  + Espada Inicial +7 26.547..27.534 (n=15)
 *   C  + the Nobre pieces  38.717..40.274 (n=15)
 *
 * Propulsão do Carrinho (EFST 461) comes on at t=1078 and never drops, so all three states
 * carry it; it is the only status the recorder owns. Everything else in `statusEvents` is
 * bookkeeping or belongs to the four bystanders on the map.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const DUMMY_GRANDE = '21066';
const CART_CANNON = 2477;
const CART_BOOST = { 'Cart Boost': 5 };

const replay: any = decodeReplay(loadReplayFixture('gn-cart-cannon-gear-states.rrf'));
const aid = replay.sessionInfo.aid;

/** Windows picked between the equip bursts, from the file's own timeline. */
const PELADO = 20_000;
const ESPADA = 45_000;
const COMPLETO = 70_000;

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
  const cls: any = new Genetic();
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

  const value = 'Cart Cannon==5';
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
  const tot: any = calc.getTotalSummary();
  return {
    model: m,
    ratio: ds.baseSkillDamage as number,
    atkStatus: tot.calc.totalStatusAtk as number,
    equipAtk: ((tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + tot.calc.totalEquipAtk) as number,
    cri: tot.calc.totalCri as number,
    // Canhão de Prótons cannot crit, so the engine reports the whole roll on
    // skillMinDamage/skillMaxDamage and leaves the NoCri pair at zero.
    min: Math.round(ds.skillMinDamage as number),
    max: Math.round(ds.skillMaxDamage as number),
  };
}

/** Every Canhão de Prótons packet the recorder itself produced, within a window. */
function packets(from: number, to: number): number[] {
  return (replay.damage ?? [])
    .filter((d: any) => d.source === aid && d.skillId === CART_CANNON && d.time >= from && d.time <= to)
    .map((d: any) => d.damage);
}

const A = packets(11_000, 29_000);
const B = packets(33_000, 50_000);
const C = packets(57_000, 77_000);

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('Bioquímico — Canhão de Prótons por estado de equipamento (pfmWFfc6NS)', () => {
  it('walks the file through three states, the first of them gearless', () => {
    expect([A.length, B.length, C.length]).toEqual([15, 15, 15]);
    expect(stateAt(PELADO).weapon).toBeUndefined();
    expect(stateAt(PELADO).ammo).toBe(18008); // Bala de Canhão Ardente
    expect([stateAt(ESPADA).weapon, stateAt(ESPADA).weaponRefine]).toEqual([13483, 7]);
    expect(stateAt(COMPLETO).weapon).toBe(13483);
  });

  /**
   * SP 41 (ATQ), SP 42 (ATQ Equip.) and SP 52 (Crítico) straight off the ZC_PAR_CHANGE
   * bursts the client re-sends after every equip. These are the game's own numbers, and
   * they are what licenses reading a formula off the packets at all: the sword's 140 base
   * ATQ and its 35 of refino are confirmed by the game rather than assumed from item.json,
   * and ATQ 167 fixes the job bonus table at job 52 (only the right FOR/DES/SOR total
   * produces it) and the melee stat order — a sword is not a bow, so DES does not lead.
   */
  it('reproduces the recorded status window at every state', () => {
    expect([sim(PELADO, CART_BOOST).atkStatus, sim(PELADO, CART_BOOST).equipAtk]).toEqual([167, 0]);
    expect([sim(ESPADA, CART_BOOST).atkStatus, sim(ESPADA, CART_BOOST).equipAtk]).toEqual([167, 175]);
    expect([sim(COMPLETO, CART_BOOST).atkStatus, sim(COMPLETO, CART_BOOST).equipAtk]).toEqual([169, 235]);
    expect(sim(COMPLETO, CART_BOOST).cri).toBe(3);
  });

  /**
   * The ratio the client's own table states: 1.250% at Nv 5, plus 20% per level of
   * Canhão de Prótons for each level of Aprimorar Carrinho (500% at Aprimorar Carrinho 5),
   * plus the INT term, all scaled by nível base / 100. 2.012 x 1,58 = 3.178.
   */
  it('builds the ratio the client table states', () => {
    expect(sim(PELADO, CART_BOOST).ratio).toBe(3178);
  });

  /**
   * Bare-handed there is no weapon ATQ to roll, so the fifteen packets print the **same
   * number** and the comparison is an exact equation rather than a range — the strongest
   * assertion this file can make, and it lands before any equipment enters the picture.
   *
   * It pins five things at once: the ratio above, the job bonus table, the melee status
   * ATQ, the cannonball's 120 of ATQ arriving as maestria (rAthena adds the projectile's
   * ATQ there precisely so P.ATQ does not scale it), and Propulsão do Carrinho's +10 ATQ
   * per level. Drop any one of them and the equality fails by more than a rounding unit.
   */
  it('matches the fifteen gearless packets exactly', () => {
    expect(new Set(A)).toEqual(new Set([15_967]));

    const s = sim(PELADO, CART_BOOST);
    expect(s.min).toBe(s.max); // no weapon -> no roll
    expect(s.max).toBe(15_967);
  });

  /**
   * Propulsão do Carrinho is worth exactly the 50 ATQ the skill grants at Nv 5, measured
   * off that same equality: with the toggle off the engine lands on 14.378, which is the
   * recorded value less 50 x the ratio. Guards the `bonus: { atk: 50 }` in cart-boost.ts
   * against being quietly re-staged.
   */
  it('prices Propulsão do Carrinho at the 50 ATQ the recording shows', () => {
    const semBoost = sim(PELADO).max;
    expect(semBoost).toBe(14_378);
    expect(15_967 - semBoost).toBe(Math.round((50 * 3178) / 100));
  });

  /**
   * OPEN. The moment the Espada Inicial goes on, the engine falls short — and by the same
   * amount in both geared states, which is what says it is one cause rather than an item
   * missing from the Nobre set:
   *
   *   B  recorded mean 27.062  vs simulated mean 25.323   -6,9%
   *   C  recorded mean 39.428  vs simulated mean 36.893   -6,9%
   *
   * Every one of the thirty packets sits above the simulated ceiling, so this is a real
   * divergence and not a sampled maximum falling short of one (review skill §9).
   *
   * Ruled out, each against its own evidence:
   *
   *  - **the ratio** — confirmed against rAthena and, above, exact bare-handed;
   *  - **the build** — the game's own ATQ, ATQ Equip. and Crítico match at all three states;
   *  - **the sword's data** — its 140 ATQ and 35 of refino are the window's own numbers,
   *    and its "Refino +7 ou mais: Dano de [Canhão de Prótons] +15%" reaches the engine as
   *    the bare `2477` key;
   *  - **the size table as a whole** — `Biolo.cart-cannon-replay.spec.ts` runs this very
   *    skill against a Médio and a Pequeno dummy and covers both, so the 100% and the 75%
   *    cells are right; `GuillotineCross.cross-impact-unbuffed.spec.ts` reproduces a katar
   *    across four dummies, Grande included, so Grande penalties exist.
   *
   * That leaves two candidates this file cannot separate, because its only target is Grande
   * and its only weapon is a level-3 blade:
   *
   *  - **the sword's Grande cell.** bROWiki puts Espada de Uma Mão at 75% there, and it is
   *    the only cell of that table no recording in this repo exercises. Forcing it to 100%
   *    swings both states from 6,9% under to about 2% over — closer, but not a fit, so it
   *    is not simply the wrong number either.
   *  - **something keyed to the weapon's nível.** The Cientista file that does line up
   *    carries a nível 5 weapon and this one a nível 3, and nível drives both the variance
   *    and the over-refine term.
   *
   * The recording that settles it is the plainest possible: **the same character firing at
   * a Médio dummy as well as a Grande one**, which is a few seconds of work for whoever
   * records it and holds the weapon still while the size changes.
   */
  it('pins the open shortfall the sword introduces', () => {
    const b = sim(ESPADA, CART_BOOST);
    const c = sim(COMPLETO, CART_BOOST);

    expect(Math.min(...B)).toBeGreaterThan(b.max);
    expect(Math.min(...C)).toBeGreaterThan(c.max);

    const desvio = (rec: number[], s: { min: number; max: number }) =>
      Number(((media(rec) / ((s.min + s.max) / 2) - 1) * 100).toFixed(1));
    expect(desvio(B, b)).toBe(6.9);
    expect(desvio(C, c)).toBe(6.9);
  });
});
