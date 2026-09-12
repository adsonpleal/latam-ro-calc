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
 * recording by MLPerceptron. A third class, so the six traits do not exist and the card is
 * complete without them.
 *
 * The player fires fifteen Canhão de Prótons with nothing but the cannonball equipped, then
 * puts on a sword, then the rest of the starter build. Three states out of one file, and
 * the first is the gearless control:
 *
 *   A  cannonball only     15.967 x15  (deterministic — no weapon, nothing to roll)
 *   B  + Espada Inicial +7 26.547..27.534 (n=15)
 *   C  + the Nobre pieces  38.717..40.274 (n=15)
 *
 * Propulsão do Carrinho (EFST 461) comes on at t=1.078 and never drops, so all three states
 * carry it; it is the only status the recorder owns. Everything else in `statusEvents` is
 * bookkeeping or belongs to the four bystanders on the map.
 *
 * What makes this file unusually decisive is that the whole damage chain can be **inverted**
 * — see `atqDe` below — so the recording yields the exact integer ATQ the server used for
 * every packet, instead of a range to bracket. That turns "the simulator is 6,9% low" into
 * "the server's ATQ was 728..755 and ours is 673..716", which is a different quality of
 * evidence and is what the last describe is built on.
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

/** Full engine run on the build worn at `t`, with the named active skills switched on;
 *  `masteryExtra` adds a flat, unscaled ATQ at the mastery stage, for measuring a residual. */
function sim(t: number, actives: Record<string, number> = {}, extraScripts: any[] = [], masteryExtra = 0) {
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
    monster: monsters[DUMMY_GRANDE], equipAtks, buffEquips: {}, buffMasterys: {},
    masteryAtks: masteryExtra ? { ...masteryAtks, _medido: { atk: masteryExtra } } : masteryAtks,
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [...parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)), ...extraScripts],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  const c = tot.calc;
  return {
    model: m,
    ratio: ds.baseSkillDamage as number,
    /** The SP fields the recording reports, keyed by their ZC_PAR_CHANGE id. */
    janela: {
      6: c.maxHp, 41: c.totalStatusAtk,
      42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + c.totalEquipAtk,
      45: c.softDef, 46: c.def, 47: c.softMdef, 48: c.mdef, 49: c.totalHit,
      52: c.totalCri, 53: Math.round((200 - c.totalAspd) * 10),
      225: c.pAtk ?? 0, 226: c.sMatk ?? 0, 227: c.res ?? 0, 228: c.mres ?? 0,
      229: c.hPlus ?? 0, 230: c.cRate ?? 0,
    } as Record<number, number>,
    /** The ATQ the engine feeds into the ratio, min and max — the first row of its trace. */
    atq: [ds.skillFormulaTrace.min[0].value, ds.skillFormulaTrace.max[0].value] as [number, number],
    min: Math.round(ds.skillMinDamage as number),
    max: Math.round(ds.skillMaxDamage as number),
  };
}

/** Canhão de Prótons packets the recorder itself produced, within a window. */
function packets(from: number, to: number): number[] {
  return (replay.damage ?? [])
    .filter((d: any) => d.source === aid && d.skillId === CART_CANNON && d.time >= from && d.time <= to)
    .map((d: any) => Number(d.damage));
}

const A = packets(11_000, 29_000);
const B = packets(33_000, 50_000);
const C = packets(57_000, 77_000);
const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const desvio = (rec: number[], s: { min: number; max: number }) =>
  Number(((media(rec) / ((s.min + s.max) / 2) - 1) * 100).toFixed(1));

/**
 * The damage chain, forwards — every stage the engine's own trace prints, in its order, in
 * integer arithmetic. Against this target there is no critical, no elemental multiplier and
 * no hard DEF, so what is left is the ranged bonus, the skill ratio, a flat 50 of soft DEF,
 * and the per-skill equipment bonus.
 */
function danoDe(atq: number, rangedPct: number, skillPct: number): number {
  let t = Math.floor((atq * (100 + rangedPct)) / 100);
  t = Math.floor((t * 3178) / 100);
  t = t - 50;
  return Math.floor((t * (100 + skillPct)) / 100);
}

