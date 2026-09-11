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
 * which reproduces a gearless Bioquímico to the unit. What these two settle is **where
 * Pyroclastic sits and what it is worth**, which no source states.
 *
 *   `bio-cart-cannon-two-sizes.rrf`  "Musty LTDA" 212/35, card cVfBmHUQzf, anonymous.
 *   `bio-pyroclastic.rrf`            "Alquimiro"  230/48, card uoyYvxyRYP, by Dijey.
 *
 * Both carry Cultivar Bárbaro, so every packet is `count` 2 and divides by two (review
 * skill §5), and both carry Pyroclastic (EFST 607) over every packet.
 *
 * Neither file carries the six traits: a Cientista is a 4th class, so they exist and the
 * dialog collected them by hand. That makes the card's values a person's typing, and the
 * tests below check them against the packets rather than trusting them — one card turns out
 * right and the other wrong.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

const CART_CANNON = 2477;
const EFST_PYROCLASTIC = 607;
const MEDIO = '21065';
const PEQUENO = '21064';

function load(name: string) {
  const replay: any = decodeReplay(loadReplayFixture(name));
  const aid = replay.sessionInfo.aid;
  return {
    replay,
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
  };
}

/**
 * `extra` stands in for a bonus the picker cannot express. `{ atk: n }` lands in ATQ Equip.,
 * outside the weapon's size penalty; `{ weaponAtk: n }` lands inside the weapon group and is
 * scaled by it. The difference between those two is what the Médio/Pequeno pair measures.
 */
function sim(replay: any, traits: Record<string, number>, mob: string, extra: any[] = [], tempering = 0) {
  const m = replayToModel(replay, items).model as any;
  Object.assign(m, traits);
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
  const actives: Record<string, number> = { _Biolo_Monster_List: 2, 'Cart Boost': 5, Tempering: tempering };
  const activeIds = cls.activeSkills.map((a: any) => actives[a.name] ?? 0);
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds: activeIds, passiveSkillIds: passiveIds })
    .getSkillBonusAndName();

  const value = 'Cart Cannon==5';
  m.selectedAtkSkill = value;
  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[mob], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: [...parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)), ...extra],
    activeSkillNames, learnedSkillMap, selectedAtkSkill: value, selectedChances: [], usedHpL: false,
  } as any);

  const ds: any = (calc as any).damageSummary;
  const tot: any = calc.getTotalSummary();
  const c = tot.calc;
  return {
    hits: ds.skillTotalHit as number,
    sizePenalty: ds.skillSizePenalty as number,
    meio: ((ds.skillMinDamage as number) + (ds.skillMaxDamage as number)) / 2,
    pAtk: (calc as any).dmgCalculator.traitBonus.pAtk as number,
    janela: {
      6: c.maxHp, 41: c.totalStatusAtk,
      42: (tot.weapon?.baseWeaponAtk ?? 0) + (tot.weapon?.refineBonus ?? 0) + c.totalEquipAtk,
      45: c.softDef, 47: c.softMdef, 49: c.totalHit, 52: c.totalCri,
      53: Math.round((200 - c.totalAspd) * 10),
    } as Record<number, number>,
  };
}

const media = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (a: number, b: number) => Number(((a / b - 1) * 100).toFixed(1));

/** Pyroclastic's worth in ATQ Equip., measured off the Alquimiro recording's own window. */
const PYROCLASTIC = 431;

