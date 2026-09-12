import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { Biolo } from './Biolo';

/**
 * Two Cientista recordings of Canhão de Prótons. Biolo inherits the skill from Genetic
 * unchanged and the formula itself is settled in `Genetic.cart-cannon-gear-states.spec.ts`,
 * which reproduces a gearless Bioquímico to the unit. What these two settle is the
 * **homunculus**: what Pyroclastic is worth, where it enters, and that an Amistr-line buff
 * the master gets no icon for (Fortaleza) is in the file all the same.
 *
 *   `bio-cart-cannon-two-sizes.rrf`  "Musty LTDA" 212/35, card cVfBmHUQzf, anonymous.
 *   `bio-pyroclastic.rrf`            "Alquimiro"  230/48, card uoyYvxyRYP, by Dijey.
 *
 * Both carry Cultivar Bárbaro, so every packet under it is `count` 2 and divides by two
 * (review skill §5), and both carry Pyroclastic (EFST 607) over every packet.
 *
 * Neither file carries the six traits: a Cientista is a 4th class, so they exist and the
 * dialog collected them by hand. That makes the card's values a person's typing, and the
 * tests below check them against the packets and the window rather than trusting them —
 * one card turns out consistent and the other is wrong by 6 POD.
 *
 * The first pass over these files missed two things, both readable straight off the status
 * window: it never diffed `coupleStatus` (which is what §2d of the review skill is for), and
 * it swept `skillUses` filtered to the recorder's own `aid`, which is exactly the filter that
 * hides a homunculus cast. Fortaleza was found by lifting that filter.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const CART_CANNON = 2477;
const EFST_PYROCLASTIC = 607;
const EFST_GN_CARTBOOST = 461;
const HAMI_DEFENCE = 8006;
const MH_PYROCLASTIC = 8042;
const MEDIO = '21065';
const PEQUENO = '21064';
const NEUTRO = '21077';

function load(name: string) {
  const replay: any = decodeReplay(loadReplayFixture(name));
  const aid = replay.sessionInfo.aid;
  return {
    replay,
    aid,
    /** Canhão de Prótons packets the recorder itself produced, per hit, grouped by target. */
    porAlvo(): Map<number, number[]> {
      const out = new Map<number, number[]>();
      for (const d of replay.damage ?? []) {
        if (d.source !== aid || d.skillId !== CART_CANNON) continue;
        if (!out.has(d.target)) out.set(d.target, []);
        out.get(d.target)!.push(Number(d.damage) / (d.hits || 1));
      }
      return out;
    },
    meus(): { t: number; v: number; c: number }[] {
      return (replay.damage ?? [])
        .filter((d: any) => d.source === aid && d.skillId === CART_CANNON)
        .map((d: any) => ({ t: Number(d.time), v: Number(d.damage), c: d.hits }));
    },
    efst(id: number): [number, boolean][] {
      return (replay.statusEvents ?? [])
        .filter((s: any) => s.aid === aid && s.statusId === id)
        .map((s: any) => [Number(s.time), s.isOn] as [number, boolean]);
    },
    /** A ZC_PAR_CHANGE series. The decoder hands these back as BigInt. */
    param(sp: number, at?: number): number[] {
      return (replay.paramChanges ?? [])
        .filter((p: any) => p.type === sp && (at === undefined || Number(p.time) === at))
        .map((p: any) => Number(p.value));
    },
    /** ZC_COUPLESTATUS: the character's own base/plus split, per stat. */
    couple(statusId: number): { t: number; base: number; plus: number }[] {
      return (replay.coupleStatus ?? [])
        .filter((c: any) => c.statusId === statusId)
        .map((c: any) => ({ t: Number(c.time), base: c.base, plus: c.plus }));
    },
    /** Every skill anyone used, with who used it — the homunculus included. */
    usos(): { t: number; source: number; skillId: number; lv: number }[] {
      return (replay.skillUses ?? []).map((s: any) => ({ t: Number(s.time), source: s.source, skillId: s.skillId, lv: s.skillLevel }));
    },
    homunculo(): { aid: number; name: string; level: number } | undefined {
      for (const e of replay.entities?.values?.() ?? []) if (e.kind === 'homun' && e.level > 0) return { aid: e.aid, name: e.name, level: e.level };
      return undefined;
    },
  };
}

