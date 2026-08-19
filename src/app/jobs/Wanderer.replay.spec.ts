import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeReplay } from 'rrfparser';
import { Calculator } from 'src/app/core/calculator';
import { CalculatorController } from 'src/app/core/calculator-controller';
import { parseOptionScripts } from 'src/app/core/option-scripts';
import { loadReplayFixture } from 'src/app/replay/__tests__/load-fixture';
import { replayToModel } from 'src/app/replay/replay-to-model';
import { SKILL_ID_BY_NAME } from 'src/app/skills';
import { Wanderer } from './Wanderer';

/**
 * `musa-tuevi-ado.rrf` — Musa (Wanderer) 130/36 on tra_fild, recorded by Tuévia Ado and
 * submitted through "Ajude o simulador" (tracker card `D5A5itNUJT`). The first recording
 * to check this class.
 *
 * The card says the talents were not filled in, and it does not matter: a Wanderer is a
 * 3rd class and has no trait points at all. The recording's own status packets say so —
 * every SP_PATK/SP_SMATK/SP_RES/SP_MRES/SP_HPLUS/SP_CRATE in the file arrives as 0.
 *
 * It is a **gear-up recording**: the character starts bare (shadow set + arrows only) and
 * puts the equipment on over 12 `equipChanges`, which yields three states out of one
 * file. They are rebuilt by folding the equip events onto the t=0 snapshot and handing
 * that to the importer — never by retyping the gear:
 *
 *   A  t < 27,9s     shadow set + Flecha de Ferro, **no weapon** — 9 basic attacks
 *   B  27,9s..58,5s  + Chicote de Cinzas +7 [Carta Alma de Trentini]
 *   C  t > 58,5s     + the Nobre set, Elmo Certeiro de Cinzas, Asas de Sigrún…
 *
 * Only one buff in the file touches damage: **Concentrar Lv10** (EFST 3, AGI e DES +12%),
 * up from t=4s to the end. The other three performances the player keeps running — Dança
 * Cigana, Ritmo Contagiante and Sibilo de Eir — carry no damage clause in the client's
 * own text (SP, VelAtq/conjuração and HP regen respectively).
 *
 * The two damaging skills are Temporal de Flechas Lv5 — whose packets arrive under the
 * server-side id **2516**, one per hit, 12 per cast — and Vulcão de Flechas Lv10, whose
 * `hit: 9` is display-only so the whole packet is one hit. Neither can crit and every
 * packet in the file is `normal`, so there is no deterministic value to compare by
 * equality: the comparison here is distribution against distribution.
 *
 * **Verdict: the build is exact, the ratios are exact, the damage is ~5% low.** The last
 * describe measures that residual and lists what has been ruled out.
 *
 * The map is public, so the file also carries a Ranger's and another player's packets —
 * everything here filters on `source === sessionInfo.aid` first.
 */

const items = JSON.parse(readFileSync('src/assets/demo/data/item.json', 'utf8'));
const monsters = JSON.parse(readFileSync('src/assets/demo/data/monster.json', 'utf8'));
const hpSpTable = JSON.parse(readFileSync('src/assets/demo/data/hp_sp_table.json', 'utf8'));

/** The two training dummies the recording hits — same stats but for the size. */
const DUMMY_PEQUENO = '21064';
const DUMMY_MEDIO = '21065';
/** The small dummy's `aid` in this recording; everything else it hits is the medium one. */
const AID_PEQUENO = 4386;

const replay: any = decodeReplay(loadReplayFixture('musa-tuevi-ado.rrf'));
const meus = replay.damage.filter((d: any) => d.source === replay.sessionInfo.aid);

/** One timestamp inside each gear state (see the three states in the header). */
const T_SEM_ARMA = 20_000;
const T_SO_ARMA = 42_000;
const T_COMPLETO = 95_000;

/**
 * Rebuild the model at a point in time. The importer only ever sees the t=0 snapshot, so
 * the equip events are folded onto it — both sides carry `slot`, the inventory index, so
 * it is an overwrite — and the result goes through `replayToModel` like any other import.
 */