describe('Cientista — quanto vale Pyroclastic, e onde ele entra', () => {
  /**
   * The magnitude, measured directly. `bio-pyroclastic.rrf` recasts the buff at t=21.400 and
   * the client re-sends ATQ Equip. on both sides of the recast, 1.005 without and 1.436 with.
   * The engine reproduces the unbuffed 1.005 exactly, so the difference is the buff alone.
   *
   * No source has this number. The calculator's picker tops out at +300, and rAthena computes
   * `100 + 10 x nível` — 150 at the skill's maximum — under an explicit `!TODO: Confirm
   * formula`. The recording is the only measurement that exists.
   */
  it('vale 431 de ATQ Equip., medido na recast da própria gravação', () => {
    const f = load('bio-pyroclastic.rrf');
    expect(f.efst(EFST_PYROCLASTIC)).toEqual([[0, true], [21400, false], [21400, true]]);
    expect(f.param(42, 21400)).toEqual([1005, 1436]);
    expect(1436 - 1005).toBe(PYROCLASTIC);

    const traits = { pow: 102, sta: 0, wis: 0, spl: 0, con: 25, crt: 0 };
    expect(sim(f.replay, traits, '21077', [], 10).janela[42]).toBe(1005);

    const picker = (new Biolo() as any).activeSkills.find((a: any) => a.name === 'Pyroclastic');
    expect(Math.max(...picker.dropdown.map((d: any) => d.bonus?.atk ?? 0))).toBe(300);
  });

  /**
   * And **where it enters**, which the other file settles on its own. `bio-cart-cannon-two-
   * sizes.rrf` fires the same build at a Médio and a Pequeno dummy seconds apart. The weapon
   * is a Rapieira, so Pequeno takes the sword's 75% and Médio takes none — and the ratio
   * between the two damages depends only on **how much of the ATQ is inside the weapon
   * group**, not on the absolute size of any buff. So the ratio locates Pyroclastic without
   * needing to know what it is worth:
   *
   *   gravado                              1,2876
   *   Pyroclastic como ATQ Equip.          1,2890   ✓
   *   Pyroclastic como ATQ de arma         1,3634..1,3969   ✗ (para +300..+500)
   *
   * It is ATQ Equip., i.e. outside the size penalty, which is what the calculator's
   * `isEquipAtk: true` already does. Worth stating because rAthena does the opposite —
   * `status_calc_watk` adds `SC_PYROCLASTIC` to the weapon ATK — and the recording wins.
   */
  it('entra como ATQ Equip. e não no grupo da arma, pela razão Médio/Pequeno', () => {
    const f = load('bio-cart-cannon-two-sizes.rrf');
    const traits = { pow: 51, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 }; // do card
    const alvos = f.porAlvo();
    const razaoGravada = media(alvos.get(4380)!) / media(alvos.get(4377)!);
    expect(Number(razaoGravada.toFixed(4))).toBe(1.2876);

    const razaoDe = (extra: any[]) =>
      sim(f.replay, traits, MEDIO, extra).meio / sim(f.replay, traits, PEQUENO, extra).meio;

    expect(Number(razaoDe([{ atk: PYROCLASTIC }]).toFixed(4))).toBe(1.2891);
    // No grupo da arma a razão dispara, porque o Pequeno passaria a descontar 25% do buff.
    expect(razaoDe([{ weaponAtk: PYROCLASTIC }])).toBeGreaterThan(1.38);
  });
});