interface Cenario {
  mob: string;
  traits: { pow: number; con: number };
  actives?: Record<string, number>;
  /** Bonuses the picker cannot express. `{ atk: n }` lands in ATQ Equip., outside the
   *  weapon's size penalty; `{ weaponAtk: n }` lands inside the weapon group and is scaled by
   *  it. The difference between those two is what the Médio/Pequeno pair measures. */
  extra?: any[];
  chances?: string[];
}

function sim(replay: any, c: Cenario) {
  const m = replayToModel(replay, items).model as any;
  Object.assign(m, { pow: c.traits.pow, sta: 0, wis: 0, spl: 0, con: c.traits.con, crt: 0 });
  const cls: any = new Biolo();
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
  const actives: Record<string, number> = { _Biolo_Monster_List: 2, 'Cart Boost': 5, ...c.actives };
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const value = 'Cart Cannon==5';
  m.selectedAtkSkill = value;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[c.mob], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [...parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)), ...(c.extra ?? [])],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: c.chances ?? [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const dc: any = (calc as any).dmgCalculator;
  const tot: any = calc.getTotalSummary();
  const cc = tot.calc;
  return {
    hits: ds.skillTotalHit as number,
    sizePenalty: ds.skillSizePenalty as number,
    min: ds.skillMinDamage as number,
    max: ds.skillMaxDamage as number,
    meio: ((ds.skillMinDamage as number) + (ds.skillMaxDamage as number)) / 2,
    pAtk: dc.traitBonus.pAtk as number,
    status: { vit: dc.status.totalVit as number, dex: dc.status.totalDex as number, pow: dc.status.totalPow as number },
    janela: {
      6: cc.maxHp, 41: cc.totalStatusAtk,
      42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + cc.totalEquipAtk,
      44: cc.totalStatusMatk, 45: cc.softDef, 47: cc.softMdef, 49: cc.totalHit, 52: cc.totalCri,
      53: Math.round((200 - cc.totalAspd) * 10), 225: dc.traitBonus.pAtk,
    } as Record<number, number>,
  };
}

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const dentro = (golpes: number[], s: { min: number; max: number }) => golpes.every((g) => g >= s.min && g <= s.max);

/**
 * Pyroclastic's worth, measured off each recording's own window. No source has the number:
 * the client says only that it grows with the homunculus level, and rAthena carries
 * `100 + 10 x nível` under an explicit `!TODO`. The Alquimiro file has the level in it.
 */
const PYRO_ALQUIMIRO = 431;
const PYRO_MUSTY = 417;