/** And backwards: every integer ATQ that would have produced this exact damage. */
function atqDe(dano: number, rangedPct: number, skillPct: number): number[] {
  const out: number[] = [];
  for (let a = 1; a < 4000; a++) if (danoDe(a, rangedPct, skillPct) === dano) out.push(a);
  return out;
}

describe('Bioquímico — a build lida da gravação bate com a janela de status dela', () => {
  it('anda pelos três estados, o primeiro deles sem arma', () => {
    expect([A.length, B.length, C.length]).toEqual([15, 15, 15]);
    expect(replay.equipChanges.length).toBe(8);
    expect(stateAt(PELADO).weapon).toBeUndefined();
    expect(stateAt(PELADO).ammo).toBe(18008); // Bala de Canhão Ardente
    expect([stateAt(ESPADA).weapon, stateAt(ESPADA).weaponRefine]).toEqual([13483, 7]);
    expect(stateAt(COMPLETO).weapon).toBe(13483);
  });

  /**
   * **Nenhum status falta.** The client re-sends the whole ZC_PAR_CHANGE block after each of
   * the eight equip events, so the file carries nine full snapshots of the status window —
   * and the engine reproduces **every field of every one of them**, not just ATQ. That is
   * what licenses reading a formula off the packets at all (review skill §3), and it is why
   * the divergence in the last describe can be put on the damage chain rather than on a
   * missing item bonus: there is no missing item bonus.
   *
   * Walking the snapshots in order matters as much as checking the final state — each equip
   * isolates one piece, so a divergence would name its culprit instead of leaving one wrong
   * total to hunt through.
   */
  it('reproduz cada campo da janela de status, a cada peça equipada', () => {
    const lidoAte = (t: number) => {
      const out: Record<number, number> = {};
      for (const p of replay.paramChanges ?? []) {
        if (Number(p.time) > t) break;
        out[p.type] = Number(p.value);
      }
      return out;
    };

    const marcos = [11_000, ...replay.equipChanges.map((e: any) => Number(e.time) + 40)];
    let conferidos = 0;
    for (const t of marcos) {
      const lido = lidoAte(t);
      const nosso = sim(t, CART_BOOST).janela;
      for (const sp of Object.keys(nosso).map(Number)) {
        if (!(sp in lido)) continue;
        expect({ t, sp, valor: nosso[sp] }).toEqual({ t, sp, valor: lido[sp] });
        conferidos += 1;
      }
    }
    // Dezoito campos distintos ao longo de nove instantâneos — 101 leituras ao todo. O
    // total é a prova de que o laço conferiu algo, e não passou batido por falta delas.
    expect(conferidos).toBe(101);
  });
});

describe('Bioquímico — a cadeia de dano, etapa por etapa, lida da própria gravação', () => {
  /**
   * The spacing between two achievable damages **is** the product of everything that
   * multiplies the ratio, so the recording states its own multipliers: the gaps between
   * adjacent packets in state B are 36 and 37, which is 3.178 x 1,15 and nothing else. That
   * confirms the client's ratio table and the sword's "Dano de [Canhão de Prótons] +15%"
   * from the packets alone, with no outside source involved.
   */
  it('o espaçamento entre pacotes confirma a razão 3.178% e os +15% da espada', () => {
    const passos = [...new Set(B)].sort((a, b) => a - b);
    const gaps = passos.slice(1).map((v, i) => v - passos[i]).filter((g) => g < 60);
    expect(gaps.length).toBeGreaterThan(3);
    for (const g of gaps) expect([36, 37]).toContain(g);

    expect(danoDe(728, 0, 15)).toBe(26_547);
    expect(danoDe(755, 0, 15)).toBe(27_534);
    expect(sim(PELADO, CART_BOOST).ratio).toBe(3178);
  });

  /**
   * Bare-handed there is no weapon ATQ to roll, so the fifteen packets print the **same
   * number**, the inversion has a single solution, and the comparison is an exact equation:
   * the server's ATQ was 504, which is 2 x 167 de ATQ mais 120 da bala mais 50 de Propulsão
   * do Carrinho. Drop any one of those and the equality fails by more than a rounding unit.
   */
  it('sem arma, o ATQ do servidor foi exatamente 504 — e o do motor também', () => {
    expect(new Set(A)).toEqual(new Set([15_967]));
    expect(atqDe(15_967, 0, 0)).toEqual([504]);

    const s = sim(PELADO, CART_BOOST);
    expect(s.atq).toEqual([504, 504]); // sem arma não há o que sortear
    expect(s.min).toBe(s.max);
    expect(s.max).toBe(15_967);
  });

  /**
   * Propulsão do Carrinho is worth exactly the 50 ATQ the skill grants at Nv 5, read off
   * that same equality: with the toggle off the engine lands on an ATQ of 454. Guards the
   * `bonus: { atk: 50 }` in cart-boost.ts against being quietly re-staged.
   */
  it('Propulsão do Carrinho vale os 50 de ATQ que a gravação mostra', () => {
    expect(sim(PELADO).atq).toEqual([454, 454]);
    expect(sim(PELADO, CART_BOOST).atq[0] - sim(PELADO).atq[0]).toBe(50);
  });
});