describe('Cientista — "Musty LTDA", os dois tamanhos (cVfBmHUQzf)', () => {
  const f = load('bio-cart-cannon-two-sizes.rrf');
  const TRAITS = { pow: 51, sta: 0, wis: 0, spl: 0, con: 0, crt: 0 }; // do card, digitados à mão

  it('acerta um Médio e um Pequeno com segundos de diferença, com a mesma build', () => {
    const alvos = f.porAlvo();
    expect([alvos.get(4380)!.length, alvos.get(4377)!.length]).toEqual([4, 3]);
    expect(f.efst(EFST_PYROCLASTIC)).toEqual([[6076, true]]);
    expect(Math.min(...f.meus().map((d) => d.t))).toBeGreaterThan(6076); // o buff precede o dano
  });

  /**
   * **O POD do card confere, e agora por medida.** The window carries nothing trait-sensitive
   * in this file, so the packets have to do it: sweeping POD against the recorded damage
   * brackets it tightly, because the trait pays 5 ATQ per point on a build whose whole ATQ is
   * a few thousand.
   *
   *   POD 25 -> +11,1% / +12,8%      POD 51 -> +0,5% / +0,6%      POD 75 -> -8,4% / -9,3%
   *
   * That is the check review-rrf-class §2 asks for on a `traitsSource: 'form'` card, and it
   * is the one of the two cards that survives it.
   */
  it('confirma o POD 51 do card contra os pacotes', () => {
    const alvos = f.porAlvo();
    const desvio = (pow: number, alvo: number, mob: string) =>
      pct(media(alvos.get(alvo)!), sim(f.replay, { ...TRAITS, pow }, mob, [{ atk: PYROCLASTIC }]).meio);

    expect([desvio(51, 4380, MEDIO), desvio(51, 4377, PEQUENO)]).toEqual([0.5, 0.6]);
    expect(desvio(25, 4380, MEDIO)).toBe(11.1);
    expect(desvio(75, 4380, MEDIO)).toBe(-8.4);
  });

  /**
   * With Pyroclastic priced at the 431 the other recording measured, every packet on both
   * dummies falls inside the simulated roll. That is the closest thing this class has to a
   * validation, and it checks the size table from the damage side at the same time: Espada de
   * Uma Mão takes 75% against Pequeno and nothing against Médio, and one build covers both.
   */
  it('cobre os dois tamanhos com Pyroclastic no valor medido', () => {
    for (const [alvo, mob, penalidade] of [[4380, MEDIO, 100], [4377, PEQUENO, 75]] as [number, string, number][]) {
      const s = sim(f.replay, TRAITS, mob, [{ atk: PYROCLASTIC }]);
      expect(s.hits).toBe(2); // Cultivar Bárbaro dobra o pacote
      expect(s.sizePenalty).toBe(penalidade);
      for (const golpe of f.porAlvo().get(alvo)!) {
        expect(Math.abs(pct(golpe, s.meio))).toBeLessThan(4);
      }
    }
  });

  /**
   * ABERTO, e sem efeito no dano. O HP máx. da gravação é 109.860 e o motor monta 96.907 —
   * 13% abaixo. **Não são talentos**: o motor só gasta STA em Tenacidade, então varrer STA de
   * 0 a 70 não move o HP em um ponto sequer. Os encantes de HP da build (dois S-HPMax e um
   * HP +2%) estão todos em `item.json` com script, então é a fórmula de HP ou a ordem em que
   * ela soma as porcentagens. Fica registrado aqui porque a janela de status é a régua da
   * build, mas não invalida nada acima: HP não entra na cadeia de dano.
   */
  it('fixa a diferença de HP máx., que não toca o dano', () => {
    expect(f.param(6)).toEqual([109860]);
    const s = sim(f.replay, TRAITS, MEDIO);
    expect(s.janela[6]).toBe(96907);
    expect(sim(f.replay, { ...TRAITS, sta: 70 }, MEDIO).janela[6]).toBe(96907); // STA não mexe
  });
});