describe('Cientista — Pyroclastic: 100 + 10 x nível da habilidade + nível do homúnculo', () => {
  /**
   * `bio-pyroclastic.rrf` recasts the buff at t=21.400 and the client re-sends ATQ Equip. on
   * both sides of the recast, 1.005 without and 1.436 with. The engine reproduces the
   * unbuffed 1.005 exactly, so the difference is the buff alone: 431. The entity table names
   * the caster — "Iron Fist Alexander", a Dieter at **level 231** — and the cast is Nv 10,
   * so 431 = 100 + 10 x 10 + 231. The picker used to give `100 + level` and stop at 200.
   */
  it('vale 431 no Alquimiro, cujo Dieter tem nível 231', () => {
    const f = load('bio-pyroclastic.rrf');
    expect(f.efst(EFST_PYROCLASTIC)).toEqual([[0, true], [21400, false], [21400, true]]);
    expect(f.param(42, 21400)).toEqual([1005, 1436]);
    expect(1436 - 1005).toBe(PYRO_ALQUIMIRO);

    const hom = f.homunculo()!;
    expect(hom.name).toBe('Iron Fist Alexander');
    expect(hom.level).toBe(231);
    const cast = f.usos().find((u) => u.source === hom.aid && u.skillId === MH_PYROCLASTIC)!;
    expect([cast.t, cast.lv]).toEqual([21400, 10]);
    expect(100 + 10 * cast.lv + hom.level).toBe(PYRO_ALQUIMIRO);

    const build = { mob: NEUTRO, traits: { pow: 106, con: 20 }, actives: { 'Cart Boost': 0, Tempering: 10 }, extra: [{ dex: 10 }] };
    expect(sim(f.replay, build).janela[42]).toBe(1005);
    expect(sim(f.replay, { ...build, extra: [...build.extra, { atk: PYRO_ALQUIMIRO }] }).janela[42]).toBe(1436);
  });

  it('o picker segue a fórmula até o nível 250', () => {
    const picker = (new Biolo() as any).activeSkills.find((a: any) => a.name === 'Pyroclastic');
    const niveis = picker.dropdown.filter((d: any) => d.isUse);
    expect(niveis.map((d: any) => d.value)).toContain(230);
    expect(Math.max(...niveis.map((d: any) => d.value))).toBe(250);
    for (const d of niveis) expect(d.bonus.atk).toBe(100 + 10 * 10 + d.value);
  });

  /**
   * The Musty file sends ATQ Equip. once, at the cast (t=6.076), so there is no "before" to
   * subtract; the engine's own 658 stands in for it, and it is the same composition (weapon +
   * refine + equipment ATQ) the Alquimiro file confirmed at 1.005. That gives 417, which the
   * formula reads as a level-217 Dieter at Nv 10 — the entity table carries no level for
   * "Dilera", so that part is inference, not measurement.
   */
  it('vale 417 no Musty, lido contra o ATQ Equip. do motor', () => {
    const f = load('bio-cart-cannon-two-sizes.rrf');
    expect(f.param(42)).toEqual([1075]);
    expect(f.usos().filter((u) => u.skillId === MH_PYROCLASTIC).map((u) => [u.t, u.lv])).toEqual([[6076, 10]]);
    expect(sim(f.replay, { mob: MEDIO, traits: { pow: 51, con: 0 } }).janela[42]).toBe(658);
    expect(1075 - 658).toBe(PYRO_MUSTY);
  });

  /**
   * And **where it enters**. `bio-cart-cannon-two-sizes.rrf` fires the same build at a Médio
   * and a Pequeno dummy seconds apart. The weapon is a Rapieira, so Pequeno takes the sword's
   * 75% and Médio takes none — and the ratio between the two damages depends only on **how
   * much of the ATQ is inside the weapon group**, not on the absolute size of any buff. So
   * the ratio locates Pyroclastic without needing to know what it is worth:
   *
   *   gravado                              1,2876
   *   Pyroclastic como ATQ Equip.          1,2893   ✓
   *   Pyroclastic como ATQ de arma         > 1,38   ✗
   *
   * It is ATQ Equip., i.e. outside the size penalty, which is what the calculator's
   * `isEquipAtk: true` already does. Worth stating because rAthena does the opposite —
   * `status_calc_watk` adds `SC_PYROCLASTIC` to the weapon ATK — and the recording wins.
   */
  it('entra como ATQ Equip. e não no grupo da arma, pela razão Médio/Pequeno', () => {
    const f = load('bio-cart-cannon-two-sizes.rrf');
    const alvos = f.porAlvo();
    const razaoGravada = media(alvos.get(4380)!) / media(alvos.get(4377)!);
    expect(Number(razaoGravada.toFixed(4))).toBe(1.2876);

    const cenario = (mob: string, extra: any[]) => sim(f.replay, { mob, traits: { pow: 51, con: 0 }, actives: { Defense: 5 }, extra });
    const razaoDe = (extra: any[]) => cenario(MEDIO, extra).meio / cenario(PEQUENO, extra).meio;

    expect(Number(razaoDe([{ atk: PYRO_MUSTY }]).toFixed(4))).toBe(1.2893);
    // Inside the weapon group the ratio climbs, because Pequeno would then lose 25% of the buff.
    expect(razaoDe([{ weaponAtk: PYRO_MUSTY }])).toBeGreaterThan(1.38);
  });
});