function modelAt(untilMs: number) {
  const inv = new Map([...replay.initialInventory].map(([k, r]: any) => [k, { ...r, cards: [...r.cards] }]));
  for (const e of replay.equipChanges ?? []) {
    if (e.time > untilMs) break;
    const rec: any = inv.get(e.slot) ?? { slot: e.slot, qty: 1, options: [] };
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
  return replayToModel({ ...replay, initialInventory: inv } as any, items);
}

/** Full engine run on the imported build, with Concentrar Lv10 on. */
function simular(untilMs: number, skillValue: string, monsterId: string) {
  const { model, learnedSkills }: any = modelAt(untilMs);
  const m: any = model;
  const cls = new Wanderer();
  const b = cls.getJobBonusStatus(m.jobLevel);
  Object.assign(m, {
    jobStr: b.str, jobAgi: b.agi, jobVit: b.vit, jobInt: b.int, jobDex: b.dex, jobLuk: b.luk,
    jobPow: b.pow, jobSta: b.sta, jobWis: b.wis, jobSpl: b.spl, jobCon: b.con, jobCrt: b.crt,
  });
  m.selectedAtkSkill = skillValue;

  const passiveSkillIds = cls.passiveSkills.map((s: any) => {
    const id = SKILL_ID_BY_NAME[s.name];
    return id ? learnedSkills[id] ?? 0 : 0;
  });
  const activeSkillIds = cls.activeSkills.map((s: any) => (s.name === 'Improve Concentration' ? 10 : 0));
  const { equipAtks, masteryAtks, activeSkillNames, learnedSkillMap } = cls
    .setLearnSkills({ activeSkillIds, passiveSkillIds })
    .getSkillBonusAndName();

  const calc = new Calculator().setMasterItems(items).setHpSpTable(hpSpTable).setClass(cls);
  calc.loadItemFromModel(m);
  new CalculatorController().runChain(calc, {
    monster: monsters[monsterId], equipAtks, masteryAtks, buffEquips: {}, buffMasterys: {},
    consumeData: [], aspdPotion: undefined,
    extraOptionScripts: parseOptionScripts((m.rawOptionTxts ?? []).filter(Boolean)),
    activeSkillNames, learnedSkillMap, selectedAtkSkill: skillValue, selectedChances: [], usedHpL: false,
  } as any);

  const s = (calc as any).damageSummary;
  const ts: any = calc.getTotalSummary();
  const arma: any = (calc as any).weaponData.data;
  return {
    /** SP_ATK1 — the status window's "ATQ". */
    atqStatus: ts.calc.totalStatusAtk as number,
    /** SP_ATK2 — "ATQ Equip.": weapon + refine + ammunition + mastery + equipment ATK. */
    atqEquip: (arma.baseWeaponAtk + arma.refineBonus + ts.calc.ammuAtk + ts.calc.totalMasteryAtk + ts.calc.totalEquipAtk) as number,
    /** Equipment + buff side of each stat, i.e. the `plus` of ZC_COUPLESTATUS minus the job bonus. */
    statusEquip: { str: ts.str || 0, agi: ts.agi || 0, vit: ts.vit || 0, int: ts.int || 0, dex: ts.dex || 0, luk: ts.luk || 0 },
    razao: s.baseSkillDamage as number,
    golpes: s.skillTotalHit as number,
    min: s.skillMinDamage as number,
    max: s.skillMaxDamage as number,
    basico: [s.basicMinDamage, s.basicMaxDamage] as [number, number],
  };
}

/** Recorded packets of one skill, in one time window, against one of the two dummies. */
function gravado(deMs: number, ateMs: number, skillId: number, alvoPequeno: boolean) {
  const v: number[] = meus
    .filter((d: any) => d.time >= deMs && d.time <= ateMs && d.skillId === skillId && (d.target === AID_PEQUENO) === alvoPequeno)
    .map((d: any) => d.damage as number);
  return { n: v.length, min: Math.min(...v), max: Math.max(...v), media: v.reduce((a, b) => a + b, 0) / v.length };
}

/** Last `plus` the server reported for each stat (13 FOR … 18 SOR). */
function plusDoJogo(statusId: number) {
  const evs = replay.coupleStatus.filter((c: any) => c.statusId === statusId);
  return evs.length ? evs[evs.length - 1].plus : null;
}

describe('Musa — a build importada reproduz a janela de status da gravação', () => {
  /**
   * Every `ZC_PAR_CHANGE` is a free assertion, and these are the game's own numbers:
   * ATQ 75 bare-handed and 184 with the whip; ATQ Equip. 30 (only the arrow), 309 (whip
   * +7 plus the Lições de Dança mastery) and 369 (full equipment).
   */
  it.each([
    { estado: 'sem arma', t: T_SEM_ARMA, atqStatus: 75, atqEquip: 30 },
    { estado: 'só a arma', t: T_SO_ARMA, atqStatus: 184, atqEquip: 309 },
    { estado: 'completo', t: T_COMPLETO, atqStatus: 184, atqEquip: 369 },
  ])('$estado → ATQ $atqStatus e ATQ Equip. $atqEquip', ({ t, atqStatus, atqEquip }) => {
    const r = simular(t, 'Severe Rainstorm==5', DUMMY_MEDIO);
    expect(r.atqStatus).toBe(atqStatus);
    expect(r.atqEquip).toBe(atqEquip);
  });

  /**
   * `ZC_COUPLESTATUS` carries `base` and `plus` per stat, and `plus` is job bonus +
   * equipment + buffs. Compared against the game's own numbers it pins the job table at
   * job 36 together with Olhos de Coruja Lv10 (DES +10), Concentrar Lv10 (AGI e DES
   * +12%) and the Chicote de Cinzas' INT e VIT +6, SOR **-6**.
   */
  it.each([
    { nome: 'AGI', statusId: 14, chave: 'agi' as const },
    { nome: 'VIT', statusId: 15, chave: 'vit' as const },
    { nome: 'INT', statusId: 16, chave: 'int' as const },
    { nome: 'DES', statusId: 17, chave: 'dex' as const },
    { nome: 'SOR', statusId: 18, chave: 'luk' as const },
  ])('$nome: bônus de classe + equipamento igual ao "plus" do servidor', ({ statusId, chave }) => {
    const bonus = new Wanderer().getJobBonusStatus(36);
    const r = simular(T_COMPLETO, 'Severe Rainstorm==5', DUMMY_MEDIO);
    expect(bonus[chave] + r.statusEquip[chave]).toBe(plusDoJogo(statusId));
  });

  it('não tem talentos — classe de 3ª, e a gravação reporta P.ATQ/RES/T.CRÍT zerados', () => {
    const talentos = replay.paramChanges.filter((p: any) => [225, 226, 227, 228, 229, 230].includes(p.type));
    expect(talentos.length).toBeGreaterThan(0);
    // `value` arrives as a BigInt on these params, so compare numerically.
    expect(talentos.every((p: any) => Number(p.value) === 0)).toBe(true);
  });
});

describe('Musa — as razões das habilidades, contra a tabela do cliente', () => {
  /** "Nv 5: 600%" na coluna Chicote/Inst.Mus., mais (DES + AGI) ÷ 2, x nível de base. */
  it('Temporal de Flechas Nv5 = 953% (600 + (151 + 116) ÷ 2, x 130/100), em 12 golpes', () => {
    const r = simular(T_COMPLETO, 'Severe Rainstorm==5', DUMMY_MEDIO);
    expect(r.razao).toBe(953);
    expect(r.golpes).toBe(12);
  });

  /** "Nv 10: 1.500%", x nível de base; os 9 golpes são de exibição — um pacote só. */
  it('Vulcão de Flechas Nv10 = 1.950% (1.500 x 130/100), em um pacote', () => {
    const r = simular(T_COMPLETO, 'Arrow Vulcan==10', DUMMY_MEDIO);
    expect(r.razao).toBe(1950);
    expect(r.golpes).toBe(1);
  });
});

/**
 * **A Musa tem um resíduo aberto: o simulador fica ~5% abaixo do jogo.**
 *
 * Os 107 pacotes do personagem caem em cinco caixas — habilidade x estado x tamanho do
 * alvo. Nenhum é crítico, então a comparação é entre distribuições: a **média** dos
 * pacotes contra o **meio** do intervalo simulado. Esse meio é a média que o jogo deveria
 * dar, porque o máximo do simulador já inclui o sobre-refino (`overUpgrade` 42 num +7 de
 * nível 4) e o mínimo não inclui nada dele; nas duas caixas de 36 pacotes o erro padrão
 * da média fica em ~0,5%.
 *
 * **O que já foi descartado**, por medida e não por opinião:
 *   - a build: as três leituras de ATQ/ATQ Equip. e os cinco `plus` de status batem
 *     exatamente com os pacotes do servidor (describes acima), então não falta ATQ plano,
 *     nem refino, nem carta, nem status;
 *   - as razões: 953% e 1.950% saem da tabela do próprio cliente;
 *   - conjuração e espera: `skill-delay.spec.ts` passa para a classe inteira;
 *   - a variação da arma: 7 dos 8 pacotes de Vulcão contra o Pequeno estão **acima** do
 *     máximo simulado, que já inclui os 42 de sobre-refino — não é sorte de rolagem;
 *   - a penalidade de tamanho: o resíduo do Pequeno e o do Médio são iguais dentro do
 *     erro, então os 75% do chicote contra alvo Pequeno estão certos;
 *   - o equipamento do estado completo: o estado "só a arma" tem o mesmo resíduo (maior,
 *     até), e ali só há o chicote, a flecha e o conjunto sombrio;
 *   - a Carta Alma de Trentini: os +40% (20 de base + 20 por arma de nível 4) entram —
 *     tirar a carta derruba o dano na proporção exata;
 *   - as outras três apresentações ativas: a descrição pt-BR de cada uma só fala de SP,
 *     VelAtq/conjuração e regeneração de HP.
 *
 * O que sobra é uma etapa de ~5% que nenhuma descrição pt-BR do equipamento usado
 * justifica. Uma segunda gravação com **outro estado de buff** sobre o mesmo equipamento
 * (§9 do `review-rrf-class`) é o que separaria "% de dano" de "ATQ plano" — aqui os cinco
 * pacotes de Vulcão contra o Médio são poucos demais para fechar a conta sozinhos.
 */
describe('Musa — resíduo aberto: o simulador fica ~5% abaixo do jogo', () => {
  it.each([
    { nome: 'Temporal Nv5, só a arma, Médio', de: 40_000, ate: 50_000, skillId: 2516, pequeno: false, t: T_SO_ARMA, skill: 'Severe Rainstorm==5', mob: DUMMY_MEDIO, n: 12, residuo: 6.8 },
    { nome: 'Temporal Nv5, completo, Pequeno', de: 60_000, ate: 108_000, skillId: 2516, pequeno: true, t: T_COMPLETO, skill: 'Severe Rainstorm==5', mob: DUMMY_PEQUENO, n: 36, residuo: 5.1 },
    { nome: 'Temporal Nv5, completo, Médio', de: 60_000, ate: 108_000, skillId: 2516, pequeno: false, t: T_COMPLETO, skill: 'Severe Rainstorm==5', mob: DUMMY_MEDIO, n: 36, residuo: 4.6 },
    { nome: 'Vulcão Nv10, completo, Pequeno', de: 60_000, ate: 108_000, skillId: 394, pequeno: true, t: T_COMPLETO, skill: 'Arrow Vulcan==10', mob: DUMMY_PEQUENO, n: 8, residuo: 7.2 },
    { nome: 'Vulcão Nv10, completo, Médio', de: 60_000, ate: 108_000, skillId: 394, pequeno: false, t: T_COMPLETO, skill: 'Arrow Vulcan==10', mob: DUMMY_MEDIO, n: 5, residuo: 1.6 },
  ])('$nome: $n pacotes, +$residuo% acima do simulado', ({ de, ate, skillId, pequeno, t, skill, mob, n, residuo }) => {
    const g = gravado(de, ate, skillId, pequeno);
    const s = simular(t, skill, mob);
    expect(g.n).toBe(n);
    expect((g.media / ((s.min + s.max) / 2) - 1) * 100).toBeCloseTo(residuo, 0);
  });

  /**
   * The bare-handed control, and the only deterministic number in the file: 9 basic
   * attacks, all exactly 130. The simulator says 100, and the difference is exactly the
   * Flecha de Ferro's ATQ 30 — which the client **does** count (SP_ATK2 is 30 in that
   * state) and the simulator only adds when a weapon is equipped. A corner with no
   * practical consequence (nobody simulates bare-handed), but it is what stops this
   * control from closing exactly.
   */
  it('desarmado: o jogo bate 130 (9 pacotes iguais) e o simulador 100 — a flecha não entra', () => {
    const basicos = meus.filter((d: any) => d.skillId === 0).map((d: any) => d.damage);
    expect(basicos).toEqual(Array(9).fill(130));
    expect(simular(T_SEM_ARMA, 'Severe Rainstorm==5', DUMMY_MEDIO).basico).toEqual([100, 100]);
  });
});