describe('Bioquímico — o ATQ com arma, medido pacote a pacote (em aberto)', () => {
  /**
   * ABERTO, e medido em vez de estimado. Every packet of state B inverts to **one** integer
   * ATQ, so the recording hands over the server's own value fifteen times:
   *
   *   servidor  728 729 730 731 737 738 740 740 746 748 749 752 753 755 755   (média 742,1)
   *   motor     673 .. 716                                                     (média 694,5)
   *
   * The fixed part is not in question — state A proved it is 504 — so the difference sits
   * with the weapon. **What it is, by measure:** a flat **+53 ± 2 de ATQ**, the same in
   * state B (bare sword) and state C (full Nobre set) once each state is compared to the
   * engine's own centre, and it does **not** widen the roll — the fifteen server values span
   * 27 in B and 33 in C, which is the sword's ±21 through the 75% size penalty and nothing
   * else (no random over-refine either, which the engine's ceiling still carries). Added as a
   * mastery-stage constant it puts all thirty packets inside the roll with the mean on the
   * centre, and breaks the gearless state by exactly the amount it adds: it exists with a
   * weapon and not without one.
   *
   * O que já foi descartado, por medida:
   *
   *  - **a build e os itens**: os 115 campos da janela de status batem, peça a peça;
   *  - **a razão e os +15% da espada**: o espaçamento dos pacotes os confirma sozinho;
   *  - **qualquer termo proporcional à arma** — dobrar o bônus de status (`ATQ x FOR / 200`,
   *    +71 antes da penalidade), metade do ATQ base, o refino em dobro: os três dão os mesmos
   *    ~53 aqui, e os três estão descartados por `Biolo.cart-cannon-replay.spec.ts`, cuja
   *    gravação do Alquimiro fecha os 24 pacotes com **nenhum** termo extra numa espada de
   *    200 de ATQ e FOR 143 (onde valeriam +100 a +143). Dobrar o bônus de status ainda
   *    quebra 135 testes de outras classes;
   *  - **`range` +7**: fecha B e C e estraga o estado sem arma (teste abaixo);
   *  - **a tabela de tamanho**: a largura da rolagem diz que os 75% estão aplicados, e sem
   *    penalidade nenhuma o teto simulado (267) fica 16 acima do maior pacote com chance de
   *    0,1% de não ser atingido em quinze;
   *  - **elemento do alvo**: os quatro dummies são Neutro 1 na tabela de monstros do cliente.
   *
   * O que sobra, e não dá para separar com estes três arquivos: os ~50 são do tamanho da
   * **Propulsão do Carrinho** (+50), que está ligada aqui e no Musty e desligada no Alquimiro
   * — o único dos três sem resíduo. O Musty é compatível com um +50 escondido (a inversão dá
   * +25 ± 12 nas unidades da arma, onde +50 de maestria vale +22), mas também é compatível com
   * zero, porque o POD dele só existe no card. A gravação que decide é esta mesma personagem,
   * espada equipada, **sem** Propulsão do Carrinho: se os +53 sumirem, o buff vale 50 sem arma
   * e 100 com arma, e a mudança no motor é de uma linha.
   */
  it('mede o ATQ que o servidor usou em cada pacote do estado com espada', () => {
    const doServidor = B.map((d) => atqDe(d, 0, 15));
    for (const s of doServidor) expect(s.length).toBe(1);

    const valores = doServidor.map((s) => s[0]).sort((a, b) => a - b);
    expect(valores).toEqual([728, 729, 730, 731, 737, 738, 740, 740, 746, 748, 749, 752, 753, 755, 755]);
    expect(sim(ESPADA, CART_BOOST).atq).toEqual([673, 716]);
    // The spread is the sword's own roll: ±21 x 75% is 31,5 wide, and fifteen draws cover 27.
    expect(valores[14] - valores[0]).toBe(27);
  });

  it('fixa o resíduo em 6,9% nos dois estados com arma', () => {
    expect(desvio(B, sim(ESPADA, CART_BOOST))).toBe(6.9);
    expect(desvio(C, sim(COMPLETO, CART_BOOST))).toBe(6.9);
    // E os trinta pacotes estão acima do teto simulado, então não é amostragem (§9).
    expect(Math.min(...B)).toBeGreaterThan(sim(ESPADA, CART_BOOST).max);
    expect(Math.min(...C)).toBeGreaterThan(sim(COMPLETO, CART_BOOST).max);
  });

  /**
   * The residual as a number, not a percentage: +53 of flat ATQ at the mastery stage closes
   * both armed states — every packet inside the roll, mean within a percent of the engine's
   * centre, which still carries the 0..16 over-refine the packets say is not there — and the
   * gearless state, exact today, would go 10,5% high with it. A term that needs a weapon to
   * exist.
   */
  it('vale +53 de ATQ plano, nos dois estados com arma e em nenhum sem arma', () => {
    const MEDIDO = 53;
    for (const [pacotes, t] of [[B, ESPADA], [C, COMPLETO]] as [number[], number][]) {
      const s = sim(t, CART_BOOST, [], MEDIDO);
      expect(pacotes.every((p) => p >= s.min && p <= s.max)).toBe(true);
      expect(Math.abs(desvio(pacotes, s))).toBeLessThanOrEqual(0.8);
    }
    expect(sim(PELADO, CART_BOOST, [], MEDIDO).max).toBeGreaterThan(15_967 * 1.1); // recorded 15.967, exact without it
    // The fifteen packets of state B pin it between 39 and 55: one point less than 39 and
    // the largest packet is above the ceiling, one more than 55 and the smallest is below the
    // floor (the ceiling still carries the 12 of over-refine the roll says is not there).
    expect(B.every((p) => p <= sim(ESPADA, CART_BOOST, [], 38).max)).toBe(false);
    expect(B.every((p) => p <= sim(ESPADA, CART_BOOST, [], 39).max)).toBe(true);
    expect(B.every((p) => p >= sim(ESPADA, CART_BOOST, [], 55).min)).toBe(true);
    expect(B.every((p) => p >= sim(ESPADA, CART_BOOST, [], 56).min)).toBe(false);
  });

  /**
   * **E o que esta gravação derruba.** `Wanderer.replay.spec.ts` deixou em aberto a hipótese
   * de faltarem "+7 a +8 pontos de Dano físico à distância" — a única chave que dava o mesmo
   * número nas três caixas grandes daquele arquivo. Ela fecha as duas caixas com arma daqui
   * também, e mesmo assim está errada: com +7 de `range` o estado **sem arma**, que hoje é
   * exato até a unidade, passa a ficar 6,5% alto.
   *
   * Uma etapa que existe com arma e não existe sem ela não é a etapa `range`, e é por isso
   * que o controle sem equipamento vale mais do que qualquer quantidade de pacotes com a
   * build inteira. Fica como teste para que ninguém gaste a tentativa de novo.
   */
  it('range +7 fecha os estados com arma e quebra o estado sem arma', () => {
    const comRange = [{ range: 7 }];
    expect(desvio(B, sim(ESPADA, CART_BOOST, comRange))).toBe(-0.1);
    expect(desvio(C, sim(COMPLETO, CART_BOOST, comRange))).toBe(0.4);
    expect(desvio(A, sim(PELADO, CART_BOOST, comRange))).toBe(-6.5);
  });
});