describe('Cientista — "Musty LTDA", os dois tamanhos (cVfBmHUQzf)', () => {
  const f = load('bio-cart-cannon-two-sizes.rrf');
  /** Card values, typed by hand; only the POD matters for damage and it is checked below. */
  const TRAITS = { pow: 51, con: 0 };
  const BUILD = { traits: TRAITS, actives: { Defense: 5 }, extra: [{ atk: PYRO_MUSTY }] };

  it('acerta um Médio e um Pequeno com segundos de diferença, com a mesma build', () => {
    const alvos = f.porAlvo();
    expect([alvos.get(4380)!.length, alvos.get(4377)!.length]).toEqual([4, 3]);
    expect(f.efst(EFST_PYROCLASTIC)).toEqual([[6076, true]]);
    expect(Math.min(...f.meus().map((d) => d.t))).toBeGreaterThan(6076); // the buff precedes the damage
    expect(f.efst(EFST_GN_CARTBOOST).at(-1)).toEqual([2585, true]); // and so does Propulsão do Carrinho
  });

  /**
   * **Fortaleza (HAMI_DEFENCE), cast by the homunculus, is in the file — just not under the
   * recorder's `aid`.** At t=4.298 "Dilera" uses skill 8006 at Nv 5 and the very same
   * millisecond the client re-sends the master's VIT (`plus` 54 where the gear and job give
   * 24), soft DEF, soft MDEF and HP máx. The master gets no status icon for it. The client's
   * own table says "VIT do Mestre +30" at Nv 5, and with that one toggle the engine lands on
   * DEF and DEFM to the unit and on HP máx. within 9 points.
   *
   * The 9 points are the HP formula's rounding somewhere in the percent stack (the Alquimiro
   * file is 7 high the same way). It is a display-only figure, so it is pinned, not chased.
   */
  it('Fortaleza Nv 5 do homúnculo: VIT +30 fecha DEF, DEFM e o HP máx.', () => {
    const cast = f.usos().find((u) => u.skillId === HAMI_DEFENCE)!;
    expect(cast).toBeDefined();
    expect(cast.source).not.toBe(f.aid);
    expect([cast.t, cast.lv]).toEqual([4298, 5]);
    expect(f.couple(15)).toEqual([{ t: 4298, base: 90, plus: 54 }]);
    expect([f.param(45, 4298), f.param(47, 4298), f.param(6, 4298)]).toEqual([[201], [246], [109860]]);

    const sem = sim(f.replay, { mob: MEDIO, traits: TRAITS });
    const com = sim(f.replay, { mob: MEDIO, traits: TRAITS, actives: { Defense: 5 } });
    expect(sem.status.vit).toBe(90 + 24);
    expect(com.status.vit).toBe(90 + 54);
    expect([sem.janela[45], sem.janela[47]]).toEqual([186, 240]);
    expect([com.janela[45], com.janela[47]]).toEqual([201, 246]);
    expect(com.janela[6]).toBe(109869); // recorded 109860
    // Fortaleza only touches VIT-derived fields; the damage roll is the same with and without it.
    expect([com.min, com.max]).toEqual([sim(f.replay, { mob: MEDIO, traits: TRAITS }).min, sem.max]);
  });

  /**
   * **The card's POD 51 is compatible with the packets, and it is the only trait that
   * matters here.** There is no trait-sensitive field in this window, so the packets have to
   * carry it: at POD 51 every per-hit packet on both dummies sits inside the simulated roll;
   * ten points lower at least one climbs above the ceiling, ten points higher at least one
   * drops below the floor. That brackets the card to ±10, which is what a 7-packet file can do.
   */
  it('o POD 51 do card é compatível com os pacotes, e ±10 já não é', () => {
    const alvos = f.porAlvo();
    for (const [alvo, mob] of [[4380, MEDIO], [4377, PEQUENO]] as [number, string][]) {
      expect(dentro(alvos.get(alvo)!, sim(f.replay, { ...BUILD, mob }))).toBe(true);
      expect(Math.max(...alvos.get(alvo)!)).toBeGreaterThan(sim(f.replay, { ...BUILD, mob, traits: { pow: 41, con: 0 } }).max);
      expect(Math.min(...alvos.get(alvo)!)).toBeLessThan(sim(f.replay, { ...BUILD, mob, traits: { pow: 61, con: 0 } }).min);
    }
  });

  /**
   * With Pyroclastic at the 417 this file measures and Fortaleza on, every packet on both
   * dummies falls inside the simulated roll, and the size table is checked from the damage
   * side at the same time: Espada de Uma Mão takes 75% against Pequeno and nothing against
   * Médio, and one build covers both.
   */
  it('cobre os dois tamanhos com Pyroclastic no valor medido', () => {
    for (const [alvo, mob, penalidade] of [[4380, MEDIO, 100], [4377, PEQUENO, 75]] as [number, string, number][]) {
      const s = sim(f.replay, { ...BUILD, mob });
      expect(s.hits).toBe(2); // Cultivar Bárbaro doubles the packet
      expect(s.sizePenalty).toBe(penalidade);
      expect(dentro(f.porAlvo().get(alvo)!, s)).toBe(true);
    }
  });
});