describe('Cientista — "Alquimiro", a gravação que não fecha (uoyYvxyRYP)', () => {
  const f = load('bio-pyroclastic.rrf');

  /**
   * **A armadilha deste arquivo: `paramChanges` mistura a janela do homúnculo.** O stream não
   * tem dono — o decodificador entrega `{time, type, value}` e mais nada — e esta gravação
   * tem um homúnculo (Iron Fist Alexander). Dois blocos alternam:
   *
   *   t=33.018  ATQ 885  MATQ 411  DEFM 324  Precisão 876  amotion  70
   *   t=38.025  ATQ 845  MATQ 371  DEFM 284  Precisão 676  amotion 210
   *
   * O segundo é o do personagem: bate com a primeira leitura do arquivo (t=13.678) e é o
   * bloco de fim de gravação. **O que prova isso é o dano**, não a aparência: +40 de ATQ de
   * status valeriam ~2% de dano, e as médias dos nove pacotes de cada lado de t=33.018 ficam
   * a 0,09% uma da outra. Ler sp41 no instante errado daria a ATQ do bicho.
   */
  it('separa a janela do personagem da do homúnculo pelo dano', () => {
    expect(f.param(41)).toEqual([845, 885, 845]);

    const dobrados = f.meus().filter((d) => d.c === 2);
    const antes = dobrados.filter((d) => d.t < 33018).map((d) => d.v);
    const depois = dobrados.filter((d) => d.t > 33018).map((d) => d.v);
    expect([antes.length, depois.length]).toEqual([9, 9]);
    expect(Math.abs(pct(media(depois), media(antes)))).toBeLessThan(0.2);
  });

  /**
   * **Os talentos do card estão errados, e a janela diz em quanto.** Two fields pin them, and
   * neither agrees with the card's "POD 100 / CON 20":
   *
   *   Precisão 676   ->  CON 25   (o motor paga 2 de Precisão por ponto de CON)
   *   P.ATQ 94       ->  POD 101..103  dado CON 25, porque P.ATQ é piso(POD/3) + piso(CON/5)
   *
   * É exatamente a conferência que a §2 do review-rrf-class manda fazer num card cujo
   * `traitsSource` é o formulário, e aqui ela pega o erro.
   */
  it('resolve os talentos reais a partir da janela: CON 25 e POD 101..103', () => {
    expect(f.param(49)).toEqual([876, 676]);
    expect(f.param(225)).toEqual([94]);

    const comTalentos = (pow: number, con: number) =>
      sim(f.replay, { pow, sta: 0, wis: 0, spl: 0, con, crt: 0 }, '21077', [], 10);

    expect(comTalentos(100, 20).janela[49]).toBe(666); // o card erra a Precisão em 10
    expect(comTalentos(100, 25).janela[49]).toBe(676);
    for (const pow of [101, 102, 103]) expect(comTalentos(pow, 25).pAtk).toBe(94);
    expect(comTalentos(100, 25).pAtk).toBe(93);
    expect(comTalentos(104, 25).pAtk).toBe(95);
  });

  /**
   * ABERTO, e é o que bloqueia o arquivo. Com os talentos certos a Precisão e o P.ATQ batem,
   * e o ATQ **não**: a janela diz 845 e o motor monta 818..828. Uma varredura de POD 90..130
   * por CON 0..60 — 2.501 combinações — não produz nenhum par que acerte os três campos ao
   * mesmo tempo, então não é questão de achar o talento certo. Faltam 17 a 27 pontos na parte
   * de status do ATQ, que só a FOR alimenta um-para-um.
   *
   * O que já foi descartado: a opção aleatória que o importador pula nesta build é a 168
   * (`HEAL_VALUE`, poder de cura), que é um dos nove status de sustentação que nunca entram na
   * cadeia de dano — pular é o certo; e o filtro numérico das descrições contra os scripts não
   * acusa FOR faltando em nenhuma das peças.
   *
   * Enquanto isso não fechar, nenhum número de dano deste arquivo significa nada (§3), e é por
   * isso que quem mediu Pyroclastic foi a janela dele e quem validou a fórmula foi o outro
   * arquivo. Inverter a cadeia aqui também não resolve: nenhum ATQ inteiro reproduz os pacotes,
   * o que é o sintoma esperado de um multiplicador ainda errado.
   */
  it('fixa a diferença de ATQ que nenhum par de talentos fecha', () => {
    const comTalentos = (pow: number, con: number) =>
      sim(f.replay, { pow, sta: 0, wis: 0, spl: 0, con, crt: 0 }, '21077', [], 10);

    expect(comTalentos(101, 25).janela[41]).toBe(818);
    expect(comTalentos(103, 25).janela[41]).toBe(828);
    expect(f.param(41)[0]).toBe(845); // …contra os 845 da janela
    // Subir o POD até o ATQ chegar lá estoura o P.ATQ muito antes: o par que acerta o ATQ
    // já erra o campo que fixou o POD, e é essa contradição que deixa o arquivo em aberto.
    expect(comTalentos(107, 25).janela[41]).toBe(848);
    expect(comTalentos(107, 25).pAtk).toBe(96);
  });
});