describe('Cientista — "Alquimiro" (uoyYvxyRYP)', () => {
  const f = load('bio-pyroclastic.rrf');
  /**
   * The build the window supports, and not the one the card typed. The card says POD 100 /
   * CON 20; the window says otherwise on three fields at once (next test). Propulsão do
   * Carrinho is **off**: EFST 461 never appears on the recorder, and the two Cientista files
   * differ exactly there.
   */
  const BUILD = { mob: NEUTRO, traits: { pow: 106, con: 20 }, actives: { 'Cart Boost': 0, Tempering: 10 }, extra: [{ dex: 10 }, { atk: PYRO_ALQUIMIRO }] };

  it('não tem Propulsão do Carrinho ligada', () => {
    expect(f.efst(EFST_GN_CARTBOOST)).toEqual([]);
  });

  /**
   * **The card is wrong, and the window says by how much.** `coupleStatus` carries the DEX
   * split: base 130, `plus` 60, against the 50 the job table and the equipment add up to —
   * the first pass never diffed it and blamed CON for the Precisão instead. Ten DEX is
   * exactly the gap on three independent fields: Precisão +10, ATQM +2 and DEFM +2 (both
   * DES ÷ 5). Where it comes from is not in the file: no equipped item, random option or
   * status icon carries "DES +10", so it rides as an `extra` here, named as such.
   *
   * With DEX settled, ATQ (845) and P.ATQ (94) both ask for POD 106: status ATQ pays 5 per
   * POD and P.ATQ pays one per three, and 106 is the only value that satisfies both at CON
   * 20. The card's 100 leaves ATQ 30 short and P.ATQ 2 short. Every field the client sent
   * then matches to the unit; HP máx. is 7 high, same rounding as the Musty file.
   */
  it('a janela pede DES +10 e POD 106, não o POD 100 / CON 20 do card', () => {
    expect(f.couple(17).map((c) => [c.base, c.plus])).toEqual([[130, 260], [130, 60]]); // 260 is the Instinto proc
    expect(f.couple(15)).toEqual([{ t: 27413, base: 85, plus: 44 }]);

    const doCard = sim(f.replay, { ...BUILD, traits: { pow: 100, con: 20 }, extra: [{ atk: PYRO_ALQUIMIRO }] });
    expect(doCard.status.dex).toBe(130 + 50);
    expect([doCard.janela[41], doCard.janela[49], doCard.janela[225]]).toEqual([813, 666, 92]); // 845, 676, 94 recorded

    const s = sim(f.replay, BUILD);
    expect(s.status.dex).toBe(130 + 60);
    expect(s.status.vit).toBe(85 + 44);
    const gravado: Record<number, number> = { 41: 845, 42: 1436, 44: 371, 45: 203, 47: 284, 49: 676, 52: 17, 53: 210, 225: 94 };
    for (const [sp, valor] of Object.entries(gravado)) {
      expect(f.param(Number(sp))).toContain(valor);
      expect({ sp, valor: s.janela[Number(sp)] }).toEqual({ sp, valor });
    }
    expect(f.param(6)).toEqual([138047]);
    expect(s.janela[6]).toBe(138054);
    // 106 is pinned from both sides: 105 loses the ATQ, 107 overshoots P.ATQ.
    expect(sim(f.replay, { ...BUILD, traits: { pow: 105, con: 20 } }).janela[41]).toBe(840);
    expect(sim(f.replay, { ...BUILD, traits: { pow: 107, con: 20 } }).janela[225]).toBe(95);
  });

  /**
   * **The window alternates between two blocks, and it is not another creature.** The
   * `paramChanges` carry no owner — the decoder hands back `{time, type, value}` and nothing
   * else — and with a homunculus in the file it is tempting to give the higher block to it:
   *
   *   t=33.018  ATQ 885  ATQM 411  DEFM 324  Precisão 876  amotion  70
   *   t=38.025  ATQ 845  ATQM 371  DEFM 284  Precisão 676  amotion 210
   *
   * It is the character with the boot's [Instinto] up: enchant 4879 gives DES +200 for 5
   * seconds at 3% per attack, and 38.025 − 33.018 = 5.007 ms is the effect's duration. What
   * proves it is the arithmetic, not the look: DES +200 is +200 of Precisão and +40 of ATQ
   * (DES ÷ 5), and with the build above the engine reproduces **both blocks to the unit**.
   * List the build's chance bonuses (`_chanceList`) before blaming another entity.
   */
  it('reproduz os dois blocos da janela: sem e com o proc de [Instinto]', () => {
    expect(f.param(41)).toEqual([845, 885, 845]);
    const t = (sp: number) => (f.replay.paramChanges ?? []).filter((p: any) => p.type === sp).map((p: any) => Number(p.time));
    expect(t(41)[2] - t(41)[1]).toBe(5007);

    const desligado = sim(f.replay, BUILD).janela;
    const ligado = sim(f.replay, { ...BUILD, chances: ['Hawkeye'] }).janela;
    expect([desligado[41], desligado[44], desligado[47], desligado[49], desligado[53]]).toEqual([845, 371, 284, 676, 210]);
    expect([ligado[41], ligado[44], ligado[47], ligado[49], ligado[53]]).toEqual([885, 411, 324, 876, 70]);
  });

  /**
   * **And with that build the damage closes.** The file has three states — three casts before
   * Têmpera, three with it (P.ATQ 79 → 94, and the packets rise the matching 8%), then
   * eighteen under Cultivar Bárbaro, each packet two hits. The six single-hit packets sit
   * inside the simulated roll. Inverting the chain packet by packet (review skill §6b) puts
   * the server's weapon draw within ±50 of the engine's midpoint in every state, which is the
   * Sabre's own variance (5% x nível 5 x 200): there is no missing weapon term in this file.
   * That is what rules out, for Canhão de Prótons in general, every candidate proportional
   * to the weapon that `Genetic.cart-cannon-gear-states.spec.ts` still needs on the Bioquímico.
   *
   * ABERTO, e pequeno: under Cultivar Bárbaro the per-hit packets run ~1% above the roll's
   * centre where the single-hit states run ~1% below it, and three of the eighteen overshoot
   * the ceiling by up to 0,5%. "Enquanto invocado, aumenta o dano de Canhão de Prótons" is
   * modelled as the second hit and nothing else; the recording says the summon is worth a
   * little more than doubling. Pinned here as measured — too small to place from 24 packets.
   */
  it('os pacotes caem dentro da rolagem; Cultivar Bárbaro fica ~1% acima do meio', () => {
    const meus = f.meus();
    const antes = meus.filter((d) => d.t < 20000);
    const tempera = meus.filter((d) => d.t > 20000 && d.t < 27000);
    const barbaro = meus.filter((d) => d.t > 27000);
    expect([antes.length, tempera.length, barbaro.length]).toEqual([3, 3, 18]);
    expect(antes.every((d) => d.c === 1) && tempera.every((d) => d.c === 1) && barbaro.every((d) => d.c === 2)).toBe(true);

    const semTempera = sim(f.replay, { ...BUILD, actives: { ...BUILD.actives, Tempering: 0, _Biolo_Monster_List: 0 } });
    const comTempera = sim(f.replay, { ...BUILD, actives: { ...BUILD.actives, _Biolo_Monster_List: 0 } });
    const comBarbaro = sim(f.replay, BUILD);
    expect([semTempera.pAtk, comTempera.pAtk, comBarbaro.hits]).toEqual([79, 94, 2]);
    expect(dentro(antes.map((d) => d.v), semTempera)).toBe(true);
    expect(dentro(tempera.map((d) => d.v), comTempera)).toBe(true);
    // The roll is tight enough for that to mean something.
    expect(comBarbaro.max / comBarbaro.min).toBeLessThan(1.06);

    const porGolpe = barbaro.map((d) => d.v / 2);
    const fora = porGolpe.filter((g) => g > comBarbaro.max);
    expect(porGolpe.every((g) => g >= comBarbaro.min)).toBe(true);
    expect(fora.length).toBe(3);
    expect(Math.max(...fora) / comBarbaro.max - 1).toBeLessThan(0.005);
    expect(Number(((media(porGolpe) / comBarbaro.meio - 1) * 100).toFixed(1))).toBe(1.0);
  });
});
